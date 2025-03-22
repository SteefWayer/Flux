import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import path from 'path';
import fs from 'fs'; // Import the fs module

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
    name: 'unmute',
    aliases: ['removeTimeout'],
    description: 'Unmute a user',
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
                .setDescription('Usage: !unmute <usermention/id>\nProvide a user to unmute.');
            return message.reply({ embeds: [usageEmbed] });
        }

        // Get user from mention or ID
        const userMentionOrId = args[0];
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

        // Unmute the user
        try {
            await member.timeout(null, `Unmuted by ${message.author.tag}`);
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('User Unmuted')
                .setDescription(`User ${user.tag} has been unmuted.`)
                .addFields(
                    { name: 'Reason', value: `Unmuted by ${message.author.tag}`, inline: false }
                );

            message.channel.send({ embeds: [successEmbed] });

            // Log the unmute action
            logMessage(`User ${user.tag} unmuted by ${message.author.tag}.`);
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Error')
                .setDescription('There was an error trying to unmute the user. Please check if the bot has the necessary permissions.');
            message.reply({ embeds: [errorEmbed] });

            // Log the error
            logMessage(`Error unmuting user ${user.tag} by ${message.author.tag}: ${error.message}`);
        }
    }
};
