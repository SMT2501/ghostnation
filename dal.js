// dal.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('ghostnation.db');

module.exports = {
    getUsers: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM users', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    createUser: (username, email) => {
        return new Promise((resolve, reject) => {
            db.run('INSERT INTO users (username, email) VALUES (?, ?)', [username, email], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    },

    // Define other CRUD functions for other tables...
};
