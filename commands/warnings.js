import fs from 'fs';
import path from 'path';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// Path to store moderation data
const moderationPath = path.resolve('./serverdata/moderation.json');

export default {
    name: 'viewwarnings',
    aliases: ['warnings', 'warninglist'],
    description: 'View warnings for a user',
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
                .setDescription('Usage: `!viewwarnings <usermention/id>`\nPlease provide a user to view warnings for.');
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

        // Retrieve user warnings
        const userWarnings = moderationData[message.guild.id]?.warnings[user.id] || [];
        if (userWarnings.length === 0) {
            const noWarningsEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('No Warnings')
                .setDescription(`User ${user.tag} has no warnings.`);
            return message.channel.send({ embeds: [noWarningsEmbed] });
        }

        // Create a paginated view for warnings
        const warningsPerPage = 5; // Number of warnings per page
        let page = 1;
        const totalPages = Math.ceil(userWarnings.length / warningsPerPage);

        // Function to create the embed for a specific page
        const createWarningsEmbed = (pageNumber) => {
            const start = (pageNumber - 1) * warningsPerPage;
            const end = Math.min(start + warningsPerPage, userWarnings.length);
            const warningsForPage = userWarnings.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle(`Warnings for ${user.tag}`)
                .setDescription(`Showing page ${pageNumber} of ${totalPages}`)
                .addFields(warningsForPage.map((warning, index) => ({
                    name: `Warning ID: ${warning.id}`,
                    value: `**Reason:** ${warning.reason}\n**Date:** ${new Date(warning.timestamp).toLocaleString()}\n**Moderator:** ${warning.moderator.username} (${warning.moderator.id})`,
                    inline: false
                })));

            return embed;
        };

        // Create buttons for pagination
        const createPaginationButtons = (currentPage) => {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages)
            );
            return row;
        };

        // Send the initial message with embed and buttons
        const messageSent = await message.channel.send({
            embeds: [createWarningsEmbed(page)],
            components: [createPaginationButtons(page)]
        });

        // Handle button interactions
        const filter = (interaction) => interaction.user.id === message.author.id;
        const collector = message.channel.createMessageComponentCollector({
            filter,
            time: 60000 // Collect interactions for 60 seconds
        });

        collector.on('collect', async (interaction) => {
            if (interaction.message.id !== messageSent.id) return;

            if (interaction.customId === 'prev') {
                page--;
            } else if (interaction.customId === 'next') {
                page++;
            }

            // Update the message with the new page
            await interaction.update({
                embeds: [createWarningsEmbed(page)],
                components: [createPaginationButtons(page)]
            });
        });

        collector.on('end', async () => {
            // Disable buttons after the collector ends
            await messageSent.edit({
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    )
                ]
            });
        });
    }
};
