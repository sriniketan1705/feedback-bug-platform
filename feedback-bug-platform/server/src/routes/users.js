const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - team members (used by the "assign to" dropdown)
router.get('/', protect, async (req, res, next) => {
  try {
    const users = await User.find().select('name email role').sort('name');
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
