import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, './stickiedmessage.json');

// Enable or disable logging
const loggingEnabled = false; // Set this to `true` or `false` to enable or disable logging

// Utility function to log messages to console
const log = (...messages) => {
    if (loggingEnabled) {
        console.log(new Date().toISOString(), ...messages);
    }
};

// Queue for sticky messages
const stickyMessageQueue = new Map();

// Map to keep track of last update time to prevent spamming
const lastUpdateTime = new Map();

// Rate limit settings
const RATE_LIMIT_MS = 2 * 1000; // 2 seconds cooldown per channel
const COOLDOWN_MS = 10 * 1000; // 10 seconds cooldown to prevent too many messages

// Load stickied messages from the JSON file
function loadStickyMessages() {
    log('Attempting to load sticky messages from:', filePath);

    if (fs.existsSync(filePath)) {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        log('Sticky message file found. Raw data length:', rawData.length);

        if (rawData.length) {
            try {
                const data = JSON.parse(rawData);
                log('Loaded sticky messages:', data);
                return data;
            } catch (error) {
                log('Error parsing sticky message file:', error);
                return [];
            }
        } else {
            log('Sticky message file is empty.');
            return [];
        }
    } else {
        log('Sticky message file does not exist.');
        return [];
    }
}

// Save stickied messages to the JSON file
function saveStickyMessages(data) {
    log('Saving sticky messages to:', filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    log('Sticky messages saved.');
}

// Function to handle sending sticky messages
async function sendStickyMessage(channel, messageContent) {
    log('Sending sticky message to channel:', channel.id);

    // Send the sticky message
    try {
        const sentMessage = await channel.send(`__**Stickied message:**__ ${messageContent}`);
        log('Sent sticky message with ID:', sentMessage.id);
        return sentMessage.id;
    } catch (error) {
        log('Error sending sticky message:', error);
    }
}

// Function to delete existing sticky message
async function deleteExistingStickyMessage(channel, messageContent) {
    log('Deleting existing sticky message in channel:', channel.id);

    try {
        const fetchedMessages = await channel.messages.fetch({ limit: 10 });
        const botMessage = fetchedMessages.find(
            (msg) => msg.author.id === channel.client.user.id && msg.content.startsWith('__**Stickied message:**__')
        );

        // If the bot's sticky message is found, delete it
        if (botMessage) {
            log('Deleting existing sticky message:', botMessage.id);
            await botMessage.delete();
        }
    } catch (error) {
        log('Error fetching or deleting existing sticky message:', error);
    }
}

// Function to check and update sticky messages
async function checkAndUpdateStickyMessage(message) {
    log('Received message in channel:', message.channel.id);

    const stickyMessages = loadStickyMessages();
    const stickyEntry = stickyMessages.find(
        (entry) => entry.guildId === message.guild.id && entry.channelId === message.channel.id
    );

    if (stickyEntry) {
        log('Found sticky entry:', stickyEntry);

        // Fetch the channel
        const channel = message.guild.channels.cache.get(stickyEntry.channelId);

        if (!channel) {
            log('Channel not found.');
            return;
        }

        // Check rate limit
        const now = Date.now();
        const lastUpdate = lastUpdateTime.get(channel.id) || 0;

        if (now - lastUpdate < COOLDOWN_MS) {
            log('Cooldown in effect. Skipping sticky message update.');
            return;
        }

        // Update last update time
        lastUpdateTime.set(channel.id, now);

        // Queue the sticky message
        if (!stickyMessageQueue.has(channel.id)) {
            stickyMessageQueue.set(channel.id, []);
        }
        const queue = stickyMessageQueue.get(channel.id);
        queue.push(async () => {
            await deleteExistingStickyMessage(channel, stickyEntry.message);
            await sendStickyMessage(channel, stickyEntry.message);
        });

        // Process the queue
        if (queue.length === 1) { // Only start processing if it's the first item in the queue
            processQueue(channel.id);
        }
    } else {
        log('No sticky message found for this channel.');
    }
}

// Function to process the queue
async function processQueue(channelId) {
    const queue = stickyMessageQueue.get(channelId) || [];
    if (queue.length === 0) {
        return;
    }

    const task = queue.shift();
    if (task) {
        await task(); // Execute the sticky message task
    }

    // Process the next item in the queue
    if (queue.length > 0) {
        setTimeout(() => processQueue(channelId), 500); // Process the next task after a short delay
    } else {
        stickyMessageQueue.delete(channelId); // Remove the queue if it's empty
    }
}

export { checkAndUpdateStickyMessage };
