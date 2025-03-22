import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';

const settingsPath = path.resolve('serverdata', 'serversettings.json');
const helpPagePath = path.resolve('./utils/help/helppage.json');
const helpEmbedPath = path.resolve('./utils/help/helpembed.json');

const getPrefixForServer = async (serverId) => {
    try {
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        return settings[serverId]?.prefix || '!';
    } catch (error) {
        console.error('Error reading server settings:', error);
        return '!';
    }
};

const loadHelpEmbed = async () => {
    try {
        const data = await fs.readFile(helpEmbedPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading help embed:', error);
        return {};
    }
};

const loadHelpPages = async () => {
    try {
        const data = await fs.readFile(helpPagePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading help pages:', error);
        return {};
    }
};

export default {
    name: 'help',
    description: 'Display help information',
    async execute(message, args, client, context) {
        const logToFile = context.logToFile;

        try {
            logToFile(`[${message.guild.id}] [${message.author.tag}] Executed help command.`);

            const prefix = await getPrefixForServer(message.guild.id);

            if (args.length > 0) {
                const embedData = await loadHelpEmbed();
                const command = args[0].toLowerCase();
                
                if (embedData[command]) {
                    const commandInfo = embedData[command];

                    const embed = new EmbedBuilder()
                        .setTitle(commandInfo.title)
                        .setDescription(commandInfo.description)
                        .addFields(commandInfo.fields.map(field => ({
                            name: field.name.replace(/!\b/g, prefix),
                            value: field.value
                        })))
                        .setColor(commandInfo.color || 0x0099ff);

                    return message.channel.send({ embeds: [embed] });
                } else {
                    return message.channel.send(`Command not found. Please check the spelling or report it as missing to the [server](<https://discord.gg/c26ZCC3TKu>).`);
                }
            }

            const generalHelpData = await loadHelpPages();
            const page = generalHelpData['home'];

            const updatedFields = page.fields.map(field => ({
                ...field,
                name: field.name.replace(/!\b/g, prefix)
            }));

            const { thumb } = context;
            if (typeof thumb !== 'string' || !thumb.startsWith('http')) {
                throw new Error('Invalid thumbnail URL');
            }

            const timestamp = new Date().toLocaleString();

            const embed = new EmbedBuilder()
                .setTitle(page.title || 'Help')
                .setDescription(page.description || 'No description available.')
                .setThumbnail(thumb)
                .addFields(updatedFields)
                .setColor(page.color || 0x0099ff)
                .setFooter({ text: `Help requested on: ${timestamp}`, iconURL: thumb });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('help_select')
                .setPlaceholder('Select a category')
                .addOptions([
                    { label: 'Home', value: 'home' },
                    { label: 'Economy', value: 'economy' },
                    { label: 'Fun', value: 'fun' },
                    { label: 'Profile', value: 'profile' },
                    { label: 'Setup', value: 'setup' },
                    { label: 'Moderation', value: 'moderation' },
                    { label: 'Servershop', value: 'servershop' },
                    { label: 'Shop', value: 'shop' },
                    { label: 'Levels', value: 'levels' },
                    { label: 'Utility', value: 'utility' },
                    { label: 'New Features', value: 'new' }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

            const filter = i => i.customId === 'help_select';
            const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

            let timeout = setTimeout(async () => {
                const disabledSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('help_select')
                    .setPlaceholder('Select a category')
                    .setDisabled(true)
                    .addOptions(selectMenu.options);

                const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
                await sentMessage.edit({ components: [disabledRow] });
            }, 30000);

            collector.on('collect', async i => {
                clearTimeout(timeout);

                timeout = setTimeout(async () => {
                    const disabledSelectMenu = new StringSelectMenuBuilder()
                        .setCustomId('help_select')
                        .setPlaceholder('Select a category')
                        .setDisabled(true)
                        .addOptions(selectMenu.options);

                    const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
                    await sentMessage.edit({ components: [disabledRow] });
                }, 30000);

                logToFile(`[${message.guild.id}] [${i.user.tag}] Dropdown selection: ${i.values[0]}`);

                if (i.user.id !== message.author.id) {
                    return i.reply({ content: 'You are not allowed to use this dropdown.', ephemeral: true });
                }

                const newTopic = i.values[0];
                const newPage = generalHelpData[newTopic] || generalHelpData['home'];

                const newUpdatedFields = newPage.fields.map(field => ({
                    ...field,
                    name: field.name.replace(/!\b/g, prefix)
                }));

                const newEmbed = new EmbedBuilder()
                    .setTitle(newPage.title)
                    .setDescription(newPage.description)
                    .setThumbnail(thumb)
                    .addFields(newUpdatedFields)
                    .setColor(newPage.color)
                    .setFooter({ text: `Help requested on: ${timestamp}`, iconURL: thumb });

                await i.update({
                    embeds: [newEmbed],
                    components: [row]
                });
            });

            collector.on('end', async () => {
                const disabledSelectMenu = new StringSelectMenuBuilder()
                    .setCustomId('help_select')
                    .setPlaceholder('Select a category')
                    .setDisabled(true)
                    .addOptions(selectMenu.options);

                const disabledRow = new ActionRowBuilder().addComponents(disabledSelectMenu);
                await sentMessage.edit({ components: [disabledRow] });
            });

        } catch (error) {
            console.error('Error executing help command:', error);
            return message.channel.send('An error occurred while executing the help command.');
        }
    }
};
