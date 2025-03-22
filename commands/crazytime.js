import { AttachmentBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { handleCoinFlip } from '../utils/crazytime/coinflip.js';
import { handlePachinko } from '../utils/crazytime/pachinko.js';
import { handleCashHunt } from '../utils/crazytime/cashhunt.js';
import { handleCrazyTimeGame } from '../utils/crazytime/crazytimegame.js';
import { createGameMessage } from '../utils/crazytime/gameEmbed.js';
import { selectRandomSegment, handleNumberBets } from '../utils/crazytime/numbers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handleCrazyTimeCommand = async (message) => {
    const betsFilePath = path.join(__dirname, '../CTtemp/bets.json');

    try {
        const betButtons = [
            new ButtonBuilder().setCustomId('bet_100').setLabel('$100').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bet_1000').setLabel('$1,000').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bet_10000').setLabel('$10,000').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bet_100000').setLabel('$100,000').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bet_1000000').setLabel('$1,000,000').setStyle(ButtonStyle.Primary),
        ];

        const row = new ActionRowBuilder().addComponents(betButtons);

        const initialEmbed = new EmbedBuilder()
            .setTitle('💰 Place Your Bet! 💰')
            .setDescription('Select your bet amount by clicking one of the buttons below.')
            .setColor('#FFD700');

        const initialMessage = await message.reply({
            embeds: [initialEmbed],
            components: [row],
        });

        await createGameMessage(message);

        const filter = (interaction) => interaction.user.id === message.author.id;

        const collector = initialMessage.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async (interaction) => {
            await interaction.deferUpdate();
            const betAmount = parseInt(interaction.customId.split('_')[1]);

            const userKey = `${interaction.guild.id}_${interaction.channel.id}_${interaction.user.id}`;

            let existingBets = {};
            if (fs.existsSync(betsFilePath)) {
                existingBets = await fs.readJson(betsFilePath);
            }

            if (!existingBets.guild) {
                existingBets.guild = interaction.guild.id;
                existingBets.channels = {};
            }

            if (!existingBets.channels[interaction.channel.id]) {
                existingBets.channels[interaction.channel.id] = [];
            }

            const userBetEntry = existingBets.channels[interaction.channel.id].find(b => b.user === interaction.user.id);

            if (userBetEntry) {
                userBetEntry.selected = betAmount;
                console.log(`User ${interaction.user.tag} updated their selected bet to $${betAmount.toLocaleString()}.`);
            } else {
                existingBets.channels[interaction.channel.id].push({
                    user: interaction.user.id,
                    selected: betAmount,
                    bets: {}
                });
                console.log(`User ${interaction.user.tag} placed a new selected bet of $${betAmount.toLocaleString()}.`);
            }

            await fs.writeJson(betsFilePath, existingBets, { spaces: 2 });

            const spinningEmbed = new EmbedBuilder()
                .setTitle('Spinning the Crazy Time Wheel!')
                .setImage('attachment://ctwheelrotating.gif')
                .setColor('#FFD700');

            const gifAttachment = new AttachmentBuilder(path.join(__dirname, '../utils/gifs/ctwheelrotating.gif'), { name: 'ctwheelrotating.gif' });

            const embedMessage = await message.channel.send({
                embeds: [spinningEmbed],
                files: [gifAttachment],
            });

            await new Promise((resolve) => setTimeout(resolve, 5000));
            const selectedSegment = selectRandomSegment();

            if (embedMessage.attachments.size > 0) {
                await embedMessage.delete();
                console.log('Attachment deleted.');
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle(`The wheel landed on **${selectedSegment.name}**!`)
                .setColor('#FFD700');

            await message.channel.send({ embeds: [resultEmbed] });

            if (['Pachinko', 'Cash Hunt', 'Coin Flip', 'Crazy Time'].includes(selectedSegment.name)) {
                switch (selectedSegment.name) {
                    case 'Pachinko':
                        await handlePachinko(message);
                        break;
                    case 'Cash Hunt':
                        await handleCashHunt(message);
                        break;
                    case 'Coin Flip':
                        await handleCoinFlip(message);
                        break;
                    case 'Crazy Time':
                        await handleCrazyTimeGame(message);
                        break;
                    default:
                        console.log('No matching game found.');
                }
            } else {
                let winningUsers = [];
                for (const betEntry of existingBets.channels[interaction.channel.id]) {
                    const userBets = betEntry.bets;
                    const winningBet = userBets[selectedSegment.name];

                    if (winningBet) {
                        const multiplier = selectedSegment.name === '1' ? 1 : selectedSegment.name === '2' ? 2 :
                            selectedSegment.name === '5' ? 5 : selectedSegment.name === '10' ? 10 : 0;

                        const winningAmount = winningBet * multiplier;
                        if (winningAmount > 0) {
                            winningUsers.push({
                                username: await message.guild.members.fetch(betEntry.user).then(member => member.user.username),
                                amountWon: winningAmount
                            });
                        }
                    }
                }

                if (winningUsers.length > 0) {
                    let winnersDescription = winningUsers.map(user => `${user.username} won **$${user.amountWon.toLocaleString()}**`).join('\n');
                    const winnersEmbed = new EmbedBuilder()
                        .setTitle(`The wheel landed on **${selectedSegment.name}**!`)
                        .setDescription(winnersDescription)
                        .setColor('#FFD700');

                    await message.channel.send({ embeds: [winnersEmbed] });
                } else {
                    const noWinnersEmbed = new EmbedBuilder()
                        .setTitle(`The wheel landed on **${selectedSegment.name}**!`)
                        .setDescription('No one won this round!')
                        .setColor('#FFD700');

                    await message.channel.send({ embeds: [noWinnersEmbed] });
                }
            }

            collector.stop();
        });

        collector.on('end', () => {
            if (!collector.ended) {
                initialMessage.edit({ components: [] });
                message.channel.send('⏰ Time to place your bet has expired!');
            }
        });
    } catch (error) {
        console.error('Error processing crazytime command:', error);
        await message.reply('An error occurred while processing the Crazy Time command.');
    }
};

export default {
    name: 'crazytime',
    aliases: ['ct'],
    description: 'Spin the Crazy Time wheel and get your payout!',
    execute: handleCrazyTimeCommand,
};
