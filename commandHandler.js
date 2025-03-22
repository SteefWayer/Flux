import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Events, ActionRowBuilder } from 'discord.js';
import { checkAndUpdateStickyMessage } from './serverutils/stickiedmessage/stickiedmessage.js'; 
import { triggerHandler } from './serverutils/triggerHandler/triggerHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userdataFilePath = path.join(__dirname, './data/userdata.json');
const settingsPath = path.join(__dirname, './serverdata/serversettings.json');
const tipsFilePath = path.join(__dirname, './utils/tips.json'); 

const commandCooldowns = new Map();
const globalCooldownDuration = 200;
const repeatedCooldownDuration = 2000;

const buttonTimers = new Map();
const buttonTimeoutDuration = 10000;

const TIP_CHANCE_PERCENTAGE = 3;

const loggingEnabled = false;

const log = (...messages) => {
    if (loggingEnabled) {
        console.log(...messages);
    }
};

const handleError = async (interaction, error, commandName, type) => {
    console.error(`Error executing ${type} command ${commandName}: ${error.message}`);
    if (context && typeof context.logToFile === 'function') {
        context.logToFile(`Error executing ${type} command ${commandName}: ${error.message}`);
    }
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: 'There was an error processing your request.', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
        }
    } catch (err) {
        console.error(`Error sending error reply: ${err.message}`);
    }
};

const getRandomTip = async () => {
    try {
        const rawTipsData = await fs.readFile(tipsFilePath, 'utf-8');
        const tips = JSON.parse(rawTipsData);
        const randomIndex = Math.floor(Math.random() * tips.length);
        return tips[randomIndex].description;
    } catch (error) {
        console.error(`Error reading tips data: ${error.message}`);
        return 'No tip found :/';
    }
};

const shouldSendTip = () => {
    return Math.random() * 100 < TIP_CHANCE_PERCENTAGE;
};

export default (client, commands, defaultPrefix, context) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;

        triggerHandler(message);

        let serverSettings = {};
        try {
            const rawData = await fs.readFile(settingsPath, 'utf-8');
            serverSettings = JSON.parse(rawData);
        } catch (err) {
            console.error(`Error reading server settings: ${err.message}`);
        }

        await checkAndUpdateStickyMessage(message);

        const guild = message.guild;
        const author = message.author;

        const guildPrefix = serverSettings[message.guild.id]?.prefix || defaultPrefix;

        if (!message.content.startsWith(guildPrefix)) return;

        const args = message.content.slice(guildPrefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const userId = message.author.id;

        if (!commands.has(commandName)) return;

        const command = commands.get(commandName);
        const now = Date.now();

        if (!commandCooldowns.has(userId)) {
            commandCooldowns.set(userId, { lastCommand: null, lastCommandTime: 0 });
        }

        const userCooldown = commandCooldowns.get(userId);
        let cooldownDuration = userCooldown.lastCommand === commandName ? repeatedCooldownDuration : globalCooldownDuration;
        const timeSinceLastCommand = now - userCooldown.lastCommandTime;

        if (timeSinceLastCommand < cooldownDuration) {
            return;
        }

        userCooldown.lastCommand = commandName;
        userCooldown.lastCommandTime = now;
        commandCooldowns.set(userId, userCooldown);

        try {
            if (command.authorId && command.authorId !== userId) {
                return;
            }

            await logCommandUsage(userId, commandName);
            await command.execute(message, args, client, context, serverSettings);

            if (shouldSendTip()) {
                const tip = await getRandomTip();
                await message.channel.send({ content: `${tip}` });
            }

            log(`Message command executed: ${commandName} by ${message.author.tag}`);
        } catch (error) {
            await handleError(message, error, commandName, 'message');
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isCommand()) {
            log(`Received slash command: /${interaction.commandName} from ${interaction.user.tag} (${interaction.user.id})`);
    
            const command = commands.get(interaction.commandName);
            if (!command) {
                log(`No matching command found for /${interaction.commandName}`);
                return;
            }
    
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferReply({ ephemeral: false });
                    log(`Interaction for /${interaction.commandName} deferred successfully.`);
                }
    
                await command.execute(interaction);
                log(`Command /${interaction.commandName} executed successfully by ${interaction.user.tag}.`);
    
                if (shouldSendTip()) {
                    const tip = await getRandomTip();
                    await interaction.followUp({ content: `${tip}` });
                    log(`Follow-up message with tip sent for /${interaction.commandName}.`);
                }
            } catch (error) {
                log(`Error executing /${interaction.commandName}: ${error.message}`);
                await handleError(interaction, error, interaction.commandName, 'slash');
            }
        } else if (interaction.isButton()) {
            const messageId = interaction.message.id;
            if (buttonTimers.has(messageId)) {
                clearTimeout(buttonTimers.get(messageId));
                buttonTimers.delete(messageId);
            }
    
            log(`Button interaction received: ${interaction.customId} on message ${messageId}`);
        }
    });
    
    setInterval(async () => {
        const now = Date.now();
        for (const [messageId, timer] of buttonTimers.entries()) {
            if (now - timer > buttonTimeoutDuration) {
                try {
                    const channel = client.channels.cache.get(messageId);
                    if (channel) {
                        const messageToUpdate = await channel.messages.fetch(messageId);
                        const updatedComponents = messageToUpdate.components.map(row =>
                            new ActionRowBuilder().addComponents(
                                row.components.map(button => button.setDisabled(true))
                            )
                        );
                        await messageToUpdate.edit({ components: updatedComponents });
                        buttonTimers.delete(messageId);
                    }
                } catch (err) {
                    console.error(`Error disabling buttons for message ${messageId}: ${err.message}`);
                }
            }
        }
    }, buttonTimeoutDuration);
};

const logCommandUsage = async (userId, commandName) => {
    let userdata = {};
    try {
        try {
            await fs.access(userdataFilePath);
            const rawData = await fs.readFile(userdataFilePath, 'utf-8');
            userdata = JSON.parse(rawData);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn('User data file not found. Initializing with empty data.');
            } else {
                console.error(`Error reading user data: ${err.message}`);
            }
        }

        if (!userdata[userId]) {
            userdata[userId] = {
                commands: {
                    daily: 0,
                    all: 0
                }
            };
        }

        if (commandName === 'daily') {
            userdata[userId].commands.daily = (userdata[userId].commands.daily || 0) + 1;
        }
        userdata[userId].commands.all = (userdata[userId].commands.all || 0) + 1;

        await fs.writeFile(userdataFilePath, JSON.stringify(userdata, null, 4));
    } catch (err) {
        console.error(`Error writing user data: ${err.message}`);
    }
};
