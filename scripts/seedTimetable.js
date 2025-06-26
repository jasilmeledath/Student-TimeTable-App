/**
 * Timetable Database Seeding Script
 * Populates the database with student and course data from JSON files
 * Handles data transformation, validation, and batch processing
 * @module scripts/seedTimetable
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');
const Student = require('../models/Student');

/**
 * Converts period string to array of integers
 * Handles various input formats: single numbers, comma-separated lists
 * 
 * @param {string|number} periodStr - Period string to process
 * @returns {number[]} Array of period numbers
 */
const processPeriods = (periodStr) => {
  if (!periodStr) return [];
  if (typeof periodStr === 'number') return [periodStr];
  return periodStr.split(',').map(p => parseInt(p.trim()));
};

/**
 * Sanitizes JSON string by replacing invalid values
 * Converts NaN, undefined, and empty strings to null
 * 
 * @param {string} str - JSON string to clean
 * @returns {string} Sanitized JSON string
 */
const cleanJSONString = (str) => {
  return str
    .replace(/:\s*NaN\s*([,}])/g, ': null$1')
    .replace(/:\s*undefined\s*([,}])/g, ': null$1')
    .replace(/:\s*"NaN"\s*([,}])/g, ': null$1')
    .replace(/:\s*"undefined"\s*([,}])/g, ': null$1')
    .replace(/:\s*""\s*([,}])/g, ': null$1');
};

/**
 * Loads and parses JSON file with error handling
 * 
 * @param {string} filePath - Path to JSON file relative to project root
 * @returns {Object} Parsed JSON data
 * @throws {Error} If file reading or parsing fails
 */
const loadJSONFile = (filePath) => {
  try {
    const absolutePath = path.resolve(__dirname, '..', filePath);
    const rawData = fs.readFileSync(absolutePath, 'utf8');
    const cleanedData = cleanJSONString(rawData);
    return JSON.parse(cleanedData);
  } catch (error) {
    logger.error(`Error reading ${filePath}:`, error);
    throw error;
  }
};

/**
 * Finds matching timetable entry for a course code
 * Supports exact matches and combined course codes
 * 
 * @param {string} courseCode - Course code to find
 * @param {Array} timetableData - Array of timetable entries
 * @returns {Object|undefined} Matching timetable entry or undefined
 */
const findTimetableEntry = (courseCode, timetableData) => {
  // Try exact match first
  let entry = timetableData.find(t => 
    t.course_code === courseCode || 
    t.batch_course_code === courseCode
  );

  if (!entry) {
    // Try matching with combined courses (e.g., "CS101 + CS102")
    entry = timetableData.find(t => {
      const combinedCodes = [
        t.course_code.split('+').map(c => c.trim()),
        t.course_code.split(' + ').map(c => c.trim()),
        t.batch_course_code.split('+').map(c => c.trim()),
        t.batch_course_code.split(' + ').map(c => c.trim())
      ].flat();
      return combinedCodes.includes(courseCode);
    });
  }

  return entry;
};

/**
 * Processes raw student data and merges with timetable information
 * Groups courses by student and adds schedule information
 * 
 * @param {Array} studentsData - Raw student enrollment data
 * @param {Array} timetableData - Course timetable data
 * @returns {Array} Processed student records with course schedules
 */
const processStudentData = (studentsData, timetableData) => {
  // Group student data by studentId
  const studentMap = studentsData.reduce((acc, record) => {
    const studentId = record['Student ID'];
    if (!studentId) return acc; // Skip invalid records

    // Initialize student record if not exists
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
    
    // Process course information
    const courseCode = record['Course Code'];
    if (!courseCode) return acc;

    const timetableEntry = findTimetableEntry(courseCode, timetableData);

    if (timetableEntry) {
      // Avoid duplicate course entries
      const courseExists = acc[studentId].courses.some(c => c.courseCode === courseCode);
      if (!courseExists) {
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
    } else {
      logger.warn(`No timetable entry found for course: ${courseCode}`);
    }

    return acc;
  }, {});

  return Object.values(studentMap);
};

/**
 * Clears existing database and sets up fresh collections
 * Drops all collections and recreates necessary indexes
 * 
 * @async
 * @throws {Error} If database operations fail
 */
const clearDatabase = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Drop existing collections
    for (const collection of collections) {
      try {
        await mongoose.connection.db.dropCollection(collection.name);
        logger.info(`Dropped collection: ${collection.name}`);
      } catch (err) {
        logger.warn(`Error dropping collection ${collection.name}:`, err.message);
      }
    }

    // Initialize fresh students collection
    await Student.createCollection();
    logger.info('Created fresh students collection');

    await Student.createIndexes();
    logger.info('Created indexes on students collection');

  } catch (error) {
    logger.error('Error clearing database:', error);
    throw error;
  }
};

/**
 * Main seeding function
 * Orchestrates the complete database seeding process:
 * 1. Connects to MongoDB
 * 2. Clears existing data
 * 3. Loads and processes new data
 * 4. Inserts processed data in batches
 * 
 * @async
 * @throws {Error} If seeding process fails
 */
const seed = async () => {
  try {
    // Initialize database connection
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    await clearDatabase();

    // Load source data files
    const studentsData = loadJSONFile('data/students_courses_data.json');
    const timetableData = loadJSONFile('data/timetable_output.json');
    
    // Transform data for database insertion
    const processedData = processStudentData(studentsData, timetableData);

    // Add default credentials
    const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || 'passme@123';
    const studentsToInsert = processedData.map(student => ({
      ...student,
      password: defaultPassword,
      isFirstLogin: true
    }));

    // Batch insert records
    const batchSize = 100;
    for (let i = 0; i < studentsToInsert.length; i += batchSize) {
      const batch = studentsToInsert.slice(i, i + batchSize);
      await Promise.all(batch.map(student => Student.create(student)));
      logger.info(`Seeded students ${i + 1} to ${Math.min(i + batchSize, studentsToInsert.length)}`);
    }
    logger.info(`Total students seeded: ${studentsToInsert.length}`);

    // Cleanup and exit
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

// Execute seeding process
seed();
