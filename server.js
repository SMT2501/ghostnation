// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt'); // For hashing passwords
const router = express.Router();

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware for parsing incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize and configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret', // Move secret to environment variable
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000 // Session duration set to 7 days (in milliseconds)
    }
}));

const expressFileUpload = require('express-fileupload');

app.use(expressFileUpload());


// Initialize and configure Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize and configure connect-flash middleware
app.use(flash());

// Initialize SQLite database
const db = new sqlite3.Database('mydatabase.db');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/content');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB file size limit
});


// Define a function to convert file paths to URLs
function pathToUrl(filePath) {
    const urlPath = filePath.replace(/\\/g, '/'); // Ensure paths are URL-friendly
    return `http://localhost:${PORT}/public${urlPath.split('public')[1]}`;
}

// Route handler to add a new post
app.post('/add_post', isAuthenticated, (req, res) => {
    const { content_title, content_text } = req.body;
    const userId = req.user.id;
    let content_url = '';
    let content_type = 'post'; // Default content type

    if (req.files) {
        const files = req.files;
        const fileArray = [];

        if (files.video) {
            const videoPath = '/public/content/' + files.video.name;
            files.video.mv('.' + videoPath, (err) => {
                if (err) {
                    console.error('Video upload error:', err);
                    return res.status(500).send('Error uploading video.');
                }
            });
            fileArray.push(videoPath);
            content_type = 'clip';
        }

        if (files.image) {
            const imagePath = '/public/content/' + files.image.name;
            files.image.mv('.' + imagePath, (err) => {
                if (err) {
                    console.error('Image upload error:', err);
                    return res.status(500).send('Error uploading image.');
                }
            });
            fileArray.push(imagePath);
            if (!files.video) {
                content_type = 'post';
            }
        }

        content_url = fileArray.join(',');
    }

    db.run('INSERT INTO dj_content (dj_id, content_title, content_text, content_url, content_type) VALUES (?, ?, ?, ?, ?)', 
           [userId, content_title, content_text, content_url, content_type], function(err) {
        if (err) {
            console.error('Error adding post:', err);
            return res.status(500).send('Error adding post.');
        }

        req.flash('success', 'Post added successfully!');
        res.redirect('/profile');
    });
});

// Passport Local Strategy for username/password authentication
passport.use(new LocalStrategy({
    usernameField: 'email', // Assuming email is used as the username
    passwordField: 'password',
    passReqToCallback: true // Pass request object to callback for flash messages
}, (req, email, password, done) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return done(error);
        }

        if (!user) {
            return done(null, false, req.flash('error', 'Invalid email or password.'));
        }

        // Compare hashed passwords
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return done(err);
            }

            if (!isMatch) {
                return done(null, false, req.flash('error', 'Invalid email or password.'));
            }

            return done(null, user);
        });
    });
}));

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return done(error);
        }
        
        return done(null, user);
    });
});

// Route handler for rendering the index page
app.get('/', (req, res) => {
    res.render('index', { user: req.user, path: req.path });
});

app.get('/login', (req, res) => {
    res.render('login', { user: req.user, path: req.path });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/signup', (req, res) => {
    res.render('signup', { user: req.user, path: req.path });
});

app.post('/signup', (req, res) => {
    const { username, email, password, bio } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (error, existingUser) => {
        if (error) {
            console.error('Error checking existing email:', error);
            return res.render('signup', { error: 'Error signing up. Please try again later.', user: req.user, path: req.path });
        }

        if (existingUser) {
            return res.render('signup', { error: 'Email address is already registered.', user: req.user, path: req.path });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.render('signup', { error: 'Error signing up. Please try again later.' });
            }

            const sql = 'INSERT INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)';
            db.run(sql, [username, email, hashedPassword, bio], function(error) {
                if (error) {
                    console.error('Error inserting user data:', error);
                    return res.render('signup', { error: 'Error signing up. Please try again later.' });
                }

                console.log('User signed up successfully:', username);
                res.redirect('/edit_profile', {user: req.user, path: req.path});
            });
        });
    });
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

// Route handler to add a new post
app.post('/add_post', isAuthenticated, (req, res) => {
    const { content_title, content_text } = req.body;
    const userId = req.user.id;
    let content_url = '';
    let content_type = 'post'; // Default content type

    // Check if files are uploaded
    if (req.files) {
        const files = req.files;
        const fileArray = [];

        // Handle video upload
        if (files.video) {
            const videoPath = '/uploads/videos/' + files.video.name;
            files.video.mv('.' + videoPath, (err) => {
                if (err) {
                    console.error('Video upload error:', err);
                    return res.status(500).send('Error uploading video.');
                }
            });
            fileArray.push(videoPath);
            content_type = 'clip'; // Set content type to 'clip' for video
        }

        // Handle image upload
        if (files.image) {
            const imagePath = '/uploads/images/' + files.image.name;
            files.image.mv('.' + imagePath, (err) => {
                if (err) {
                    console.error('Image upload error:', err);
                    return res.status(500).send('Error uploading image.');
                }
            });
            fileArray.push(imagePath);
            if (!files.video) { // Only set to 'post' if no video is uploaded
                content_type = 'post';
            }
        }

        content_url = fileArray.join(',');
    }

    // Insert post into database
    db.run('INSERT INTO dj_content (dj_id, content_title, content_text, content_url, content_type) VALUES (?, ?, ?, ?, ?)', 
           [userId, content_title, content_text, content_url, content_type], function(err) {
        if (err) {
            console.error('Error adding post:', err);
            return res.status(500).send('Error adding post.');
        }

        req.flash('success', 'Post added successfully!');
        res.redirect('/profile');
    });
});


app.get('/profile', isAuthenticated, (req, res) => {
    const userId = req.user.id;

    db.get('SELECT * FROM users WHERE id = ?', [userId], (error, user) => {
        if (error) {
            console.error('Error querying user data:', error);
            return res.render('profile', { user: req.user, path: req.path, error: 'Error loading profile.' });
        }

        db.all('SELECT * FROM dj_content WHERE dj_id = ? ORDER BY upload_time DESC', [userId], (error, content) => {
            if (error) {
                console.error('Error querying content data:', error);
                return res.render('profile', { user: req.user, error: 'Error loading profile content.' });
            }

            res.render('profile', { user: user, path: req.path, posts: content, success: req.flash('success'), error: req.flash('error') });
        });
    });
});

// Route to render the DJ profile page
app.get('/dj_profile/:id', isAuthenticated, (req, res) => {
    const djId = req.params.id; // Retrieve the DJ ID from the URL parameter
    let content = []; // Initialize content as an empty array
    let bookings = []; // Initialize bookings as an empty array

    // Query the database to retrieve DJ details based on the ID
    db.get('SELECT * FROM users WHERE id = ?', [djId], (error, dj) => {
        if (error || !dj) {
            console.error('Error querying DJ data:', error);
            return res.render('dj_profile', {
                user: req.user,
                dj: null,
                content: [],
                bookings: [],
                following: false,
                path: req.path,
                error: 'Error fetching DJ data.'
            });
        }

        // Query to get DJ content
        db.all('SELECT * FROM dj_content WHERE dj_id = ?', [dj.id], (err, contentData) => {
            if (err) {
                console.error('Error fetching DJ content:', err);
                return res.render('dj_profile', {
                    user: req.user,
                    dj,
                    content: [],
                    bookings: [],
                    following: false,
                    path: req.path,
                    error: 'Error fetching DJ content.'
                });
            }
            content = contentData; // Assign the fetched content data to the content array

            // Query to get confirmed bookings
            db.all('SELECT * FROM bookings WHERE dj_id = ? AND status = "Confirmed"', [dj.id], (err, bookingsData) => {
                if (err) {
                    console.error('Error fetching confirmed bookings:', err);
                    return res.render('dj_profile', {
                        user: req.user,
                        dj,
                        content,
                        bookings: [],
                        following: false,
                        path: req.path,
                        error: 'Error fetching confirmed bookings.'
                    });
                }
                bookings = bookingsData; // Assign the fetched bookings data to the bookings array

                // Query to check if the current user is following this DJ
                db.get('SELECT * FROM followings WHERE user_id = ? AND following_id = ?', [req.user.id, dj.id], (err, follow) => {
                    if (err) {
                        console.error('Error checking follow status:', err);
                        return res.render('dj_profile', {
                            user: req.user,
                            dj,
                            content,
                            bookings,
                            following: false,
                            path: req.path,
                            error: 'Error checking follow status.'
                        });
                    }
                    const following = !!follow; // Convert result to boolean

                    // Render the DJ profile page with DJ data, content, bookings, and follow status
                    res.render('dj_profile', {
                        user: req.user, // Pass the logged-in user
                        dj, // Pass the DJ data
                        content, // Pass the content array
                        bookings, // Pass the bookings array
                        following, // Pass the follow status
                        path: req.path, // Pass the current path
                        error: null // No error
                    });
                });
            });
        });
    });
});


// Route to handle booking a DJ
app.post('/book_dj/:username', isAuthenticated, (req, res) => {
    const username = req.params.username;
    const { date, venue, location, price, time, duration } = req.body;

    // Query the database to get the DJ's ID
    db.get('SELECT id FROM djs WHERE username = ?', [username], (error, dj) => {
        if (error || !dj) {
            console.error('Error querying DJ data:', error);
            return res.redirect(`/dj_profile/${username}`);
        }

        const djId = dj.id;
        const userId = req.user.id;

        // Insert the booking into the database
        db.run('INSERT INTO bookings (user_id, dj_id, date, venue, location, price, time, duration, confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [userId, djId, date, venue, location, price, time, duration, 0], (err) => {
                if (err) {
                    console.error('Error booking DJ:', err);
                    return res.redirect(`/dj_profile/${username}`);
                }
                res.redirect(`/dj_profile/${username}`);
            }
        );
    });
});

// Route to handle following/unfollowing a DJ
app.post('/follow/:djId', isAuthenticated, (req, res) => {
    const djId = req.params.djId;
    db.run('INSERT INTO followings (user_id, following_id) VALUES (?, ?)', [req.user.id, djId], (err) => {
        if (err) {
            console.error('Error following DJ:', err);
            return res.redirect(`/dj_profile/${djId}?error=follow`);
        }
        res.redirect(`/dj_profile/${djId}`);
    });
});

app.post('/unfollow/:djId', isAuthenticated, (req, res) => {
    const djId = req.params.djId;
    db.run('DELETE FROM followings WHERE user_id = ? AND following_id = ?', [req.user.id, djId], (err) => {
        if (err) {
            console.error('Error unfollowing DJ:', err);
            return res.redirect(`/dj_profile/${djId}?error=unfollow`);
        }
        res.redirect(`/dj_profile/${djId}`);
    });
});

// Route to display the edit profile page
app.get('/edit_profile', isAuthenticated, (req, res) => {
    res.render('edit_profile', { user: req.user, path: req.path, success: req.flash('success'), error: req.flash('error') });
});

// Route to update profile information
app.post('/update_profile', isAuthenticated, upload.single('profile_picture'), (req, res) => {
    const userId = req.user.id;
    const { username, bio } = req.body;

    // If a new profile picture is uploaded, use its path, otherwise keep the existing one
    const profile_picture = req.file ? pathToUrl(req.file.path) : req.user.profile_picture;

    // If a new profile picture is uploaded, delete the old one
    if (req.file && req.user.profile_picture) {
        const oldProfilePicturePath = req.user.profile_picture.split('/public')[1];
        fs.unlink(path.join(__dirname, 'public', oldProfilePicturePath), (err) => {
            if (err) console.error('Error deleting old profile picture:', err);
        });
    }

    const sql = 'UPDATE users SET username = ?, bio = ?, profile_picture = ? WHERE id = ?';
    db.run(sql, [username, bio, profile_picture, userId], (error) => {
        if (error) {
            console.error('Error updating user data:', error);
            req.flash('error', 'Error updating profile. Please try again later.');
            return res.redirect('/edit_profile');
        }

        req.flash('success', 'Profile updated successfully.');
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

// Route handler to render the Add Post form
app.get('/add_post', isAuthenticated, (req, res) => {
    res.render('add_post', { user: req.user, path: req.path });
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

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong! Please try again later.');
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});