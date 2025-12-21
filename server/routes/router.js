const express = require('express');
const route = express.Router();
const bcrypt = require('bcrypt');
const Group = require('../model/group');
const Member = require('../model/member');
const User = require('../model/user');


route.get('/', (req, res) => {
    res.render('home');
});

route.get('/thankyou', (req, res) => {
    res.render('thankyou');
});

route.get('/login', (req, res) => {
    res.render('login');
});

route.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).render('login', { error: 'Invalid username or password' });
        }
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).render('login', { error: 'Invalid username or password' });
        }
        // Store user in session
        req.session.userId = user._id;
        req.session.username = user.username;

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('login', { error: 'Login failed. Please try again.' });
    }
});

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Dashboard - show user's groups
route.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const groups = await Group.find({ author: req.session.userId });
        res.render('dashboard', { 
            username: req.session.username,
            groups: groups
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).send('Error loading dashboard');
    }
});

// View single group
route.get('/groups/:groupId', requireAuth, async (req, res) => {
    try {
        const group = await Group.findOne({ 
            _id: req.params.groupId,
            author: req.session.userId
        }).populate('members');
        
        if (!group) {
            return res.status(404).send('Group not found');
        }

        // Decrypt member names for display
        const decryptedMembers = group.members.map(member => ({
            ...member.toObject(),
            name: member.getDecryptedName()
        }));

        const signupLink = `${req.protocol}://${req.get('host')}/groups/signup/${group.signUpLinkSuffix}`;
        
        // Check if owner has been auto-assigned a giftee
        const ownerMember = group.members.find(m => m.isOwner);
        let autoGiftee = null;
        if (ownerMember && ownerMember.giftee) {
            const gifteeM = group.members.find(m => m._id.toString() === ownerMember.giftee.toString());
            if (gifteeM) {
                autoGiftee = gifteeM.getDecryptedName();
            }
        }

        res.render('group', { 
            group: group,
            members: decryptedMembers,
            signupLink: signupLink,
            giftee: req.query.giftee || autoGiftee,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Group view error:', error);
        res.status(500).send('Error loading group');
    }
});

route.get('/register', (req, res) => {
    res.render('register');
});

route.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).render('register', { error: 'Username already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const user = new User({
            username,
            password: hashedPassword
        });

        await user.save();
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).render('register', { error: 'Registration failed. Please try again.' });
    }
});

// create new group
route.post('/groups', requireAuth, async (req, res) => {
    try {
        const signUpLink = `${Math.random().toString(36).substring(7)}`;
        
        // Create the owner as the first member
        const ownerMember = new Member({
            name: req.body.ownerName,
            isOwner: true
        });
        await ownerMember.save();

        const group = new Group({
            name: req.body.name,
            author: req.session.userId,
            members: [ownerMember._id],
            signUpLinkSuffix: signUpLink
        });
        await group.save();
        res.redirect(`/groups/${group._id}`);
    } catch (error) {
        console.error('Create group error:', error);
        res.redirect('/dashboard');
    }
});

// add member to group
route.post('/groups/:groupId/members', requireAuth, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.groupId,
            author: req.session.userId
        });
        
        if (!group) {
            return res.status(404).send('Group not found');
        }

        // Prevent adding members to solved groups
        if (group.solved) {
            return res.redirect(`/groups/${req.params.groupId}`);
        }

        const member = new Member({
            name: req.body.name
        });
        await member.save();
        group.members.push(member._id);
        await group.save();
        res.redirect(`/groups/${req.params.groupId}`);
    } catch (error) {
        console.error('Add member error:', error);
        res.redirect(`/groups/${req.params.groupId}`);
    }
});

// delete member from group
route.post('/groups/:groupId/members/:memberId/delete', requireAuth, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.groupId,
            author: req.session.userId
        });
        
        if (!group) {
            return res.status(404).send('Group not found');
        }

        // Prevent deleting members from solved groups
        if (group.solved) {
            return res.redirect(`/groups/${req.params.groupId}?error=Cannot delete members from a solved group`);
        }

        // Find the member
        const member = await Member.findById(req.params.memberId);
        if (!member) {
            return res.redirect(`/groups/${req.params.groupId}?error=Member not found`);
        }

        // Prevent deleting the owner
        if (member.isOwner) {
            return res.redirect(`/groups/${req.params.groupId}?error=Cannot delete the group owner`);
        }

        // Remove member from group's members array
        group.members = group.members.filter(m => m.toString() !== req.params.memberId);
        await group.save();

        // Delete the member document
        await Member.findByIdAndDelete(req.params.memberId);

        res.redirect(`/groups/${req.params.groupId}`);
    } catch (error) {
        console.error('Delete member error:', error);
        res.redirect(`/groups/${req.params.groupId}?error=Failed to delete member`);
    }
});

// delete group and all its members
route.post('/groups/:groupId/delete', requireAuth, async (req, res) => {
    try {
        const group = await Group.findOne({
            _id: req.params.groupId,
            author: req.session.userId
        });
        
        if (!group) {
            return res.status(404).send('Group not found');
        }

        // Delete all members in the group
        await Member.deleteMany({ _id: { $in: group.members } });
        
        // Delete the group
        await Group.findByIdAndDelete(req.params.groupId);
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete group error:', error);
        res.redirect('/dashboard');
    }
});

// get signup for group
route.get('/groups/signup/:signUpLinkSuffix', async (req, res) => {
    try {
        const group = await Group.findOne({ signUpLinkSuffix: req.params.signUpLinkSuffix });
        if (!group) {
            return res.status(404).send({ message: 'Group not found' });
        }

        // Block signup if group is already solved
        if (group.solved) {
            return res.status(403).send('This group has already been completed and is no longer accepting submissions.');
        }

        const members = await Member.find({ _id: { $in: group.members } });
        // Decrypt member names for display
        const decryptedMembers = members.map(member => ({
            ...member.toObject(),
            name: member.getDecryptedName()
        }));
        res.render('addGiftee', { group: group, members: decryptedMembers });
    } catch (error) {
        res.status(400).send(error);
    }
});

// add giftee to member
route.post('/members/:memberId/giftee', async (req, res) => {
    try {
        const member = await Member.findById(req.params.memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        member.giftee = req.body.gifteeId;
        await member.save();

        // Check if all non-owner members have now assigned giftees
        // Find the group this member belongs to
        const group = await Group.findOne({ members: member._id }).populate('members');
        if (group) {
            const nonOwnerMembers = group.members.filter(m => !m.isOwner);
            const allNonOwnersAssigned = nonOwnerMembers.every(m => m.giftee);
            
            if (allNonOwnersAssigned) {
                // Auto-solve: find the missing giftee for the owner
                const memberIds = group.members.map(m => m._id.toString());
                const gifteeIds = group.members
                    .filter(m => m.giftee)
                    .map(m => m.giftee.toString());
                
                const missingGifteeId = memberIds.find(id => !gifteeIds.includes(id));
                
                if (missingGifteeId) {
                    // Assign the missing giftee to the owner
                    const ownerMember = group.members.find(m => m.isOwner);
                    if (ownerMember && !ownerMember.giftee) {
                        ownerMember.giftee = missingGifteeId;
                        await ownerMember.save();
                    }
                }

                // Mark the group as solved
                group.solved = true;
                await group.save();
            }
        }

        res.status(200).json({ success: true, message: 'Giftee assigned successfully!' });
    } catch (error) {
        console.error('Assign giftee error:', error);
        res.status(400).json({ success: false, message: error.message || 'Error assigning giftee' });
    }
});

module.exports = route;
