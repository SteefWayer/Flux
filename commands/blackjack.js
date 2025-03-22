import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { shuffleDeck, drawCard, calculateHandValue } from '../utils/blackjackUtils.js';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const economyFilePath = path.resolve(__dirname, '../data/economy.json');

export const cardEmojis = {
    // Spades
    's01': '<:s01:1276929198761443390>', 's02': '<:s02:1276929298741199071>', 's03': '<:s03:1276929202494505010>',
    's04': '<:s04:1276929205048840274>', 's05': '<:s05:1276929301001797642>', 's06': '<:s06:1276929208857137152>',
    's07': '<:s07:1276929442119286815>', 's08': '<:s08:1276929213173071872>', 's09': '<:s09:1276929440617857116>',
    's10': '<:s10:1276929216658804817>', 's11': '<:s11:1276929297071734806>', 's12': '<:s12:1276929220265639977>',
    's13': '<:s13:1276929222769639486>',

    // Hearts
    'h01': '<:h01:1276929169544056965>', 'h02': '<:h02:1276929171167252652>', 'h03': '<:h03:1276929172538916905>',
    'h04': '<:h04:1276929173868253289>', 'h05': '<:h05:1276929175462215823>', 'h06': '<:h06:1276929176896540755>',
    'h07': '<:h07:1276929178599424134>', 'h08': '<:h08:1276929180524609547>', 'h09': '<:h09:1276929187780886538>',
    'h10': '<:h10:1276929189601345571>', 'h11': '<:h11:1276929192046366781>', 'h12': '<:h12:1276929193707438175>',
    'h13': '<:h13:1276929197381783602>',

    // Diamonds
    'd01': '<:d01:1276705159233142785>', 'd02': '<:d02:1276705160478982217>', 'd03': '<:d03:1276705162022355036>',
    'd04': '<:d04:1276705163414863984>', 'd05': '<:d05:1276705164509839424>', 'd06': '<:d06:1276705166057541663>',
    'd07': '<:d07:1276705167940653097>', 'd08': '<:d08:1276705169215586315>', 'd09': '<:d09:1276705170780192780>',
    'd10': '<:d10:1276705897854275695>', 'd11': '<:d11:1276705950178345062>', 'd12': '<:d12:1276705952229490809>',
    'd13': '<:d13:1276705954997473342>',

    // Clubs
    'c01': '<:c01:1276705983149768766>', 'c02': '<:c02:1276705984932479130>', 'c03': '<:c03:1276705986606010450>',
    'c04': '<:c04:1276705987847389285>', 'c05': '<:c05:1276705989038571560>', 'c06': '<:c06:1276705990691131393>',
    'c07': '<:c07:1276705992402534412>', 'c08': '<:c08:1276705994046570651>', 'c09': '<:c09:1276720260136833054>',
    'c10': '<:c10:1276720991933956188>', 'c11': '<:c11:1276720994152747098>', 'c12': '<:c12:1276720996673392771>',
    'c13': '<:c13:1276721000414973983>',
};

const cardBackEmoji = '<:cardback01:1276930843905884260>';
const BET_MIN = 1000;
const BET_MAX = 10000000;
const BET_DEFAULT = 10000000;
const COLORS = { WIN: '#2ecc71', LOSE: '#e74c3c', DRAW: '#f1c40f', DEFAULT: '#1abc9c', TIMEOUT: '#e74c3c' };

const handToEmojis = (hand) => hand.map(cardCode => cardEmojis[cardCode] || cardBackEmoji).join(' ');

async function readEconomyData() {
    try {
        const data = await fs.readFile(economyFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading economy data:', error);
        return null;
    }
}

async function saveEconomyData(data) {
    try {
        await fs.writeFile(economyFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving economy data:', error);
    }
}

export default {
    name: 'blackjack',
    aliases: ['bj'],
    description: 'Play a game of blackjack!',

    async execute(message, args) {
        const userId = message.author.id;

        let economyData = await readEconomyData();
        if (!economyData) return message.channel.send('Error reading economy data.');

        const userEconomy = economyData[userId] || { withdrawnCash: 0 };
        let betAmount = parseBetAmount(args, userEconomy.withdrawnCash);

        if (betAmount === null) {
            return message.channel.send(`Please enter a valid bet amount between ${BET_MIN.toLocaleString()} and ${BET_MAX.toLocaleString()}, or use "all" or "max" to bet everything.`);
        }

        if (userEconomy.withdrawnCash < betAmount) {
            return message.channel.send('You do not have enough withdrawn cash to place that bet.');
        }

        userEconomy.withdrawnCash -= betAmount;
        await saveEconomyData(economyData);

        let { deck, playerHand, dealerHand, playerValue, dealerValue } = initializeGame();
        const createGameEmbed = () => createEmbed(message.author.tag, playerHand, playerValue, dealerHand, dealerValue, COLORS.DEFAULT);
        const gameEmbed = createGameEmbed();
        const row = createButtonRow();
        const gameMessage = await message.channel.send({ embeds: [gameEmbed], components: [row] });

        const filter = interaction => interaction.user.id === message.author.id;
        const collector = gameMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'hit') {
                playerHand.push(drawCard(deck));
                playerValue = calculateHandValue(playerHand);

                if (playerValue > 21) {
                    await finalizeGame(gameMessage, playerHand, dealerHand, playerValue, dealerValue, betAmount, userEconomy, economyData, userId, message);
                    collector.stop();
                } else {
                    const updatedEmbed = createGameEmbed();
                    await interaction.update({ embeds: [updatedEmbed], components: [row] });
                }
            } else if (interaction.customId === 'stand') {
                while (dealerValue < 17) {
                    dealerHand.push(drawCard(deck));
                    dealerValue = calculateHandValue(dealerHand);
                }

                await finalizeGame(gameMessage, playerHand, dealerHand, playerValue, dealerValue, betAmount, userEconomy, economyData, userId, message);
                collector.stop();
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('Game Over')
                    .setDescription('You took too long to respond! The game has ended.')
                    .setColor(COLORS.TIMEOUT);

                await gameMessage.edit({ embeds: [timeoutEmbed], components: [] });
            }
        });
    },
};

function parseBetAmount(args, withdrawnCash) {
    if (['all', 'max'].includes(args[0])) {
        if (withdrawnCash <= 0) {
            return null;
        }
        return Math.min(withdrawnCash, BET_DEFAULT);
    }
    const betAmount = parseInt(args[0], 10);
    if (isNaN(betAmount) || betAmount < BET_MIN || betAmount > BET_MAX) {
        return null;
    }
    return betAmount;
}

function initializeGame() {
    const deck = shuffleDeck();
    const playerHand = [drawCard(deck), drawCard(deck)];
    const dealerHand = [drawCard(deck), drawCard(deck)];
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);
    return { deck, playerHand, dealerHand, playerValue, dealerValue };
}

function createEmbed(username, playerHand, playerValue, dealerHand, dealerValue, color) {
    return new EmbedBuilder()
        .setTitle(`${username}'s Blackjack Game`)
        .setDescription(`Your hand: ${handToEmojis(playerHand)} (Value: ${playerValue})\nDealer's hand: ${handToEmojis([dealerHand[0], 'cardback01'])} (Value: ${dealerValue})`)
        .setColor(color);
}

function createButtonRow() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('hit')
                .setLabel('Hit')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stand')
                .setLabel('Stand')
                .setStyle(ButtonStyle.Secondary)
        );
}

async function finalizeGame(gameMessage, playerHand, dealerHand, playerValue, dealerValue, betAmount, userEconomy, economyData, userId, message) {
    let result, finalColor;

    if (playerValue > 21) {
        result = 'You bust! Dealer wins.';
        finalColor = COLORS.LOSE;
    } else if (dealerValue > 21 || playerValue > dealerValue) {
        result = 'You win!';
        finalColor = COLORS.WIN;
        userEconomy.withdrawnCash += betAmount * 2;
    } else if (playerValue < dealerValue) {
        result = 'Dealer wins!';
        finalColor = COLORS.LOSE;
    } else {
        result = `It's a draw!`;
        finalColor = COLORS.DRAW;
        userEconomy.withdrawnCash += betAmount; 
    }

    economyData[userId] = userEconomy;
    await saveEconomyData(economyData);

    const finalEmbed = new EmbedBuilder()
        .setTitle('Game Over')
        .setDescription(`Your hand: ${handToEmojis(playerHand)} (Value: ${playerValue})\nDealer's hand: ${handToEmojis(dealerHand)} (Value: ${dealerValue})\n${result}`)
        .setColor(finalColor);

    await gameMessage.edit({ embeds: [finalEmbed], components: [] });
}
