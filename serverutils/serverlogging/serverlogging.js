import { EmbedBuilder, AuditLogEvent } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const settingsFilePath = path.resolve(__dirname, '../../serverdata/serversettings.json');

// Enable or disable console logging for debugging
const debugLogging = true; // Set to false to disable console logging

// A set to track which guilds have logging initialized
const initializedGuilds = new Set();

// Load server settings from the JSON file
export function loadServerSettings() {
    if (fs.existsSync(settingsFilePath)) {
        return JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
    }
    return {};
}

// Helper function to send logs
export async function sendLog(guild, title, description, color = '#2ecc71', embed = null) {
    const serverSettings = loadServerSettings();
    const guildId = guild.id;

    // Check if logging is enabled for the current guild
    if (serverSettings[guildId]?.loggingEnabled) {
        const logChannelId = serverSettings[guildId].loggingChannelId;
        const logChannel = guild.channels.cache.get(logChannelId);

        if (logChannel) {
            const logEmbed = embed || new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();

            try {
                await logChannel.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error(`Failed to send log message: ${error.message}`);
            }
        } else {
            console.error(`Log channel not found for guild: ${guildId}`);
        }
    }
}

// Delay function to wait for a certain amount of time
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main event listener setup
export default async function setupLoggingEvents(client) {
    await delay(5000);
    console.log('Bot startup successful. Logging events initialized.');

    const serverSettings = loadServerSettings();

    client.guilds.cache.forEach(guild => {
        const guildId = guild.id;

        // Check if logging is already initialized for this guild
        if (initializedGuilds.has(guildId)) {
            if (debugLogging) {
                console.log(`Logging already initialized for guild: ${guildId}`);
            }
            return; // Skip if logging is already initialized for this guild
        }

        if (serverSettings[guildId]?.loggingEnabled) {
            if (debugLogging) {
                console.log(`Logging is enabled for guild: ${guildId}`);
            }

            // Mark the guild as initialized
            initializedGuilds.add(guildId);

            client.on('guildMemberAdd', async (member) => {
                if (member.guild.id !== guildId) return;
                await sendLog(member.guild, '📥 Member Joined', `**${member.user.tag}** has joined the server.`, '#3498db');
            });

            client.on('guildMemberUpdate', async (oldMember, newMember) => {
                // Check if the update is from the specified guild
                if (oldMember.guild.id !== guildId) return;
            
                // Check roles added and removed
                const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
                const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
            
                // Check mute status
                const wasMuted = oldMember.communicationDisabledUntilTimestamp !== null;
                const isMuted = newMember.communicationDisabledUntilTimestamp !== null;

                // Log mute and unmute events
                if (wasMuted && !isMuted) {
                    const muteDuration = oldMember.communicationDisabledUntilTimestamp - Date.now();
                    const muteDurationString = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.floor(muteDuration / 1000 / 60), 'minutes');
                    await sendLog(newMember.guild, '🔊 Unmuted', `**${newMember.user.tag}** has been unmuted.`, '#2ecc71');
                } else if (!wasMuted && isMuted) {
                    const muteDuration = newMember.communicationDisabledUntilTimestamp - Date.now();
                    const muteDurationString = new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.floor(muteDuration / 1000 / 60), 'minutes');
                    await sendLog(newMember.guild, '🔕 Muted', `**${newMember.user.tag}** has been muted for **${muteDurationString}**.`, '#e74c3c');
                }
            
                // Log role updates separately
                if (addedRoles.size > 0 || removedRoles.size > 0) {
                    let admin = 'Unknown';
                    try {
                        const fetchedLogs = await newMember.guild.fetchAuditLogs({
                            limit: 1,
                            type: AuditLogEvent.MemberRoleUpdate,
                        });
                        const roleLog = fetchedLogs.entries.first();
            
                        // Check if the log is valid and matches the newMember
                        if (roleLog && roleLog.target.id === newMember.id) {
                            admin = roleLog.executor.tag;
                        }
                    } catch (error) {
                        console.error('Error fetching audit logs:', error);
                    }
            
                    // Create an embed for the role update log
                    const embed = new EmbedBuilder()
                        .setColor('#9b59b6') // Purple color for role updates
                        .setTitle(`🔄 Role Updated by ${admin}`)
                        .setDescription(`**${newMember.user.tag}** had their roles updated.`)
                        .setTimestamp();
            
                    // Add added roles to the embed
                    if (addedRoles.size > 0) {
                        const addedRoleNames = addedRoles.map(role => `<@&${role.id}>`).join(', ') || 'None';
                        embed.addFields({ name: '🟢 Roles Added', value: addedRoleNames, inline: true });
                    }
            
                    // Add removed roles to the embed
                    if (removedRoles.size > 0) {
                        const removedRoleNames = removedRoles.map(role => `<@&${role.id}>`).join(', ') || 'None';
                        embed.addFields({ name: '🔴 Roles Removed', value: removedRoleNames, inline: true });
                    }
            
                    embed.setFooter({ text: `User ID: ${newMember.id}` });
                    await sendLog(newMember.guild, embed.title, embed.description, embed.color, embed);
                }
            });
            
            client.on('guildMemberRemove', async (member) => {
                if (member.guild.id !== guildId) return;
                await sendLog(member.guild, '📤 Member Left', `**${member.user.tag}** has left the server.`, '#e74c3c');
            });

            client.on('userUpdate', async (oldUser, newUser) => {
                const guild = client.guilds.cache.find(g => g.members.cache.has(newUser.id) && g.id === guildId);
                if (!guild) return;

                if (oldUser.username !== newUser.username) {
                    await sendLog(guild, '🔤 Username Changed', `**${oldUser.tag}** changed their username to **${newUser.tag}**.`, '#f1c40f');
                }

                if (oldUser.avatar !== newUser.avatar) {
                    await sendLog(guild, '🖼 Avatar Changed', `**${newUser.tag}** has changed their avatar.`, '#8e44ad');
                }
            });

            client.on('channelCreate', async (channel) => {
                if (channel.guild.id !== guildId) return;
                await sendLog(channel.guild, '📂 Channel Created', `#️⃣ Channel **${channel.name}** was created.`, '#1abc9c');
            });

            client.on('channelDelete', async (channel) => {
                if (channel.guild.id !== guildId) return;
                await sendLog(channel.guild, '🚫 Channel Deleted', `#️⃣ Channel **${channel.name}** was deleted.`, '#e74c3c');
            });

            client.on('roleCreate', async (role) => {
                if (role.guild.id !== guildId) return;
                await sendLog(role.guild, '🔖 Role Created', `**${role.name}** role was created.`, '#2ecc71');
            });

            client.on('roleDelete', async (role) => {
                if (role.guild.id !== guildId) return;
                await sendLog(role.guild, '🚫 Role Deleted', `**${role.name}** role was deleted.`, '#e74c3c');
            });

            client.on('guildUpdate', async (oldGuild, newGuild) => {
                if (newGuild.id !== guildId) return;

                if (oldGuild.name !== newGuild.name) {
                    await sendLog(newGuild, '🏷 Server Name Changed', `Server name changed from **${oldGuild.name}** to **${newGuild.name}**.`, '#f39c12');
                }
            });

            client.on('messageDelete', async (message) => {
                if (message.guild?.id !== guildId || message.partial || message.author.bot) return;
                await sendLog(message.guild, '🗑️ Message Deleted', `Message from **${message.author.tag}** deleted in **#${message.channel.name}**: \n${message.content}`, '#e74c3c');
            });

            client.on('messageUpdate', async (oldMessage, newMessage) => {
                if (newMessage.guild?.id !== guildId || newMessage.partial || oldMessage.partial || newMessage.author.bot) return;
                await sendLog(newMessage.guild, '📝 Message Edited', `Message from **${newMessage.author.tag}** edited in **#${newMessage.channel.name}**: \n**Before:** ${oldMessage.content}\n**After:** ${newMessage.content}`, '#f39c12');
            });

            client.on('voiceStateUpdate', async (oldState, newState) => {
                if (oldState.guild.id !== guildId) return;

                const userTag = newState.member.user.tag;
                const oldChannel = oldState.channel ? `#${oldState.channel.name}` : 'None';
                const newChannel = newState.channel ? `#${newState.channel.name}` : 'None';

                if (oldState.channelId !== newState.channelId) {
                    const title = '🔊 Voice Channel Update';
                    const description = `**${userTag}** moved from **${oldChannel}** to **${newChannel}**.`;
                    const color = '#3498db'; // Blue for voice channel update
                    await sendLog(newState.guild, title, description, color);
                }
            });
        } else {
            if (debugLogging) {
                console.log(`Logging is not enabled for guild: ${guildId}`);
            }
        }
    });
}
