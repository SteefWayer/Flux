import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';

const usersPerPage = 10;
const messageCountFile = path.resolve('./serverdata/messagecount.json');

const loadMessageCounts = () => {
    if (!fs.existsSync(messageCountFile)) return {};
    const data = fs.readFileSync(messageCountFile);
    return JSON.parse(data);
};

const saveMessageCounts = (data) => {
    try {
        console.log("Attempting to save message counts:", data);
        fs.writeFileSync(messageCountFile, JSON.stringify(data, null, 2));
        console.log("Message count data saved successfully.");
    } catch (err) {
        console.error("Failed to save message count data:", err);
    }
};

const fetchGuildMessages = async (guild) => {
    const messageCounts = loadMessageCounts();
    
    if (!guild || !guild.id) {
        console.error("Invalid guild or guild ID.");
        return messageCounts;
    }
    
    const channels = guild.channels.cache.filter(channel => 
        channel.isTextBased() && channel.viewable
    );

    console.log(`Fetching messages from ${channels.size} channels...`);
    
    for (const channel of channels.values()) {
        let lastMessageId;

        try {
            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) options.before = lastMessageId;

                const messages = await channel.messages.fetch(options);
                if (messages.size === 0) break;

                console.log(`Fetched ${messages.size} messages from ${channel.name}`);

                messages.forEach((msg) => {
                    if (msg.author && !msg.author.bot) {
                        const userId = msg.author.id;
            
                        if (!messageCounts[guild.id]) {
                            messageCounts[guild.id] = { users: {} };
                        }
            
                        if (!messageCounts[guild.id].users[userId]) {
                            messageCounts[guild.id].users[userId] = { count: 0, commands: 0, username: msg.author.username };
                        }
            
                        messageCounts[guild.id].users[userId].count += 1;
                    }
                });

                lastMessageId = messages.last().id;
            }
            
        } catch (error) {
            console.error(`Error fetching messages in channel ${channel.name}:`, error);
        }
    }

    saveMessageCounts(messageCounts);
    return messageCounts;
};

const createLeaderboardEmbed = (sortedUsers, page, totalPages) => {
    const embed = new EmbedBuilder()
        .setTitle(`Message Leaderboard - Page ${page}/${totalPages}`)
        .setDescription(
            sortedUsers.map((user, index) => {
                const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
                return `${rankEmoji} <@${user.id}> - **Total Messages**: ${user.messages}`;
            }).join('\n') || 'No messages found.'
        )
        .setColor('#00ff00')
        .setTimestamp();
    
    return embed;
};

const checkForMissingUsers = async (guild) => {
    const messageCounts = loadMessageCounts();
    const guildData = messageCounts[guild.id]?.users || {};
    const members = await guild.members.fetch();
    const missingUsers = [];

    members.forEach(member => {
        if (!guildData[member.user.id] && !member.user.bot) {
            missingUsers.push(member.user.id);
        }
    });

    console.log(`Missing users: ${missingUsers.length}`);
    return missingUsers.length > 0 ? missingUsers : null;
};

const sendLeaderboard = async (channel, page = 1, previousMessage = null) => {
    const messageCounts = loadMessageCounts();
    const userCounts = messageCounts[channel.guild.id]?.users || {};
    const sortedUsers = Object.keys(userCounts)
        .map(id => ({
            id,
            username: userCounts[id].username || 'Unknown',
            messages: userCounts[id].count || 0,
        }))
        .sort((a, b) => b.messages - a.messages);

    const totalPages = Math.ceil(sortedUsers.length / usersPerPage);
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToDisplay = sortedUsers.slice(startIndex, endIndex);

    const embed = createLeaderboardEmbed(usersToDisplay, page, totalPages);

    const createPaginationRow = (currentPage, totalPages) => {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('previous')
                    .setLabel('Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === 1),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentPage === totalPages)
            );
    };

    const row = createPaginationRow(page, totalPages);

    if (!previousMessage) {
        previousMessage = await channel.send({ embeds: [embed], components: [row] });
    } else {
        await previousMessage.edit({ embeds: [embed], components: [row] });
    }

    const filter = interaction => interaction.customId === 'previous' || interaction.customId === 'next';
    const collector = previousMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (interaction) => {
        try {
            await interaction.deferUpdate();

            let nextPage = page; 
            if (interaction.customId === 'previous') {
                nextPage = Math.max(1, page - 1);
            } else if (interaction.customId === 'next') {
                nextPage = Math.min(totalPages, page + 1); 
            }

            if (nextPage !== page) {
                const newEmbed = createLeaderboardEmbed(
                    sortedUsers.slice((nextPage - 1) * usersPerPage, nextPage * usersPerPage),
                    nextPage,
                    totalPages
                );
                const newRow = createPaginationRow(nextPage, totalPages);
                await previousMessage.edit({ embeds: [newEmbed], components: [newRow] });
                page = nextPage; 
            }
        } catch (error) {
            console.error("Error handling button interaction:", error);
        }
    });

    collector.on('end', collected => {
        previousMessage.edit({ components: [] });
    });
};

export const handleMessages = async (message) => {
    const guild = message.guild;
    if (!guild) return message.reply("This command can only be used in a server.");
    console.log("Getting leaderboard...");

    const missingUsers = await checkForMissingUsers(guild);
    if (missingUsers) {
        console.log(`Missing users detected, fetching messages for all channels...`);
        await fetchGuildMessages(guild);
    }

    console.log("Sending leaderboard...");
    await sendLeaderboard(message.channel);
};
