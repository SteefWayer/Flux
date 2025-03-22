import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const multipliers = [
    { value: '2x', odds: 0.5 },
    { value: '5x', odds: 0.3 },
    { value: '10x', odds: 0.15 },
    { value: '20x', odds: 0.1 },
    { value: '25x', odds: 0.07 },
    { value: '50x', odds: 0.05 },
    { value: '100x', odds: 0.03 },
    { value: '200x', odds: 0.02 },
    { value: '500x', odds: 0.01 },
];

const rollRandomMultipliers = () => {
    const selectedMultipliers = [];
    for (let i = 0; i < 25; i++) {
        const randomValue = Math.random();
        let cumulativeOdds = 0;

        for (const multiplier of multipliers) {
            cumulativeOdds += multiplier.odds;
            if (randomValue <= cumulativeOdds) {
                selectedMultipliers.push(multiplier.value);
                break;
            }
        }
    }
    return selectedMultipliers;
};

const generateEmojiGrid = (multiplierGrid) => {
    const emojis = ['🍀', '🧁', '🦆', '⭐', '🎁'];
    const grid = Array.from({ length: 5 }, () => Array(5).fill(''));

    multiplierGrid.forEach((multiplier, index) => {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        if (index < 25) {
            grid[Math.floor(index / 5)][index % 5] = emoji;
        }
    });

    return grid; 
};

const readBets = async (guildId, channelId) => {
    const filePath = path.join(__dirname, '../../CTtemp/bets.json');
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const bets = JSON.parse(data);
        
        const channelBets = bets.channels[channelId];
        if (!channelBets) {
            console.log('No bets found for channel:', channelId);
            return null;
        }
        
        return channelBets;
    } catch (error) {
        console.error('Error reading bets JSON:', error);
        return null;
    }
};

const formatEmojiGrid = (emojiGrid) => {
    return emojiGrid.map(row => row.join(' | ')).join('\n');
};

const animateEmojiShuffle = async (embedMessage, emojiGrid) => {
    const shuffleMessage = await embedMessage.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Shuffling Cash Hunt Emojis...')
            .setDescription(`\`\`\`\n${formatEmojiGrid(emojiGrid)}\n\`\`\``)
            .setColor('#FFD700')],
    });

    for (let i = 0; i < 5; i++) {
        const shuffledGrid = emojiGrid.map(row => 
            row.sort(() => Math.random() - 0.5).join(' | ')
        ).join('\n');

        await shuffleMessage.edit({
            embeds: [new EmbedBuilder()
                .setTitle('Shuffling Cash Hunt Emojis...')
                .setDescription(`\`\`\`\n${shuffledGrid}\n\`\`\``)
                .setColor('#FFD700')],
        });

        await new Promise((resolve) => setTimeout(resolve, 300)); 
    }

    return shuffleMessage.id; 
};

export const handleCashHunt = async (embedMessage) => {
    try {
        const guildId = embedMessage.guild.id;
        const channelId = embedMessage.channel.id;
        const userBets = await readBets(guildId, channelId);

        if (!userBets) {
            console.error('No user bets found for channel:', channelId);
            return await sendErrorEmbed(embedMessage, 'No bets found for this channel.');
        }

        let totalBetAmount = 0;

        for (const bet of userBets) {
            const cashHuntBetAmount = bet.bets?.cash_hunt;

            if (typeof cashHuntBetAmount !== 'number' || isNaN(cashHuntBetAmount) || cashHuntBetAmount <= 0) {
                console.error('Invalid Cash Hunt bet amount for user:', bet.user);
                continue; 
            }

            console.log(`User ${bet.user} Cash Hunt Bet Amount: $${cashHuntBetAmount.toLocaleString()}`);
            totalBetAmount += cashHuntBetAmount;
        }

        const rolledMultipliers = rollRandomMultipliers();
        const formatMultiplierGrid = (multipliers) => {
            return Array.from({ length: 5 }, (_, row) => 
                multipliers.slice(row * 5, row * 5 + 5).join(' | ')
            ).join('\n');
        };
        
        const multiplierGrid = formatMultiplierGrid(rolledMultipliers);        

        const gridEmbedMessage = await sendNewEmbed(
            embedMessage.channel, 
            `\`\`\`\n${multiplierGrid}\n\`\`\``, 
            'Cash Hunt Multipliers Grid'
        );

        await new Promise(resolve => setTimeout(resolve, 3000));

        const emojiGrid = generateEmojiGrid(rolledMultipliers);
        const emojiGridEmbedMessage = await sendNewEmbed(embedMessage.channel, `\`\`\`\n${formatEmojiGrid(emojiGrid)}\n\`\`\``, 'Cash Hunt Emoji Grid');

        await new Promise(resolve => setTimeout(resolve, 3000));

        await animateEmojiShuffle(emojiGridEmbedMessage, emojiGrid);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const buttonRows = createButtonRows(emojiGrid);
        
        const chooseEmojiEmbed = new EmbedBuilder()
            .setTitle('Choose an emoji!')
            .setDescription('Click a button to select your emoji!')
            .setColor('#FFD700');
        
        const emojiEmbedMessage = await embedMessage.channel.send({
            embeds: [chooseEmojiEmbed],
            components: buttonRows,
        });

        await handleEmojiSelection(emojiEmbedMessage, buttonRows, emojiGrid, totalBetAmount, rolledMultipliers);

    } catch (error) {
        console.error('Error handling Cash Hunt:', error);
        await sendErrorEmbed(embedMessage, 'An error occurred while handling Cash Hunt.');
    }
};

const handleEmojiSelection = async (emojiEmbedMessage, buttonRows, emojiGrid, totalBetAmount, rolledMultipliers) => {
    const filter = (interaction) => interaction.isButton();
    const collector = emojiEmbedMessage.channel.createMessageComponentCollector({ filter, time: 10000 });
    const userSelections = new Map();

    collector.on('collect', async (interaction) => {
        const userId = interaction.user.id;
        const selectedEmoji = interaction.customId.split('_')[1]; 
        userSelections.set(userId, selectedEmoji);
        
        await interaction.reply({ content: `You selected: ${selectedEmoji}!`, ephemeral: true });
    });

    collector.on('end', async () => {
        const disabledButtons = buttonRows.map(row => 
            new ActionRowBuilder().addComponents(row.components.map(button => button.setDisabled(true)))
        );

        await emojiEmbedMessage.edit({
            components: disabledButtons,
        });

        const multiplierInfo = emojiGrid.map((row, rowIndex) => 
            row.map((emoji, colIndex) => `${emoji}: ${rolledMultipliers[rowIndex * 5 + colIndex]}`).join(' | ')
        ).join('\n');

        await emojiEmbedMessage.edit({
            embeds: [
                new EmbedBuilder()
                    .setTitle('Emoji Multipliers')
                    .setDescription(`Here are the multipliers for each emoji:\n\`\`\`\n${multiplierInfo}\n\`\`\``)
                    .setColor('#FFD700'),
            ],
        });

        await displayResults(emojiEmbedMessage, userSelections, rolledMultipliers, totalBetAmount);
    });
};

const sendErrorEmbed = async (embedMessage, errorMessage) => {
    await sendNewEmbed(embedMessage.channel, errorMessage, 'Error');
};

const sendNewEmbed = async (channel, description, title, components = []) => {
    return await channel.send({
        embeds: [new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor('#FFD700')],
        components,
    });
};

const createButtonRows = (emojiGrid) => {
    const buttonRows = [];
    for (let i = 0; i < 5; i++) {
        const rowButtons = [];
        for (let j = 0; j < 5; j++) {
            const emoji = emojiGrid[i][j]; 
            rowButtons.push(
                new ButtonBuilder()
                    .setCustomId(`emoji_${emoji}_${i}_${j}`)
                    .setLabel(emoji)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        buttonRows.push(new ActionRowBuilder().addComponents(rowButtons));
    }
    return buttonRows;
};

const displayResults = async (emojiEmbedMessage, userSelections, rolledMultipliers, totalBetAmount) => {
    const resultsEmbed = new EmbedBuilder()
        .setTitle('Cash Hunt Results')
        .setDescription('Here are the multipliers for each emoji!')
        .setColor('#FFD700');

    for (const [userId] of userSelections.entries()) {
        const user = await emojiEmbedMessage.guild.members.fetch(userId);
        const username = user.user.username;
        const selectedMultiplier = rolledMultipliers[Math.floor(Math.random() * rolledMultipliers.length)];
        const multiplierValue = parseFloat(selectedMultiplier.replace('x', ''));

        if (typeof totalBetAmount !== 'number' || isNaN(totalBetAmount) || 
            typeof multiplierValue !== 'number' || isNaN(multiplierValue)) {
            console.error('Invalid totalBetAmount or multiplierValue:', { totalBetAmount, multiplierValue });
            continue;
        }

        const winnings = Math.floor(totalBetAmount * multiplierValue);
        resultsEmbed.addFields({ name: `${username}`, value: `Selected Multiplier: ${selectedMultiplier} \nWinnings: $${winnings.toLocaleString()}`, inline: true });
    }

    await emojiEmbedMessage.channel.send({ embeds: [resultsEmbed] });
};
