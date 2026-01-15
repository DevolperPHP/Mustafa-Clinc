const mongoose = require('mongoose');
const Course = require('../models/Course');
const Tests = require('../models/Tests');
const Exercise = require('../models/Exercise');
const Patient = require('../models/Patient');

const { seedCourses } = require('./generators/course-generator');
const { seedTests } = require('./generators/test-generator');
const { seedExercises } = require('./generators/exercise-generator');
const { generatePatients } = require('./generators/patient-generator');

// Parse command line arguments
const args = process.argv.slice(2);
const isFresh = args.includes('--fresh');
const patientCountArg = args.find(arg => arg.startsWith('--patients='));
const patientCount = patientCountArg ? parseInt(patientCountArg.split('=')[1]) : 50;

// Configuration
const SEED_CONFIG = {
  courses: {
    clearExisting: isFresh
  },
  tests: {
    clearExisting: isFresh
  },
  exercises: {
    clearExisting: isFresh
  },
  patients: {
    count: patientCount,
    clearExisting: isFresh
  }
};

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic';

async function seed() {
  try {
    console.log('🌱 Starting seed process for Mustafa Clinic...\n');
    console.log('📋 Configuration:');
    console.log(`   - Fresh start: ${isFresh ? 'Yes (will clear existing data)' : 'No (incremental)'}`);
    console.log(`   - Patients to create: ${patientCount}`);
    console.log(`   - Database: ${MONGODB_URI}\n`);

    // Connect to database
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Check existing data counts before seeding
    const beforeStats = {
      courses: await Course.countDocuments(),
      tests: await Tests.countDocuments(),
      exercises: await Exercise.countDocuments(),
      patients: await Patient.countDocuments()
    };

    if (isFresh) {
      console.log('🗑️  Fresh start enabled - clearing existing data...\n');
    } else {
      console.log('📊 Existing data before seeding:');
      console.log(`   - Courses: ${beforeStats.courses}`);
      console.log(`   - Tests: ${beforeStats.tests}`);
      console.log(`   - Exercises: ${beforeStats.exercises}`);
      console.log(`   - Patients: ${beforeStats.patients}\n`);
    }

    // Seed in order (respecting dependencies)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Seeding Courses');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await seedCourses(SEED_CONFIG.courses);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Seeding Tests');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await seedTests(SEED_CONFIG.tests);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Seeding Exercises');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await seedExercises(SEED_CONFIG.exercises);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Generating Patients');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await generatePatients(SEED_CONFIG.patients);
    console.log('');

    // Final statistics
    const afterStats = {
      courses: await Course.countDocuments(),
      tests: await Tests.countDocuments(),
      exercises: await Exercise.countDocuments(),
      patients: await Patient.countDocuments()
    };

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 FINAL STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Courses:   ${beforeStats.courses} → ${afterStats.courses} (+${afterStats.courses - beforeStats.courses})`);
    console.log(`   Tests:     ${beforeStats.tests} → ${afterStats.tests} (+${afterStats.tests - beforeStats.tests})`);
    console.log(`   Exercises: ${beforeStats.exercises} → ${afterStats.exercises} (+${afterStats.exercises - beforeStats.exercises})`);
    console.log(`   Patients:  ${beforeStats.patients} → ${afterStats.patients} (+${afterStats.patients - beforeStats.patients})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 Seed completed successfully!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
