import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve file path for economy data
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const economyFilePath = path.join(__dirname, '..', 'data', 'economy.json');

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
    name: 'deposit',
    aliases: ['dep'],
    description: 'Deposit money into your bank balance from your withdrawn cash balance.',
    
    async execute(message, args, client, context) {
        const logToFile = context.logToFile;
        const userId = message.author.id;
        const allOption = args[0] && args[0].toLowerCase() === 'all';
        const amountStr = allOption ? null : args[0];
        const amount = amountStr ? parseAmount(amountStr) : null;

        logToFile(`[deposit] Command executed by User ID: ${userId}`);

        // Read the economy data file
        let economy;
        try {
            const data = fs.readFileSync(economyFilePath, 'utf8');
            economy = JSON.parse(data);
        } catch (error) {
            console.error('Error reading economy data:', error);
            return message.reply('Error fetching user data.');
        }

        // Ensure economy data structure exists for the user
        if (!economy[userId]) {
            economy[userId] = { balance: 0, bankBalance: 0, withdrawnCash: 0, lastWork: 0 };
        }

        // Initialize the user's economy fields correctly if they are missing or incorrect
        economy[userId].balance = economy[userId].balance || 0;
        economy[userId].bankBalance = economy[userId].bankBalance || 0; // Default to 0 if null or undefined
        economy[userId].withdrawnCash = economy[userId].withdrawnCash || 0;

        const { balance, bankBalance, withdrawnCash } = economy[userId];

        logToFile(`[deposit] Retrieved data. Balance: ${balance}, Bank Balance: ${bankBalance}, Withdrawn Cash: ${withdrawnCash}`);

        if (allOption) {
            // Deposit all available withdrawn cash
            if (withdrawnCash <= 0) {
                return message.reply('You don\'t have any money to deposit!');
            }

            // Update the bank balance and reset withdrawn cash
            const newBankBalance = bankBalance + withdrawnCash;

            // Update user data
            try {
                economy[userId].withdrawnCash = 0;
                economy[userId].bankBalance = newBankBalance;

                fs.writeFileSync(economyFilePath, JSON.stringify(economy, null, 2), 'utf8');
                console.log('Economy data successfully updated.');
            } catch (error) {
                console.error('Error writing economy data:', error);
                return message.reply('Error updating user data.');
            }

            logToFile(`[deposit] Deposit all executed. New Bank Balance: ${newBankBalance}`);

            // Respond to user
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏦 Deposit Successful 🏦')
                .setDescription(`You deposited **${withdrawnCash}** ⏣ into your bank!\n\nNew Bank Balance: **${newBankBalance}** ⏣`)
                .setThumbnail(context.thumb);

            return message.reply({ embeds: [embed] });
        }

        // Validate the amount
        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please enter a valid amount to deposit.');
        }

        if (amount > withdrawnCash) {
            return message.reply('You don\'t have enough money to deposit that amount!');
        }

        // Deposit the specified amount
        const newBankBalance = bankBalance + amount;
        const newWithdrawnCash = withdrawnCash - amount;

        // Update user data
        try {
            economy[userId].withdrawnCash = newWithdrawnCash;
            economy[userId].bankBalance = newBankBalance;

            fs.writeFileSync(economyFilePath, JSON.stringify(economy, null, 2), 'utf8');
            console.log('Economy data successfully updated.');
        } catch (error) {
            console.error('Error writing economy data:', error);
            return message.reply('Error updating user data.');
        }

        logToFile(`[deposit] Amount specified. Updated balances. New Bank Balance: ${newBankBalance}, New Withdrawn Cash: ${newWithdrawnCash}`);

        // Respond to user
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🏦 Deposit Successful 🏦')
            .setDescription(`You deposited **${amount}** ⏣ into your bank!\n\nNew Bank Balance: **${newBankBalance}** ⏣`)
            .setThumbnail(context.thumb);

        return message.reply({ embeds: [embed] });
    }
};
