const mongoose = require('mongoose');

const resumeRefreshmentSchema = new mongoose.Schema({
  // Basic contact info (from email context)
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  applicantName: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },

  // Form fields from AMP email
  sameCompany: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  
  skills: [{
    type: String,
    trim: true,
    enum: [
      'React',
      'Node.js', 
      'MongoDB',
      'Big Data',
      'Docker',
      'Kubernetes',
      'Python',
      'Data Engineering'
    ]
  }],
  
  currentRole: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0,
    max: 50
  },
  
  relevantInfo: {
    type: String,
    trim: true,
    maxlength: 1200
  },

  // Metadata
  submissionMetadata: {
    userAgent: String,
    ipAddress: String,
    submissionSource: {
      type: String,
      enum: ['amp_email', 'web_form', 'api'],
      default: 'amp_email'
    },
    emailMessageId: String,
    serverUrl: String
  },
  
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'approved', 'rejected', 'processed'],
    default: 'submitted'
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
resumeRefreshmentSchema.index({ email: 1, createdAt: -1 });
resumeRefreshmentSchema.index({ status: 1, createdAt: -1 });
resumeRefreshmentSchema.index({ currentRole: 'text', relevantInfo: 'text' });
resumeRefreshmentSchema.index({ sameCompany: 1 });
resumeRefreshmentSchema.index({ yearsOfExperience: 1 });

// Update lastUpdated on save
resumeRefreshmentSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Virtual for formatted experience display
resumeRefreshmentSchema.virtual('experienceDisplay').get(function() {
  return `${this.yearsOfExperience} year${this.yearsOfExperience !== 1 ? 's' : ''}`;
});

// Virtual for skills summary
resumeRefreshmentSchema.virtual('skillsSummary').get(function() {
  return this.skills.join(', ');
});

module.exports = mongoose.model('ResumeRefreshment', resumeRefreshmentSchema);
