# API Testing Examples for Subscription Rules

This document provides ready-to-use cURL commands to test all subscription enforcement rules.

## Prerequisites

1. Start your backend server
2. Get authentication tokens for:
   - A teacher account
   - An admin account
   - A student account

## Setup Variables

```bash
# Set your base URL
BASE_URL="http://localhost:5000/api"

# Set your tokens (replace with actual tokens)
TEACHER_TOKEN="your-teacher-jwt-token"
ADMIN_TOKEN="your-admin-jwt-token"
STUDENT_TOKEN="your-student-jwt-token"

# Set IDs (replace with actual IDs from your database)
TEACHER_ID="your-teacher-id"
STUDENT_ID="your-student-id"
PLAN_ID="your-plan-id"
```

---

## Rule 1: Dynamic Package Support

### Create a New Package (4th Package)

```bash
curl -X POST "$BASE_URL/plans/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "الخطة المتقدمة",
    "description": "خطة جديدة للمعلمين المحترفين",
    "price": 29,
    "currency": "JOD",
    "maxStudents": 500,
    "maxExams": 250,
    "maxQuestions": 5000,
    "duration": 180,
    "durationUnit": "days",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2025-12-31T23:59:59.999Z",
    "features": ["ميزة متقدمة 1", "ميزة متقدمة 2", "دعم 24/7"]
  }'
```

**Expected:** 201 Created with new plan data

### Get All Plans

```bash
curl -X GET "$BASE_URL/plans" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected:** List of all plans (should show 4+ if you added one)

---

## Rule 2: Free Package Expiration

### Create a Free Subscription (for testing)

```bash
curl -X POST "$BASE_URL/subscriptions/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "'$TEACHER_ID'",
    "planId": "free-plan-id-here",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-08T00:00:00.000Z",
    "amount": 0,
    "currency": "JOD"
  }'
```

### Check Subscription Status

```bash
curl -X GET "$BASE_URL/subscriptions/teacher/$TEACHER_ID/active" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### Test Action with Expired Subscription

After expiration, try any action:

```bash
curl -X POST "$BASE_URL/questions/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Test question",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "source": "teacher"
  }'
```

**Expected:** 403 Forbidden with message "الاشتراك منتهي الصلاحية"

---

## Rule 3: Maximum Students Limit

### Check Current Usage

```bash
curl -X GET "$BASE_URL/teachers/$TEACHER_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

Look for `currentUsage.studentsCount` and `currentLimits.maxStudents`

### Try to Subscribe a Student (at limit)

```bash
curl -X POST "$BASE_URL/teacher-students/subscribe" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "'$TEACHER_ID'",
    "studentId": "'$STUDENT_ID'"
  }'
```

**Expected when at limit:**
```json
{
  "success": false,
  "message": "لا يمكن إضافة المزيد من الطلاب. الحد الأقصى: 10",
  "code": "LIMIT_EXCEEDED",
  "data": {
    "currentUsage": {
      "studentsCount": 10,
      "examsCount": 0,
      "questionsCount": 0
    },
    "limits": {
      "maxStudents": 10,
      "maxExams": 5,
      "maxQuestions": 100
    }
  }
}
```

### Successfully Subscribe a Student (under limit)

Same command as above, but will succeed if `studentsCount < maxStudents`

**Expected:** 201 Created with subscription data

---

## Rule 4: Maximum Questions Limit

### Create a Question (at limit)

```bash
curl -X POST "$BASE_URL/questions/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "source": "teacher",
    "subject": "Math",
    "grade": "9",
    "term": "1",
    "unit": "Basic Operations"
  }'
```

**Expected when at limit:**
```json
{
  "success": false,
  "message": "لا يمكن إضافة المزيد من الأسئلة. الحد الأقصى: 100",
  "code": "LIMIT_EXCEEDED",
  "data": {
    "currentUsage": {
      "studentsCount": 0,
      "examsCount": 0,
      "questionsCount": 100
    },
    "limits": {
      "maxStudents": 10,
      "maxExams": 5,
      "maxQuestions": 100
    }
  }
}
```

### Successfully Create a Question (under limit)

Same command, will succeed if `questionsCount < maxQuestions`

**Expected:** 201 Created with question data

---

## Rule 5: Maximum Exams Limit

### Create a Custom Exam (at limit)

```bash
curl -X POST "$BASE_URL/exams/custom-exams/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examName": "Math Test - Chapter 1",
    "subject": "Math",
    "grade": "9",
    "term": "1",
    "duration": 60,
    "questions": [
      {
        "questionText": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correctAnswer": "4"
      },
      {
        "questionText": "What is 3 * 3?",
        "options": ["6", "9", "12", "15"],
        "correctAnswer": "9"
      }
    ]
  }'
```

**Expected when at limit:**
```json
{
  "success": false,
  "message": "لا يمكن إنشاء المزيد من الامتحانات. الحد الأقصى: 5",
  "code": "LIMIT_EXCEEDED",
  "data": {
    "currentUsage": {
      "studentsCount": 0,
      "examsCount": 5,
      "questionsCount": 0
    },
    "limits": {
      "maxStudents": 10,
      "maxExams": 5,
      "maxQuestions": 100
    }
  }
}
```

### Create a Manual Exam (at limit)

```bash
curl -X POST "$BASE_URL/teacher-manual-exams/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Science Quiz",
    "subject": "Science",
    "grade": "10",
    "term": "1",
    "duration": 45,
    "questions": [
      {
        "questionText": "What is H2O?",
        "options": ["Water", "Oxygen", "Hydrogen", "Salt"],
        "correctAnswer": "Water"
      }
    ]
  }'
```

**Expected when at limit:** Same error as above

### Successfully Create an Exam (under limit)

Same commands, will succeed if `examsCount < maxExams`

**Expected:** 201 Created with exam data

---

## Additional Test Scenarios

### Test No Subscription

First, remove teacher's subscription, then try any action:

```bash
curl -X POST "$BASE_URL/questions/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Test",
    "options": ["A", "B"],
    "correctAnswer": "A"
  }'
```

**Expected:**
```json
{
  "success": false,
  "message": "لا يوجد اشتراك نشط. يرجى الاشتراك في إحدى الباقات للاستمرار.",
  "code": "NO_SUBSCRIPTION"
}
```

### Test Banned Teacher

```bash
# First ban the teacher (admin only)
curl -X PUT "$BASE_URL/admin/teachers/$TEACHER_ID/ban" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Then try any action
curl -X POST "$BASE_URL/questions/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Test",
    "options": ["A", "B"],
    "correctAnswer": "A"
  }'
```

**Expected:**
```json
{
  "success": false,
  "message": "تم حظر حسابك. يرجى التواصل مع الدعم.",
  "code": "TEACHER_BANNED"
}
```

### Test Subscription Activation Updates Limits

```bash
# Create subscription with pending status
curl -X POST "$BASE_URL/subscriptions/create" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "'$TEACHER_ID'",
    "planId": "'$PLAN_ID'",
    "status": "pending"
  }'

# Check teacher limits (should be 0)
curl -X GET "$BASE_URL/teachers/$TEACHER_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# Activate subscription
curl -X PUT "$BASE_URL/subscriptions/activate/SUBSCRIPTION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentStatus": "paid"
  }'

# Check teacher limits again (should match plan limits)
curl -X GET "$BASE_URL/teachers/$TEACHER_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

---

## Testing Checklist

- [ ] Create a 4th package successfully
- [ ] Verify expired subscription blocks all actions
- [ ] Test student limit enforcement
- [ ] Test question limit enforcement
- [ ] Test exam limit enforcement
- [ ] Verify no subscription blocks actions
- [ ] Verify banned teacher is blocked
- [ ] Verify subscription activation updates limits
- [ ] Verify usage counters increment correctly
- [ ] Verify error messages are clear and helpful

---

## Notes

1. Replace all placeholder values (`$TEACHER_ID`, `$TOKEN`, etc.) with actual values
2. Some endpoints require admin privileges
3. Make sure your test teacher has appropriate subscription status
4. Usage counters are automatically updated - no manual intervention needed
5. All limits are enforced at the middleware level for consistency

---

## Quick Test Script

Save this as `test-subscription-rules.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:5000/api"
TEACHER_TOKEN="your-token"
TEACHER_ID="your-id"

echo "Testing subscription rules..."

# Test question creation
echo "1. Testing question creation..."
curl -X POST "$BASE_URL/questions/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "Test",
    "options": ["A", "B"],
    "correctAnswer": "A"
  }' | jq .

# Test exam creation
echo "2. Testing exam creation..."
curl -X POST "$BASE_URL/exams/custom-exams/create" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examName": "Test",
    "subject": "Math",
    "grade": "9",
    "term": "1",
    "duration": 60,
    "questions": []
  }' | jq .

echo "Tests complete!"
```

Make it executable: `chmod +x test-subscription-rules.sh`

