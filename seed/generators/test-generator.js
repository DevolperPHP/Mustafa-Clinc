const Tests = require('../../models/Tests');
const testsData = require('../data/tests.json');

async function seedTests(config) {
  try {
    if (config.clearExisting) {
      await Tests.deleteMany({});
      console.log('🗑️  Cleared existing tests');
    }

    let createdCount = 0;
    for (const testData of testsData.tests) {
      const existing = await Tests.findOne({ name: testData.name });

      if (!existing) {
        await Tests.create({
          name: testData.name,
          sortDate: new Date(),
          patients: []
        });
        console.log(`✅ Created test: ${testData.name}`);
        createdCount++;
      }
    }

    const count = await Tests.countDocuments();
    console.log(`📊 Total tests in database: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Error seeding tests:', error);
    throw error;
  }
}

module.exports = { seedTests };
