// routes/notifications.js

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('mydatabase.db');

// Route to render the notifications page
router.get('/notifications', (req, res) => {
    // Check if req.user exists and has an id property
    if (req.user && req.user.id) {
        // Access the id property
        const userId = req.user.id;
        db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY notification_time DESC', [req.user.id], (err, notifications) => {
            if (err) {
                console.error('Error fetching notifications:', err);
                return res.render('notifications', { error: 'Error fetching notifications.' });
            }
            // Render the notifications page with the retrieved notifications
            res.render('notifications', { notifications });
        });
    } else {
        // Handle case where req.user is undefined or doesn't have an id property
        res.status(400).send('User ID not found');
    }
});

// Route to mark a notification as read
router.post('/mark_as_read/:notificationId', (req, res) => {
    const notificationId = req.params.notificationId;
    // Update the notification in the database to mark it as read
    db.run('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [notificationId], (err) => {
        if (err) {
            console.error('Error marking notification as read:', err);
            // Handle the error appropriately
            res.status(500).send('Error marking notification as read');
        } else {
            // Redirect back to the notifications page
            res.redirect('/');
        }
    });
});

// Add more routes as needed for notification-related actions
module.exports = router;
