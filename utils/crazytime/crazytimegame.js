import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Manually define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define possible multipliers with their corresponding odds
const multipliers = [
    { value: '10x', odds: 0.4 },
    { value: '15x', odds: 0.25 },
    { value: '20x', odds: 0.1 },
    { value: '25x', odds: 0.05 },
    { value: '50x', odds: 0.03 },
    { value: '100x', odds: 0.02 },
    { value: '150x', odds: 0.015 },
    { value: '200x', odds: 0.01 },
    { value: '250x', odds: 0.008 },
    { value: '1000x', odds: 0.005 },
    { value: '2000x', odds: 0.002 },
];

// Function to roll random multipliers based on defined odds
const rollRandomMultiplier = () => {
    const randomValue = Math.random();
    let cumulativeOdds = 0;

    for (const multiplier of multipliers) {
        cumulativeOdds += multiplier.odds;
        if (randomValue <= cumulativeOdds) {
            return multiplier.value;
        }
    }
    return '20x'; // Default return value if none matched
};

// Function to display current rolling multipliers for all colors
const displayCurrentRollingMultipliers = async (embedMessage) => {
    const duration = 15000; // 15 seconds
    const interval = 1000; // Update every second
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
        const currentMultipliers = {
            green: rollRandomMultiplier(),
            blue: rollRandomMultiplier(),
            red: rollRandomMultiplier(),
        };

        const multiplierEmbed = new EmbedBuilder()
            .setTitle('🎡 Current Multipliers 🎡')
            .setDescription(`Current Multipliers:\n🟩 Green: **${currentMultipliers.green}**\n🟦 Blue: **${currentMultipliers.blue}**\n🟥 Red: **${currentMultipliers.red}**`)
            .setColor('#FFD700')
            .setFooter({ text: 'Choose wisely!' });

        await embedMessage.edit({ embeds: [multiplierEmbed] });
        await new Promise((resolve) => setTimeout(resolve, interval)); // Wait for 1 second before the next update
    }
};

// Function to animate the spinning wheel
const animateWheelSpin = async (embedMessage) => {
    const spinEmojis = ['🔄', '🔃', '🔄', '🔃', '🔄', '🔃'];

    for (let i = 0; i < 10; i++) { // Number of spinning updates
        const spinEmbed = new EmbedBuilder()
            .setTitle('🎡 Spinning the Wheel... 🎡')
            .setDescription(`${spinEmojis[i % spinEmojis.length]} Spinning...`)
            .setColor('#FFD700')
            .setFooter({ text: 'Good luck! 🎉' });

        await embedMessage.edit({ embeds: [spinEmbed] });
        await new Promise((resolve) => setTimeout(resolve, 100)); // Adjust the timing for desired spin speed
    }
};

export const handleCrazyTimeGame = async (message, betAmount) => { // Accept betAmount as parameter
    try {
        // Create buttons for color selection
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('green')
                    .setLabel('Green')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('blue')
                    .setLabel('Blue')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('red')
                    .setLabel('Red')
                    .setStyle(ButtonStyle.Danger),
            );

        // Create an initial embed with instructions and visual appeal
        const embed = new EmbedBuilder()
            .setTitle('🎉 Crazy Time! 🎉')
            .setDescription('Choose a color to spin the wheel! You have **15 seconds** to make your choice!')
            .setColor('#FFD700')
            .setThumbnail('https://example.com/path/to/your/image.png') // Replace with a suitable thumbnail
            .setImage('https://example.com/path/to/your/image.png') // Replace with a suitable image
            .addFields(
                { name: 'Available Colors:', value: '🟩 Green, 🟦 Blue, 🟥 Red', inline: true },
                { name: 'Instructions:', value: 'Click a button below to select your color!' }
            )
            .setFooter({ text: 'May the odds be in your favor! 🍀' });

        // Send the initial message with buttons
        const embedMessage = await message.reply({
            embeds: [embed],
            components: [row],
        });

        console.log('Waiting for button interactions...');

        // Store user selections as an object to ensure only one selection per user
        const userSelections = {};

        // Collect all interactions for 15 seconds
        const filter = i => i.customId === 'green' || i.customId === 'blue' || i.customId === 'red';
        const collector = embedMessage.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', (interaction) => {
            // Ensure the user hasn't selected a color already
            if (!userSelections[interaction.user.id]) {
                // Add the user's selection
                userSelections[interaction.user.id] = {
                    username: interaction.user.username,
                    color: interaction.customId,
                };

                interaction.reply({ content: `You selected **${interaction.customId}**!`, ephemeral: true });
            } else {
                interaction.reply({ content: 'You have already made your selection!', ephemeral: true });
            }
        });

        // Wait for the collector to end
        collector.on('end', async () => {
            // Remove buttons after the timer ends
            await embedMessage.edit({ components: [] });

            // Display current rolling multipliers for 15 seconds
            await displayCurrentRollingMultipliers(embedMessage);

            // Wait before starting the spin
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before starting the spin

            // Animate the wheel spin and generate random multipliers for each color
            await animateWheelSpin(embedMessage);

            // Roll random multipliers for each color
            const finalResults = {
                green: rollRandomMultiplier(),
                blue: rollRandomMultiplier(),
                red: rollRandomMultiplier(),
            };

            // Create the result embed with all winners' payouts
            let resultsDescription = 'Here are the results for each color selected:\n';
            let totalWinnings = 0; // Track total winnings

            // Include user selections in the results
            for (const userId in userSelections) {
                const selection = userSelections[userId];
                const multiplier = parseFloat(finalResults[selection.color]);
                const winningAmount = betAmount * multiplier; // Calculate winnings based on bet amount

                resultsDescription += `**${selection.username}** selected **${selection.color}** and got **${finalResults[selection.color]}**! (Winning: **$${winningAmount.toLocaleString()}**)\n`;
                totalWinnings += winningAmount; // Add to total winnings
            }

            resultsDescription += `\n**Final Multipliers:**\n🟩 Green: **${finalResults.green}**\n🟦 Blue: **${finalResults.blue}**\n🟥 Red: **${finalResults.red}**`;
            resultsDescription += `\n**Total Winnings:** **$${totalWinnings.toLocaleString()}**`; // Display total winnings

            const resultEmbed = new EmbedBuilder()
                .setTitle('🎡 The wheel has stopped! 🎡')
                .setDescription(resultsDescription)
                .setColor('#FFD700')
                .setFooter({ text: 'Thanks for playing! 🎉' })
                .setThumbnail('https://example.com/path/to/your/image.png') // Replace with a suitable thumbnail
                .setImage('https://example.com/path/to/your/image.png'); // Replace with a suitable image

            // Edit the original message to show the result
            await embedMessage.edit({
                embeds: [resultEmbed],
                components: [], // Ensure buttons are removed after selection
            });
        });

    } catch (error) {
        console.error('Error processing Crazy Time game:', error);
        await message.reply('An error occurred while processing the Crazy Time game. Please try again.');
    }
};
