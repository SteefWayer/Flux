import { EmbedBuilder } from 'discord.js';
import { context } from '../context.js';

// Enable or disable logging
const loggingEnabled = false; // Set to false to disable logging

export default {
    name: 'slots',
    description: 'Play the slot machine and try to win big!',

    async execute(message, args) {
        const userId = message.author.id;

        // Fetch user data to get withdrawn cash
        let userData;
        try {
            userData = await context.getUserData(userId);
        } catch (error) {
            if (loggingEnabled) console.error('Error fetching user data:', error);
            return message.channel.send('Error fetching user data.');
        }

        const withdrawnCash = userData.withdrawnCash;

        // Function to parse bet amount with shorthand notation support
        const parseBetAmount = (input) => {
            if (input === 'all') {
                return withdrawnCash;  // Return all withdrawn cash for 'all'
            }
            const shorthandRegex = /^(\d+)([kKmM]?)$/;
            const match = input.match(shorthandRegex);

            if (!match) return null;

            let amount = parseInt(match[1], 10);
            const suffix = match[2].toLowerCase();

            if (suffix === 'k') {
                amount *= 1000;
            } else if (suffix === 'm') {
                amount *= 1000000;
            }

            return amount;
        };

        // Determine bet amount
        let betAmount = parseBetAmount(args[0]);
        if (betAmount === null) {
            return message.channel.send('Please enter a valid bet amount. Example: `1000`, `1k`, `all`.');
        }

        // Cap the bet amount to a maximum of 100,000
        if (betAmount > 100000) {
            betAmount = 100000;
        }

        // Validate bet amount
        if (betAmount < 100 || betAmount > 100000) {
            return message.channel.send('Please enter a valid bet amount between 100 and 100.000, or use `all` to bet up to 100.000.');
        }

        // Check if the user has enough withdrawn cash
        if (withdrawnCash < betAmount) {
            return message.channel.send(`You do not have enough withdrawn cash to place that bet. Your current withdrawn balance is **${withdrawnCash}**.`);
        }

        // Deduct bet amount from withdrawn cash
        const newWithdrawnCash = withdrawnCash - betAmount;
        try {
            await context.updateUserData(userId, { withdrawnCash: newWithdrawnCash });
        } catch (error) {
            if (loggingEnabled) console.error('Error updating user data:', error);
            return message.channel.send('Error updating user data.');
        }

        // Send initial spinning message with the spinning emoji
        const initialEmbed = new EmbedBuilder()
            .setTitle(`${message.author.tag} plays Slots!`)
            .setDescription('<a:Slot:1294014324993556551><a:Slot:1294014324993556551><a:Slot:1294014324993556551> \nSpinning...')
            .setColor('#3498db')
            .setFooter({ text: 'Slot Machine' });

        const initialMessage = await message.channel.send({ embeds: [initialEmbed] });

        // Wait for a short duration before showing the results (simulate spin time)
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second spin delay

        // Slot machine symbols and their weighted probabilities
        const symbols = [
            { emoji: '🍒', weight: 40 },
            { emoji: '🍋', weight: 30 },
            { emoji: '🍊', weight: 30 },
            { emoji: '🍉', weight: 20 },
            { emoji: '🍇', weight: 15 },
            { emoji: '🍀', weight: 10 },
            { emoji: '💎', weight: 5 },
            { emoji: '🔔', weight: 5 },
            { emoji: '7️⃣', weight: 1 }
        ];

        // Function to select a symbol based on weights
        const getRandomSymbol = () => {
            const totalWeight = symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
            const random = Math.floor(Math.random() * totalWeight);

            let accumulatedWeight = 0;
            for (const symbol of symbols) {
                accumulatedWeight += symbol.weight;
                if (random < accumulatedWeight) {
                    return symbol.emoji;
                }
            }
        };

        // Determine the final spin result
        const finalReels = [
            getRandomSymbol(),
            getRandomSymbol(),
            getRandomSymbol()
        ];

        // Calculate payout
        const [reel1, reel2, reel3] = finalReels;
        let payout = 0;
        if (reel1 === reel2 && reel2 === reel3) {
            if (['🍒', '🍋', '🍊', '🍉'].includes(reel1)) {
                payout = betAmount * 2; // Common symbols
            } else if (['🍇', '🍀'].includes(reel1)) {
                payout = betAmount * 5; // Rare symbols
            } else if (['💎', '🔔', '7️⃣'].includes(reel1)) {
                payout = betAmount * 50; // Jackpot symbols
            }
        } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
            if (['🍒', '🍋', '🍊', '🍉'].includes(reel1)) {
                payout = Math.floor(betAmount * 1.5); // Common symbols
            } else if (['🍇', '🍀'].includes(reel1)) {
                payout = Math.floor(betAmount * 3); // Rare symbols
            }
        }

        // Update withdrawn cash based on payout
        const updatedWithdrawnCash = newWithdrawnCash + payout;
        try {
            await context.updateUserData(userId, { withdrawnCash: updatedWithdrawnCash });
        } catch (error) {
            if (loggingEnabled) console.error('Error updating user data:', error);
            return message.channel.send('Error updating user data.');
        }

        // Prepare result message
        const resultEmbed = new EmbedBuilder()
            .setTitle(`${message.author.tag} plays Slots!`)
            .setDescription(`🎰 **Result:**  ${finalReels.join(' ')}\n\nYou bet **${betAmount}** coins and **${payout > 0 ? `won ${payout} coins` : `lost ${betAmount} coins`}**!\n\nYour current withdrawn balance is **${updatedWithdrawnCash}**.`)
            .setColor(payout > 0 ? '#00FF00' : '#FF0000')
            .setFooter({ text: 'Slot Machine' });

        // Edit the initial message to show the final result
        await initialMessage.edit({ embeds: [resultEmbed] });
        
        // Log the result if logging is enabled
        if (loggingEnabled) {
            console.log(`${message.author.tag} bet ${betAmount} and ${payout > 0 ? `won ${payout}` : `lost ${betAmount}`}.`);
        }
    }
};
