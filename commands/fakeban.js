import { EmbedBuilder } from 'discord.js';
import path from 'path';

// Path to store moderation data (not used in this fake command)
const moderationPath = path.resolve('./serverdata/moderation.json');

export default {
    name: 'expel',
    description: 'Fake expel a user from the server',
    async execute(message, args) {
        // Ensure arguments are provided
        if (args.length < 1) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: `!expel <usermention/id> [reason]`\nProvide a user to fake expel and optionally a reason.');
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

        // Simulate the expulsion
        const fakeExpelEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('User Expelled (Fake)')
            .setDescription(`🚫 **${user.tag}** has been *expelled* from the server (just kidding)!`)
            .addFields(
                { name: 'Reason', value: reason, inline: false },
                { name: 'Expelled By', value: `${message.author.tag}`, inline: false }
            )
            .setFooter({ text: `User ID: ${user.id}` });

        message.channel.send({ embeds: [fakeExpelEmbed] });
    }
};
