import { EmbedBuilder } from 'discord.js';

// Define the possible multiplier outcomes for Pachinko with their corresponding emoji IDs
const multipliers = {
    2: '<:2x:1291815945391570997>',
    5: '<:5x:1291815948562726992>',
    10: '<:10x:1291815949959299072>',
    20: '<:20x:1291815951808987267>',
    25: '<:25x:1291815953436512326>',
    50: '<:50x:1291815955181076580>',
    100: '<:100x:1291815957001535531>',
    200: '<:200x:1291815958326804550>',
    250: '<:250x:1291815990019227669>',
    400: '<:400x:1291815962785349736>',
    500: '<:500x:1291816131538976928>',
    'Double': '<:Double:1291815966459560046>',
};

// Define the pin layout
const pinLayout = [
    ' . . . . . . . . . . ',
    '  . . . . . . . . .  ',
    ' . . . . . . . . . . ',
    '  . . . . . . . . .  ',
    ' . . . . . . . . . . ',
    '  . . . . . . . . .  ',
    ' . . . . . . . . . . ',
    '  . . . . . . . . .  ',
    ' . . . . . . . . . . ',
    '  . . . . . . . . .  ',
];

// Function to handle Pachinko logic
export const handlePachinko = async (embedMessage, betAmount, userNames) => {
    try {
        // Ensure userNames is an array
        if (!Array.isArray(userNames)) {
            console.error('userNames is not an array:', userNames);
            return await embedMessage.reply('An error occurred: Invalid user names.');
        }

        // Update the embed to show Pachinko starting
        const rollingEmbed = new EmbedBuilder()
            .setTitle('Pachinko is rolling!')
            .setDescription('Watch as the Pachinko ball drops...')
            .setColor('#FFD700');

        // Edit the message without any files or attachments
        await embedMessage.edit({
            embeds: [rollingEmbed],
            files: [],
        });

        // Generate 10 random multipliers for the game
        const selectedMultipliers = Array.from({ length: 10 }, () => {
            const randomIndex = Math.floor(Math.random() * Object.keys(multipliers).length);
            return Object.values(multipliers)[randomIndex]; // Get the emoji for the random multiplier
        });

        // Randomly determine the starting position for the ball (0 to 9)
        let ballPosition = Math.floor(Math.random() * 10); // Random starting position for the ball

        // Simulate the ball dropping down 10 levels
        for (let i = 0; i < 10; i++) {
            // Create a new grid for the current level
            const pinGrid = pinLayout.map((line, index) => {
                if (index === i) {
                    return line.split('').map((char, idx) => {
                        return idx === ballPosition * 2 ? `⚪` : char; // Mark ball position
                    }).join('');
                }
                return line;
            }).join('\n');

            // Create a row for the multipliers directly below the pins
            const multiplierRow = selectedMultipliers.join('    ');

            // Create an embed for the current state
            const interimEmbed = new EmbedBuilder()
                .setTitle('Pachinko is rolling!')
                .setDescription(`\`\`\`\n${pinGrid}\n\`\`\`\n\n${multiplierRow}`)
                .setColor('#FFD700');

            // Update the message to simulate the ball dropping without attachments
            await embedMessage.edit({
                embeds: [interimEmbed],
                files: [],
            });

            // Randomly decide the direction for the ball (left or right)
            const movement = Math.random();
            if (movement < 0.5 && ballPosition > 0) ballPosition--;
            else if (movement >= 0.5 && ballPosition < 9) ballPosition++;

            // Delay between each step to simulate the animation
            await new Promise((resolve) => setTimeout(resolve, 800));
        }

        // Determine the final multiplier where the ball lands
        let finalMultiplier = selectedMultipliers[ballPosition].match(/\d+/g);
        let finalMultiplierText = finalMultiplier ? finalMultiplier[0] + 'x' : 'Unknown';

        // Handle 'Double' logic
        if (selectedMultipliers[ballPosition].includes('Double')) {
            const nextMultiplier = Object.values(multipliers)[Math.floor(Math.random() * Object.keys(multipliers).length)];
            finalMultiplierText = `${nextMultiplier.replace('x', '') * 2}x`;
        }

        // Calculate winnings for each user based on their usernames
        const winners = userNames.map((username) => {
            const winnings = betAmount * (finalMultiplierText !== 'Unknown' ? parseInt(finalMultiplierText) : 0);
            return { username, winnings };
        });

        const winningsText = winners.map(winner => `${winner.username} won $${winner.winnings.toLocaleString()}`).join(', ');

        // Log the winnings for debugging purposes
        console.log('Pachinko Results:', winners);

        // Show the final result
        const finalEmbed = new EmbedBuilder()
            .setTitle(`The Pachinko ball landed on **${finalMultiplierText}**!`)
            .setDescription(`Congratulations! You win **${finalMultiplierText}** your bet! \n\n${winningsText}`)
            .setColor('#FFD700');

        // Edit the original message to show the final Pachinko result without attachments
        await embedMessage.edit({
            embeds: [finalEmbed],
            files: [],
        });
    } catch (error) {
        console.error('Error processing Pachinko:', error.message);
        await embedMessage.reply('An error occurred while processing the Pachinko.');
    }
};
