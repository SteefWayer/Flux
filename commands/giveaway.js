import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import ms from 'ms';
import fs from 'fs';
import { pickWinners } from '../pickWinners.js';

const log = (...messages) => {
    console.log(...messages);
};

export default {
    name: 'giveaway',
    aliases: ['gaw'],
    description: 'Start a giveaway',

    async execute(message, args, client, context, serverSettings) {
        try {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return message.reply("You don't have permission to use this command.");
            }

            const input = args.join(' ');
            const parts = input.split('/');

            if (parts.length < 3) {
                const helpEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Giveaway Command Usage')
                    .setDescription('Please provide the following arguments to start a giveaway:')
                    .addFields(
                        { name: 'Title', value: 'The title of the giveaway. **Required**', inline: false },
                        { name: 'Duration', value: 'Duration of the giveaway (e.g., "10m", "1h"). **Required**', inline: false },
                        { name: 'Description', value: 'Description of the giveaway. **Required**', inline: false },
                        { name: 'Boost Role', value: 'Role to boost the giveaway (optional)', inline: false },
                        { name: 'Give Role', value: 'Role to give upon winning (optional)', inline: false },
                        { name: 'Role Duration', value: 'Duration in minutes for how long the role should be assigned (optional)', inline: false },
                        { name: 'Winners', value: 'Number of winners (optional)', inline: false }
                    )
                    .setFooter({ text: 'Example: !giveaway Title/10m/Description/RoleBoost/RoleGive/30/2' });

                return message.reply({ embeds: [helpEmbed] });
            }

            const title = parts[0].trim();
            const duration = parts[1].trim();
            const description = parts.slice(2, parts.length - 4).join('/').trim();
            const numberOfWinners = parseInt(parts[parts.length - 1]) || 1;
            const roleBoost = message.guild.roles.cache.find(role => role.name === parts[3]) || null;
            const roleGive = message.guild.roles.cache.find(role => role.name === parts[4]) || null;
            const roleDuration = parseInt(parts[5]) || 0;

            const giveawayDuration = ms(duration);
            if (!giveawayDuration || giveawayDuration <= 0) {
                return message.reply('Invalid duration format. Please use a valid format (e.g., "10m", "1h").');
            }

            const giveawayEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor('#00FF00')
                .addFields(
                    { name: 'Duration', value: `${duration}`, inline: false },
                    { name: 'Number of Winners', value: `${numberOfWinners}`, inline: false },
                    ...(roleBoost ? [{ name: 'Boost Role', value: roleBoost.name, inline: false }] : []),
                    ...(roleGive ? [{ name: 'Give Role', value: roleGive.name, inline: false }] : []),
                    ...(roleDuration > 0 ? [{ name: 'Role Duration', value: `${roleDuration} minutes`, inline: false }] : []),
                )
                .setFooter({ text: 'React with 🎉 to participate!' });

            const giveawayMessage = await message.channel.send({ embeds: [giveawayEmbed] });

            const updatedFooterEmbed = new EmbedBuilder(giveawayEmbed.toJSON())
                .setFooter({ text: `React with 🎉 to participate! | Message ID: ${giveawayMessage.id}` });

            await giveawayMessage.edit({ embeds: [updatedFooterEmbed] });
            await giveawayMessage.react('🎉');

            const giveawayData = {
                messageId: giveawayMessage.id,
                guildId: message.guild.id,
                channelId: message.channel.id,
                title,
                description,
                duration,
                numberOfWinners,
                roleBoost: roleBoost ? roleBoost.id : null,
                roleGive: roleGive ? roleGive.id : null,
                roleDuration,
                createdAt: new Date().toISOString(),
                winners: [],
                participants: [],
                ended: false
            };

            const giveawaysPath = './serverdata/giveaways.json';
            let giveaways = [];
            if (fs.existsSync(giveawaysPath)) {
                const data = fs.readFileSync(giveawaysPath);
                giveaways = JSON.parse(data);
            }
            giveaways.push(giveawayData);
            fs.writeFileSync(giveawaysPath, JSON.stringify(giveaways, null, 2));

            log(`Giveaway started and saved with message ID: ${giveawayMessage.id} in channel ID: ${message.channel.id}`);

            const collector = giveawayMessage.createReactionCollector({
                filter: (reaction, user) => reaction.emoji.name === '🎉' && !user.bot,
                time: giveawayDuration,
            });

            collector.on('collect', () => {
                const joinCount = collector.collected.size;
                const updatedEmbed = new EmbedBuilder(giveawayEmbed.toJSON())
                    .setFooter({ text: `React with 🎉 to participate! ${joinCount} joined so far. | Message ID: ${giveawayMessage.id}` });
                giveawayMessage.edit({ embeds: [updatedEmbed] });
            });

            collector.on('end', async () => {
                const currentGiveaway = giveaways.find(g => g.messageId === giveawayMessage.id);
                if (currentGiveaway && currentGiveaway.ended) {
                    await message.channel.send(`🎉 The giveaway for **${title}** has ended! 🎉\nWinners: ${currentGiveaway.winners.map(id => `<@${id}>`).join(', ') || 'No winners'}`);
                    return;
                }

                const { winners, participants } = await pickWinners(giveawayMessage, numberOfWinners, roleBoost, roleGive, roleDuration);
                const winnerList = winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'No winners';

                await message.channel.send(`🎉 The giveaway for **${title}** has ended! 🎉\nWinners: ${winnerList}`);

                const updatedGiveawayData = {
                    ...giveawayData,
                    winners,
                    participants,
                    ended: true
                };

                const index = giveaways.findIndex(g => g.messageId === giveawayMessage.id);
                if (index !== -1) {
                    giveaways[index] = updatedGiveawayData;
                    fs.writeFileSync(giveawaysPath, JSON.stringify(giveaways, null, 2));
                }

                log(`Giveaway ended. Winners: ${winnerList} in channel ID: ${message.channel.id}`);
            });
        } catch (error) {
            console.error('Error executing giveaway command:', error);
            message.reply('There was an error executing the giveaway command.');
        }
    }
};
