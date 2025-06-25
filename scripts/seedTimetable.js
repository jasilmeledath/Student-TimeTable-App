// seedTimetable.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');
const Student = require('../models/Student');

const processPeriods = (periodStr) => {
  if (!periodStr) return [];
  if (typeof periodStr === 'number') return [periodStr];
  return periodStr.split(',').map(p => parseInt(p.trim()));
};

const cleanJSONString = (str) => {
  // Replace NaN, undefined, and empty strings with null
  return str
    .replace(/:\s*NaN\s*([,}])/g, ': null$1')
    .replace(/:\s*undefined\s*([,}])/g, ': null$1')
    .replace(/:\s*"NaN"\s*([,}])/g, ': null$1')
    .replace(/:\s*"undefined"\s*([,}])/g, ': null$1')
    .replace(/:\s*""\s*([,}])/g, ': null$1');
};

const loadJSONFile = (filePath) => {
  try {
    // Use path.resolve to get the correct absolute path
    const absolutePath = path.resolve(__dirname, '..', filePath);
    const rawData = fs.readFileSync(absolutePath, 'utf8');
    const cleanedData = cleanJSONString(rawData);
    return JSON.parse(cleanedData);
  } catch (error) {
    logger.error(`Error reading ${filePath}:`, error);
    throw error;
  }
};

const processStudentData = (studentsData, timetableData) => {
  // Group student data by studentId
  const studentMap = studentsData.reduce((acc, record) => {
    const studentId = record['Student ID'];
    if (!studentId) return acc; // Skip records without student ID
    
    if (!acc[studentId]) {
      acc[studentId] = {
        studentId: studentId,
        name: record['Student Name'] || 'Unknown Student',
        department: record['Dept.'] || 'Unknown',
        program: record['Program'] || 'Unknown',
        batch: parseInt(record['Batch']) || new Date().getFullYear(),
        school: 'School of Engineering',
        courses: []
      };
    }
    
    // Find timetable entry for this course
    const courseCode = record['Course Code'];
    if (!courseCode) return acc; // Skip records without course code

    const timetableEntry = timetableData.find(t => 
      t.course_code === courseCode || 
      t.batch_course_code === courseCode
    );

    if (timetableEntry) {
      acc[studentId].courses.push({
        courseCode: courseCode,
        courseName: record['Course Name'] || 'Unknown Course',
        batchCourseCode: timetableEntry.batch_course_code || courseCode,
        faculty: timetableEntry.faculty || 'TBD',
        venue: timetableEntry.venue || 'TBD',
        schedule: {
          Monday: processPeriods(timetableEntry.Monday),
          Tuesday: processPeriods(timetableEntry.Tuesday),
          Wednesday: processPeriods(timetableEntry.Wednesday),
          Thursday: processPeriods(timetableEntry.Thursday),
          Friday: processPeriods(timetableEntry.Friday)
        }
      });
    }

    return acc;
  }, {});

  return Object.values(studentMap);
};

const clearDatabase = async () => {
  try {
    // Get list of all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Drop each collection
    for (const collection of collections) {
      try {
        await mongoose.connection.db.dropCollection(collection.name);
        logger.info(`Dropped collection: ${collection.name}`);
      } catch (err) {
        logger.warn(`Error dropping collection ${collection.name}:`, err.message);
      }
    }

    // Create fresh students collection
    await Student.createCollection();
    logger.info('Created fresh students collection');

    // Create necessary indexes
    await Student.createIndexes();
    logger.info('Created indexes on students collection');

  } catch (error) {
    logger.error('Error clearing database:', error);
    throw error;
  }
};

const seed = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Clear database and setup fresh collections
    await clearDatabase();

    // Load and process data
    const studentsData = loadJSONFile('data/students_courses_data.json');
    const timetableData = loadJSONFile('data/timetable_output.json');
    
    // Process and transform the data
    const processedData = processStudentData(studentsData, timetableData);

    // Hash default password for students
    const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || 'passme@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Add password to each student
    const studentsToInsert = processedData.map(student => ({
      ...student,
      password: hashedPassword,
      isFirstLogin: true
    }));

    // Insert new data in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < studentsToInsert.length; i += batchSize) {
      const batch = studentsToInsert.slice(i, i + batchSize);
      await Student.insertMany(batch);
      logger.info(`Seeded students ${i + 1} to ${Math.min(i + batchSize, studentsToInsert.length)}`);
    }
    logger.info(`Total students seeded: ${studentsToInsert.length}`);

    // Cleanup
    await mongoose.disconnect();
    logger.info('Database seeding completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Error seeding database:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Run the seeder
seed();
