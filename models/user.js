const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    premium: {
        active: {
            type: Boolean,
            default: false
        },
        expiresAt: {
            type: Date,
            default: null
        },
        redeemedCodes: [{
            code: String,
            redeemedAt: Date
        }]
    },
    playlists: [{
        name: String,
        tracks: [{
            title: String,
            author: String,
            uri: String,
            duration: Number
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    statistics: {
        commandsUsed: {
            type: Number,
            default: 0
        },
        songsPlayed: {
            type: Number,
            default: 0
        },
        totalListenTime: {
            type: Number,
            default: 0
        }
    }
});

module.exports = mongoose.model('User', userSchema);
