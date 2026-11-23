const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Issue = require('../models/Issue');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { analyzeIssue } = require('../services/ai');

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many reports from this IP, please try again later' },
});

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* -------------------------------------------------------------------------
 * PUBLIC: called by the embeddable widget (no login needed)
 * POST /api/issues/public
 * ----------------------------------------------------------------------- */
router.post('/public', publicLimiter, async (req, res, next) => {
  try {
    const { title, description, type, reporterName, reporterEmail, screenshot, pageInfo } = req.body;

    if (!description || description.trim().length < 5) {
      return res.status(400).json({ message: 'Please describe the problem (at least 5 characters)' });
    }
    if (screenshot && !String(screenshot).startsWith('data:image/')) {
      return res.status(400).json({ message: 'Screenshot must be an image data URL' });
    }

    const issueData = {
      title: (title && title.trim()) || description.trim().slice(0, 60),
      description: description.trim(),
      type: ['bug', 'feedback', 'feature'].includes(type) ? type : 'bug',
      reporterName,
      reporterEmail,
      pageInfo,
      screenshot: screenshot || undefined,
      hasScreenshot: Boolean(screenshot),
    };

    // Recent unresolved issues are the candidates for duplicate detection
    const recent = await Issue.find({ status: { $in: ['open', 'in-progress'] } })
      .select('title description')
      .sort('-createdAt')
      .limit(25);
    const candidates = recent.map((i) => ({ id: String(i._id), title: i.title, description: i.description }));

    const ai = await analyzeIssue(issueData, candidates);

    const issue = await Issue.create({
      ...issueData,
      type: ai.type,
      category: ai.category,
      severity: ai.severity,
      aiSummary: ai.summary,
      aiSource: ai.source,
      duplicateOf: ai.duplicateOf,
    });

    res.status(201).json({
      message: 'Thanks! Your report was submitted.',
      id: issue._id,
      isDuplicate: Boolean(ai.duplicateOf),
    });
  } catch (err) {
    next(err);
  }
});

/* -------------------------------------------------------------------------
 * PROTECTED: dashboard routes
 * ----------------------------------------------------------------------- */
router.use(protect);

// GET /api/issues/stats - numbers for the dashboard cards
router.get('/stats', async (req, res, next) => {
  try {
    const [total, byStatus, byType, bySeverity] = await Promise.all([
      Issue.countDocuments(),
      Issue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Issue.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Issue.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
    ]);
    const toMap = (rows) => rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
    const duplicates = await Issue.countDocuments({ duplicateOf: { $ne: null } });
    res.json({
      total,
      duplicates,
      byStatus: toMap(byStatus),
      byType: toMap(byType),
      bySeverity: toMap(bySeverity),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/issues?status=&type=&severity=&search=&assigned=me&sort=votes
router.get('/', async (req, res, next) => {
  try {
    const { status, type, severity, search, assigned, sort } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (assigned === 'me') filter.assignedTo = req.user._id;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    let issues = await Issue.find(filter)
      .select('-screenshot')
      .populate('assignedTo', 'name email')
      .sort('-createdAt')
      .limit(200);

    if (sort === 'votes') issues = issues.sort((a, b) => b.votes.length - a.votes.length);

    res.json(issues);
  } catch (err) {
    next(err);
  }
});

// GET /api/issues/:id - full details including screenshot
router.get('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid issue id' });

    const issue = await Issue.findById(req.params.id)
      .select('+screenshot')
      .populate('assignedTo', 'name email')
      .populate('duplicateOf', 'title status');
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    res.json(issue);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/issues/:id - update status / assignment / severity / category
router.patch('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid issue id' });

    const allowed = ['status', 'assignedTo', 'severity', 'category'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key] === '' ? null : req.body[key];
    });

    if (updates.assignedTo) {
      if (!isValidId(updates.assignedTo) || !(await User.exists({ _id: updates.assignedTo }))) {
        return res.status(400).json({ message: 'Assigned user does not exist' });
      }
    }

    const issue = await Issue.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .select('+screenshot')
      .populate('assignedTo', 'name email')
      .populate('duplicateOf', 'title status');
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    res.json(issue);
  } catch (err) {
    next(err);
  }
});

// POST /api/issues/:id/vote - toggle the logged-in user's vote
router.post('/:id/vote', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid issue id' });

    const issue = await Issue.findById(req.params.id).select('votes');
    if (!issue) return res.status(404).json({ message: 'Issue not found' });

    const already = issue.votes.some((v) => String(v) === String(req.user._id));
    if (already) issue.votes.pull(req.user._id);
    else issue.votes.push(req.user._id);
    await issue.save();

    res.json({ voted: !already, voteCount: issue.votes.length, votes: issue.votes });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/issues/:id - admin only
router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid issue id' });
    const issue = await Issue.findByIdAndDelete(req.params.id);
    if (!issue) return res.status(404).json({ message: 'Issue not found' });
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
