const mongoose = require('mongoose');

const pageInfoSchema = new mongoose.Schema(
  {
    url: String,
    title: String,
    referrer: String,
    userAgent: String,
    language: String,
    screen: String, // e.g. "1920x1080"
    viewport: String, // e.g. "1280x720"
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    type: { type: String, enum: ['bug', 'feedback', 'feature'], default: 'bug' },
    category: {
      type: String,
      enum: ['ui', 'performance', 'crash', 'security', 'content', 'other'],
      default: 'other',
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved', 'closed'],
      default: 'open',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    reporterName: { type: String, trim: true, maxlength: 60 },
    reporterEmail: { type: String, trim: true, lowercase: true, maxlength: 100 },

    // Screenshot is stored as a (compressed) base64 data URL to keep the project simple
    screenshot: { type: String, select: false },
    hasScreenshot: { type: Boolean, default: false },
    pageInfo: pageInfoSchema,

    // Generative AI results
    aiSummary: String,
    aiSource: { type: String, enum: ['gemini', 'rules'], default: 'rules' },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },

    // Feature voting: one vote per team member
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

issueSchema.index({ title: 'text', description: 'text' });

issueSchema.virtual('voteCount').get(function () {
  return this.votes ? this.votes.length : 0;
});

issueSchema.set('toJSON', { virtuals: true });
issueSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Issue', issueSchema);
