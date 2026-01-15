const moment = require('moment');
const names = require('../data/arabic-names.json');
const locations = require('../data/kuwait-locations.json');

function generateArabicName(gender) {
  const firstNames = gender === 'ذكر'
    ? names.firstNames.male
    : names.firstNames.female;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = names.lastNames[Math.floor(Math.random() * names.lastNames.length)];
  return `${firstName} ${lastName}`;
}

function generatePhone() {
  // Kuwait phone format: +965 XXXX XXXX
  const prefixes = [
    '9000', '9001', '9002', '9003', '9004', '9005', '9006', '9007', '9008', '9009',
    '9100', '9101', '9102', '9103', '9104', '9105', '9106', '9107', '9108', '9109',
    '9300', '9301', '9302', '9303', '9304', '9305', '9306', '9307', '9308', '9309',
    '9400', '9401', '9402', '9403', '9404', '9405', '9406', '9407', '9408', '9409',
    '9500', '9501', '9502', '9503', '9504', '9505', '9506', '9507', '9508', '9509',
    '9600', '9601', '9602', '9603', '9604', '9605', '9606', '9607', '9608', '9609',
    '9700', '9701', '9702', '9703', '9704', '9705', '9706', '9707', '9708', '9709',
    '9800', '9801', '9802', '9803', '9804', '9805', '9806', '9807', '9808', '9809',
    '9900', '9901', '9902', '9903', '9904', '9905', '9906', '9907', '9908', '9909',
    '5000', '5001', '5002', '5003', '5004', '5005', '5006', '5007', '5008', '5009',
    '5100', '5101', '5102', '5103', '5104', '5105', '5106', '5107', '5108', '5109',
    '5200', '5201', '5202', '5203', '5204', '5205', '5206', '5207', '5208', '5209',
    '5500', '5501', '5502', '5503', '5504', '5505', '5506', '5507', '5508', '5509',
    '6000', '6001', '6002', '6003', '6004', '6005', '6006', '6007', '6008', '6009',
    '6100', '6101', '6102', '6103', '6104', '6105', '6106', '6107', '6108', '6109',
    '6200', '6201', '6202', '6203', '6204', '6205', '6206', '6207', '6208', '6209',
    '6500', '6501', '6502', '6503', '6504', '6505', '6506', '6507', '6508', '6509',
    '6600', '6601', '6602', '6603', '6604', '6605', '6606', '6607', '6608', '6609',
    '6700', '6701', '6702', '6703', '6704', '6705', '6706', '6707', '6708', '6709'
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix.substring(0, 4)} ${suffix}`;
}

function generateAddress() {
  const city = locations.cities[Math.floor(Math.random() * locations.cities.length)];
  const area = locations.areas[Math.floor(Math.random() * locations.areas.length)];
  return `${area}، ${city}`;
}

function generateBirthDate(minAge, maxAge) {
  const today = new Date();
  const year = today.getFullYear() - Math.floor(Math.random() * (maxAge - minAge + 1)) - minAge;
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateCode() {
  return Math.floor(1000000000 + Math.random() * 9000000000);
}

function generateDateAdded() {
  const daysAgo = Math.floor(Math.random() * 730); // Up to 2 years ago
  return moment().subtract(daysAgo, 'days').locale('ar-kw').format('l');
}

function generateJob() {
  const jobs = [
    'مهندس', 'طبيب', 'معلم', 'موظف حكومي', 'موظف خاص',
    'تاجر', 'طالب', 'ربة منزل', 'محاسب', 'مبرمج',
    'أكاديمي', 'محامي', 'صيدلي', 'فني', 'استشاري'
  ];
  return jobs[Math.floor(Math.random() * jobs.length)];
}

function generateExperience() {
  const experiences = [
    'خبرة إيجابية سابقة', 'خبرة سلبية سابقة',
    'لا توجد خبرة سابقة', 'تجربة مع عيادات أخرى',
    'علاج سابق مع أخصائيين آخرين'
  ];
  return experiences[Math.floor(Math.random() * experiences.length)];
}

function generateDiagnosis() {
  const diagnoses = [
    'اضطراب القلق العام', 'الاكتئاب الشديد', 'اضطراب الوسواس القهري',
    'اضطراب ما بعد الصدمة', 'القلق الاجتماعي', 'نوبات الهلع',
    'الاضطراب ثنائي القطب', 'اضطراب الشخصية الحدية',
    'اضطراب الشخصية التجنبية', 'الاكتئاب المزدوج',
    'اضطراب التكيف', 'الإدمان على المواد', null
  ];
  return diagnoses[Math.floor(Math.random() * diagnoses.length)];
}

function generateHealthStatus() {
  const statuses = ['جيدة', 'مزمنة', 'تحت المراقبة', 'حرجة'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generatePsychoStatus() {
  const statuses = ['مستقرة', 'تحت العلاج', 'تحت الملاحظة', 'حرجة'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateRelationshipStatus() {
  const statuses = ['أعزب', 'متزوج', 'مطلق', 'أرمل'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateStudyLevel() {
  const levels = ['ثانوية', 'دبلوم', 'بكالوريوس', 'ماجستير', 'دكتوراه'];
  return levels[Math.floor(Math.random() * levels.length)];
}

module.exports = {
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
};
