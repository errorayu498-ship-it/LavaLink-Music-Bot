const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
        default: '!'
    },
    djRole: {
        type: String,
        default: null
    },
    volume: {
        type: Number,
        default: 100
    },
    twentyFourSeven: {
        type: Boolean,
        default: false
    },
    filters: {
        type: [String],
        default: []
    },
    blacklistedChannels: {
        type: [String],
        default: []
    },
    premium: {
        type: Boolean,
        default: false
    },
    premiumExpiresAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Guild', guildSchema);
