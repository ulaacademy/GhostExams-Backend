// Backend/scripts/create-ghost-teacher.js
// ✅ Script to manually create/verify Ghost Teacher account

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Teacher = require("../models/Teacher");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

async function createGhostTeacher() {
  try {
    console.log("🔍 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Check if Ghost Teacher already exists
    console.log("🔍 Checking if Ghost Teacher already exists...");
    let ghostTeacher = await Teacher.findOne({
      $or: [
        { name: /ghost/i },
        { email: /ghost/i },
        { name: /Ghost Examinations/i },
        { email: "ghost@ghostexams.com" }
      ]
    });

    if (ghostTeacher) {
      console.log("✅ Ghost Teacher already exists:");
      console.log("   ID:", ghostTeacher._id.toString());
      console.log("   Name:", ghostTeacher.name);
      console.log("   Email:", ghostTeacher.email);
      console.log("   Subjects:", ghostTeacher.subjects.join(", "));
      console.log("   Created:", ghostTeacher.createdAt);
    } else {
      console.log("📝 Creating new Ghost Teacher...");
      
      const defaultPassword = await bcrypt.hash("GhostTeacher@123", 10);
      
      ghostTeacher = await Teacher.create({
        name: "Ghost Examinations",
        email: "ghost@ghostexams.com",
        password: defaultPassword,
        subjects: ["جميع المواد", "All Subjects"],
        role: "teacher",
        isBanned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log("✅ Ghost Teacher created successfully:");
      console.log("   ID:", ghostTeacher._id.toString());
      console.log("   Name:", ghostTeacher.name);
      console.log("   Email:", ghostTeacher.email);
      console.log("   Password: GhostTeacher@123");
      console.log("   Subjects:", ghostTeacher.subjects.join(", "));
    }

    // Update config file
    console.log("\n📝 Updating config file...");
    const configPath = path.resolve(__dirname, "../config/ghostTeacher.js");
    const configContent = `// backend/config/ghostTeacher.js
module.exports = {
  ghostTeacherId: "${ghostTeacher._id.toString()}", // ✅ Auto-generated Ghost Teacher ID
};
`;

    fs.writeFileSync(configPath, configContent, "utf8");
    console.log("✅ Config file updated successfully");
    console.log(`   Path: ${configPath}`);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS!");
    console.log("=".repeat(60));
    console.log("\n✅ Ghost Teacher is ready to use!");
    console.log("\n📋 Ghost Teacher Details:");
    console.log(`   ID: ${ghostTeacher._id.toString()}`);
    console.log(`   Name: ${ghostTeacher.name}`);
    console.log(`   Email: ${ghostTeacher.email}`);
    console.log(`   Password: GhostTeacher@123`);
    
    console.log("\n📝 Next Steps:");
    console.log("   1. Restart your backend server to load the new config");
    console.log("   2. Admin can create Ghost Examinations through admin panel");
    console.log("   3. New students will automatically be subscribed to Ghost Teacher");
    console.log("   4. Students will see Ghost Examinations in their dashboard");
    
    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("❌ Error creating Ghost Teacher:", error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from database");
  }
}

createGhostTeacher();

