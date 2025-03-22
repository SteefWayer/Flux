import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load moderators and admins from servermods.json
const modsFilePath = path.join(__dirname, '..', 'serverdata', 'servermods.json');

// Number emoji array for poll options
const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

// Utility function to read the mods file
const readModsFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Error reading or parsing file at ${filePath}: ${err.message}`);
    }
};

export default {
    name: 'poll',
    description: 'Create a poll with a question and multiple answers.',
    async execute(message, args) {
        const userId = message.author.id;
        const serverId = message.guild.id;

        // Load mods and admins from servermods.json
        let modsData;
        try {
            modsData = readModsFile(modsFilePath);
        } catch (error) {
            console.error('Error loading mods file:', error.message);
            return message.reply('Error accessing moderation settings.');
        }

        const serverData = modsData[serverId] || {};
        const admins = serverData.admins || [];
        const mods = serverData.mods || [];

        // Check if the user is either a mod, admin, or has "Manage Messages" permission
        const hasPermission = admins.includes(userId) || mods.includes(userId) ||
            message.member.permissions.has(PermissionsBitField.Flags.ManageMessages);

        if (!hasPermission) {
            return message.reply("You don't have the required permissions to create a poll.");
        }

        // Check if there is any input after the command
        if (!args.length) {
            return message.reply('Please provide a poll question and answers. Example: !poll (Your Question)/Answer 1/Answer 2');
        }

        // Parse the poll content (question and answers)
        const pollContent = args.join(' ').split('/');
        
        // Ensure that the poll has at least one question and two answers
        if (pollContent.length < 3) {
            return message.reply('Please provide a poll with a question and at least two answers.');
        }

        const pollQuestion = pollContent[0]; // The first part is the question
        const pollAnswers = pollContent.slice(1); // The rest are the answers

        // Create an embed for the poll
        const pollEmbed = new EmbedBuilder()
            .setTitle('📊 Poll')
            .setDescription(`**${pollQuestion}**`)
            .setColor('#00FF00')
            .setFooter({ text: `Poll created by ${message.author.username}` });

        // Add answers as fields in the embed with emojis
        pollAnswers.forEach((answer, index) => {
            pollEmbed.addFields({ name: `Option ${index + 1}`, value: `${numberEmojis[index]} ${answer}`, inline: false });
        });

        // Send the poll embed message
        const pollMessage = await message.channel.send({ embeds: [pollEmbed] });

        // React to the poll with corresponding number emojis
        for (let i = 0; i < pollAnswers.length && i < numberEmojis.length; i++) {
            await pollMessage.react(numberEmojis[i]);
        }
    }
};
