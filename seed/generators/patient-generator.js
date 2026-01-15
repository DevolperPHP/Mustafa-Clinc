const Patient = require('../../models/Patient');
const Course = require('../../models/Course');
const Tests = require('../../models/Tests');
const Exercise = require('../../models/Exercise');
const moment = require('moment');

const {
  generateArabicName,
  generatePhone,
  generateAddress,
  generateBirthDate,
  generateCode,
  generateDateAdded,
  generateJob,
  generateExperience,
  generateDiagnosis,
  generateHealthStatus,
  generatePsychoStatus,
  generateRelationshipStatus,
  generateStudyLevel
} = require('../utils/arabic-data');

const {
  weightedRandom,
  randomInt,
  randomItem
} = require('../utils/random-utils');

const { generateCourseEnrollment } = require('./course-generator');
const { generatePaymentHistory } = require('./balance-generator');
const scenarios = require('../data/patient-scenarios.json');

const GENDERS = ['ذكر', 'أنثى'];
const VISIT_TYPES = ['حضوري', 'أونلاين'];
const STATUS_VALUES = ['open', 'close'];

async function generatePatients(config) {
  try {
    if (config.clearExisting) {
      await Patient.deleteMany({});
      console.log('🗑️  Cleared existing patients');
    }

    const courses = await Course.find({});
    const tests = await Tests.find({});
    const exercises = await Exercise.find({});

    console.log(`👥 Generating ${config.count} patients...`);

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < config.count; i++) {
      // Select scenario based on weights
      const scenario = weightedRandom(scenarios.scenarios, 'weight');

      // Generate basic demographics
      const gender = randomItem(GENDERS);
      const name = generateArabicName(gender);
      const birthDate = generateBirthDate(18, 65); // Age 18-65
      const relationship = generateRelationshipStatus();
      const children = relationship === 'متزوج' ? randomInt(0, 8) : 0;

      const patientData = {
        name,
        birthDate,
        gender,
        phone: generatePhone(),
        address: generateAddress(),
        relationship,
        familyMembers: randomInt(1, 12),
        familyRank: randomInt(1, 8),
        health: generateHealthStatus(),
        psycho: generatePsychoStatus(),
        study: generateStudyLevel(),
        children,
        job: generateJob(),
        experince: generateExperience(),
        experince_rate: randomItem(['جيدة', 'متوسطة', 'سيئة', null]),
        doctor_diagnose: generateDiagnosis(),
        therapist_diagnose: generateDiagnosis(),
        RelationshipAndFamily: randomItem(['جيدة', 'متوسطة', 'سيئة', 'تحتاج تحسين']),
        type: randomItem(VISIT_TYPES),
        status: randomItem(STATUS_VALUES),
        statusReasons: [],
        sendTo: null,
        psychoNote: null,
        neededTest: null,
        Notes: null,
        otherNotes: [],
        code: generateCode(),
        dateAdded: generateDateAdded(),
        balance: 0,
        inCourse: false,
        course: [],
        bills: [],
        tests: [],
        exercise: [],
        purchase: [],
        discounts: []
      };

      // Apply scenario logic
      await applyScenario(patientData, scenario, courses, tests, exercises);

      // Check for duplicates and save
      const existing = await Patient.findOne({
        code: patientData.code
      });

      if (!existing) {
        await Patient.create(patientData);
        createdCount++;
        if (createdCount % 10 === 0) {
          console.log(`✅ Created ${createdCount}/${config.count} patients...`);
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`👥 Patient generation completed: ${createdCount} created, ${skippedCount} skipped (duplicates)`);
    return createdCount;
  } catch (error) {
    console.error('❌ Error generating patients:', error);
    throw error;
  }
}

async function applyScenario(patientData, scenario, courses, tests, exercises) {
  // Apply course enrollment if needed
  if (scenario.inCourse && courses.length > 0) {
    const course = randomItem(courses);
    const enrollment = generateCourseEnrollment(
      course,
      scenario.sessionsProgress
    );
    patientData.course.push(enrollment);
    patientData.inCourse = true;

    // Generate bill
    const bill = {
      code: enrollment.code,
      price: enrollment.price,
      sessions: course.sessions,
      Date: moment().locale('ar-kw').format('l'),
      paid: false,
      left: -enrollment.price
    };
    patientData.bills.push(bill);
    patientData.balance = -enrollment.price;

    // Generate payment history
    const payments = generatePaymentHistory(enrollment.price, scenario.sessionsProgress);
    patientData.purchase.push(...payments);

    // Update balance based on payments
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    patientData.balance = -enrollment.price + totalPaid;

    // Update bill paid status
    if (totalPaid >= enrollment.price) {
      bill.paid = true;
      bill.left = 0;
    } else {
      bill.left = -enrollment.price + totalPaid;
    }
  }

  // Add tests
  if (scenario.hasTests && tests.length > 0) {
    const numTests = randomInt(1, Math.min(4, tests.length));
    const selectedTests = [];
    for (let i = 0; i < numTests; i++) {
      const test = randomItem(tests);
      if (!selectedTests.includes(test.name)) {
        selectedTests.push(test.name);
        patientData.tests.push({
          test: test.name,
          Date: moment().subtract(randomInt(0, 90), 'days').locale('ar-kw').format('l')
        });
      }
    }

    // Set needed test for some patients
    if (Math.random() > 0.5 && selectedTests.length > 0) {
      patientData.neededTest = randomItem(selectedTests);
    }
  }

  // Add exercises
  if (scenario.hasExercises && exercises.length > 0) {
    const numExercises = randomInt(1, Math.min(5, exercises.length));
    const selectedExercises = [];
    for (let i = 0; i < numExercises; i++) {
      const exercise = randomItem(exercises);
      if (!selectedExercises.includes(exercise.name)) {
        selectedExercises.push(exercise.name);
        patientData.exercise.push({
          exercise: exercise.name,
          Date: moment().subtract(randomInt(0, 60), 'days').locale('ar-kw').format('l')
        });
      }
    }
  }

  // Add completed courses for relevant scenarios
  if (scenario.completedCourses && courses.length > 0) {
    const numCompleted = randomInt(1, 3);
    for (let i = 0; i < numCompleted; i++) {
      const course = randomItem(courses);
      const completed = generateCourseEnrollment(course, 'completed');
      patientData.course.push(completed);
    }
  }

  // Add status reason for closed accounts
  if (patientData.status === 'close') {
    const reasons = [
      'إكمال العلاج',
      'انتقال إلى عيادة أخرى',
      'عدم القدرة على الاستمرار مالياً',
      'ظروف شخصية',
      'تحسن الحالة'
    ];
    patientData.statusReasons.push(randomItem(reasons));
  }

  // Add psycho note for some patients
  if (Math.random() > 0.6) {
    const notes = [
      'المريض متعاون جداً',
      'يحتاج إلى متابعة مكثفة',
      'يتجاوب بشكل جيد مع العلاج',
      'يحتاج إلى دعم أسري إضافي',
      'حالة مستقرة'
    ];
    patientData.psychoNote = randomItem(notes);
  }
}

module.exports = { generatePatients };
