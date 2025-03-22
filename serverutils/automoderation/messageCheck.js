import fs from 'fs/promises';
import path from 'path';
import { Events } from 'discord.js';

const automodPath = path.join(process.cwd(), './serverdata/automoderation.json');
const messagesToDeletePath = path.join(process.cwd(), './serverdata/messagesToDelete.json');

const log = (...messages) => {
    console.log('[AutoMod]', ...messages);
};

const readAutoModData = async (guildId) => {
    try {
        const data = await fs.readFile(automodPath, 'utf-8');
        const automodData = JSON.parse(data);
        return automodData[guildId] || {};
    } catch (error) {
        if (error.code === 'ENOENT') {
            log('Auto moderation file not found. Initializing with empty data.');
            return {};
        }
        log('Error reading auto moderation data:', error);
        return {};
    }
};

const readMessagesToDelete = async () => {
    try {
        const data = await fs.readFile(messagesToDeletePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            log('Messages to delete file not found. Initializing with empty data.');
            return {};
        }
        log('Error reading messages to delete data:', error);
        return {};
    }
};

const writeMessagesToDelete = async (messages) => {
    await fs.writeFile(messagesToDeletePath, JSON.stringify(messages, null, 2));
};

export default (client) => {
    const messageHandler = async (message) => {
        // Check if the message is from a bot or is in a DM
        if (message.author.bot) return; // Ignore bots
        if (!message.guild) {
            log(`Ignoring DM from ${message.author.tag}.`);
            return; // Ignore DMs
        }

        const guildId = message.guild.id;
        const automodData = await readAutoModData(guildId);
        const messagesToDelete = await readMessagesToDelete();

        if (automodData.bannedWords && automodData.bannedWords.length > 0) {
            const messageContent = message.content.toLowerCase();
            const containsBannedWord = automodData.bannedWords.some(word => messageContent.includes(word.toLowerCase()));

            if (containsBannedWord) {
                try {
                    // Attempt to delete the message
                    await message.delete();
                    log(`Deleted message from ${message.author.tag} for containing banned words.`);

                    // Store the deleted message info in messagesToDelete
                    messagesToDelete[message.id] = {
                        author: message.author.id,
                        content: message.content,
                        timestamp: message.createdTimestamp,
                    };
                    await writeMessagesToDelete(messagesToDelete);
                } catch (error) {
                    log(`Failed to delete message from ${message.author.tag}:`, error);
                }
            }
        }

        // Clean up deleted messages from the stored JSON
        const existingMessages = await message.channel.messages.fetch({ limit: 100 }).catch(() => []);
        const currentMessages = existingMessages.map(msg => msg.id);

        for (const [msgId] of Object.entries(messagesToDelete)) {
            // Only keep message IDs that still exist
            if (!currentMessages.includes(msgId)) {
                delete messagesToDelete[msgId];
                await writeMessagesToDelete(messagesToDelete);
                log(`Removed ${msgId} from messages to delete as it was already deleted.`);
            }
        }
    };

    // Set max listeners to avoid warning
    client.setMaxListeners(20);

    client.off(Events.MessageCreate, messageHandler);
    client.on(Events.MessageCreate, messageHandler);
};
