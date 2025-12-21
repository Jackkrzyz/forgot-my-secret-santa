/**
 * Scheme for group model
 */

const mongoose = require('mongoose');
const groupSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    name: {
        type: String,
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    }],
    signUpLinkSuffix: {
        type: String
    },
    solved: {
        type: Boolean,
        default: false
    }
});

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;