import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid'; // Ensure you have uuid installed

// Path to store moderation data
const moderationPath = path.resolve('./serverdata/moderation.json');

export default {
    name: 'removewarning',
    aliases: ['remwarn', 'delwarn'],
    description: 'Remove a specific warning for a user by warning ID',
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
                .setDescription('Usage: `!removewarning <usermention/id> <warningID>`\nPlease provide a user and the warning ID to remove.');
            return message.reply({ embeds: [usageEmbed] });
        }

        // Extract user and warning ID
        const userMentionOrId = args[0];
        const warningId = args[1];
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

        // Load moderation data
        let moderationData = {};
        if (fs.existsSync(moderationPath)) {
            moderationData = JSON.parse(fs.readFileSync(moderationPath));
        }

        // Retrieve user warnings
        const userWarnings = moderationData[message.guild.id]?.warnings[user.id] || [];
        if (userWarnings.length === 0) {
            const noWarningsEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('No Warnings')
                .setDescription(`User ${user.tag} has no warnings to remove.`);
            return message.channel.send({ embeds: [noWarningsEmbed] });
        }

        // Find and remove the warning with the specified ID
        const warningIndex = userWarnings.findIndex(warning => warning.id === warningId);
        if (warningIndex === -1) {
            const warningNotFoundEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Warning Not Found')
                .setDescription(`No warning found with ID ${warningId} for user ${user.tag}.`);
            return message.channel.send({ embeds: [warningNotFoundEmbed] });
        }

        // Remove the warning from the list
        userWarnings.splice(warningIndex, 1);
        moderationData[message.guild.id].warnings[user.id] = userWarnings;

        // Save updated moderation data
        fs.writeFileSync(moderationPath, JSON.stringify(moderationData, null, 2));

        // Send confirmation message
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Warning Removed')
            .setDescription(`Successfully removed warning with ID ${warningId} for user ${user.tag}.`);

        message.channel.send({ embeds: [successEmbed] });
    }
};
