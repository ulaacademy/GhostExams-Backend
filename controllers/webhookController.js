// تهيئة Stripe فقط إذا كان المفتاح موجودًا
let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized');
  } else {
    console.log('⚠️ STRIPE_SECRET_KEY not found in .env file');
  }
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error.message);
}

const Subscription = require('../models/Subscription');
const User = require('../models/User');

exports.handleWebhook = async (req, res) => {
  // إذا لم يكن Stripe مهيأ
  if (!stripe) {
    console.log('⚠️ Stripe is not configured, skipping webhook');
    return res.status(503).json({ 
      error: 'Stripe webhook handler is not configured. Please add STRIPE_SECRET_KEY to your .env file.' 
    });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // التحقق من صحة الـ Webhook
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ خطأ في التحقق من Webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('✅ تم استقبال حدث:', event.type);

  // معالجة الأحداث المختلفة
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      default:
        console.log(`حدث غير معالج: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('خطأ في معالجة Webhook:', error);
    res.status(500).json({ error: error.message });
  }
};

// معالج إنشاء اشتراك جديد
async function handleSubscriptionCreated(subscription) {
  console.log('🎉 اشتراك جديد:', subscription.id);

  const userId = subscription.metadata.userId;
  const plan = subscription.metadata.plan;

  // البحث عن المستخدم
  const user = await User.findById(userId);
  if (!user) {
    console.error('المستخدم غير موجود:', userId);
    return;
  }

  // إنشاء سجل الاشتراك في قاعدة البيانات
  const newSubscription = new Subscription({
    userId: user._id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer,
    stripePriceId: subscription.items.data[0].price.id,
    stripeProductId: subscription.items.data[0].price.product,
    status: subscription.status,
    plan: plan,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  });

  await newSubscription.save();
  console.log('✅ تم حفظ الاشتراك في قاعدة البيانات');
}

// معالج تحديث الاشتراك
async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 تحديث اشتراك:', subscription.id);

  const existingSubscription = await Subscription.findOne({
    stripeSubscriptionId: subscription.id
  });

  if (!existingSubscription) {
    console.error('الاشتراك غير موجود في قاعدة البيانات');
    return;
  }

  // تحديث البيانات
  existingSubscription.status = subscription.status;
  existingSubscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  existingSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
  
  if (subscription.canceled_at) {
    existingSubscription.canceledAt = new Date(subscription.canceled_at * 1000);
  }

  await existingSubscription.save();
  console.log('✅ تم تحديث الاشتراك في قاعدة البيانات');
}

// معالج حذف الاشتراك
async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️ حذف اشتراك:', subscription.id);

  const existingSubscription = await Subscription.findOne({
    stripeSubscriptionId: subscription.id
  });

  if (existingSubscription) {
    existingSubscription.status = 'canceled';
    existingSubscription.canceledAt = new Date();
    await existingSubscription.save();
    console.log('✅ تم تحديث حالة الاشتراك إلى ملغي');
  }
}

// معالج دفع الفاتورة بنجاح
async function handleInvoicePaid(invoice) {
  console.log('💰 تم دفع فاتورة:', invoice.id);

  if (invoice.subscription) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });

    if (subscription) {
      // تحديث حالة الاشتراك إلى نشط
      subscription.status = 'active';
      await subscription.save();
      
      console.log('✅ تم تحديث حالة الاشتراك إلى نشط');
      
      // يمكنك إرسال إيميل للمستخدم هنا
      // await sendPaymentSuccessEmail(subscription.userId);
    }
  }
}

// معالج فشل دفع الفاتورة
async function handleInvoicePaymentFailed(invoice) {
  console.log('❌ فشل دفع فاتورة:', invoice.id);

  if (invoice.subscription) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription
    });

    if (subscription) {
      // تحديث حالة الاشتراك
      subscription.status = 'past_due';
      await subscription.save();
      
      console.log('⚠️ تم تحديث حالة الاشتراك إلى متأخر في الدفع');
      
      // إرسال إيميل تحذيري للمستخدم
      // await sendPaymentFailedEmail(subscription.userId);
    }
  }
}

// معالج إتمام عملية الدفع (Checkout)
async function handleCheckoutCompleted(session) {
  console.log('✅ تم إتمام عملية الدفع:', session.id);

  // يمكنك إضافة منطق إضافي هنا بعد إتمام الدفع
  // مثل إرسال إيميل ترحيبي أو تفعيل ميزات خاصة
}

module.exports = exports;