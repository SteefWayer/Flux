import { ButtonBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const betsFilePath = path.join(__dirname, '../../CTtemp/bets.json');

export const createInitialEmbed = () => {
    const initialEmbed = new EmbedBuilder()
        .setTitle('Welcome to the Game!')
        .setDescription('Choose your option below:')
        .setColor('#FFD700');

    return initialEmbed;
};

export const createButtons = () => {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('1')
            .setLabel('1')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('2')
            .setLabel('2')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('5')
            .setLabel('5')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('10')
            .setLabel('10')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('coin_flip')
            .setLabel('Coin Flip')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('cash_hunt')
            .setLabel('Cash Hunt')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('pachinko')
            .setLabel('Pachinko')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('crazy_time')
            .setLabel('Crazy Time')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
};

export const handleButtonInteraction = async (interaction) => {
    await interaction.deferUpdate();
    const userId = interaction.user.id;
    const optionSelected = interaction.customId;

    const userKey = `${interaction.guild.id}_${interaction.channel.id}`;

    let existingBets = {};
    if (fs.existsSync(betsFilePath)) {
        existingBets = await fs.readJson(betsFilePath);
    }

    if (!existingBets.channels) {
        existingBets.channels = {};
    }

    if (!existingBets.channels[interaction.channel.id]) {
        existingBets.channels[interaction.channel.id] = [];
    }

    let userBetEntry = existingBets.channels[interaction.channel.id].find(b => b.user === userId);

    if (!userBetEntry) {
        userBetEntry = { user: userId, selected: 0, bets: {} };
        existingBets.channels[interaction.channel.id].push(userBetEntry);
    } else if (!userBetEntry.bets) {
        userBetEntry.bets = {}; 
    }

    console.log('User Bet Entry before updating bets:', JSON.stringify(userBetEntry, null, 2));
    const userSelectedEntry = existingBets.channels[interaction.channel.id].find(b => b.user === userId);
    console.log('User Selected Entry:', JSON.stringify(userSelectedEntry, null, 2));
    const selectedBet = userSelectedEntry ? userSelectedEntry.selected || 0 : 0; 
    console.log(`User ${interaction.user.tag} selected option: ${optionSelected}, with bet: $${selectedBet}`);
    if (optionSelected) {
        if (!userBetEntry.bets[optionSelected]) {
            userBetEntry.bets[optionSelected] = 0;
        }
        userBetEntry.bets[optionSelected] += selectedBet;
    } else {
        console.error(`Invalid option selected: ${optionSelected}`);
    }

    await fs.writeJson(betsFilePath, existingBets, { spaces: 2 });
    console.log(`User ${interaction.user.tag} placed a bet of $${selectedBet}. Current bets: ${JSON.stringify(userBetEntry.bets)}`);
};

export const createGameMessage = async (message) => {
    const embed = createInitialEmbed();
    const [row1, row2] = createButtons();

    const reply = await message.channel.send({ embeds: [embed], components: [row1, row2] });

    const filter = (interaction) => interaction.customId && interaction.user.id === message.author.id;
    const collector = reply.createMessageComponentCollector({ filter, time: 30000 }); 

    collector.on('collect', handleButtonInteraction);

    collector.on('end', collected => {
    });

    return reply;
};
