// routes/users.js

const express = require('express');
const router = express.Router();
const isAuthenticated = require('./auth'); // Import authentication middleware
//const upload = require('../middlewares/posts'); // Import multer middleware for file uploads
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer'); // Import multer for handling file uploads
const db = new sqlite3.Database('mydatabase.db');
const upload = multer({ dest: 'public/images' });

// Route to render the profile page
router.get('/profile', isAuthenticated, (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    // Query the database to retrieve user data based on userId
    db.get('SELECT * FROM users WHERE id = ?', [userId], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return res.render('profile', { error: 'Error fetching user data.' });
        }
        // Render the profile page with user data
        res.render('profile', { user });
    });
});

// Route to render the edit profile page
router.get('/edit_profile', isAuthenticated, (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    // Query the database to retrieve user data based on userId
    db.get('SELECT * FROM users WHERE id = ?', [userId], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return res.render('edit_profile', { error: 'Error fetching user data.' });
        }
        // Render the edit profile page with user data
        res.render('edit_profile', { user });
    });
});

// Route to handle profile updates
router.post('/edit_profile', isAuthenticated, (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    const { username, bio, placesWorked } = req.body;

    // Update user data in the database
    db.run('UPDATE users SET username = ?, bio = ?, placesWorked = ? WHERE id = ?', 
           [username, bio, placesWorked, userId], 
           (error) => {
        if (error) {
            console.error('Error updating user data:', error);
            return res.render('edit_profile', { error: 'Error updating user profile.' });
        }
        // Redirect to the profile page after successful update
        res.redirect('/profile');
    });
});

// Route to render the edit profile picture page
router.get('/edit_profile_picture', isAuthenticated, (req, res) => {
    res.render('edit_profile_picture');
});

// Route to handle profile picture upload
router.post('/edit_profile_picture', isAuthenticated, upload.single('profile_picture'), (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    const newProfilePicturePath = req.file ? req.file.path.replace('public', '') : null; // Get uploaded file path

    // Update the user's profile picture in the database
    db.run('UPDATE users SET profile_picture = ? WHERE id = ?', 
           [newProfilePicturePath, userId], 
           (error) => {
        if (error) {
            console.error('Error updating profile picture:', error);
            return res.render('edit_profile_picture', { error: 'Error updating profile picture.' });
        }
        // Redirect to the profile page after successful update
        res.redirect('/profile');
    });
});

module.exports = router;
