import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library for generating unique IDs

// Path to store moderation data
const moderationPath = path.resolve('./serverdata/moderation.json');

export default {
    name: 'warn',
    description: 'Gives a warning to a user',
    async execute(message, args) {
        // Check if the user has the required permissions
        if (!message.member.permissions.has(['MANAGE_GUILD', 'MANAGE_MESSAGES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MODERATE_MEMBERS'])) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command. Required Permissions: Manage Server, Manage Messages, Kick Members, Ban Members, or Timeout Members.');
            return message.reply({ embeds: [noPermsEmbed] });
        }

        // Ensure arguments are provided
        if (args.length < 2) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: `!warn <usermention/id> <reason>`\nPlease provide a user to warn and a warning message.');
            return message.reply({ embeds: [usageEmbed] });
        }

        // Extract user and reason
        const userMentionOrId = args[0];
        const reason = args.slice(1).join(' ');

        // Get user from mention or ID
        let user = message.mentions.users.first() || message.guild.members.cache.get(userMentionOrId.replace(/\D/g, ''))?.user;
        if (!user) {
            try {
                user = await message.client.users.fetch(userMentionOrId.replace(/\D/g, ''));
            } catch {
                const userNotFoundEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('User Not Found')
                    .setDescription('User not found. Please mention a valid user or provide their ID.');
                return message.reply({ embeds: [userNotFoundEmbed] });
            }
        }

        // Check if user is in the guild
        let member = message.guild.members.cache.get(user.id);
        if (!member) {
            try {
                member = await message.guild.members.fetch(user.id);
            } catch (error) {
                const notInGuildEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('User Not In Guild')
                    .setDescription('User is not a member of this guild.');
                return message.reply({ embeds: [notInGuildEmbed] });
            }
        }

        // Load existing moderation data
        let moderationData = {};
        if (fs.existsSync(moderationPath)) {
            moderationData = JSON.parse(fs.readFileSync(moderationPath));
        }

        // Initialize guild settings if not present
        if (!moderationData[message.guild.id]) {
            moderationData[message.guild.id] = { warnings: {} };
        }

        // Initialize user warnings if not present
        if (!moderationData[message.guild.id].warnings[user.id]) {
            moderationData[message.guild.id].warnings[user.id] = [];
        }

        // Add the warning with a unique ID
        const warningId = uuidv4(); // Generate a unique ID for the warning
        moderationData[message.guild.id].warnings[user.id].push({
            id: warningId,
            reason,
            timestamp: new Date().toISOString(),
            username: user.username, // Store the username of the warned user
            moderator: {
                id: message.author.id,
                username: message.author.username
            }
        });

        // Save updated moderation data
        fs.writeFileSync(moderationPath, JSON.stringify(moderationData, null, 2));

        // Send confirmation message
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Warning Issued')
            .setDescription(`User ${user.tag} has been warned.`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Date', value: new Date().toLocaleString(), inline: false },
                { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: false }
            );

        message.channel.send({ embeds: [successEmbed] });
    }
};
