import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import commandHandler from './commandHandler.js';
import { context, logToFile } from './context.js';
import { contextFilePath } from './constants.js';
import { handleXP } from './xpHandler.js';
import { handleXPAndLevel } from './levelhandler.js';
import sendSetupMessage from './serverutils/setupmessage/setupMessage.js';

context.logToFile = logToFile;

const loggingEnabled = true;

const log = (...messages) => {
    if (loggingEnabled) {
        console.log(...messages);
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPrefix = '!';

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_BOT_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
    ],
});

client.on('guildCreate', async (guild) => {
    log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);

    try {
        const channel = guild.channels.cache
            .filter((ch) => ch.isTextBased() && ch.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages']))
            .first();

        if (channel) {
            await sendSetupMessage(channel);
            log(`Setup message sent in ${channel.name} of ${guild.name}`);
        } else {
            log(`No suitable channel found to send the setup message in ${guild.name}`);
        }
    } catch (error) {
        log(`Failed to send setup message for guild ${guild.name}: ${error.message}`);
    }
});

const commands = new Map();

const loadCommands = async () => {
    let successfulLoads = 0;
    let failedLoads = 0;
    const failedFiles = [];

    context.logToFile('Starting to load command files.');
    log('Starting to load command files.');

    try {
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        if (commandFiles.length === 0) {
            context.logToFile('No command files found in the commands directory.');
            log('No command files found in the commands directory.');
        } else {
            context.logToFile(`Found ${commandFiles.length} command files in the commands directory.`);
            log(`Found ${commandFiles.length} command files in the commands directory.`);
            for (const file of commandFiles) {
                const commandPath = new URL(`./commands/${file}`, import.meta.url);
                try {
                    const command = (await import(commandPath)).default;
                    if (command && command.name) {
                        commands.set(command.name, command);
                        if (command.aliases) {
                            command.aliases.forEach(alias => commands.set(alias, command));
                        }
                        successfulLoads++;
                        context.logToFile(`Loaded command file ${file}`);
                        log(`Loaded command file ${file}`);
                    } else {
                        context.logToFile(`Command in file ${file} does not have a default export with 'name'.`);
                        log(`Command in file ${file} does not have a default export with 'name'.`);
                        failedLoads++;
                        failedFiles.push(file);
                    }
                } catch (error) {
                    context.logToFile(`Failed to load command file ${file}: ${error.message}`);
                    log(`Failed to load command file ${file}: ${error.message}`);
                    failedLoads++;
                    failedFiles.push(file);
                }
            }
        }

        const shopCommandPath = new URL(`./shop/shop.js`, import.meta.url);
        if (fs.existsSync(shopCommandPath)) {
            context.logToFile('Loading shop command file: shop.js');
            log('Loading shop command file: shop.js');
            try {
                const shopCommand = (await import(shopCommandPath)).default;
                if (shopCommand && shopCommand.name) {
                    commands.set(shopCommand.name, shopCommand);
                    if (shopCommand.aliases) {
                        shopCommand.aliases.forEach(alias => commands.set(alias, shopCommand));
                    }
                    successfulLoads++;
                } else {
                    context.logToFile(`Shop command does not have a default export with 'name'.`);
                    log(`Shop command does not have a default export with 'name'.`);
                    failedLoads++;
                    failedFiles.push('shop.js');
                }
            } catch (error) {
                context.logToFile(`Failed to load shop command file: shop.js. Error: ${error.message}`);
                log(`Failed to load shop command file: shop.js. Error: ${error.message}`);
                failedLoads++;
                failedFiles.push('shop.js');
            }
        } else {
            context.logToFile('No shop.js command file found in the shop directory.');
            log('No shop.js command file found in the shop directory.');
        }
    } catch (error) {
        context.logToFile(`Failed to load commands: ${error.message}`);
        log(`Failed to load commands: ${error.message}`);
        throw error;
    }

    context.logToFile(`Command loading completed. Success: ${successfulLoads}, Failures: ${failedLoads}`);
    log(`Command loading completed. Success: ${successfulLoads}, Failures: ${failedLoads}`);
    if (failedLoads > 0) {
        context.logToFile(`Failed command files: ${failedFiles.join(', ')}`);
        log(`Failed command files: ${failedFiles.join(', ')}`);
    }
};

const loadServerUtils = async () => {
    const serverUtilsPath = path.join(__dirname, 'serverutils');

    try {
        const subdirs = fs.readdirSync(serverUtilsPath).filter((file) =>
            fs.statSync(path.join(serverUtilsPath, file)).isDirectory()
        );

        console.log(`Found subdirectories: ${subdirs.join(', ')}`);

        for (const subdir of subdirs) {
            const subdirPath = path.join(serverUtilsPath, subdir);

            const files = fs.readdirSync(subdirPath).filter((file) => file.endsWith('.js'));

            console.log(`Found files in ${subdir}: ${files.join(', ')}`);

            for (const file of files) {
                const filePath = path.join(subdirPath, file);
                try {
                    context.logToFile(`Loading server utility script: ${filePath}`);
                    log(`Loading server utility script: ${filePath}`);
                    await import(`file://${filePath}`);
                    log(`Successfully loaded server utility script: ${filePath}`);
                } catch (error) {
                    context.logToFile(`Failed to load server utility script ${filePath}: ${error.message}`);
                    log(`Failed to load server utility script ${filePath}: ${error.message}`);
                }
            }
        }
    } catch (error) {
        context.logToFile(`Failed to load server utilities: ${error.message}`);
        log(`Failed to load server utilities: ${error.message}`);
    }
};

const updateIDs = async () => {
    try {
        const updateIDPath = path.resolve(__dirname, 'utils', 'updateID.js');
        context.logToFile(`Attempting to load updateID.js from: ${updateIDPath}`);
        log(`Attempting to load updateID.js from: ${updateIDPath}`);
        await import(`file://${updateIDPath}`);
        context.logToFile('ID update script executed successfully.');
        log('ID update script executed successfully.');
    } catch (error) {
        context.logToFile(`Failed to execute ID update script: ${error.message}`);
        log(`Failed to execute ID update script: ${error.message}`);
        throw error;
    }
};

const updateNames = async () => {
    try {
        const updateNamePath = path.resolve(__dirname, 'utils', 'updateName.js');
        context.logToFile(`Attempting to load updateName.js from: ${updateNamePath}`);
        log(`Attempting to load updateName.js from: ${updateNamePath}`);
        await import(`file://${updateNamePath}`);
        context.logToFile('Name update script executed successfully.');
        log('Name update script executed successfully.');
    } catch (error) {
        context.logToFile(`Failed to execute Name update script: ${error.message}`);
        log(`Failed to execute Name update script: ${error.message}`);
        throw error;
    }
};

const sendStartupMessage = async (client) => {
    try {
        if (fs.existsSync(contextFilePath)) {
            const contextData = fs.readFileSync(contextFilePath, 'utf8');
            const { channelId, guildId } = JSON.parse(contextData);

            const channel = await client.channels.fetch(channelId);
            const guild = client.guilds.cache.get(guildId);

            if (channel && guild) {
                await channel.send(`The bot has restarted and is now online! Ping: ${client.ws.ping}ms`);
                context.logToFile(`Sent startup message to channel ${channelId} in guild ${guildId}.`);
                log(`Sent startup message to channel ${channelId} in guild ${guildId}.`);
            } else {
                context.logToFile(`Channel or Guild not found. Channel ID: ${channelId}, Guild ID: ${guildId}`);
                log(`Channel or Guild not found. Channel ID: ${channelId}, Guild ID: ${guildId}`);
            }

            fs.unlinkSync(contextFilePath);
        } else {
            context.logToFile('No context file found, skipping startup message.');
            log('No context file found, skipping startup message.');
        }
    } catch (error) {
        context.logToFile(`Failed to send startup message: ${error.message}`);
        log(`Failed to send startup message: ${error.message}`);
        throw error;
    }
};

commandHandler(client, commands, defaultPrefix, context);
handleXP(client);
handleXPAndLevel(client);

client.login(token).then(async () => {
    context.logToFile('Client logged in successfully.');
    log('Client logged in successfully.');

    try {
        log('Starting the slash command registration process...');
        const rest = new REST({ version: '10' }).setToken(token);

        const slashCommands = [];
        const slashCommandsPath = path.join(__dirname, 'slashcommands');
        const slashCommandFiles = fs.readdirSync(slashCommandsPath).filter(file => file.endsWith('.js'));

        log(`Found ${slashCommandFiles.length} slash command files to load.`);
        for (const file of slashCommandFiles) {
            const commandPath = path.join(slashCommandsPath, file);
            log(`Loading slash command file: ${file}`);
            try {
                const commandModule = await import(`file://${commandPath}`);
                const command = commandModule.default;

                if (command && command.data && typeof command.data.toJSON === 'function') {
                    slashCommands.push(command.data.toJSON());
                    log(`Successfully loaded slash command: ${command.data.name}`);
                } else {
                    log(`Invalid command structure in file ${file}. Skipping...`);
                }
            } catch (importError) {
                log(`Failed to import slash command file ${file}: ${importError.message}`);
            }
        }

        log(`Registering ${slashCommands.length} slash commands globally...`);
        const data = await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
        log(`Successfully registered ${data.length} slash commands globally.`);

        // Now load server utility scripts after registering commands
        await loadServerUtils();
        await loadCommands();
        await updateIDs();
        await updateNames();
        await sendStartupMessage(client);
    } catch (error) {
        log(`Failed to load or register commands: ${error.message}`);
    }
});

// Handle process exit
process.on('exit', (code) => {
    context.logToFile(`Process exited with code ${code}`);
    log(`Process exited with code ${code}`);
});

process.on('uncaughtException', (error) => {
    context.logToFile(`Uncaught Exception: ${error.message}`);
    log(`Uncaught Exception: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
    context.logToFile(`Unhandled Rejection at: ${promise} reason: ${reason}`);
    log(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});
