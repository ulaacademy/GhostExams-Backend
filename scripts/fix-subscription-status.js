require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');

/**
 * Script to fix subscriptions with null or missing status
 * This sets them to 'pending' (the default value)
 */

async function fixSubscriptionStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find subscriptions with null or missing status
    const subscriptionsToFix = await Subscription.find({
      $or: [
        { status: null },
        { status: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${subscriptionsToFix.length} subscriptions with null/missing status`);

    if (subscriptionsToFix.length === 0) {
      console.log('✅ All subscriptions have valid status!');
      process.exit(0);
    }

    // Update each subscription
    let updatedCount = 0;
    for (const sub of subscriptionsToFix) {
      // Set status to 'pending' if it's null or missing
      sub.status = 'pending';
      await sub.save();
      updatedCount++;
      console.log(`✓ Updated subscription ${sub._id} to status: pending`);
    }

    console.log(`\n✅ Successfully updated ${updatedCount} subscriptions!`);
    console.log('All subscriptions now have valid status.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing subscription status:', error);
    process.exit(1);
  }
}

// Run the script
fixSubscriptionStatus();

