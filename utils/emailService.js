const nodemailer = require("nodemailer");

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  // دعم أسماء متغيرات متعددة للتوافق
  const SMTP_HOST = process.env.SMTP_HOST || process.env.SMTP_SERVER;
  const SMTP_PORT = process.env.SMTP_PORT;
  const SMTP_USER = process.env.SMTP_USER || process.env.SENDER_EMAIL;
  const SMTP_PASS = process.env.SMTP_PASS || process.env.SENDER_PASSWORD;
  const SMTP_SECURE = process.env.SMTP_SECURE;
  const SMTP_FROM = process.env.SMTP_FROM || process.env.SENDER_EMAIL;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    const missingVars = [];
    if (!SMTP_HOST) missingVars.push("SMTP_HOST أو SMTP_SERVER");
    if (!SMTP_PORT) missingVars.push("SMTP_PORT");
    if (!SMTP_USER) missingVars.push("SMTP_USER أو SENDER_EMAIL");
    if (!SMTP_PASS) missingVars.push("SMTP_PASS أو SENDER_PASSWORD");

    console.error(
      "❌ متغيرات البريد الإلكتروني مفقودة:",
      missingVars.join(", ")
    );
    throw new Error("EMAIL_TRANSPORT_MISSING_CONFIG");
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cachedTransporter;
};

const formatDate = (value) => {
  if (!value) return "غير محدد";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: process.env.EMAIL_TIMEZONE || "Asia/Riyadh",
    }).format(date);
  } catch (err) {
    return date.toISOString();
  }
};

const normalize = (value) => {
  if (value === null || value === undefined) return "غير محدد";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (value === "") return "غير متوفر";
  return String(value);
};

const buildDetailsTable = (rows) => {
  const cells = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;font-weight:600;background:#f9fafb;">${label}</td>
          <td style="padding:8px;border:1px solid #e2e8f0;">${normalize(
            value
          )}</td>
        </tr>`
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;font-family:Arial,sans-serif;font-size:14px;">
      ${cells}
    </table>
  `;
};

const buildEmailBody = ({ teacher, plan, subscription, submittedData }) => {
  const teacherSection = buildDetailsTable([
    ["الاسم", teacher?.name],
    ["البريد الإلكتروني", teacher?.email],
    ["رقم الهوية", teacher?._id],
    [
      "المواد",
      Array.isArray(teacher?.subjects) && teacher.subjects.length
        ? teacher.subjects.join(", ")
        : "غير محدد",
    ],
  ]);

  const planSection = buildDetailsTable([
    ["اسم الخطة", plan?.name],
    ["الوصف", plan?.description],
    ["السعر", plan ? `${plan.price} ${plan.currency || ""}` : "غير محدد"],
    [
      "المدة",
      plan ? `${plan.duration} ${plan.durationUnit || "days"}` : "غير محدد",
    ],
    ["الحد الأقصى للطلاب", plan?.maxStudents],
    ["الحد الأقصى للامتحانات", plan?.maxExams],
    ["الحد الأقصى للأسئلة", plan?.maxQuestions],
  ]);

  const submittedSection = buildDetailsTable([
    ["تاريخ البداية (المدخل)", submittedData?.startDate],
    ["تاريخ النهاية (المدخل)", submittedData?.endDate],
    ["طريقة الدفع", submittedData?.paymentMethod],
    ["المبلغ", submittedData?.amount],
    ["العملة", submittedData?.currency],
    ["ملاحظات إضافية", submittedData?.notes],
    ["مصدر الطلب", submittedData?.source],
  ]);

  const snapshotSection = buildDetailsTable([
    ["الحالة الحالية", subscription?.status],
    ["تاريخ البداية (المسجل)", subscription?.startDate],
    ["تاريخ النهاية (المسجل)", subscription?.endDate],
    ["حالة الدفع", subscription?.paymentStatus],
    ["طريقة الدفع (المسجلة)", subscription?.paymentMethod],
    ["المبلغ (المسجل)", subscription?.amount],
    ["العملة (المسجلة)", subscription?.currency],
    ["تاريخ الإنشاء", subscription?.createdAt],
    ["ملاحظات النظام", subscription?.notes],
  ]);

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1a202c;">
      <h2 style="margin-bottom:4px;">طلب اشتراك جديد للمعلمين</h2>
      <p style="margin-top:0;color:#4a5568;">
        تم استلام طلب اشتراك جديد من ${normalize(
          teacher?.name
        )}. التفاصيل الكاملة موجودة أدناه.
      </p>
      <h3 style="margin-bottom:4px;">بيانات المعلم</h3>
      ${teacherSection}
      <h3 style="margin-bottom:4px;">تفاصيل الخطة</h3>
      ${planSection}
      <h3 style="margin-bottom:4px;">البيانات التي أدخلها المعلم</h3>
      ${submittedSection}
      <h3 style="margin-bottom:4px;">بيانات الاشتراك المسجلة في النظام</h3>
      ${snapshotSection}
    </div>
  `;

  const text = `
طلب اشتراك جديد للمعلمين
----------------------------------------
بيانات المعلم:
- الاسم: ${normalize(teacher?.name)}
- البريد الإلكتروني: ${normalize(teacher?.email)}
- رقم الهوية: ${normalize(teacher?._id)}
- المواد: ${normalize(teacher?.subjects)}

تفاصيل الخطة:
- الاسم: ${normalize(plan?.name)}
- الوصف: ${normalize(plan?.description)}
- السعر: ${normalize(plan?.price)} ${normalize(plan?.currency)}
- المدة: ${
    plan ? `${plan.duration} ${plan.durationUnit || "days"}` : "غير محدد"
  }

البيانات المدخلة:
- تاريخ البداية: ${normalize(submittedData?.startDate)}
- تاريخ النهاية: ${normalize(submittedData?.endDate)}
- طريقة الدفع: ${normalize(submittedData?.paymentMethod)}
- المبلغ: ${normalize(submittedData?.amount)}
- العملة: ${normalize(submittedData?.currency)}
- الملاحظات: ${normalize(submittedData?.notes)}
- مصدر الطلب: ${normalize(submittedData?.source)}

بيانات النظام:
- الحالة: ${normalize(subscription?.status)}
- تاريخ البداية: ${normalize(subscription?.startDate)}
- تاريخ النهاية: ${normalize(subscription?.endDate)}
- حالة الدفع: ${normalize(subscription?.paymentStatus)}
- طريقة الدفع: ${normalize(subscription?.paymentMethod)}
- المبلغ: ${normalize(subscription?.amount)}
- العملة: ${normalize(subscription?.currency)}
- تاريخ الإنشاء: ${normalize(subscription?.createdAt)}
- الملاحظات: ${normalize(subscription?.notes)}
`;

  return { html, text };
};

exports.sendTeacherSubscriptionRequestEmail = async ({
  teacher,
  plan,
  subscription,
  submittedData,
}) => {
  try {
    console.log("📧 محاولة إرسال بريد إلكتروني لطلب اشتراك جديد...");

    // التحقق من وجود المتغيرات المطلوبة (يدعم أسماء متعددة)
    const SMTP_HOST = process.env.SMTP_HOST || process.env.SMTP_SERVER;
    const SMTP_PORT = process.env.SMTP_PORT;
    const SMTP_USER = process.env.SMTP_USER || process.env.SENDER_EMAIL;
    const SMTP_PASS = process.env.SMTP_PASS || process.env.SENDER_PASSWORD;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      const missingVars = [];
      if (!SMTP_HOST) missingVars.push("SMTP_HOST أو SMTP_SERVER");
      if (!SMTP_PORT) missingVars.push("SMTP_PORT");
      if (!SMTP_USER) missingVars.push("SMTP_USER أو SENDER_EMAIL");
      if (!SMTP_PASS) missingVars.push("SMTP_PASS أو SENDER_PASSWORD");

      console.error(
        "❌ متغيرات البريد الإلكتروني مفقودة:",
        missingVars.join(", ")
      );
      throw new Error("EMAIL_TRANSPORT_MISSING_CONFIG");
    }

    const transporter = getTransporter();
    const recipient =
      process.env.SUBSCRIPTION_NOTIFICATION_EMAIL || "saeednshahin@gmail.com";
    const fromAddress =
      process.env.SMTP_FROM || process.env.SENDER_NAME || SMTP_USER;

    console.log("📧 إعدادات البريد:", {
      from: fromAddress,
      to: recipient,
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      hasPassword: !!SMTP_PASS,
    });

    const { html, text } = buildEmailBody({
      teacher,
      plan,
      subscription,
      submittedData,
    });

    // استخدام SENDER_NAME كاسم المرسل إذا كان متوفراً
    const senderName = process.env.SENDER_NAME || "ULA Subscription System";
    const fromDisplay = senderName
      ? `"${senderName}" <${fromAddress}>`
      : fromAddress;

    const mailOptions = {
      from: fromDisplay,
      to: recipient,
      subject: `طلب اشتراك جديد - ${teacher?.name || teacher?.email || "معلم"}`,
      html,
      text,
    };

    console.log("📧 إرسال البريد إلى:", recipient);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ تم إرسال البريد الإلكتروني بنجاح:", {
      messageId: info.messageId,
      response: info.response,
      to: recipient,
    });

    return info;
  } catch (error) {
    console.error("❌ خطأ في إرسال البريد الإلكتروني:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
};
