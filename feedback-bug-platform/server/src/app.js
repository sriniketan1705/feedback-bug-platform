const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const issueRoutes = require('./routes/issues');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// The widget runs on OTHER websites, so the public endpoint must allow any origin.
// Dashboard routes are protected by JWT, so open CORS is safe here.
app.use(cors());

// Screenshots are base64 strings, so allow a larger JSON body
app.use(express.json({ limit: '6mb' }));

// Serves /widget.js and /demo.html
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
