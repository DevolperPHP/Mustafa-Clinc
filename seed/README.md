# Seed Data System for Mustafa Clinic

This directory contains the seed data system for populating the Mustafa Clinic Management System with test data.

## Overview

The seed system generates realistic Arabic test data for:
- **Courses**: Therapy courses with different session counts and pricing
- **Patients**: 50+ diverse patient scenarios with courses, sessions, and payment history
- **Tests**: Psychological tests library
- **Exercises**: Therapeutic exercises library

## Directory Structure

```
seed/
├── data/                      # Raw seed data files
│   ├── courses.json          # Course configurations
│   ├── tests.json            # Psychological tests library
│   ├── exercises.json        # Therapeutic exercises library
│   ├── arabic-names.json     # Arabic first/last names
│   ├── kuwait-locations.json # Kuwaiti cities/areas
│   └── patient-scenarios.json # Patient archetypes
├── generators/               # Data generation modules
│   ├── course-generator.js   # Course seeding & enrollment
│   ├── test-generator.js     # Test seeding
│   ├── exercise-generator.js # Exercise seeding
│   ├── balance-generator.js  # Payment history generation
│   └── patient-generator.js  # Patient generation logic
├── utils/                    # Utility functions
│   ├── arabic-data.js        # Arabic names, dates, phone utilities
│   └── random-utils.js       # Weighted random selection
├── seed.js                   # Main seed script
└── README.md                 # This file
```

## Usage

### Basic Usage

Run the seed script from the project root:

```bash
npm run seed
```

This will:
- Add courses, tests, and exercises if they don't exist
- Generate 50 patients with diverse scenarios
- Preserve existing data (idempotent)

### Fresh Start

To clear all existing data and start fresh:

```bash
npm run seed:fresh
```

### Custom Patient Count

Generate a specific number of patients:

```bash
node seed/seed.js --patients=100
```

### Combined Options

Clear data and generate 75 patients:

```bash
node seed/seed.js --fresh --patients=75
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--fresh` | Clear existing data before seeding | false |
| `--patients=N` | Generate N patients | 50 |

## Patient Scenarios

The seed system creates patients with different scenarios:

| Scenario | Weight | Description |
|----------|--------|-------------|
| `new_patient` | 30% | New patient, no course yet |
| `active_course_start` | 25% | Active course, 0-3 sessions done |
| `active_course_mid` | 20% | Active course, 30-70% sessions done |
| `completing_course` | 15% | Almost done with course (80-100%) |
| `completed_course` | 10% | Completed course, may start new one |

## Data Generated

### Courses
- 10 sessions - KD 150
- 15 sessions - KD 200
- 20 sessions - KD 250

### Tests (8)
- مقياس وكسلر لذكاء البالغين (WAIS)
- اختبار شخصية مينيسوتا (MMPI)
- مقياس بيك للاكتئاب (BDI)
- مقياس القلق ليبوتسكي (LSAS)
- مقياس فرط الحركة وتشتت الانتباه (ADHD)
- مقياس الوسواس القهري (OCI-R)
- مقياس تقدير الذات (RSES)
- اختبار الرسم التلقائي (DAP)

### Exercises (8)
- تمارين الاسترخاء العميق
- تمارين التنفس الموجه
- كتابة اليوميات النفسية
- تمارين التخيل الموجه
- تمارين إدارة الغضب
- تمارين التعديل المعرفي
- تمارين التعرض التدريجي
- تمارين اليقظة الذهنية

### Patient Data

Each patient includes:
- **Demographics**: Name, birth date, gender, phone, address
- **Family**: Relationship status, family size, rank, children
- **Medical**: Health status, psychological status, diagnoses
- **Treatment**: Tests, exercises, courses, session notes
- **Financial**: Balance, bills, purchase history, discounts
- **Admin**: Account status, visit type, patient code, registration date

## Customization

### Adding New Courses

Edit `seed/data/courses.json`:

```json
{
  "courses": [
    {
      "sessions": 12,
      "price": 180,
      "name": "كورس 12 جلسة"
    }
  ]
}
```

### Adding New Tests

Edit `seed/data/tests.json`:

```json
{
  "tests": [
    {
      "name": "اسم الاختبار الجديد",
      "abbreviation": "XXX",
      "category": "فئة"
    }
  ]
}
```

### Adding New Exercises

Edit `seed/data/exercises.json`:

```json
{
  "exercises": [
    {
      "name": "اسم التمرين الجديد",
      "category": "فئة"
    }
  ]
}
```

### Adding Arabic Names

Edit `seed/data/arabic-names.json` to add more first names or last names.

## Troubleshooting

### Database Connection Error

Make sure MongoDB is running:
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or check if running
ps aux | grep mongod
```

### Duplicate Data

The seed system is idempotent - it checks for existing records before inserting. If you want to start fresh, use the `--fresh` flag.

### Arabic Text Display Issues

Make sure your terminal supports UTF-8 encoding. Most modern terminals do by default.

## Development

### Adding New Generator Modules

1. Create a new file in `seed/generators/`
2. Export an async function that accepts a config object
3. Import and call it from `seed/seed.js`

### Adding New Utility Functions

1. Create a new file in `seed/utils/` or add to existing files
2. Export functions to be used by generators
3. Import in the generators that need them

## Database Models

The seed system uses these models:
- [`models/Patient.js`](../models/Patient.js) - Patient schema
- [`models/Course.js`](../models/Course.js) - Course schema
- [`models/Tests.js`](../models/Tests.js) - Tests schema
- [`models/Exercise.js`](../models/Exercise.js) - Exercise schema

## License

Part of the Mustafa Clinic Management System.
