const PERIODS = {
  1: { start: '09:00 AM', end: '09:50 AM' },
  2: { start: '10:00 AM', end: '10:50 AM' },
  3: { start: '11:00 AM', end: '11:50 AM' },
  4: { start: '12:00 PM', end: '12:50 PM' },
  5: { start: '02:00 PM', end: '02:50 PM' },
  6: { start: '03:00 PM', end: '03:50 PM' },
  7: { start: '04:00 PM', end: '04:50 PM' },
  8: { start: '05:00 PM', end: '05:50 PM' }
};


const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEK_DAYS = ['Sunday', ...DAYS, 'Saturday'];


/**
 * Get day name from date object
 * @param {Date} date - Date object
 * @returns {string} Day name
 */
const getDayName = (date) => WEEK_DAYS[date.getDay()];

/**
 * Get next working day
 * @param {string} currentDay - Current day name
 * @returns {string} Next day name
 */
const getNextDay = (currentDay) => {
  const currentIndex = DAYS.indexOf(currentDay);
  return DAYS[(currentIndex + 1) % 5];
};

/**
 * Get previous working day
 * @param {string} currentDay - Current day name
 * @returns {string} Previous day name
 */
const getPreviousDay = (currentDay) => {
  const currentIndex = DAYS.indexOf(currentDay);
  return DAYS[(currentIndex - 1 + 5) % 5];
};

/**
 * Transform student courses into daily schedule
 * @param {Array} courses - Array of course objects
 * @param {string} day - Day name
 * @returns {Array} Array of schedule slots
 */
const transformCoursesToSchedule = (courses, day) => {
  const daySchedule = [];
  
  courses.forEach(course => {
    const periods = course.schedule[day];
    periods.forEach(period => {
      daySchedule.push({
        period,
        courseCode: course.courseCode,
        courseName: course.courseName,
        faculty: course.faculty,
        venue: course.venue,
        time: PERIODS[period]
      });
    });
  });

  return daySchedule.sort((a, b) => a.period - b.period);
};

/**
 * Create full schedule with empty slots
 * @param {Array} daySchedule - Array of scheduled periods
 * @returns {Array} Complete schedule with empty slots
 */
const createFullSchedule = (daySchedule) => {
  const fullSchedule = [];
  
  for (let i = 1; i <= 8; i++) {
    const existingClass = daySchedule.find(c => c.period === i);
    if (existingClass) {
      fullSchedule.push(existingClass);
    } else {
      fullSchedule.push({
        period: i,
        isEmpty: true,
        time: PERIODS[i]
      });
    }
  }

  return fullSchedule;
};

/**
 * Get current working day
 * @param {string} [queryDay] - Optional day from query
 * @returns {string} Working day name
 */
const getCurrentWorkingDay = (queryDay) => {
  const today = new Date();
  let currentDay = queryDay || getDayName(today);
  
  // If it's weekend, show Monday's timetable
  if (currentDay === 'Sunday' || currentDay === 'Saturday') {
    currentDay = 'Monday';
  }

  return currentDay;
};

module.exports = {
  PERIODS,
  DAYS,
  WEEK_DAYS,
  getDayName,
  getNextDay,
  getPreviousDay,
  transformCoursesToSchedule,
  createFullSchedule,
  getCurrentWorkingDay
}; 