const moment = require('moment');

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Moment.js format string
 * @returns {string} Formatted date string
 */
exports.formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

/**
 * Get start and end of week
 * @param {Date|string} date - Date within the week
 * @returns {Object} Object containing start and end dates
 */
exports.getWeekBounds = (date) => {
  const momentDate = moment(date);
  return {
    start: momentDate.startOf('week').toDate(),
    end: momentDate.endOf('week').toDate()
  };
};

/**
 * Get array of days in a week
 * @param {Date|string} date - Date within the week
 * @returns {Array} Array of day objects
 */
exports.getWeekDays = (date) => {
  const start = moment(date).startOf('week');
  const days = [];

  for (let i = 0; i < 7; i++) {
    const day = moment(start).add(i, 'days');
    days.push({
      date: day.toDate(),
      dayName: day.format('dddd'),
      isToday: day.isSame(moment(), 'day'),
      dateString: day.format('YYYY-MM-DD')
    });
  }

  return days;
};

/**
 * Get time slots for a day
 * @param {number} startHour - Start hour (24-hour format)
 * @param {number} endHour - End hour (24-hour format)
 * @param {number} intervalMinutes - Interval in minutes
 * @returns {Array} Array of time slot objects
 */
exports.getTimeSlots = (startHour = 8, endHour = 18, intervalMinutes = 60) => {
  const slots = [];
  const start = moment().startOf('day').add(startHour, 'hours');
  const end = moment().startOf('day').add(endHour, 'hours');

  while (start.isBefore(end)) {
    slots.push({
      start: start.format('HH:mm'),
      end: moment(start).add(intervalMinutes, 'minutes').format('HH:mm'),
      displayTime: start.format('h:mm A')
    });
    start.add(intervalMinutes, 'minutes');
  }

  return slots;
};

/**
 * Check if a time is between two times
 * @param {string} time - Time to check (HH:mm)
 * @param {string} start - Start time (HH:mm)
 * @param {string} end - End time (HH:mm)
 * @returns {boolean} True if time is between start and end
 */
exports.isTimeBetween = (time, start, end) => {
  const momentTime = moment(time, 'HH:mm');
  const momentStart = moment(start, 'HH:mm');
  const momentEnd = moment(end, 'HH:mm');

  return momentTime.isBetween(momentStart, momentEnd, 'minute', '[]');
};

/**
 * Get relative time string
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
exports.getRelativeTime = (date) => {
  return moment(date).fromNow();
};

/**
 * Format duration between two times
 * @param {string} start - Start time (HH:mm)
 * @param {string} end - End time (HH:mm)
 * @returns {string} Formatted duration
 */
exports.formatDuration = (start, end) => {
  const duration = moment.duration(
    moment(end, 'HH:mm').diff(moment(start, 'HH:mm'))
  );
  
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  
  if (hours === 0) {
    return `${minutes} minutes`;
  }
  
  return `${hours}h ${minutes}m`;
}; 