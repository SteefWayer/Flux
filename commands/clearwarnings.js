import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';

// Path to store moderation data
const moderationPath = path.resolve('./serverdata/moderation.json');

export default {
    name: 'clearwarnings',
    description: 'Clear all warnings for a user',
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
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: `!clearwarnings <usermention/id>`\nPlease provide a user to clear warnings for.');
            return message.reply({ embeds: [usageEmbed] });
        }

        // Extract user
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

        // Load moderation data
        let moderationData = {};
        if (fs.existsSync(moderationPath)) {
            moderationData = JSON.parse(fs.readFileSync(moderationPath));
        }

        // Clear user warnings
        if (!moderationData[message.guild.id]?.warnings[user.id]) {
            const noWarningsEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('No Warnings Found')
                .setDescription(`User ${user.tag} has no warnings to clear.`);
            return message.channel.send({ embeds: [noWarningsEmbed] });
        }

        delete moderationData[message.guild.id].warnings[user.id];
        fs.writeFileSync(moderationPath, JSON.stringify(moderationData, null, 2));

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Warnings Cleared')
            .setDescription(`Successfully cleared all warnings for ${user.tag}.`);

        message.channel.send({ embeds: [successEmbed] });
    }
};
