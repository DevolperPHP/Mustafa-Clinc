const Course = require('../../models/Course');
const coursesData = require('../data/courses.json');
const moment = require('moment');

async function seedCourses(config) {
  try {
    if (config.clearExisting) {
      await Course.deleteMany({});
      console.log('🗑️  Cleared existing courses');
    }

    let createdCount = 0;
    for (const courseData of coursesData.courses) {
      const existing = await Course.findOne({
        sessions: courseData.sessions
      });

      if (!existing) {
        await Course.create(courseData);
        console.log(`✅ Created course: ${courseData.sessions} sessions - KD ${courseData.price}`);
        createdCount++;
      }
    }

    const count = await Course.countDocuments();
    console.log(`📊 Total courses in database: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    throw error;
  }
}

function generateSessionNote() {
  const notes = [
    'تحسن ملحوظ في الحالة المزاجية',
    'استجابة جيدة للعلاج السلوكي',
    'تم مناقشة استراتيجيات التعامل مع التوتر',
    'واجب منزلي: تمارين الاسترخاء اليومية',
    'تحقيق الأهداف العلاجية الأسبوعية',
    'حضور منتظم ومشاركة فعالة',
    'استمرار في التحسن',
    'مناقشة التحديات اليومية',
    'تطبيق تقنيات الاسترخاء',
    'مراجعة التقدم العلاجي'
  ];
  return notes[Math.floor(Math.random() * notes.length)];
}

function generateCourseEnrollment(course, progressType) {
  const code = Math.floor(1000000000 + Math.random() * 9000000000);
  const sessions = {};

  let sessionsDone;
  switch (progressType) {
    case 'early':
      sessionsDone = Math.floor(Math.random() * 3) + 1;
      break;
    case 'mid':
      sessionsDone = Math.floor(course.sessions * (0.3 + Math.random() * 0.4));
      break;
    case 'late':
      sessionsDone = Math.floor(course.sessions * (0.8 + Math.random() * 0.2));
      break;
    case 'completed':
      sessionsDone = course.sessions;
      break;
    default:
      sessionsDone = 0;
  }

  // Generate session objects
  for (let i = 0; i < course.sessions; i++) {
    const isDone = i < sessionsDone;
    let date = null;
    let note = null;

    if (isDone) {
      const daysAgo = (sessionsDone - i - 1) * 7 + Math.floor(Math.random() * 5);
      date = moment().subtract(daysAgo, 'days').locale('ar-kw').format('l');
      note = Math.random() > 0.7 ? generateSessionNote() : null;
    }

    sessions[`Object${i}`] = {
      session: i + 1,
      Date: date,
      Note: note,
      Done: isDone
    };
  }

  const isCompleted = progressType === 'completed';

  return {
    sessions,
    end: isCompleted,
    price: course.price,
    Date: moment().subtract(sessionsDone * 7, 'days').locale('ar-kw').format('l'),
    endDate: isCompleted ? moment().locale('ar-kw').format('l') : null,
    code
  };
}

module.exports = {
  seedCourses,
  generateCourseEnrollment
};
