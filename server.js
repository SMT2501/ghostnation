// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer'); // Import multer for handling file uploads
const fs = require('fs');
const router = express.Router();


const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for parsing incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize and configure session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000 // Session duration set to 7 days (in milliseconds)
    }
}));

// Initialize and configure Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize and configure connect-flash middleware
app.use(flash());

// Initialize SQLite database
const db = new sqlite3.Database('mydatabase.db');

// Initialize multer for handling file uploads
const upload = multer({ dest: 'public/images' }); // Destination folder for uploaded images

// Multer configuration
const add_post = multer({ 
    dest: 'public/content', // Destination folder for uploaded files
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
    }
});

// Route handler for rendering the index page
app.get('/', (req, res) => {
    //res.render('index', { user: req.user, path: req.path });
    res.render('index', { user: req.user, path: req.path }); // Pass user and path
});


app.get('/login', (req, res) => {
    res.render('login', {  user: req.user, path: req.path }); // Pass the user variable
});

app.post('/login', passport.authenticate('local', {
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

app.get('/signup', (req, res) => {
    res.render('signup', {user: req.user, path: req.path});
});

app.post('/signup', (req, res) => {
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

// Route to render the browse DJs page
app.get('/djs', (req, res) => {
    // Query the database to retrieve all users (DJs)
    db.all('SELECT * FROM users', (error, users) => {
        if (error) {
            console.error('Error querying users:', error);
            return res.render('djs', { error: 'Error fetching DJs.' });
        }
        //console.log(users); // Log the users array to check its contents
        // Render the browse DJs page with the retrieved users data
        res.render('djs', { users: users, user: req.user, path: req.path }); // Pass the users array if available
    });
});

// Mount the notifications routes



// Route to render the profile page
app.get('/profile', isAuthenticated, (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    // Query the database to retrieve user data based on userId
    db.get('SELECT * FROM users WHERE id = ?', [userId], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return res.render('profile', { error: 'Error fetching user data.' });
        }
        // Render the profile page with user data
        res.render('profile', {  user: req.user, path: req.path }); // Pass both user and req

       // res.render('profile', { user });
    });
});

// Add a new route for editing the profile
app.get('/edit_profile', isAuthenticated, (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    const { username, bio, placesWorked } = req.body;
    const oldProfilePicture = req.body.old_profile_picture; // Retrieve old profile picture path
    
    // Query the database to retrieve user data based on userId
    db.get('SELECT * FROM users WHERE id = ?', [userId], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return res.render('edit_profile', { error: 'Error fetching user data.' });
        }
        // Convert placesWorked to string if it's an array
        //const placesWorked = Array.isArray(user.placesWorked) ? user.placesWorked.join(', ') : user.placesWorked;
        // Render the edit profile page with user data and any error message
        res.render('edit_profile', { user, path: req.path, error: null });
    });
});

// Route to render the profile picture edit page
app.get('/edit_profile_picture', isAuthenticated, (req, res) => {
    res.render('edit_profile_picture', {  user: req.user, path: req.path });
});


// Handle profile updates, including picture upload
app.post('/edit_profile', isAuthenticated, upload.single('profile_picture'), (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    const { username, bio, placesWorked } = req.body;
    const newProfilePicturePath = req.file ? req.file.path.replace('public', '') : null; // Get uploaded file path

    // Retrieve the old profile picture path from the database
    db.get('SELECT profile_picture FROM users WHERE id = ?', [userId], (error, row) => {
        if (error) {
            console.error('Error retrieving old profile picture path:', error);
            return res.render('edit_profile', { error: 'Error updating user profile.', user: req.user }); // Pass req.user to retain user data
        }
        const oldProfilePicturePath = row.profile_picture;

        // Update the user's information in the database
        db.run('UPDATE users SET username = ?, bio = ?, profile_picture = ?, placesWorked = ? WHERE id = ?', 
               [username, bio, newProfilePicturePath, placesWorked, userId], 
               (updateError) => {
            if (updateError) {
                console.error('Error updating user data:', updateError);
                return res.render('edit_profile', { error: 'Error updating user profile.', user: req.user }); // Pass req.user to retain user data
            }

            // If there was an old profile picture path and it's different from the new one, remove the old picture
            if (oldProfilePicturePath && oldProfilePicturePath !== newProfilePicturePath) {
                // Delete the old profile picture from storage
                fs.unlink(`public${oldProfilePicturePath}`, (unlinkError) => {
                    if (unlinkError) {
                        console.error('Error deleting old profile picture:', unlinkError);
                    }
                });
            }

            // Redirect to the profile page after successful update
            res.redirect('/profile');
        });
    });
});

// Route to handle profile picture edit form submission
app.post('/edit_profile_picture', isAuthenticated, upload.single('new_profile_picture'), (req, res) => {
    const userId = req.user.id; // Retrieve the user's ID from the session
    const removeProfilePicture = req.body.remove_profile_picture === 'on';
    const newProfilePicturePath = req.file ? req.file.path.replace('public', '') : null; // Get uploaded file path

    // Update the user's profile picture in the database
    let query = 'UPDATE users SET profile_picture = ? WHERE id = ?';
    let params = [newProfilePicturePath, userId];

    // If the user chose to remove the profile picture, set the profile_picture field to NULL
    if (removeProfilePicture) {
        query = 'UPDATE users SET profile_picture = NULL WHERE id = ?';
        params = [userId];
    }

    // Execute the update query
    db.run(query, params, (error) => {
        if (error) {
            console.error('Error updating profile picture:', error);
            return res.render('edit_profile_picture', { error: 'Error updating profile picture.', user: req.user });
        }

        // Redirect to the profile page after successful update
        res.redirect('/profile');
    });
});

// Route to render the bookings page
app.get('/bookings', isAuthenticated, (req, res) => {
    // Query the database to retrieve bookings for the current user
    db.all('SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC', [req.user.id], (err, bookings) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.render('bookings', { error: 'Error fetching bookings.', bookings, user: req.user, path: req.path, djs: [] }); // Pass an empty array for djs
        }
        // Query the database to retrieve all users
        db.all('SELECT * FROM users', (err, users) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.render('bookings', { error: 'Error fetching users.', bookings, user: req.user, path: req.path, djs: [] }); // Pass an empty array for djs
            }
            // Render the bookings page with the retrieved bookings, users, and user
            res.render('bookings', { bookings, users, user: req.user, path: req.path, error: 'Error.' });
        });
    });
});


// Route to book a DJ
app.post('/bookings', (req, res) => {
    const { djId, bookingDate, bookingTime, bookingDuration } = req.body;
    const userId = req.user.id;

    // Insert the booking into the database
    db.run('INSERT INTO bookings (user_id, dj_id, booking_date, booking_time, booking_duration) VALUES (?, ?, ?, ?, ?)',
        [userId, djId, bookingDate, bookingTime, bookingDuration],
        (err) => {
            if (err) {
                console.error('Error creating booking:', err);
                return res.render('bookings', { error: 'Error creating booking.' });
            }
            // Redirect back to the bookings page after successful booking
            res.redirect('/bookings');
        }
    );
});

app.get('/notifications', (req, res) => {
    // Check if req.user exists and has an id property
    if (req.user && req.user.id) {
        // Access the id property
        const userId = req.user.id;
        db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY notification_time DESC', [req.user.id], (err, notifications) => {
            if (err) {
                console.error('Error fetching notifications:', err);
                return res.render('notifications', { error: 'Error fetching notifications.', user: req.user }); // Pass the user object
            }
            // Render the notifications page with the retrieved notifications and user
            res.render('notifications', { notifications, userId, user: req.user, path: req.path });
        });
    } else {
        // Handle case where req.user is undefined or doesn't have an id property
        //res.status(400).send('User ID not found');
        res.redirect('/login');
    }
});


// Route to mark a notification as read
app.post('/mark_as_read/:notificationId', (req, res) => {
    const notificationId = req.params.notificationId;
    // Update the notification in the database to mark it as read
    db.run('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [notificationId], (err) => {
        if (err) {
            console.error('Error marking notification as read:', err);
            // Handle the error appropriately
            res.status(500).send('Error marking notification as read');
        } else {
            // Redirect back to the notifications page
            res.redirect('/notifications');
        }
    });
});

app.post('/create', isAuthenticated, (req, res) => {
    // Logic for creating a new post
    res.send('Creating a new post...');
});

// Define a route handler for rendering the add post page
app.get('/add_post', isAuthenticated, (req, res) => {
    res.render('add_post', { error: null, user: req.user, path: req.path }); // Render the add_post EJS file
});


// Route handler for adding a post with video and image
app.post('/add_post', isAuthenticated, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'image', maxCount: 1 }]), (req, res) => {
    // Extract post data from request body
    const { content } = req.body;
    
    // Extract uploaded files
    const videoFile = req.files['video'][0];
    const imageFile = req.files['image'][0];
    
    // Logic for saving the post and uploaded files to the database
    const sql = 'INSERT INTO dj_content (content, video_path, image_path, dj_id) VALUES (?, ?, ?, ?)';
    const values = [content, videoFile.path, imageFile.path, req.user.id];
    
    db.run(sql, values, (error) => {
        if (error) {
            console.error('Error adding post to database:', error);
            return res.status(500).json({ error: 'Error adding post to database' });
        }
        res.send('Post added successfully');
    });
});

// Route handler for retrieving a specific post
app.get('/add_post:id', (req, res) => {
    const postId = req.params.id;
    // Logic for retrieving a specific post by ID
    res.send(`Retrieving post with ID ${postId}...`);
});

// Route handler for updating a post
app.put('/add_post:id/update', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    // Logic for updating a post
    res.send(`Updating post with ID ${postId}...`);
});

// Route handler for deleting a post
app.delete('/add_post:id/delete', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    // Logic for deleting a post
    res.send(`Deleting post with ID ${postId}...`);
});
// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Logout route
app.get('/logout', (req, res) => {
    req.logout(() => {}); // Provide an empty callback function
    res.redirect('/'); // Redirect to homepage
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
