import { EmbedBuilder } from 'discord.js';

export default {
    name: 'purge',
    description: 'Purge messages from the channel (up to 1000 messages).',
    async execute(message, args) {
        // Check if the user has the "Manage Messages" permission
        if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return message.reply('You do not have permission to use this command.');
        }

        // Parse the amount of messages to delete
        const amount = parseInt(args[0], 10);

        // Validate the amount
        if (isNaN(amount) || amount <= 0 || amount > 1000) {
            return message.reply('Please provide a valid number of messages to delete (between 1 and 1000).');
        }

        try {
            const messagesToDelete = [];
            let lastMessageId;

            // Loop to fetch messages in batches of 100
            while (messagesToDelete.length < amount) {
                const fetched = await message.channel.messages.fetch({
                    limit: 100,
                    before: lastMessageId
                });

                if (fetched.size === 0) break;

                // Filter out the command message and pinned messages
                fetched.each(msg => {
                    if (!msg.pinned && (messagesToDelete.length < amount)) {
                        messagesToDelete.push(msg);
                    }
                });

                // Update the last message ID to fetch older messages
                lastMessageId = fetched.last().id;
            }

            // Track message counts by user
            const userMessageCounts = new Map();
            messagesToDelete.forEach(msg => {
                const userId = msg.author.id;
                if (!userMessageCounts.has(userId)) {
                    userMessageCounts.set(userId, 0);
                }
                userMessageCounts.set(userId, userMessageCounts.get(userId) + 1);
            });

            // Bulk delete the messages
            if (messagesToDelete.length > 0) {
                try {
                    await message.channel.bulkDelete(messagesToDelete, true);
                } catch (err) {
                    console.error('Error during bulk delete:', err);
                }
            }

            // Format the detailed report
            const reportLines = [];
            userMessageCounts.forEach((count, userId) => {
                const user = message.guild.members.cache.get(userId) || { user: { tag: 'Unknown User' } };
                reportLines.push(`Deleted **${count}** messages from ${user.user.tag}`);
            });

            const report = reportLines.join('\n');

            // Create and send a confirmation embed
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🗑️ Messages Purged')
                .setDescription(`Successfully deleted **${messagesToDelete.length}** messages.\n\n${report}`)
                .setThumbnail(message.guild.iconURL());

            const confirmationMessage = await message.channel.send({ embeds: [embed] });

            // Schedule the deletion of the confirmation message and the command message
            setTimeout(async () => {
                try {
                    await confirmationMessage.delete();
                } catch (err) {
                    // Ignore the error if the message is already deleted
                    if (err.code !== 10008) {
                        console.error('Error deleting confirmation message:', err);
                    }
                }

                try {
                    await message.delete();
                } catch (err) {
                    // Ignore the error if the message is already deleted
                    if (err.code !== 10008) {
                        console.error('Error deleting command message:', err);
                    }
                }
            }, 3000); // 3000 milliseconds = 3 seconds

        } catch (error) {
            console.error('Error purging messages:', error);
            message.reply('There was an error trying to purge messages.');
        }
    }
};
