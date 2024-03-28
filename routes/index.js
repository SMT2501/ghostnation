// routes/index.js

const express = require('express');
const router = express.Router();

// Import route handlers from other files
const authRouter = require('./auth');
const usersRouter = require('./bookings');
const postsRouter = require('./posts');
const bookingsRouter = require('./bookings');
const notificationsRouter = require('./notifications');

// Mount routers to specific paths
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/posts', postsRouter);
router.use('/bookings', bookingsRouter);
router.use('/notifications', notificationsRouter);

module.exports = router;
