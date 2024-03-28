// routes/auth.js

const express = require('express');
const router = express.Router();
const passport = require('passport');
const sqlite3 = require('sqlite3').verbose();
const LocalStrategy = require('passport-local').Strategy;
const db = new sqlite3.Database('mydatabase.db');

// Route handler for user login
router.get('/login', (req, res) => {
    res.render('login'); // Render login form
});

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

router.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));

// Passport Local Strategy for username/password authentication
passport.use(new LocalStrategy({
    usernameField: 'email', // Assuming email is used as the username
    passwordField: 'password',
    passReqToCallback: true // Pass request object to callback for flash messages
}, (req, email, password, done) => {
    // Check if the email and password match a user in the database
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return done(error);
        }

        if (!user) {
            // User with the provided email and password not found
            return done(null, false, req.flash('error', 'Invalid email or password.'));
        }

        // User authenticated successfully, return user object
        return done(null, user);
    });
}));

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    // Query the database to retrieve user data based on userId
    db.get('SELECT * FROM users WHERE id = ?', [id], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return done(error);
        }
        
        return done(null, user);
    });
});


// Route handler for user signup
router.get('/signup', (req, res) => {
    res.render('signup'); // Render signup form
});

router.post('/signup', (req, res) => {
    const { username, email, password, bio } = req.body;

    // Check if the email address already exists in the database
    db.get('SELECT * FROM users WHERE email = ?', [email], (error, existingUser) => {
        if (error) {
            console.error('Error checking existing email:', error);
            return res.render('signup', { error: 'Error signing up. Please try again later.' });
        }

        if (existingUser) {
            // Email address already exists, display an error message
            return res.render('signup', { error: 'Email address is already registered.' });
        }

        // Email address is unique, proceed with user registration
        const sql = 'INSERT INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)';
        db.run(sql, [username, email, password, bio], function(error) {
            if (error) {
                console.error('Error inserting user data:', error);
                return res.render('signup', { error: 'Error signing up. Please try again later.' });
            }
            
            console.log('User signed up successfully:', username);
            res.redirect('/login');
        });
    });
});

// Route handler for user logout
router.get('/logout', (req, res) => {
    req.logout(); // Logout the user
    res.redirect('/login'); // Redirect to login page
});

module.exports = router;
