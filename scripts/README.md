# Backend Scripts

This directory contains utility scripts for managing the Ghost Teacher system and other backend operations.

## 📋 Available Scripts

### 1. Verify Ghost Teacher Setup
**File**: `verify-ghost-teacher.js`

Checks if the Ghost Teacher system is properly configured and working.

**Usage**:
```bash
node Backend/scripts/verify-ghost-teacher.js
```

**What it checks**:
- ✅ Ghost Teacher ID configuration
- ✅ Ghost Teacher exists in database
- ✅ Ghost Examinations count
- ✅ Student subscriptions count
- ✅ System status summary

**When to use**:
- After initial setup
- When troubleshooting issues
- To verify system health
- Before deploying to production

---

### 2. Create/Update Ghost Teacher
**File**: `create-ghost-teacher.js`

Creates a new Ghost Teacher account or updates the configuration if it already exists.

**Usage**:
```bash
node Backend/scripts/create-ghost-teacher.js
```

**What it does**:
- ✅ Checks if Ghost Teacher exists
- ✅ Creates new Ghost Teacher if missing
- ✅ Updates `config/ghostTeacher.js` with correct ID
- ✅ Displays account credentials

**When to use**:
- Initial system setup
- Config file has wrong ID
- Ghost Teacher is missing from database
- Need to reset Ghost Teacher credentials

**Ghost Teacher Credentials**:
- Email: `ghost@ghostexams.com`
- Password: `GhostTeacher@123`

---

### 3. Comprehensive Database Seeding
**File**: `comprehensive-seed.js`

Seeds the database with test data including teachers, students, exams, and Ghost Teacher.

**Usage**:
```bash
node Backend/scripts/comprehensive-seed.js
```

**What it creates**:
- Demo teachers
- Demo students
- Demo exams
- Ghost Teacher (if not exists)
- Sample subscriptions

**When to use**:
- Development environment setup
- Testing purposes
- Demo/Presentation setup

⚠️ **Warning**: Do NOT run in production! This is for development only.

---

## 🚀 Quick Start

### First Time Setup

1. **Create Ghost Teacher**:
```bash
node Backend/scripts/create-ghost-teacher.js
```

2. **Verify Setup**:
```bash
node Backend/scripts/verify-ghost-teacher.js
```

3. **Restart Backend Server**:
```bash
npm start
# or
npm run dev
```

### Troubleshooting

If you encounter issues:

1. **Run verification first**:
```bash
node Backend/scripts/verify-ghost-teacher.js
```

2. **Fix by recreating**:
```bash
node Backend/scripts/create-ghost-teacher.js
```

3. **Check output** for specific error messages

---

## 📝 Environment Requirements

All scripts require:
- ✅ MongoDB connection (via `.env` file)
- ✅ Node.js installed
- ✅ Dependencies installed (`npm install`)

**Required .env variables**:
```env
MONGODB_URI=mongodb://localhost:27017/your_database
# or
MONGO_URI=mongodb://localhost:27017/your_database
```

---

## 🔧 Script Output Examples

### Successful Verification
```
✅ Ghost Teacher is properly configured and ready!

📋 Ghost Teacher Details:
   ID: 681b9731a21339f0a1beae00
   Name: Ghost Examinations
   Email: ghost@ghostexams.com

📊 Statistics:
   Ghost Examinations: 15
   Student Subscriptions: 42
```

### Needs Configuration
```
⚠️ Ghost Teacher exists but config needs update

💡 Action Required:
   Update Backend/config/ghostTeacher.js with:
   ghostTeacherId: "681b9731a21339f0a1beae00"
```

---

## 📞 Need Help?

1. Check the main documentation: `GHOST_TEACHER_SYSTEM.md`
2. Run verification script for detailed diagnostics
3. Check backend logs for error messages
4. Ensure MongoDB is running and accessible

---

## 🔄 Maintenance

### Regular Checks (Recommended)
- Run `verify-ghost-teacher.js` weekly
- Check Ghost Examinations count
- Monitor student subscriptions
- Verify system health

### After Updates
- Run verification after code updates
- Check if Ghost Teacher ID is still correct
- Restart backend server after config changes

---

**Last Updated**: November 2024

