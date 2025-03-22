// commands/invites.js
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'invites',
    description: 'Shows the number of invites the user has in the guild.',
    aliases: ['invites'],
    cooldown: 5, // Cooldown in seconds
    execute: async (message, args, client, context) => {
        const guild = message.guild;
        const user = message.author;

        if (!guild) {
            return message.reply('This command can only be used in a guild.');
        }

        try {
            // Ensure the bot has all members cached
            await guild.members.fetch();

            // Handle leaderboard or specific user request
            if (args[0] === 'leaderboard' || args[0] === 'lb') {
                // Handle leaderboard
                const invites = await guild.invites.fetch();

                const inviteCounts = new Map();

                invites.forEach(invite => {
                    if (invite.inviter) {
                        const inviterId = invite.inviter.id;
                        inviteCounts.set(inviterId, (inviteCounts.get(inviterId) || 0) + invite.uses);
                    }
                });

                const inviteArray = Array.from(inviteCounts.entries())
                    .map(([id, count]) => ({ id, count }))
                    .sort((a, b) => b.count - a.count);

                const topInviters = inviteArray.slice(0, 10);

                const leaderboardEmbed = new EmbedBuilder()
                    .setColor('#F1C40F') // Bright yellow
                    .setTitle('🎉 Invite Leaderboard 🎉')
                    .setDescription(`Top 10 users with the most invites in **${guild.name}**`)
                    .addFields(
                        ...topInviters.map((user, index) => {
                            const member = guild.members.cache.get(user.id);
                            return {
                                name: `${index + 1}. ${member ? member.user.tag : 'Unknown User'}`,
                                value: `📈 Invites: ${user.count}`,
                                inline: false
                            };
                        })
                    )
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });

                await message.reply({ embeds: [leaderboardEmbed] });
            } else if (args[0]) {
                // Handle specific user request
                let targetUser;

                if (args[0].startsWith('<@') && args[0].endsWith('>')) {
                    // Mentioned user
                    const userId = args[0].replace(/[<@!>]/g, '');
                    targetUser = guild.members.cache.get(userId);
                } else {
                    // User ID
                    targetUser = guild.members.cache.get(args[0]);
                }

                if (!targetUser) {
                    // Fetch the user if not in cache
                    targetUser = await guild.members.fetch(args[0]).catch(() => null);
                }

                if (!targetUser) {
                    return message.reply('User not found. Please mention a valid user or provide a user ID.');
                }

                // Fetch the invites again to ensure up-to-date data
                const invites = await guild.invites.fetch();
                let userInvitesCount = 0;

                invites.forEach(invite => {
                    if (invite.inviter && invite.inviter.id === targetUser.id) {
                        userInvitesCount += invite.uses;
                    }
                });

                const inviteEmbed = new EmbedBuilder()
                    .setColor('#E67E22') // Orange
                    .setTitle('📊 Invite Information 📊')
                    .setDescription(`Invite details for **${targetUser.user.tag}** in **${guild.name}**`)
                    .addFields(
                        { name: '👤 User:', value: `${targetUser.user.tag}`, inline: true },
                        { name: '📈 Total Invites:', value: `${userInvitesCount}`, inline: true },
                        { name: '🌐 Guild Name:', value: `${guild.name}`, inline: true },
                        { name: '👥 Total Members:', value: `${guild.memberCount}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });

                await message.reply({ embeds: [inviteEmbed] });
            } else {
                // Handle the current user's invites
                const invites = await guild.invites.fetch();
                let userInvitesCount = 0;

                invites.forEach(invite => {
                    if (invite.inviter && invite.inviter.id === user.id) {
                        userInvitesCount += invite.uses;
                    }
                });

                const inviteEmbed = new EmbedBuilder()
                    .setColor('#9B59B6') // Purple
                    .setTitle('📊 Your Invite Information 📊')
                    .setDescription(`Here is the information about your invites in **${guild.name}**`)
                    .addFields(
                        { name: '👤 User:', value: `${user.tag}`, inline: true },
                        { name: '📈 Total Invites:', value: `${userInvitesCount}`, inline: true },
                        { name: '🌐 Guild Name:', value: `${guild.name}`, inline: true },
                        { name: '👥 Total Members:', value: `${guild.memberCount}`, inline: true },
                        { name: '📜 Total Invites:', value: `${invites.size}`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${user.tag}`, iconURL: user.displayAvatarURL() });

                await message.reply({ embeds: [inviteEmbed] });
            }
        } catch (error) {
            console.error('Error executing invites command:', error);
            message.reply('There was an error executing the invites command. Please try again later.');
        }
    }
};
