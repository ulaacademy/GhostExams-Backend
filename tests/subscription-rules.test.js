/**
 * Comprehensive Test Suite for Subscription System Rules
 * 
 * This test file verifies all subscription enforcement rules:
 * 1. Dynamic package support (3+ packages)
 * 2. Free package expiration and account restriction
 * 3. Maximum students limit enforcement
 * 4. Maximum questions limit enforcement
 * 5. Maximum exams limit enforcement
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const Question = require('../models/Question');
const TeacherCustomExam = require('../models/TeacherCustomExam');
const TeacherStudentSubscription = require('../models/TeacherStudentSubscription');
const { checkExpiredSubscriptions } = require('../utils/subscriptionUtils');
const { isSubscriptionValid } = require('../middleware/usageLimits');

// Test configuration
const TEST_CONFIG = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/test-subscription',
  TIMEOUT: 30000
};

describe('Subscription System Rules Tests', () => {
  let testTeacher;
  let freePlan;
  let basicPlan;
  let premiumPlan;
  let testSubscription;

  beforeAll(async () => {
    await mongoose.connect(TEST_CONFIG.MONGO_URI);
    console.log('✅ Connected to test database');
  });

  afterAll(async () => {
    // Cleanup
    await Teacher.deleteMany({ email: /test-teacher/ });
    await Plan.deleteMany({ name: /Test Plan/ });
    await Subscription.deleteMany({});
    await Question.deleteMany({ source: 'test' });
    await TeacherCustomExam.deleteMany({});
    await TeacherStudentSubscription.deleteMany({});
    await mongoose.connection.close();
    console.log('✅ Test database cleaned and closed');
  });

  beforeEach(async () => {
    // Create test teacher
    testTeacher = await Teacher.create({
      name: 'Test Teacher',
      email: `test-teacher-${Date.now()}@test.com`,
      password: 'hashedpassword',
      role: 'teacher',
      isBanned: false,
      currentLimits: {
        maxStudents: 0,
        maxExams: 0,
        maxQuestions: 0
      },
      currentUsage: {
        studentsCount: 0,
        examsCount: 0,
        questionsCount: 0
      }
    });

    // Create test plans
    const now = new Date();
    freePlan = await Plan.create({
      name: 'Test Plan Free',
      price: 0,
      currency: 'JOD',
      maxStudents: 10,
      maxExams: 5,
      maxQuestions: 100,
      duration: 7,
      durationUnit: 'days',
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    basicPlan = await Plan.create({
      name: 'Test Plan Basic',
      price: 10,
      currency: 'JOD',
      maxStudents: 50,
      maxExams: 25,
      maxQuestions: 500,
      duration: 30,
      durationUnit: 'days',
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      isActive: true
    });

    premiumPlan = await Plan.create({
      name: 'Test Plan Premium',
      price: 19,
      currency: 'JOD',
      maxStudents: 200,
      maxExams: 100,
      maxQuestions: 2000,
      duration: 90,
      durationUnit: 'days',
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      isActive: true
    });
  });

  describe('Rule 1: Dynamic Package Support', () => {
    test('should support creating any number of packages', async () => {
      const plans = await Plan.find({ name: /Test Plan/ });
      expect(plans.length).toBeGreaterThanOrEqual(3);

      // Create a 4th plan
      const fourthPlan = await Plan.create({
        name: 'Test Plan Advanced',
        price: 29,
        currency: 'JOD',
        maxStudents: 500,
        maxExams: 250,
        maxQuestions: 5000,
        duration: 180,
        durationUnit: 'days',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true
      });

      expect(fourthPlan._id).toBeDefined();
      expect(fourthPlan.maxStudents).toBe(500);

      // Verify subscription can be created with new plan
      const subscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: fourthPlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        amount: 29,
        currency: 'JOD'
      });

      expect(subscription.planId.toString()).toBe(fourthPlan._id.toString());
    });
  });

  describe('Rule 2: Free Package Expiration', () => {
    test('should disable teacher account when free package expires', async () => {
      // Create expired free subscription
      const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // Yesterday
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: freePlan._id,
        status: 'active',
        startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        endDate: expiredDate,
        amount: 0,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.currentLimits.maxStudents = 10;
      testTeacher.currentLimits.maxExams = 5;
      testTeacher.currentLimits.maxQuestions = 100;
      await testTeacher.save();

      // Run expiration check
      const result = await checkExpiredSubscriptions();

      // Verify subscription is expired
      const updatedSubscription = await Subscription.findById(testSubscription._id);
      expect(updatedSubscription.status).toBe('expired');

      // Verify teacher limits are reset
      const updatedTeacher = await Teacher.findById(testTeacher._id);
      expect(updatedTeacher.currentLimits.maxStudents).toBe(0);
      expect(updatedTeacher.currentLimits.maxExams).toBe(0);
      expect(updatedTeacher.currentLimits.maxQuestions).toBe(0);
    });

    test('should check subscription validity correctly', async () => {
      // Active subscription
      const activeSub = await Subscription.create({
        teacherId: testTeacher._id,
        planId: basicPlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: 10,
        currency: 'JOD'
      });

      const validCheck = await isSubscriptionValid(activeSub._id);
      expect(validCheck.valid).toBe(true);

      // Expired subscription
      const expiredSub = await Subscription.create({
        teacherId: testTeacher._id,
        planId: basicPlan._id,
        status: 'active',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        amount: 10,
        currency: 'JOD'
      });

      const expiredCheck = await isSubscriptionValid(expiredSub._id);
      expect(expiredCheck.valid).toBe(false);
      expect(expiredCheck.reason).toContain('منتهي');
    });
  });

  describe('Rule 3: Maximum Students Limit', () => {
    test('should enforce maximum students limit', async () => {
      // Create active subscription with limit of 10 students
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: freePlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        amount: 0,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.updateLimitsFromPlan(freePlan);
      testTeacher.currentUsage.studentsCount = 10; // At limit
      await testTeacher.save();

      // Try to add student - should fail
      const canAdd = testTeacher.canAddStudent();
      expect(canAdd).toBe(false);

      // Verify limit message
      expect(testTeacher.currentUsage.studentsCount).toBeGreaterThanOrEqual(
        testTeacher.currentLimits.maxStudents
      );
    });

    test('should allow adding students when under limit', async () => {
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: basicPlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: 10,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.updateLimitsFromPlan(basicPlan);
      testTeacher.currentUsage.studentsCount = 25; // Under limit of 50
      await testTeacher.save();

      const canAdd = testTeacher.canAddStudent();
      expect(canAdd).toBe(true);
    });
  });

  describe('Rule 4: Maximum Questions Limit', () => {
    test('should enforce maximum questions limit', async () => {
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: freePlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        amount: 0,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.updateLimitsFromPlan(freePlan);
      testTeacher.currentUsage.questionsCount = 100; // At limit
      await testTeacher.save();

      const canAdd = testTeacher.canAddQuestion();
      expect(canAdd).toBe(false);
    });

    test('should allow creating questions when under limit', async () => {
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: premiumPlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        amount: 19,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.updateLimitsFromPlan(premiumPlan);
      testTeacher.currentUsage.questionsCount = 1000; // Under limit of 2000
      await testTeacher.save();

      const canAdd = testTeacher.canAddQuestion();
      expect(canAdd).toBe(true);
    });
  });

  describe('Rule 5: Maximum Exams Limit', () => {
    test('should enforce maximum exams limit', async () => {
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: freePlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        amount: 0,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.updateLimitsFromPlan(freePlan);
      testTeacher.currentUsage.examsCount = 5; // At limit
      await testTeacher.save();

      const canCreate = testTeacher.canCreateExam();
      expect(canCreate).toBe(false);
    });

    test('should allow creating exams when under limit', async () => {
      testSubscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: basicPlan._id,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: 10,
        currency: 'JOD'
      });

      testTeacher.subscription = testSubscription._id;
      testTeacher.updateLimitsFromPlan(basicPlan);
      testTeacher.currentUsage.examsCount = 10; // Under limit of 25
      await testTeacher.save();

      const canCreate = testTeacher.canCreateExam();
      expect(canCreate).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should block all actions when subscription is expired', async () => {
      const expiredSub = await Subscription.create({
        teacherId: testTeacher._id,
        planId: basicPlan._id,
        status: 'expired',
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        amount: 10,
        currency: 'JOD'
      });

      testTeacher.subscription = expiredSub._id;
      testTeacher.currentLimits.maxStudents = 0;
      testTeacher.currentLimits.maxExams = 0;
      testTeacher.currentLimits.maxQuestions = 0;
      await testTeacher.save();

      const validCheck = await isSubscriptionValid(expiredSub._id);
      expect(validCheck.valid).toBe(false);

      expect(testTeacher.canAddStudent()).toBe(false);
      expect(testTeacher.canCreateExam()).toBe(false);
      expect(testTeacher.canAddQuestion()).toBe(false);
    });

    test('should properly update limits when subscription is activated', async () => {
      const subscription = await Subscription.create({
        teacherId: testTeacher._id,
        planId: premiumPlan._id,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        amount: 19,
        currency: 'JOD'
      });

      testTeacher.subscription = subscription._id;
      await testTeacher.save();

      // Activate subscription
      subscription.status = 'active';
      await subscription.save();

      testTeacher.updateLimitsFromPlan(premiumPlan);
      await testTeacher.save();

      expect(testTeacher.currentLimits.maxStudents).toBe(200);
      expect(testTeacher.currentLimits.maxExams).toBe(100);
      expect(testTeacher.currentLimits.maxQuestions).toBe(2000);
    });
  });
});

console.log('✅ Subscription rules test suite loaded');
console.log('📝 Run with: npm test -- subscription-rules.test.js');

