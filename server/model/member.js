/**
 * Scheme for member model
 */

const mongoose = require('mongoose');
const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    giftee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    }
});

const Member = mongoose.model('Member', memberSchema);
module.exports = Member;