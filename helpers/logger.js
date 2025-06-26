/**
 * Application Logging Configuration Module
 * Configures Winston logger for application-wide logging with
 * file rotation, error tracking, and development console output
 * @module helpers/logger
 */

const winston = require('winston');
const path = require('path');

/**
 * Custom log format configuration
 * Includes timestamp, error stacks, and JSON formatting
 */
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

/**
 * Ensure logs directory exists
 * Creates directory if not present
 */
const logsDir = path.join(__dirname, '../logs');
require('fs').mkdirSync(logsDir, { recursive: true });

/**
 * Winston logger instance configuration
 * Sets up multiple transports for different log levels
 * Implements log rotation and size limits
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'student-timetable' },
    transports: [
        // Error log configuration - captures error level and below
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined log configuration - captures all log levels
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

/**
 * Development environment configuration
 * Adds console transport with colorization in non-production environments
 */
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

/**
 * Morgan integration stream
 * Allows Morgan HTTP logger to use Winston for output
 */
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger; 