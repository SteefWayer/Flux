import { PermissionsBitField } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID; 
const BOT_PERMISSIONS = PermissionsBitField.Flags.Administrator; // 8

const generateInviteLink = () => {
    if (!CLIENT_ID) {
        throw new Error('Client ID is not defined. Please check your .env file.');
    }
    return `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${BOT_PERMISSIONS}&scope=bot%20applications.commands`;
};

const handleInviteCommand = async (message) => {
    try {
        const inviteLink = generateInviteLink();
        await message.reply(`🌟 **Invite the bot to your server!** 🌟\n\n[Click here to invite the bot](${inviteLink})\n\nFeel free to add me to any of your servers!`);
    } catch (error) {
        console.error('Error sending the invite link:', error);
        await message.reply('❌ An error occurred while generating the invite link. Please try again later.');
    }
};

export default {
    name: 'invite',
    aliases: ['invitebot', 'add'],
    description: 'Get the link to invite the bot to your server.',
    execute: handleInviteCommand,
};
