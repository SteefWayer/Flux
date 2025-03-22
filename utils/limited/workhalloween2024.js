import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const itemsPath = path.join(__dirname, '../items.json');
const inventoryPath = path.join(__dirname, '../../data/inventory.json');

// Load a random Halloween item from items.json
async function getRandomHalloweenItem() {
    try {
        const data = await fs.readFile(itemsPath, 'utf8');
        const itemsData = JSON.parse(data);
        const halloweenItems = itemsData.halloween_2024[0].items;

        if (halloweenItems.length === 0) {
            console.error('No Halloween items available.');
            return null;
        }

        const randomItem = halloweenItems[Math.floor(Math.random() * halloweenItems.length)];
        console.log('Randomly selected item:', randomItem);
        return randomItem;
    } catch (error) {
        console.error('Error reading items.json:', error);
        return null;
    }
}

// Add item to user's inventory in inventory.json
async function addToInventory(userId, item) {
    try {
        const data = await fs.readFile(inventoryPath, 'utf8');
        const inventoryData = JSON.parse(data);

        if (!inventoryData[userId]) {
            inventoryData[userId] = [];
        }

        const existingItem = inventoryData[userId].find(invItem => invItem.id === item.item_ID);
        if (existingItem) {
            existingItem.amount += 1;
        } else {
            inventoryData[userId].push({
                id: item.item_ID,
                name: item.item_name,
                emoji: item.item_emoji,
                amount: 1,
                type: 'halloweenItemID',
                price: item.item_price
            });
        }

        await fs.writeFile(inventoryPath, JSON.stringify(inventoryData, null, 2));
    } catch (error) {
        console.error('Error updating inventory.json:', error);
    }
}

// Start a new game
async function startNewGame(message) {
    const targetNumber = Math.floor(Math.random() * 10) + 1;
    const embed = new EmbedBuilder()
        .setTitle('🎲 Number Guessing Game')
        .setDescription('Guess a number between 1 and 10! You have 3 attempts.')
        .setColor('#3498db');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('guess-1').setLabel('1').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-2').setLabel('2').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-3').setLabel('3').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-4').setLabel('4').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-5').setLabel('5').setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('guess-6').setLabel('6').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-7').setLabel('7').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-8').setLabel('8').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-9').setLabel('9').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('guess-10').setLabel('10').setStyle(ButtonStyle.Primary)
    );

    const messageSent = await message.reply({ embeds: [embed], components: [row1, row2] });
    
    return { number: targetNumber, attempts: 0, messageId: messageSent.id }; // Return game state
}

// Handle user guess
async function handleGuess(interaction, gameState) {
    const guessedNumber = parseInt(interaction.customId.split('-')[1]);

    if (guessedNumber === gameState.number) {
        const randomItem = await getRandomHalloweenItem();
        if (randomItem) {
            await addToInventory(interaction.user.id, randomItem);
            const embed = new EmbedBuilder()
                .setTitle('🎉 Congratulations!')
                .setDescription(`You guessed the number ${gameState.number} correctly and received a **${randomItem.item_name}** ${randomItem.item_emoji}!`)
                .setColor('#2ecc71');

            await interaction.update({ embeds: [embed], components: [] });
        } else {
            const embed = new EmbedBuilder()
                .setTitle('🎉 Congratulations!')
                .setDescription(`You guessed the number ${gameState.number} correctly, but there was an error awarding your item.`)
                .setColor('#2ecc71');

            await interaction.update({ embeds: [embed], components: [] });
        }
        return true; // Indicate game is over
    } else {
        gameState.attempts++;
        if (gameState.attempts >= 3) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Game Over!')
                .setDescription(`You've used all 3 attempts. The correct number was ${gameState.number}.`)
                .setColor('#e74c3c');

            await interaction.update({ embeds: [embed], components: [] });
            return true; // Indicate game is over
        }

        const hint = guessedNumber < gameState.number ? 'Try a higher number!' : 'Try a lower number!';
        const embed = new EmbedBuilder()
            .setTitle('❌ Incorrect Guess!')
            .setDescription(`${hint} You have ${3 - gameState.attempts} attempts remaining.`)
            .setColor('#e74c3c');

        await interaction.update({ embeds: [embed] });
        return false; // Game continues
    }
}

// Main function to be triggered based on chance
export default async function numberGuessingGame(message) {
    const gameState = await startNewGame(message);

    const filter = (interaction) => interaction.isButton() && interaction.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async (interaction) => {
        const gameEnded = await handleGuess(interaction, gameState);
        if (gameEnded) {
            collector.stop();
        }
    });

    collector.on('end', async () => {
        if (gameState.attempts < 3) {
        }
    });
}
