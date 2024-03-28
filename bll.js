// bll.js

const dal = require('./dal');

module.exports = {
    authenticateUser: async (username, password) => {
        // Call DAL function to retrieve user from the database
        const user = await dal.getUserByUsername(username);
        
        if (!user) {
            throw new Error('User not found');
        }

        // Check if the password matches
        if (user.password !== password) {
            throw new Error('Incorrect password');
        }

        // Return authenticated user
        return user;
    },

    getUserProfile: async (userId) => {
        // Call DAL function to retrieve user profile
        return dal.getUserProfile(userId);
    },

    // Define other business logic functions...
};
