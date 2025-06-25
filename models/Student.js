const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Student Schema
 * @typedef {Object} Student
 * @property {string} studentId - Unique student ID
 * @property {string} name - Student's full name
 * @property {string} email - Student's email address
 * @property {string} password - Hashed password
 * @property {string} school - School name (e.g., PSCS)
 * @property {string} department - Department name (e.g., CSE)
 * @property {string} program - Program name (e.g., CCE, CSE, ISE)
 * @property {number} batch - Academic batch year
 * @property {boolean} isFirstLogin - Whether this is the student's first login
 * @property {Array} courses - Array of courses with schedule
 */
const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  program: {
    type: String,
    required: true
  },
  batch: {
    type: Number,
    required: true
  },
  school: {
    type: String,
    required: true,
    default: 'School of Engineering'
  },
  courses: [{
    courseCode: {
      type: String,
      required: true
    },
    courseName: {
      type: String,
      required: true
    },
    batchCourseCode: String,
    faculty: String,
    venue: String,
    schedule: {
      Monday: [Number],
      Tuesday: [Number],
      Wednesday: [Number],
      Thursday: [Number],
      Friday: [Number]
    }
  }],
  isFirstLogin: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLoginLocation: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Drop old indexes
studentSchema.index({ rollNo: 1 }, { unique: true, sparse: true });

// Update timestamp on save
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving
studentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Check if the password is already hashed (bcrypt hashes start with '$2a$', '$2b$', or '$2y$')
    if (this.password.match(/^\$2[aby]\$\d+\$/)) {
      return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Helper method for validating student's password
studentSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Helper method for updating login info
studentSchema.methods.updateLoginInfo = async function(location) {
  this.lastLoginAt = new Date();
  this.lastLoginLocation = location;
  return this.save();
};

module.exports = mongoose.model('Student', studentSchema); 