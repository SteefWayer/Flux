import fs from 'fs';
import path from 'path';
import loadUserMessageCount from '../utils/loadUserMessageCount.js';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGGING_ENABLED = false;

const log = (...messages) => {
    if (LOGGING_ENABLED) {
        console.log(...messages);
    }
};

const execute = async (context) => {
    const message = context.message || context;
    const guild = message.guild;
    const args = message.content.split(' ');

    let targetUser = message.mentions.users.first() || guild.members.cache.get(args[1])?.user || message.author;

    if (!targetUser && args[1]) {
        try {
            targetUser = await guild.members.fetch(args[1]);
            targetUser = targetUser?.user;
        } catch (error) {
            return message.reply("Invalid user ID or user not found.");
        }
    }

    log(`Fetching message count for: ${targetUser.tag}`);

    const loadingEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Loading Message Count...')
        .setDescription(`Fetching message count for **${targetUser.tag}**...`)
        .setTimestamp();

    const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

    const messageCountPath = path.join(__dirname, '../serverdata/messagecount.json');
    log('Message count path:', messageCountPath);

    if (!fs.existsSync(messageCountPath)) {
        console.error('Message count data file not found. Creating a new one...');
        fs.writeFileSync(messageCountPath, JSON.stringify({}, null, 2));
    }

    const messageCountData = JSON.parse(fs.readFileSync(messageCountPath, 'utf-8'));
    log('Message count data loaded:', messageCountData);

    if (!messageCountData[guild.id]) {
        log(`Creating new entry for guild: ${guild.id}`);
        messageCountData[guild.id] = { users: {} };
    }

    const userMessageCount = messageCountData[guild.id].users[targetUser.id]?.count;

    if (userMessageCount === undefined) {
        log(`User ${targetUser.tag} not found in message count data, loading...`);

        await loadingMessage.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle('Loading Messages...')
                    .setDescription(`Currently loading messages for **${targetUser.tag}**... Please wait.`)
                    .setTimestamp()
            ]
        });

        await loadUserMessageCount(message);

        const updatedData = JSON.parse(fs.readFileSync(messageCountPath, 'utf-8'));
        const updatedCount = updatedData[guild.id]?.users[targetUser.id]?.count || 0;

        log(`Total messages sent by ${targetUser.tag} after loading: ${updatedCount}`);

        const finalEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Message Count Retrieved')
            .setDescription(`Total messages sent by **${targetUser.tag}** after loading: **${updatedCount}**`)
            .setTimestamp();

        return await loadingMessage.edit({ embeds: [finalEmbed] });
    }

    const finalEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Message Count Retrieved')
        .setDescription(`Total messages sent by **${targetUser.tag}**: **${userMessageCount}**`)
        .setTimestamp();

    await loadingMessage.edit({ embeds: [finalEmbed] });
};

export default {
    name: 'messages',
    aliases: ['msgs'],
    description: 'Retrieves the message count for a specified user in the current guild.',
    execute,
};
