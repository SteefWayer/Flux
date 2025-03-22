import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the economy.json file
const economyPath = path.join(__dirname, '../data/economy.json');

// Function to parse amounts with suffixes
const parseAmount = (amountStr) => {
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (amountStr.toLowerCase().includes('k')) {
        return amount * 1000;
    } else if (amountStr.toLowerCase().includes('m')) {
        return amount * 1000000;
    }
    return amount;
};

export default {
    name: 'withdraw',
    aliases: ['with'],
    description: 'Withdraw money from your bank balance into your cash balance.',
    async execute(message, args, client, context) {
        const logToFile = context.logToFile;
        const userId = message.author.id;
        const allOption = args[0] && args[0].toLowerCase() === 'all';
        const amountStr = allOption ? null : args[0];
        const amount = amountStr ? parseAmount(amountStr) : null;

        logToFile(`[withdraw] Command executed by User ID: ${userId}`);

        let economy;
        try {
            // Read the economy data file
            const data = await fs.readFile(economyPath, 'utf8');
            economy = JSON.parse(data);
        } catch (error) {
            console.error('Error reading economy data:', error);
            return message.reply('There was an error fetching the economy data.');
        }

        // Fetch user data
        const userData = economy[userId];
        const { bankBalance, withdrawnCash } = userData;

        logToFile(`[withdraw] Retrieved data. Bank Balance: ${bankBalance}, Withdrawn Cash: ${withdrawnCash}`);

        if (allOption) {
            if (bankBalance === 0) {
                return message.reply('You don\'t have any money in your bank to withdraw!');
            }

            const newBankBalance = 0;
            const newWithdrawnCash = withdrawnCash + bankBalance; // Update withdrawn cash when withdrawing all

            userData.bankBalance = newBankBalance;
            userData.withdrawnCash = newWithdrawnCash;

            // Save the updated economy.json
            try {
                await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf8');
                console.log('Economy data successfully saved after withdraw all.');

                // Force another save to ensure data persistence
                await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf8');
                console.log('Economy data successfully re-saved after withdraw all.');

                // Re-read the file to confirm
                const updatedData = await fs.readFile(economyPath, 'utf8');
                const updatedEconomy = JSON.parse(updatedData);
                if (JSON.stringify(economy) !== JSON.stringify(updatedEconomy)) {
                    console.error('Economy data mismatch after re-save.');
                    return message.reply('There was an error validating the economy data.');
                }
            } catch (error) {
                console.error('Error writing economy data after withdraw all:', error);
                return message.reply('There was an error saving the updated economy data.');
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏧 Withdrawal Successful 🏧')
                .setDescription(`You withdrew **${bankBalance}** ⏣ from your bank!\n\nNew Bank Balance: **${newBankBalance}** ⏣\nNew Withdrawn Cash: **${newWithdrawnCash}** ⏣`)
                .setThumbnail(context.thumb);

            return message.reply({ embeds: [embed] });
        }

        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please enter a valid amount to withdraw.');
        }

        if (amount > bankBalance) {
            return message.reply('You don\'t have enough money in your bank to withdraw that amount!');
        }

        const newBankBalance = bankBalance - amount;
        const newWithdrawnCash = withdrawnCash + amount; // Update withdrawn cash

        userData.bankBalance = newBankBalance;
        userData.withdrawnCash = newWithdrawnCash;

        // Save the updated economy data
        try {
            await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf8');
            console.log('Economy data successfully saved after specified withdrawal.');

            // Force another save to ensure data persistence
            await fs.writeFile(economyPath, JSON.stringify(economy, null, 2), 'utf8');
            console.log('Economy data successfully re-saved after specified withdrawal.');

            // Re-read the file to confirm
            const updatedData = await fs.readFile(economyPath, 'utf8');
            const updatedEconomy = JSON.parse(updatedData);
            if (JSON.stringify(economy) !== JSON.stringify(updatedEconomy)) {
                console.error('Economy data mismatch after re-save.');
                return message.reply('There was an error validating the economy data.');
            }
        } catch (error) {
            console.error('Error writing economy data after specified withdrawal:', error);
            return message.reply('There was an error saving your withdrawal.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏧 Withdrawal Successful 🏧')
            .setDescription(`You withdrew **${amount}** ⏣ from your bank!\n\nNew Bank Balance: **${newBankBalance}** ⏣\nNew Withdrawn Cash: **${newWithdrawnCash}** ⏣`)
            .setThumbnail(context.thumb);

        return message.reply({ embeds: [embed] });
    }
};
