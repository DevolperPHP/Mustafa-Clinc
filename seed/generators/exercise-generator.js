const Exercise = require('../../models/Exercise');
const exercisesData = require('../data/exercises.json');
const moment = require('moment');

async function seedExercises(config) {
  try {
    if (config.clearExisting) {
      await Exercise.deleteMany({});
      console.log('🗑️  Cleared existing exercises');
    }

    let createdCount = 0;
    for (const exerciseData of exercisesData.exercises) {
      const existing = await Exercise.findOne({ name: exerciseData.name });

      if (!existing) {
        await Exercise.create({
          name: exerciseData.name,
          Date: moment().locale('ar-kw').format('l')
        });
        console.log(`✅ Created exercise: ${exerciseData.name}`);
        createdCount++;
      }
    }

    const count = await Exercise.countDocuments();
    console.log(`📊 Total exercises in database: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    throw error;
  }
}

module.exports = { seedExercises };
