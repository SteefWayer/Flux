import { EmbedBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

const formatNumber = (number) => {
    if (isNaN(number)) return number;
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default {
    name: 'balance',
    aliases: ['bal'],
    description: 'Check your balance or someone else\'s balance',
    async execute(message, args, client, context) {
        let userId;
        let targetUser;
        const { thumb } = context;
        const loggingEnabled = false; 

        try {
            if (args.length) {
                targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
                if (targetUser) {
                    userId = targetUser.id;
                } else {
                    return message.channel.send('User not found. Please mention a valid user or provide a valid user ID.');
                }
            } else {
                userId = message.author.id;
                targetUser = message.author;
            }

            await context.loadEconomyData();

            let userData = await context.getUserData(userId);

            if (!userData) {
                userData = {
                    balance: 0,
                    bankBalance: 0,
                    withdrawnCash: 0
                };
                context.economyData[userId] = userData;

                const economyPath = path.join(__dirname, '..', 'data', 'economy.json');
                await fs.writeFile(economyPath, JSON.stringify(context.economyData, null, 2), 'utf-8');
            }

            const { balance, bankBalance, withdrawnCash } = userData;

            const formattedWithdrawnCash = formatNumber(withdrawnCash);
            const formattedBankBalance = formatNumber(bankBalance);
            const formattedTotalBalance = formatNumber(withdrawnCash + bankBalance);

            const embed = new EmbedBuilder()
                .setTitle(`💰 ${targetUser.tag}'s Balance`)
                .setDescription(`Cash balance: **⏣ ${formattedWithdrawnCash}**.\nBank Balance: **⏣ ${formattedBankBalance}**.\nTotal Balance: **⏣ ${formattedTotalBalance}**.`)
                .setColor('#3498db')
                .setThumbnail(thumb);

            await message.channel.send({ embeds: [embed] });

            if (loggingEnabled) {
                context.logToFile(`[${message.author.tag}] Checked balance of [${targetUser.tag}]. Withdrawn Cash: ⏣ ${formattedWithdrawnCash}, Bank Balance: ⏣ ${formattedBankBalance}`);
            }
        } catch (error) {
            if (loggingEnabled) {
                context.logToFile(`[${message.author.tag}] Error executing balance command: ${error.message}`);
            }
            console.error('Error executing balance command:', error);
            message.channel.send('There was an error executing the balance command.');
        }
    }
};
