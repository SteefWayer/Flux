import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import path from 'path';

// Path to store moderation data
const moderationPath = path.resolve('./serverdata/moderation.json');

export default {
    name: 'kick',
    description: 'Kick a user from the server',
    async execute(message, args) {
        // Check if the user has the required permissions
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command. Required Permissions: Kick Members or higher.');
            return message.reply({ embeds: [noPermsEmbed] });
        }

        // Ensure arguments are provided
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: `!kick <usermention/id> [reason]`\nProvide a user to kick and optionally a reason.');
            return message.reply({ embeds: [usageEmbed] });
        }

        // Extract user and reason
        const userMentionOrId = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';

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

        // Kick the user
        try {
            await member.kick(reason);
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('User Kicked')
                .setDescription(`User ${user.tag} has been kicked.`)
                .addFields(
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Kicked By', value: `${message.author.tag}`, inline: false }
                );

            message.channel.send({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Error')
                .setDescription('There was an error trying to kick the user. Please check if the bot has the necessary permissions.');
            message.reply({ embeds: [errorEmbed] });
        }
    }
};
