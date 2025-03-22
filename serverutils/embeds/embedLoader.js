import fs from 'fs';
import path from 'path';
import { EmbedBuilder } from 'discord.js';
import { context } from '../context.js'; // Adjust the import path as necessary

// Function to load embeds from embeds.json
const loadEmbeds = () => {
    const embedsPath = path.join(process.cwd(), 'embeds.json'); // Adjust the path if necessary

    if (!fs.existsSync(embedsPath)) {
        context.logToFile(`Embeds file not found: ${embedsPath}`);
        console.log(`Embeds file not found: ${embedsPath}`);
        return {};
    }

    const embedsData = fs.readFileSync(embedsPath, 'utf8');
    const embeds = JSON.parse(embedsData);
    context.logToFile('Embeds loaded successfully.');
    console.log('Embeds loaded successfully.');

    return embeds;
};

// Function to create an embed from the loaded embeds
const createEmbed = (embedName) => {
    const embeds = loadEmbeds();

    if (!embeds[embedName]) {
        context.logToFile(`Embed not found: ${embedName}`);
        console.log(`Embed not found: ${embedName}`);
        return null;
    }

    const embedData = embeds[embedName];
    const embed = new EmbedBuilder()
        .setTitle(embedData.title)
        .setDescription(embedData.description)
        .setColor(embedData.color);

    if (embedData.fields) {
        embedData.fields.forEach(field => {
            embed.addFields({ name: field.name, value: field.value });
        });
    }

    return embed;
};

export { loadEmbeds, createEmbed };
