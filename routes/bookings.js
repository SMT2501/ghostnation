// const express = require('express');
// const router = express.Router();
// const sqlite3 = require('sqlite3');

// // Create SQLite database connection
// const db = new sqlite3.Database('mydatabase.db');

// // Route to render the bookings page
// router.get('/', (req, res) => {
//     // Query the database to retrieve bookings for the current user
//     db.all('SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC', [req.user.id], (err, bookings) => {
//         if (err) {
//             console.error('Error fetching bookings:', err);
//             return res.render('bookings', { error: 'Error fetching bookings.' });
//         }
//         // Render the bookings page with the retrieved bookings
//         res.render('bookings', { bookings });
//     });
// });

// // Route to book a DJ
// router.post('/', (req, res) => {
//     const { djId, bookingDate, bookingTime, bookingDuration } = req.body;
//     const userId = req.user.id;

//     // Insert the booking into the database
//     db.run('INSERT INTO bookings (user_id, dj_id, booking_date, booking_time, booking_duration) VALUES (?, ?, ?, ?, ?)',
//         [userId, djId, bookingDate, bookingTime, bookingDuration],
//         (err) => {
//             if (err) {
//                 console.error('Error creating booking:', err);
//                 return res.render('bookings', { error: 'Error creating booking.' });
//             }
//             // Redirect back to the bookings page after successful booking
//             res.redirect('/bookings');
//         }
//     );
// });

// module.exports = router;

