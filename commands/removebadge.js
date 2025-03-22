import fs from 'fs';
import path from 'path';

const userDataPath = path.resolve('./data/userdata.json');

export default {
    name: 'removebadge',
    aliases: ['rembadge', 'delbadge'],
    description: 'Removes a badge from a user or the bot.',
    usage: '!removebadge @username badgeID',
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
        const userBadges = userData[userId]?.badges || [];
        const hasPermission = userBadges.includes('B8') || userBadges.includes('B10');

        if (!hasPermission) {
            return message.reply("You don't have permission to use this command.");
        }

        // Get badge ID from the arguments
        const badgeId = args[1];
        if (!badgeId) {
            return message.reply('Please specify a badge ID to remove.');
        }

        // Determine target user based on mention
        const targetUser = message.mentions.users.first();
        if (!targetUser) {
            return message.reply('Please mention a user to remove a badge from.');
        }

        const targetUserId = targetUser.id;

        // Check if the target user exists in userdata.json
        if (!userData[targetUserId]) {
            return message.reply(`No profile found for ${targetUser.username}.`);
        }

        // Remove badge if it exists
        const targetBadges = userData[targetUserId].badges;
        const badgeIndex = targetBadges.indexOf(badgeId);

        if (badgeIndex !== -1) {
            targetBadges.splice(badgeIndex, 1);
            message.channel.send(`Badge **${badgeId}** has been removed from ${targetUser.username}'s profile!`);
        } else {
            return message.reply('This user does not have that badge.');
        }

        // Write the updated user data back to userdata.json
        try {
            fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        } catch (error) {
            console.error('Error writing user data:', error);
            return message.channel.send('Failed to update user data. Please try again later.');
        }
    },
};
