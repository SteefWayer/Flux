import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const economyFilePath = path.join(__dirname, '../data/economy.json');

export default {
    name: 'horserace',
    aliases: ['hr'],
    description: 'Start a horse race or view horses',
    async execute(message, args, client) {
        const userId = message.author.id;
        let betAmount;

        if (args[0] === 'all') {
            try {
                // Read and parse the economy.json file
                const data = await readFile(economyFilePath, 'utf8');
                const economy = JSON.parse(data);

                const userData = economy[userId];
                if (!userData) {
                    return message.channel.send('User data not found.');
                }
                const withdrawnCash = userData.withdrawnCash;

                betAmount = Math.min(withdrawnCash, 100000); // Bet all withdrawn cash up to 100,000
                if (withdrawnCash === 0) {
                    return message.channel.send('You do not have enough withdrawn cash to place a bet.');
                }
            } catch (error) {
                console.error('Error reading or parsing economy data:', error);
                return message.channel.send('There was an error fetching your data.');
            }
        } else {
            betAmount = parseInt(args[0], 10);

            if (isNaN(betAmount) || betAmount < 1000 || betAmount > 100000) {
                return message.channel.send('Please enter a valid bet amount between 1,000 and 100,000.');
            }
        }

        try {
            // Read and parse the economy.json file
            const data = await readFile(economyFilePath, 'utf8');
            const economy = JSON.parse(data);

            // Get user data and balance
            const userData = economy[userId];
            if (!userData) {
                return message.channel.send('User data not found.');
            }
            const withdrawnCash = userData.withdrawnCash;

            if (withdrawnCash < betAmount) {
                return message.channel.send('You do not have enough withdrawn cash to place that bet.');
            }

            // Define horses and their styles
            const horses = [
                { name: 'Betty', emoji: '🐴', style: ButtonStyle.Danger },
                { name: 'Charlie', emoji: '🐎', style: ButtonStyle.Success },
                { name: 'Daisy', emoji: '🐴', style: ButtonStyle.Primary },
                { name: 'Eleanor', emoji: '🐎', style: ButtonStyle.Secondary },
                { name: 'Frank', emoji: '🐴', style: ButtonStyle.Primary },
                { name: 'Ginger', emoji: '🐎', style: ButtonStyle.Secondary }
            ];

            // Generate random odds for each horse
            const generateRandomOdds = () => Math.floor(Math.random() * 10) + 1;
            const horseOdds = horses.reduce((acc, horse) => {
                acc[horse.name] = generateRandomOdds();
                return acc;
            }, {});

            // Create and send the embed with betting options
            const embed = new EmbedBuilder()
                .setTitle('Place Your Bet!')
                .setDescription('Select a horse to place your bet on:')
                .addFields(horses.map(horse => ({
                    name: horse.name,
                    value: `Odds: ${horseOdds[horse.name]}`
                })))
                .setColor('#ff0000');

            const buttons = horses.map(horse =>
                new ButtonBuilder()
                    .setCustomId(horse.name.toLowerCase())
                    .setLabel(horse.name)
                    .setStyle(horse.style)
                    .setEmoji(horse.emoji)
            );

            const createActionRows = (buttons) => {
                const rows = [];
                for (let i = 0; i < buttons.length; i += 5) {
                    rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
                }
                return rows;
            };
            const actionRows = createActionRows(buttons);

            const messageSent = await message.channel.send({ embeds: [embed], components: actionRows });

            // Track user interactions
            const interactedUsers = new Set();

            // Create a filter for button interactions
            const filter = interaction => 
                interaction.isButton() &&
                horses.some(horse => horse.name.toLowerCase() === interaction.customId) &&
                !interactedUsers.has(interaction.user.id);

            const collector = messageSent.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async (interaction) => {
                interactedUsers.add(interaction.user.id); // Mark user as interacted

                const selectedHorseName = interaction.customId;
                const selectedHorse = horses.find(horse => horse.name.toLowerCase() === selectedHorseName);

                if (!selectedHorse) {
                    console.error('Invalid horse selected:', selectedHorseName);
                    return interaction.reply('Invalid horse selected.');
                }

                // Start the race
                const raceStartEmbed = new EmbedBuilder()
                    .setTitle('Horse Race Begins!')
                    .setDescription('The race is about to start! Countdown and racing animation coming up...')
                    .setColor('#ff0000');
                const raceMessage = await interaction.reply({ embeds: [raceStartEmbed], fetchReply: true });

                for (let i = 3; i > 0; i--) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await raceMessage.edit({ embeds: [raceStartEmbed.setDescription(`Race starts in ${i}...`)] });
                }

                const TRACK_LENGTH = 20;
                const horsePositions = horses.reduce((acc, horse) => {
                    acc[horse.name] = 0;
                    return acc;
                }, {});

                const horseSpeeds = horses.reduce((acc, horse) => {
                    acc[horse.name] = Math.random() * (2 / horseOdds[horse.name]) + 1;
                    return acc;
                }, {});

                const raceDuration = 10000;
                const numUpdates = 15;
                const updateInterval = raceDuration / numUpdates;

                let raceStartTime = Date.now();
                let allHorsesFinished = false;

                const updateRaceAnimation = setInterval(async () => {
                    const elapsed = Date.now() - raceStartTime;

                    if (elapsed >= raceDuration || allHorsesFinished) {
                        clearInterval(updateRaceAnimation);
                        await determineRaceOutcome(raceMessage, selectedHorse, betAmount, userId, horseOdds, horses, economyFilePath, message.guild.id);
                    } else {
                        for (const horse of horses) {
                            if (horsePositions[horse.name] < TRACK_LENGTH) {
                                horsePositions[horse.name] = Math.min(TRACK_LENGTH, Math.floor((elapsed / raceDuration) * TRACK_LENGTH * horseSpeeds[horse.name]));
                            }
                        }

                        allHorsesFinished = horses.every(horse => horsePositions[horse.name] >= TRACK_LENGTH);

                        const trackDescriptions = horses.map(horse => {
                            const progress = horsePositions[horse.name];
                            const track = '░'.repeat(progress) + '🏇' + '░'.repeat(TRACK_LENGTH - progress) + '🏁';
                            return `${horse.emoji} ${track}\n`;
                        }).join('');

                        const raceEmbed = new EmbedBuilder()
                            .setTitle('Horse Race!')
                            .setDescription(trackDescriptions)
                            .setColor('#ff0000');

                        await raceMessage.edit({ embeds: [raceEmbed] });
                    }
                }, updateInterval);
            });

            collector.on('end', collected => {
                console.log(`Collector ended. Collected interactions: ${collected.size}`);
                messageSent.edit({ components: [] });
            });
        } catch (error) {
            console.error('Error executing horse race command:', error);
            message.channel.send('There was an error executing the horse race command.');
        }
    }
};

const determineRaceOutcome = async (raceMessage, selectedHorse, betAmount, userId, horseOdds, horses, economyFilePath, guildId) => {
    const totalOdds = Object.values(horseOdds).reduce((sum, odds) => sum + (1 / odds), 0);
    const random = Math.random() * totalOdds;
    let winningHorse = null;

    let accumulatedOdds = 0;
    for (const horse of horses) {
        accumulatedOdds += 1 / horseOdds[horse.name];
        if (random <= accumulatedOdds) {
            winningHorse = horse;
            break;
        }
    }

    const resultEmbed = new EmbedBuilder()
        .setTitle('Race Results!')
        .setDescription(`The winning horse is **${winningHorse.name}**!`)
        .setColor('#00ff00');

    await raceMessage.edit({ embeds: [resultEmbed] });

    // Handle bet payout or loss
    if (selectedHorse === winningHorse) {
        const payout = betAmount * horseOdds[winningHorse.name];
        const userData = await readFile(economyFilePath, 'utf8');
        const economy = JSON.parse(userData);

        if (!economy[userId]) {
            economy[userId] = { withdrawnCash: 0, bankBalance: 0 }; // Ensure user data exists
        }

        economy[userId].withdrawnCash += payout;

        // Write updated data back to file
        await writeFile(economyFilePath, JSON.stringify(economy, null, 2));
        await raceMessage.channel.send(`Congratulations! You won ${payout} coins.`);
    } else {
        const userData = await readFile(economyFilePath, 'utf8');
        const economy = JSON.parse(userData);

        if (!economy[userId]) {
            economy[userId] = { withdrawnCash: 0, bankBalance: 0 }; // Ensure user data exists
        }

        economy[userId].withdrawnCash -= betAmount;

        // Write updated data back to file
        await writeFile(economyFilePath, JSON.stringify(economy, null, 2));
        await raceMessage.channel.send(`Sorry, you lost your bet of ${betAmount} coins.`);
    }
};
