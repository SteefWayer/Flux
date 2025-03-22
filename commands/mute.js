import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import path from 'path';
import fs from 'fs';

// Path to store moderation data
const moderationPath = path.resolve('./serverdata/moderation.json');

// Enable or disable logging (set to true to enable logging)
const isLoggingEnabled = true;

// Logging function
const logMessage = (message) => {
    if (isLoggingEnabled) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(moderationPath, logEntry, 'utf8');
    }
};

export default {
    name: 'mute',
    aliases: ['timeout'],
    description: 'Mute a user for a specified duration',
    async execute(message, args) {
        // Check if the user has the required permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command. Required Permissions: Timeout Members or higher.');
            return message.reply({ embeds: [noPermsEmbed] });
        }

        // Ensure arguments are provided
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: !mute <usermention/id> [duration]\nProvide a user to mute and optionally a duration (e.g., 10m for 10 minutes, 2h for 2 hours). Default is 1 hour.');
            return message.reply({ embeds: [usageEmbed] });
        }

        // Extract user and duration
        const userMentionOrId = args[0];
        let duration = args[1] || '1h'; // Default to 1 hour if no duration provided

        // Parse duration
        const durationRegex = /^(\d+)([smhd])$/; // Matches "10m", "2h", etc.
        const match = duration.match(durationRegex);
        if (!match) {
            const invalidDurationEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Invalid Duration')
                .setDescription('Please provide a valid duration. Format: <number><s/m/h/d> (e.g., 10m for 10 minutes).');
            return message.reply({ embeds: [invalidDurationEmbed] });
        }

        const [, amount, unit] = match;
        const timeUnits = {
            s: 1000,          // seconds
            m: 60 * 1000,     // minutes
            h: 60 * 60 * 1000, // hours
            d: 24 * 60 * 60 * 1000 // days
        };
        const muteDuration = parseInt(amount) * timeUnits[unit];

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

        // Mute the user
        try {
            await member.timeout(muteDuration, `Muted by ${message.author.tag} for ${duration}`);
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('User Muted')
                .setDescription(`User ${user.tag} has been muted for ${duration}.`)
                .addFields(
                    { name: 'Reason', value: `Muted by ${message.author.tag}`, inline: false },
                    { name: 'Duration', value: duration, inline: false }
                );

            message.channel.send({ embeds: [successEmbed] });

            // Log the mute action
            logMessage(`User ${user.tag} muted by ${message.author.tag} for ${duration}.`);
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Error')
                .setDescription('There was an error trying to mute the user. Please check if the bot has the necessary permissions.');
            message.reply({ embeds: [errorEmbed] });

            // Log the error
            logMessage(`Error muting user ${user.tag} by ${message.author.tag}: ${error.message}`);
        }
    }
};
