const mongoose = require('mongoose');

/**
 * ActivityLog Schema
 * @typedef {Object} ActivityLog
 * @property {ObjectId} userId - Reference to the student or admin
 * @property {string} userType - Type of user (student/admin)
 * @property {string} action - Type of action performed
 * @property {string} entityType - Type of entity affected
 * @property {ObjectId} entityId - Reference to the affected entity
 * @property {Object} details - Additional details about the action
 * @property {Object} location - Location data when action was performed
 * @property {Date} createdAt - Action timestamp
 */
const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'userType'
  },
  userType: {
    type: String,
    required: true,
    enum: ['Student', 'Admin']
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'password_change', 'view']
  },
  entityType: {
    type: String,
    required: true,
    enum: ['Student', 'System']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.entityType !== 'System';
    }
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  location: {
    ip: String,
    city: String,
    country: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }
}, {
  timestamps: true
});

/**
 * Indexes for efficient querying and filtering
 */
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, entityType: 1 });
activityLogSchema.index({ createdAt: -1 });

/**
 * Static method to log an activity
 * @param {Object} data - Activity data
 * @returns {Promise<ActivityLog>} Created activity log
 */
activityLogSchema.statics.logActivity = async function(data) {
  return this.create({
    userId: data.userId,
    userType: data.userType,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    details: data.details || {},
    location: data.location || {}
  });
};

/**
 * Static method to get user activity summary
 * @param {ObjectId} userId - User ID
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Promise<Object>} Activity summary
 */
activityLogSchema.statics.getUserActivitySummary = async function(userId, startDate, endDate) {
  const match = {
    userId,
    ...(startDate && endDate ? {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    } : {})
  };

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          action: '$action',
          entityType: '$entityType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.entityType',
        actions: {
          $push: {
            action: '$_id.action',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog; 