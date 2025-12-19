const express = require('express');
const route = express.Router();
const Group = require('../model/group');
const Member = require('../model/member');

// create new group
route.post('/groups', async (req, res) => {
    try {
        const signUpLink = `${Math.random().toString(36).substring(7)}`;
        const group = new Group({
            name: req.body.name,
            members: req.body.members.map(member => new Member({ name: member.name })),
            signUpLinkSuffix: signUpLink
        });
        await group.save();
        res.status(201).send(group);
    } catch (error) {
        res.status(400).send(error);
    }
});

// add member to group
route.post('/groups/:groupId/members', async (req, res) => {
    try {
        const member = new Member({
            name: req.body.name
        });
        await member.save();
        const group = await Group.findById(req.params.groupId);
        group.members.push(member._id);
        await group.save();
        res.status(201).send(member);
    } catch (error) {
        res.status(400).send(error);
    }
});

// get signup for group
route.get('/groups/signup/:signUpLinkSuffix', async (req, res) => {
    try {
        const group = await Group.findOne({ signUpLinkSuffix: req.params.signUpLinkSuffix });
        if (!group) {
            return res.status(404).send({ message: 'Group not found' });
        }
        const members = await Member.find({ _id: { $in: group.members } });
        res.render('addGiftee', { group: group, members: members });
    } catch (error) {
        res.status(400).send(error);
    }
});

// add giftee to member
route.post('/members/:memberId/giftee', async (req, res) => {
    try {
        const member = await Member.findById(req.params.memberId);
        member.giftee = req.body.gifteeId;
        await member.save();
        res.status(200).send(member);
    } catch (error) {
        res.status(400).send(error);
    }
});

// determine the missing giftee
route.get('/solve/:groupId', async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId).populate('members');
        
        const memberIds = group.members.map(member => member._id.toString());
        const gifteeIds = group.members
            .filter(member => member.giftee)
            .map(member => member.giftee.toString());

        const missingGifteeId = memberIds.find(id => !gifteeIds.includes(id));
        const missingGiftee = group.members.find(member => member._id.toString() === missingGifteeId);

        res.status(200).send(missingGiftee);
    } catch (error) {
        res.status(400).send(error);
    }
});

module.exports = route;
