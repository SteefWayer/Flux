import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';
import os from 'os';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the paths to the relevant data files
const userdataFilePath = path.join(__dirname, '../data/userdata.json');
const economyFilePath = path.join(__dirname, '../data/economy.json');

export default {
    name: 'botinfo',
    description: 'Displays information about the bot including command usage, bot owner, net worth, and more.',
    async execute(message, args, client) {
        try {
            // Read and parse userdata.json
            let userdata = {};
            if (fs.existsSync(userdataFilePath)) {
                const rawData = fs.readFileSync(userdataFilePath);
                userdata = JSON.parse(rawData);
            }

            // Read and parse economy.json
            let economy = {};
            if (fs.existsSync(economyFilePath)) {
                const rawData = fs.readFileSync(economyFilePath);
                economy = JSON.parse(rawData);
            }

            // Calculate total commands run
            let totalCommands = 0;
            for (const userId in userdata) {
                if (userdata[userId].commands) {
                    totalCommands += userdata[userId].commands.daily || 0;
                    totalCommands += userdata[userId].commands.all || 0;
                }
            }

            // Calculate total net worth
            let totalNetWorth = 0;
            for (const userId in economy) {
                const user = economy[userId];
                totalNetWorth += (user.withdrawnCash || 0) + (user.bankBalance || 0);
            }

            // Get bot owner information
            const owner = await client.users.fetch(client.application?.owner?.id).catch(() => null);

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle('Bot Information')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    { name: 'Total Commands Run', value: totalCommands.toLocaleString(), inline: true },
                    { name: 'Bot Owner', value: owner ? owner.tag : '<@!1271600306383355979>', inline: true },
                    { name: 'Total Net Worth', value: `⏣ ${totalNetWorth.toLocaleString()}`, inline: true },
                    { name: 'RAM Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: 'Ping', value: `${client.ws.ping} ms`, inline: true },
                    { name: 'Bot Creation Date', value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: 'Bot Last Reset', value: `<t:${Math.floor(process.uptime())}:R>`, inline: true },
                    { name: 'Servers', value: client.guilds.cache.size.toString(), inline: true },
                    { name: 'Total Members', value: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString(), inline: true }
                )
                .setColor('#3498db') // Optional: Set color
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            // Send the embed
            await message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Error executing botinfo command:', error);
            message.reply('There was an error trying to display the bot information.');
        }
    }
};
