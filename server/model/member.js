/**
 * Scheme for member model
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption settings - uses AES-256-GCM for authenticated encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment variable
const getEncryptionKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    return Buffer.from(key, 'hex');
};

// Encrypt a string
const encrypt = (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Return iv:authTag:encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
};

// Decrypt a string
const decrypt = (encryptedText) => {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

const memberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    giftee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    },
    isOwner: {
        type: Boolean,
        default: false
    }
});

// Pre-save hook to encrypt name before saving
memberSchema.pre('save', function() {
    if (this.isModified('name') && !this.name.includes(':')) {
        // Only encrypt if not already encrypted (simple check)
        this.name = encrypt(this.name);
    }
});

// Method to get decrypted name
memberSchema.methods.getDecryptedName = function() {
    try {
        return decrypt(this.name);
    } catch (error) {
        return this.name; // Return as-is if decryption fails
    }
};

// Static method to encrypt a name (for use before saving)
memberSchema.statics.encryptName = encrypt;
memberSchema.statics.decryptName = decrypt;

const Member = mongoose.model('Member', memberSchema);
module.exports = Member;