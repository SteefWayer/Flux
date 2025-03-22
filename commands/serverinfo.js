import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

// Resolve the path to the settings file
const settingsPath = path.resolve('serverdata', 'serversettings.json');

// Function to get the prefix for a given server
const getPrefixForServer = async (serverId) => {
    try {
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        return settings[serverId]?.prefix || '!'; // Default to "!" if not found
    } catch (error) {
        console.error('Error reading server settings:', error);
        return '!'; // Fallback to default prefix in case of error
    }
};

// Helper function to format milliseconds as time
const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Ensure all values are strings
const safeString = (value) => (value !== undefined && value !== null) ? value.toString() : 'N/A';

// Pages for the server info
const pages = {
    general: {
        title: 'General Information',
        description: 'Basic details about the server.',
        fields: (guild, prefix) => [
            { name: 'Server Name', value: safeString(guild.name), inline: true },
            { name: 'Server ID', value: safeString(guild.id), inline: true },
            { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Region', value: safeString(guild.preferredLocale), inline: true },
            { name: 'Created On', value: safeString(guild.createdAt.toDateString()), inline: true },
            { name: 'Member Count', value: safeString(guild.memberCount), inline: true },
            { name: 'Boosters', value: safeString(guild.premiumSubscriptionCount), inline: true },
            { name: 'Boost Level', value: safeString(guild.premiumTier), inline: true },
            { name: 'Bots', value: safeString(guild.members.cache.filter(member => member.user.bot).size), inline: true },
            { name: 'Roles', value: safeString(guild.roles.cache.size), inline: true },
            { name: 'Channels', value: safeString(guild.channels.cache.size), inline: true },
            { name: 'Emojis', value: safeString(guild.emojis.cache.size), inline: true },
            { name: 'Verification Level', value: safeString(guild.verificationLevel), inline: true },
            { name: 'AFK Channel', value: guild.afkChannel ? guild.afkChannel.toString() : 'None', inline: true },
            { name: 'AFK Timeout', value: safeString(formatDuration(guild.afkTimeout * 1000)), inline: true },
            { name: 'System Channel', value: guild.systemChannel ? guild.systemChannel.toString() : 'None', inline: true },
            { name: 'Rules Channel', value: guild.rulesChannel ? guild.rulesChannel.toString() : 'None', inline: true },
            { name: 'Bot Prefix', value: safeString(prefix), inline: true }
        ],
        color: '#3498db'
    },
    emojis: {
        title: 'Emojis',
        description: 'List of server emojis.',
        fields: (guild) => [
            { name: 'Total Emojis', value: safeString(guild.emojis.cache.size), inline: true },
            { name: 'Emojis', value: guild.emojis.cache.map(emoji => `${emoji} - ${emoji.name}`).join('\n') || 'No emojis', inline: false }
        ],
        color: '#e67e22'
    },
    roles: {
        title: 'Roles',
        description: 'List of roles in the server.',
        fields: (guild) => [
            { name: 'Total Roles', value: safeString(guild.roles.cache.size), inline: true },
            { name: 'Roles', value: guild.roles.cache.map(role => `${role} - ${role.name}`).join('\n') || 'No roles', inline: false }
        ],
        color: '#9b59b6'
    },
    channels: {
        title: 'Channels',
        description: 'List of channels in the server.',
        fields: (guild) => [
            { name: 'Total Channels', value: safeString(guild.channels.cache.size), inline: true },
            { name: 'Text Channels', value: safeString(guild.channels.cache.filter(c => c.type === 'GUILD_TEXT').size), inline: true },
            { name: 'Voice Channels', value: safeString(guild.channels.cache.filter(c => c.type === 'GUILD_VOICE').size), inline: true },
            { name: 'Category Channels', value: safeString(guild.channels.cache.filter(c => c.type === 'GUILD_CATEGORY').size), inline: true },
            { name: 'News Channels', value: safeString(guild.channels.cache.filter(c => c.type === 'GUILD_NEWS').size), inline: true },
            { name: 'Store Channels', value: safeString(guild.channels.cache.filter(c => c.type === 'GUILD_STORE').size), inline: true },
            { name: 'Channels List', value: guild.channels.cache.map(c => `${c} - ${c.name} (${c.type})`).join('\n') || 'No channels', inline: false }
        ],
        color: '#27ae60'
    },
    members: {
        title: 'Members',
        description: 'Details about the server members.',
        fields: (guild) => [
            { name: 'Total Members', value: safeString(guild.memberCount), inline: true },
            { name: 'Online Members', value: safeString(guild.members.cache.filter(member => member.presence?.status === 'online').size), inline: true },
            { name: 'Idle Members', value: safeString(guild.members.cache.filter(member => member.presence?.status === 'idle').size), inline: true },
            { name: 'DND Members', value: safeString(guild.members.cache.filter(member => member.presence?.status === 'dnd').size), inline: true },
            { name: 'Offline Members', value: safeString(guild.members.cache.filter(member => member.presence?.status === 'offline').size), inline: true }
        ],
        color: '#e74c3c'
    },
    activity: {
        title: 'Server Activity',
        description: 'Recent server activity details.',
        fields: (guild) => {
            const sortedMembers = guild.members.cache.sort((a, b) => b.joinedTimestamp - a.joinedTimestamp);
            const newestMember = sortedMembers.first();
            const lastLeftMember = sortedMembers.filter(member => !member.user.presence).last(); // Simplified example

            return [
                { name: 'Newest Member', value: newestMember ? `${newestMember} - Joined on ${newestMember.joinedAt.toDateString()}` : 'N/A', inline: true },
                { name: 'Last Member to Leave', value: lastLeftMember ? `${lastLeftMember} - Left on ${lastLeftMember.joinedAt.toDateString()}` : 'N/A', inline: true }
            ];
        },
        color: '#f39c12'
    }
};

// Function to create an embed
const createEmbeds = (pageData, guild, prefix) => {
    const embeds = [];
    const fields = pageData.fields(guild, prefix);

    let currentEmbed = new EmbedBuilder()
        .setTitle(pageData.title)
        .setDescription(pageData.description)
        .setColor(pageData.color);

    let currentFieldCount = 0;
    let currentLength = 0;

    fields.forEach((field) => {
        let fieldValue = field.value;

        // If the field value exceeds 1024 characters, split it
        while (fieldValue.length > 1024) {
            const splitValue = fieldValue.slice(0, 1024);
            fieldValue = fieldValue.slice(1024);

            // Add the split field to the current embed
            currentEmbed.addFields({ name: field.name, value: splitValue, inline: field.inline });
            currentFieldCount++;
            currentLength += splitValue.length;

            // If adding this split field exceeds limits, push the current embed and start a new one
            if (
                currentFieldCount >= 25 || 
                (currentLength + currentEmbed.data.title.length + (currentEmbed.data.description ? currentEmbed.data.description.length : 0)) > 6000
            ) {
                embeds.push(currentEmbed);
                currentEmbed = new EmbedBuilder().setColor(pageData.color);
                currentFieldCount = 0;
                currentLength = 0;
            }
        }

        // Add the remaining part of the field to the current embed
        currentEmbed.addFields({ name: field.name, value: fieldValue, inline: field.inline });
        currentFieldCount++;
        currentLength += fieldValue.length;

        // If adding this field exceeds limits, push the current embed and start a new one
        if (
            currentFieldCount >= 25 || 
            (currentLength + currentEmbed.data.title.length + (currentEmbed.data.description ? currentEmbed.data.description.length : 0)) > 6000
        ) {
            embeds.push(currentEmbed);
            currentEmbed = new EmbedBuilder().setColor(pageData.color);
            currentFieldCount = 0;
            currentLength = 0;
        }
    });

    // Add the last embed if not empty
    if (currentFieldCount > 0) {
        embeds.push(currentEmbed);
    }

    return embeds;
};

// Function to handle button interaction
const handleButtonInteraction = async (i, currentPage, pagesList, pagesData, currentEmbedIndex) => {
    const currentPageIndex = pagesList.indexOf(currentPage);

    if (i.customId === 'next') {
        const nextIndex = (currentPageIndex + 1) % pagesList.length;
        return [pagesList[nextIndex], 0]; // Reset to the first embed of the next page
    } else if (i.customId === 'prev') {
        const prevIndex = (currentPageIndex - 1 + pagesList.length) % pagesList.length;
        return [pagesList[prevIndex], 0]; // Reset to the first embed of the previous page
    } else if (i.customId === 'nextEmbed') {
        const nextEmbedIndex = (currentEmbedIndex + 1) % pagesData[currentPage].length;
        return [currentPage, nextEmbedIndex];
    } else if (i.customId === 'prevEmbed') {
        const prevEmbedIndex = (currentEmbedIndex - 1 + pagesData[currentPage].length) % pagesData[currentPage].length;
        return [currentPage, prevEmbedIndex];
    } else if (i.customId === 'delete') {
        await i.message.delete();
        return [null, null];
    }
    return [currentPage, currentEmbedIndex];
};

// Function to send server info and handle interactions
export default {
    name: 'serverinfo',
    description: 'Displays detailed information about the server',
    async execute(message, args, client) {
        try {
            const guild = message.guild;
            const prefix = await getPrefixForServer(guild.id);

            const pagesList = ['general', 'emojis', 'roles', 'channels', 'members', 'activity'];
            const rows = [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('delete')
                        .setLabel('Delete')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('prevEmbed')
                        .setLabel('Previous Embed')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('nextEmbed')
                        .setLabel('Next Embed')
                        .setStyle(ButtonStyle.Primary)
                )
            ];

            let currentPage = pagesList[0];
            let currentEmbedIndex = 0;
            const pagesData = pagesList.reduce((acc, pageKey) => {
                acc[pageKey] = createEmbeds(pages[pageKey], guild, prefix); // Use createEmbeds here
                return acc;
            }, {});

            const sentMessage = await message.reply({
                embeds: [pagesData[currentPage][currentEmbedIndex]],
                components: rows
            });

            const filter = (i) => i.user.id === message.author.id;
            const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (i) => {
                const [newPage, newEmbedIndex] = await handleButtonInteraction(i, currentPage, pagesList, pagesData, currentEmbedIndex);

                if (newPage === null) {
                    collector.stop(); // Stop the collector if the message is deleted
                } else {
                    currentPage = newPage;
                    currentEmbedIndex = newEmbedIndex;
                    await i.update({ embeds: [pagesData[currentPage][currentEmbedIndex]] });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    sentMessage.edit({ components: [] });
                }
            });

        } catch (error) {
            console.error('Error executing serverinfo command:', error);
            message.reply({ content: 'There was an error trying to execute this command!' });
        }
    }
};

// Bot Mention Handling
export const handleBotMention = async (message, client) => {
    if (message.mentions.has(client.user)) {
        // Execute the serverinfo command when the bot is mentioned
        await client.commands.get('serverinfo').execute(message);
    }
};
