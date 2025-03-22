import fs from 'fs';
import path from 'path';

const userDataPath = path.resolve('./data/userdata.json');

export default {
    name: 'addbadge',
    description: 'Adds a badge to a user or the bot.',
    usage: '!addbadge @username|userID <badgeID>',
    execute: async (message, args) => {
        // Read userdata.json to get current user data
        let userData;
        try {
            userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
        } catch (error) {
            console.error('Error reading user data:', error);
            return message.channel.send('Failed to read user data. Please try again later.');
        }

        const userId = message.member.id;
        const userBadges = userData[userId]?.badges || []; // Ensure it's an array
        const hasPermission = userBadges.includes('B8') || userBadges.includes('B10');

        if (!hasPermission) {
            return message.reply("You don't have permission to use this command.");
        }

        // Get badge ID from the arguments
        const badgeId = args[1];
        if (!badgeId) {
            return message.reply('Please specify a badge ID to add.');
        }

        // Determine the target user either by mention or ID
        let targetUser = message.mentions.users.first();
        let targetUserId = targetUser ? targetUser.id : args[0];

        // If no mention, try to fetch the user by ID
        if (!targetUser) {
            try {
                targetUser = await message.guild.members.fetch(targetUserId);
                targetUser = targetUser.user; // Extract user object from the GuildMember
            } catch (error) {
                return message.reply('Cannot find the user in this guild.');
            }
        }

        // If targetUser is still null, return an error message
        if (!targetUser) {
            return message.reply('Please mention a valid user or provide a valid user ID.');
        }

        targetUserId = targetUser.id; // Now we have the target user ID

        // Check if the target user exists in userdata.json
        if (!userData[targetUserId]) {
            // Create a default profile for the user if it doesn't exist
            userData[targetUserId] = {
                commands: {
                    daily: 0,
                    all: 0
                },
                pnickname: targetUser.username, // Properly store the username
                description: `Profile for ${targetUser.username}`, // Properly store the description
                badges: []
            };
            message.channel.send(`Profile created for ${targetUser.username}.`);
        } else {
            // Update the stored username in case it has changed
            userData[targetUserId].pnickname = targetUser.username;
        }

        // Ensure badges array exists
        if (!userData[targetUserId].badges) {
            userData[targetUserId].badges = [];
        }

        // Add the badge if it doesn't already exist
        if (!userData[targetUserId].badges.includes(badgeId)) {
            userData[targetUserId].badges.push(badgeId);
            message.channel.send(`Badge **${badgeId}** has been added to ${targetUser.username}'s profile!`);
        } else {
            return message.reply('This user already has this badge.');
        }

        // Write the updated user data back to userdata.json
        try {
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        } catch (error) {
            console.error('Error writing user data:', error);
            return message.channel.send('Failed to update user data. Please try again later.');
        }
    }
};
