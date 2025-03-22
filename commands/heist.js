import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import ms from 'ms';

// Define the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the path to the JSON file
const jsonFilePath = resolve(__dirname, '../serverdata/mainheist.json');

// Function to read data from JSON file
const readJsonFile = () => {
    if (!fs.existsSync(jsonFilePath)) {
        fs.writeFileSync(jsonFilePath, JSON.stringify({}), 'utf8');
    }
    const rawData = fs.readFileSync(jsonFilePath);
    return JSON.parse(rawData);
};

// Function to write data to JSON file
const writeJsonFile = (data) => {
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
};

// Global variable to track active heists
const activeHeists = new Map();

// Utility function for logging
const log = (...messages) => {
    console.log(...messages);
};

// Utility function to delete all unpinned messages
const deleteAllMessages = async (channel) => {
    let messages = await channel.messages.fetch();
    while (messages.size > 0) {
        const messagesToDelete = messages.filter(msg => !msg.pinned);
        if (messagesToDelete.size > 0) {
            try {
                await channel.bulkDelete(messagesToDelete, true);
                messages = await channel.messages.fetch(); // Fetch messages again after deletion
            } catch (error) {
                log(`[heist] Error deleting messages: ${error.message}`);
                break; // Break the loop if an error occurs
            }
        } else {
            break; // Exit loop if no unpinned messages left
        }
    }
};

export default {
    name: 'heist',
    description: 'Initiates a heist in the specific guild.',
    cooldown: 10, // Cooldown in seconds

    async execute(message, args, client, context) {
        // Ensure `context` is correctly handled
        if (!context) {
            log('[heist] Context is undefined.');
            return;
        }

        const guildId = message.guild.id;
        const allowedRoleIdsPerGuild = {
            '1272538741986168893': ['1272538742011330607', '123456789012345678', '1277686885233197199', '1278188800975175754'],
            '1276929369545248889': ['1278188800975175754'],
        };
        const roleChancesPerGuild = {
            '1272538741986168893': {
                '1277686885233197199': 1.3,
                '123456789012345678': 1.5,
            },
            '1276929369545248889': {
                '1278188800975175754': 1.5,
            },
        };

        if (!allowedRoleIdsPerGuild[guildId] || !roleChancesPerGuild[guildId]) {
            log(`[heist] Guild ${guildId} is not configured.`);
            return message.reply('This command is not configured for your guild.');
        }

        const allowedRoleIds = allowedRoleIdsPerGuild[guildId];
        const roleChances = roleChancesPerGuild[guildId];

        const hasRole = message.member.roles.cache.some(role => allowedRoleIds.includes(role.id));
        if (!hasRole) {
            log(`[heist] User ${message.author.id} does not have the required role.`);
            return message.reply('You do not have the required role to use this command.');
        }

        // Read the current heist data
        const heistData = readJsonFile();

        if (args[0] === 'stop') {
            if (!activeHeists.has(guildId)) {
                log(`[heist] No active heist to stop in guild ${guildId}.`);
                return message.reply('No active heist to stop.');
            }

            const { heistMessage, collector, usersSet } = activeHeists.get(guildId);
            collector.stop('Heist stopped by command');

            const role = message.guild.roles.cache.find(role => role.name === 'Heist Member');
            if (role) {
                usersSet.forEach(async userId => {
                    const member = message.guild.members.cache.get(userId);
                    if (member) {
                        try {
                            await member.roles.remove(role);
                            log(`[heist] Role removed from user: ${userId}`);
                        } catch (error) {
                            log(`[heist] Error removing role from user <@${userId}>: ${error.message}`);
                        }
                    }
                });
            }

            await deleteAllMessages(message.channel);
            activeHeists.delete(guildId);

            // Update the heist history
            if (!heistData[guildId]) {
                heistData[guildId] = { count: 0, history: [] };
            }
            heistData[guildId].history.push({
                timestamp: new Date().toISOString(),
                result: 'Heist stopped by command'
            });

            // Show the history of the last 10 heists and the total count
            const history = heistData[guildId].history.slice(-10).reverse();
            const historyText = history.map((entry, index) => `**${index + 1}.** ${entry.timestamp} - ${entry.result}`).join('\n');
            const totalCount = heistData[guildId].count;

            return message.channel.send(`Heist stopped.\n\n**Total Heists:** ${totalCount}\n**Last 10 Heists:**\n${historyText}`);
        }

        if (args[0] === 'roll' || args[0] === 'reroll') {
            if (!activeHeists.has(guildId)) {
                log(`[heist] No active heist to ${args[0]} participants in guild ${guildId}.`);
                return message.reply(`No active heist to ${args[0]} for.`);
            }

            const { usersSet } = activeHeists.get(guildId);
            if (usersSet.size < 3) {
                log(`[heist] Not enough participants to ${args[0]} for the heist. Participants: ${usersSet.size}`);
                return message.reply(`Not enough participants to ${args[0]} for the heist.`);
            }

            log(`[heist] ${args[0]}ing for participants in guild ${guildId}.`);
            await selectAndAssignRoles(message, usersSet, roleChances);

            // Update and write the heist count
            if (!heistData[guildId]) {
                heistData[guildId] = { count: 0, history: [] };
            }
            heistData[guildId].count += 1;
            heistData[guildId].history.push({
                timestamp: new Date().toISOString(),
                participants: Array.from(usersSet),
                result: 'Heist completed'
            });
            writeJsonFile(heistData);

            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Heist Time!')
            .setDescription('Click the button below to join the heist or leave if you change your mind. \nParticipants will be shown in the embed.')
            .setImage(context.thumb)
            .setTimestamp();

        const joinButton = new ButtonBuilder()
            .setCustomId('join_heist')
            .setLabel('Join Heist')
            .setStyle(ButtonStyle.Primary);

        const leaveButton = new ButtonBuilder()
            .setCustomId('leave_heist')
            .setLabel('Leave Heist')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder().addComponents(joinButton, leaveButton);
        const heistMessage = await message.channel.send({ embeds: [embed], components: [actionRow] });

        const filter = interaction => !interaction.user.bot;
        const collector = heistMessage.createMessageComponentCollector({ filter, time: 3600000 }); // 1 hour duration

        activeHeists.set(guildId, { heistMessage, collector, usersSet: new Set() });

        collector.on('collect', async interaction => {
            const usersSet = activeHeists.get(guildId).usersSet;
            if (interaction.customId === 'join_heist') {
                if (!usersSet.has(interaction.user.id)) {
                    usersSet.add(interaction.user.id);
                    const updatedEmbed = embed
                        .setDescription(`Click the button below to join the heist or leave if you change your mind. Participants:\n${Array.from(usersSet).map(id => `<@${id}>`).join(', ')}`);
                    await interaction.deferUpdate();
                    await heistMessage.edit({ embeds: [updatedEmbed] });
                    await interaction.followUp({ content: 'You have joined the heist!', ephemeral: true });
                }
            } else if (interaction.customId === 'leave_heist') {
                if (usersSet.has(interaction.user.id)) {
                    usersSet.delete(interaction.user.id);
                    const updatedEmbed = embed
                        .setDescription(`Click the button below to join the heist or leave if you change your mind. Participants:\n${Array.from(usersSet).map(id => `<@${id}>`).join(', ')}`);
                    await interaction.deferUpdate();
                    await heistMessage.edit({ embeds: [updatedEmbed] });
                    await interaction.followUp({ content: 'You have left the heist.', ephemeral: true });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            log(`[heist] Collector ended with reason: ${reason}`);
            if (reason === 'time') {
                log(`[heist] Collector ended due to timeout. Proceeding with 3-minute countdown.`);
                await message.channel.send('The heist has ended.');

                const { usersSet } = activeHeists.get(guildId);
               
                log(`[heist] Number of participants: ${usersSet.size}`);

                if (usersSet.size >= 3) {
                    log('[heist] Sufficient participants, starting 3-minute countdown.');
                    setTimeout(async () => {
                        log('[heist] 3-minute countdown completed. Rolling participants now.');
                        try {
                            await selectAndAssignRoles(message, usersSet, roleChances);
                            await message.channel.send('Heist completed. Participants have been rolled.');
                        } catch (error) {
                            log(`[heist] Error during role assignment: ${error.message}`);
                        }
                    }, 180000); // 3 minutes in milliseconds
                } else {
                    log('[heist] Not enough participants to start the heist.');
                    await message.channel.send('Not enough participants for the heist.');
                    await deleteAllMessages(message.channel);
                    await heistMessage.delete();
                    activeHeists.delete(guildId);
                }
            } else if (reason === 'Heist stopped by command') {
                log(`[heist] Heist stopped by command.`);
                return;
            }
        });
    },
};

async function selectAndAssignRoles(message, usersSet, roleChances) {
    log(`[heist] Selecting and assigning roles.`);
    const weightedUsers = Array.from(usersSet).map(userId => {
        const member = message.guild.members.cache.get(userId);
        let weight = 1.0;
        if (member) {
            member.roles.cache.forEach(role => {
                if (roleChances[role.id]) {
                    weight *= roleChances[role.id];
                }
            });
        }
        return { userId, weight };
    });

    log(`[heist] Weighted users: ${JSON.stringify(weightedUsers)}`);

    const selectedUsers = [];
    for (let i = 0; i < 3; i++) {
        const totalWeight = weightedUsers.reduce((sum, user) => sum + user.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        for (const user of weightedUsers) {
            if (randomWeight < user.weight) {
                selectedUsers.push(user.userId);
                weightedUsers.splice(weightedUsers.indexOf(user), 1);
                break;
            }
            randomWeight -= user.weight;
        }
    }

    log(`[heist] Selected users: ${selectedUsers}`);

    const role = message.guild.roles.cache.find(role => role.name === 'Heist Member');
    if (!role) {
        log('[heist] Heist Member role not found.');
        return;
    }

    for (const userId of selectedUsers) {
        const member = message.guild.members.cache.get(userId);
        if (member) {
            try {
                await member.roles.add(role);
                log(`[heist] Role added to user: ${userId}`);
            } catch (error) {
                log(`[heist] Error adding role to user <@${userId}>: ${error.message}`);
            }
        }
    }

    const mentionString = selectedUsers.map(id => `<@${id}>`).join(', ');
    await message.channel.send(`The following users have been selected for the heist: ${mentionString}.`);
}

