import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ChannelType } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadUserMessageCount = async (message) => {
    const guild = message.guild;
    const messageCountPath = path.join(__dirname, '../serverdata/messagecount.json');

    // Load existing message count data
    let messageCountData = {};
    if (fs.existsSync(messageCountPath)) {
        messageCountData = JSON.parse(fs.readFileSync(messageCountPath, 'utf-8'));
    } else {
        console.log(`No existing message count file found, creating a new one.`);
    }

    // Initialize guild entry if not present
    if (!messageCountData[guild.id]) {
        console.log(`Creating new entry for guild: ${guild.id}`);
        messageCountData[guild.id] = { users: {} };
    }

    const channels = await guild.channels.fetch();
    const textChannels = channels.filter(channel => channel.type === ChannelType.GuildText);

    console.log(`Found ${textChannels.size} text channels in the guild.`);

    for (const channel of textChannels.values()) {
        const botMember = guild.members.me;

        if (!botMember || !channel.permissionsFor(botMember).has('VIEW_CHANNEL') || !channel.permissionsFor(botMember).has('READ_MESSAGE_HISTORY')) {
            console.warn(`Cannot read messages in channel: ${channel.name}`);
            continue; // Skip this channel
        }

        console.log(`Fetching messages from channel: ${channel.name}`);

        let lastMessageId = null;
        let fetchedMessages;

        try {
            do {
                fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId });

                // Iterate through fetched messages
                fetchedMessages.forEach(msg => {
                    const userId = msg.author.id;

                    // Initialize user entry if not present
                    if (!messageCountData[guild.id].users[userId]) {
                        messageCountData[guild.id].users[userId] = { count: 0, commands: 0, username: msg.author.tag };
                    }

                    // Increment the message count for the user
                    messageCountData[guild.id].users[userId].count++;

                    // Check for commands in the user's messages
                    if (msg.content.startsWith('!') || msg.content.startsWith('?') || msg.content.startsWith('/') || msg.content.startsWith('$')) {
                        messageCountData[guild.id].users[userId].commands++;
                    }
                });

                console.log(`Fetched ${fetchedMessages.size} messages from channel: ${channel.name}`);

                if (fetchedMessages.size > 0) {
                    lastMessageId = fetchedMessages.last().id; 
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            } while (fetchedMessages.size > 0);
        } catch (error) {
            console.error(`Error fetching messages from channel ${channel.name}:`, error);
        }
    }

    // Log all users' message counts
    console.log("Message Count Data:", JSON.stringify(messageCountData[guild.id].users, null, 2));

    // Write the updated message count data to the JSON file
    try {
        fs.writeFileSync(messageCountPath, JSON.stringify(messageCountData, null, 2));
        console.log(`Message counts saved successfully.`);
    } catch (error) {
        console.error(`Error saving message count data:`, error);
    }
    
    await loadingMessage.edit(`Message count data has been updated.`);
};

export default loadUserMessageCount;
