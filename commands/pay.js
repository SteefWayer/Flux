import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const economyFilePath = path.join(__dirname, '../data/economy.json');

// Utility function to read economy file
const readEconomy = async () => {
    try {
        const data = await fs.readFile(economyFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading economy file:', err.message);
        throw new Error('Error reading economy data.');
    }
};

// Utility function to write to economy file
const writeEconomy = async (economy) => {
    try {
        await fs.writeFile(economyFilePath, JSON.stringify(economy, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing economy file:', err.message);
        throw new Error('Error updating economy data.');
    }
};

// Function to parse shorthand amounts like 50k, 10m, etc.
const parseAmount = (amountStr) => {
    const suffixes = { k: 1e3, m: 1e6, b: 1e9 };
    const regex = /^(\d+(?:\.\d+)?)([kmb])?$/i;
    const match = amountStr.match(regex);

    if (!match) return NaN; // Return NaN if input doesn't match expected format

    const [, num, suffix] = match;
    const multiplier = suffix ? suffixes[suffix.toLowerCase()] : 1;
    return parseFloat(num) * multiplier;
};

const payCommand = {
    name: 'pay',
    description: 'Pay an amount to another user.',
    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('Please specify a user and an amount in the format: `!pay @username amount`.');
        }

        // Extract user mention
        const user = message.mentions.users.first();
        if (!user) {
            return message.reply('Please mention a valid user to pay the amount to.');
        }

        // Extract amount (last argument)
        const amountStr = args.pop();
        const amount = parseAmount(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('Please specify a valid amount.');
        }

        const targetUserId = user.id;
        const senderUserId = message.author.id;

        let economy;
        try {
            economy = await readEconomy();
            console.log('Economy Read Successfully:', economy); // Debugging
        } catch (error) {
            return message.reply('There was an error accessing the economy data.');
        }

        const senderData = economy[senderUserId] || { withdrawnCash: 0 };
        const targetData = economy[targetUserId] || { withdrawnCash: 0 };

        if (senderData.withdrawnCash < amount) {
            return message.reply('You do not have enough withdrawn cash to pay this amount.');
        }

        // Deduct amount from sender's withdrawnCash and add to target's withdrawnCash
        senderData.withdrawnCash -= amount;
        targetData.withdrawnCash += amount;

        try {
            await writeEconomy({ ...economy, [senderUserId]: senderData, [targetUserId]: targetData });
            console.log(`[${message.author.tag}] successfully paid ${amount} to ${user.username}.`);
        } catch (error) {
            console.error('Error updating economy:', error.message);
            return message.reply('There was an error updating the economy.');
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💸 Payment Successful 💸')
            .setDescription(`Successfully paid **${amount.toLocaleString()}** to ${user.username}!`)
            .setThumbnail(user.displayAvatarURL());

        try {
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending message:', error.message);
        }
    }
};

export default payCommand;
