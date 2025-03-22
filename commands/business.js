import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';

// Handle __dirname in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inventoryPath = path.join(__dirname, '..', 'data', 'inventory.json');
const businessesPath = path.join(__dirname, '..', 'utils', 'businesses.json');
const completedMissionsPath = path.join(__dirname, '..', 'data', 'completedmissions.json');
const setupMissionsPath = path.join(__dirname, '..', 'utils', 'businesses', 'setupmissions.json');
const balancePath = path.join(__dirname, '..', 'data', 'economy.json');

// Debug flag for logging
const debug = false; // Set this to false to disable debug logging

// Utility functions
const readJSONFile = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        if (debug) console.log(`Read file at ${filePath}`);
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Error reading or parsing file at ${filePath}: ${err.message}`);
    }
};

const writeJSONFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        if (debug) console.log(`Successfully wrote to file at ${filePath}`);
    } catch (err) {
        throw new Error(`Error writing file at ${filePath}: ${err.message}`);
    }
};

// Create an embed to display the user's businesses
const createBusinessEmbed = (user, businesses, allBusinesses) => {
    let description = '';
    const actionRows = [];
    let row = new ActionRowBuilder();

    businesses.forEach((business, index) => {
        const businessDetails = allBusinesses.flatMap(category => category.businesses)
            .find(b => b.shop_id === parseInt(business.id)); // Ensure ID is parsed as integer
        if (!businessDetails) return;

        description += `${businessDetails.shop_emoji} **${businessDetails.shop_name}** - ${businessDetails.category_name}\n`;

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`business_${business.id}`)
                .setLabel(businessDetails.shop_name)
                .setStyle(ButtonStyle.Primary)
        );

        // Add buttons in a paginated way if you have many businesses
        if (index % 5 === 4) { // limit to 5 buttons per row
            actionRows.push(row);
            row = new ActionRowBuilder(); // reset row
        }
    });

    // Add the last row if there are any remaining buttons
    if (row.components.length > 0) {
        actionRows.push(row);
    }

    return {
        embed: new EmbedBuilder()
            .setTitle(`${user.username}'s Businesses`)
            .setColor('#0099ff')
            .setDescription(description || 'No businesses found.')
            .setFooter({ text: 'Click the buttons below to view more details about each business.' }),
        actionRows
    };
};

// Create an embed with business details
const createBusinessDetailEmbed = (businessDetails, missionData) => {
    const embed = new EmbedBuilder()
        .setTitle(`${businessDetails.shop_emoji} ${businessDetails.shop_name}`)
        .setColor('#0099ff')
        .setDescription(businessDetails.shop_description)
        .addFields(
            { name: 'Category', value: businessDetails.category_name, inline: true },
            { name: 'Price', value: businessDetails.shop_price, inline: true },
            { name: 'Income Per Hour', value: businessDetails.income_per_hour, inline: true },
            { name: 'Missions Completed', value: `${missionData.missions_completed}/${missionData.total_missions}`, inline: true },
            { name: 'Payout Status', value: missionData.payout ? 'Completed' : 'Not Completed', inline: true }
        );

    // Add the "Collect Income" button if payout is true
    if (missionData.payout) {
        embed.setFooter({ text: 'Click the button below to collect income.' });
    } else if (missionData.missions_completed === 0) {
        embed.setFooter({ text: 'Click the button below to start a mission.' });
    }

    return embed;
};

// Start a new mission
const startMission = async (userId, businessId, setupMissions, completedMissions) => {
    try {
        const randomMission = setupMissions.setupmissions[Math.floor(Math.random() * setupMissions.setupmissions.length)];

        // Initialize user and business data if not present
        if (!completedMissions[userId]) {
            completedMissions[userId] = {};
        }

        if (!completedMissions[userId][businessId]) {
            completedMissions[userId][businessId] = {
                missions_completed: 0,
                total_missions: randomMission.missions.length,
                payout: false,
                current_mission: {} // Ensure this field is initialized
            };
        }

        // Start with the first mission in the random setup mission
        const initialMission = randomMission.missions[0];

        // Add the setup mission to the user's current mission
        completedMissions[userId][businessId].current_mission = {
            setup_mission_id: randomMission.setup_mission_id,
            mission_id: initialMission.mission_id,
            mission_description: initialMission.description,
            mission_progress: 0
        };

        // Save the updated data
        writeJSONFile(completedMissionsPath, completedMissions);

        return randomMission;
    } catch (err) {
        console.error(`Error starting mission: ${err.message}`);
        throw new Error('Failed to start the mission.');
    }
};

// Utility function to handle income collection with cooldown
const handleCollectIncome = (userId, businessId, businessDetails, completedMissions, balances) => {
    console.log(`[${new Date().toISOString()}] Handling income collection for User ID ${userId}, Business ID ${businessId}`);

    const now = Date.now();
    const cooldownKey = `${userId}_${businessId}`;
    let cooldowns;

    try {
        cooldowns = readJSONFile(completedMissionsPath); // Load cooldowns data
        console.log(`[${new Date().toISOString()}] Current cooldowns: ${JSON.stringify(cooldowns)}`);
    } catch (err) {
        console.error(`Error reading cooldowns data: ${err.message}`);
        return { error: 'Failed to read cooldowns data.' };
    }

    if (now < (cooldowns[cooldownKey] || 0)) {
        const remainingTime = Math.ceil(((cooldowns[cooldownKey] || 0) - now) / 60000);
        console.log(`[${new Date().toISOString()}] User is still on cooldown. Remaining time: ${remainingTime} minutes`);
        return { error: `You can collect income in ${remainingTime} minutes.` };
    }

    const nextCooldown = now + 3600000;
    cooldowns[cooldownKey] = nextCooldown;

    try {
        writeJSONFile(completedMissionsPath, cooldowns); // Save updated cooldowns
        console.log(`[${new Date().toISOString()}] Updated cooldown for ${cooldownKey}: ${nextCooldown}`);
    } catch (err) {
        console.error(`Error writing cooldowns data: ${err.message}`);
        return { error: 'Failed to update cooldowns data.' };
    }

    if (!balances[userId]) {
        balances[userId] = {
            balance: 0,
            bankBalance: 0,
            withdrawnCash: 0,
            userName: '',
            lastWork: 0,
            lastDaily: 0
        };
    }

    const incomeAmount = parseInt(businessDetails.income_per_hour.replace(/\D/g, ''));

    balances[userId].withdrawnCash += incomeAmount;

    try {
        writeJSONFile(balancePath, balances);
        console.log(`[${new Date().toISOString()}] Updated balance for User ID ${userId}. New balance: ⏣ ${balances[userId].balance}`);
    } catch (err) {
        console.error(`Error writing balance data: ${err.message}`);
        return { error: 'Failed to update balance data.' };
    }

    console.log(`[${new Date().toISOString()}] Updated withdrawn cash for User ID ${userId}. New withdrawn cash: ⏣ ${balances[userId].withdrawnCash}`);

    return { success: `Collected ⏣ ${incomeAmount} income!` };
};

// Handle business interactions
const handleBusinessInteraction = async (interaction, allBusinesses, completedMissions, setupMissions, balances) => {
    const customId = interaction.customId;
    if (debug) console.log(`[${new Date().toISOString()}] Handling interaction with custom ID: ${customId}`);

    const parts = customId.split('_');
    const action = parts[0];
    const businessId = parts[parts.length - 1];
    if (debug) console.log(`[${new Date().toISOString()}] Extracted business ID: ${businessId}`);

    const businessDetails = allBusinesses.flatMap(category => category.businesses)
        .find(b => b.shop_id === parseInt(businessId));
    if (!businessDetails) {
        if (debug) console.log(`[${new Date().toISOString()}] Business details not found for ID ${businessId}`);
        return interaction.reply({ content: 'Business details not found.', ephemeral: true });
    }

    if (!completedMissions[interaction.user.id]) {
        completedMissions[interaction.user.id] = {};
    }

    if (!completedMissions[interaction.user.id][businessId]) {
        completedMissions[interaction.user.id][businessId] = {
            missions_completed: 0,
            total_missions: 5,
            payout: false,
            current_mission: {}
        };
        try {
            writeJSONFile(completedMissionsPath, completedMissions);
        } catch (err) {
            console.error(`Error writing completed missions data: ${err.message}`);
            return interaction.reply({ content: 'Failed to update mission data.', ephemeral: true });
        }
    }

    const missionData = completedMissions[interaction.user.id][businessId];
    const detailEmbed = createBusinessDetailEmbed(businessDetails, missionData);

    const components = [];
    if (missionData.payout) {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`collect_income_${businessId}`)
                    .setLabel('Collect Income')
                    .setStyle(ButtonStyle.Success)
            )
        );
    }

    try {
        await interaction.update({ embeds: [detailEmbed], components });
        if (debug) console.log(`[${new Date().toISOString()}] Updated interaction with new embed and components`);
    } catch (err) {
        console.error(`Error updating interaction: ${err.message}`);
        return interaction.reply({ content: 'Failed to update interaction.', ephemeral: true });
    }
};

// Execute the command
export default {
    name: 'businesses',
    aliases: ['b', 'business', 'shops'],
    description: 'Shows the user their owned businesses',
    async execute(message, args) {
        try {
            // Load data from files
            const inventory = readJSONFile(inventoryPath);
            const allBusinesses = readJSONFile(businessesPath).categories.flatMap(category => ({
                ...category,
                businesses: category.businesses.map(business => ({
                    ...business,
                    category_name: category.category_name
                }))
            }));
            const completedMissions = readJSONFile(completedMissionsPath);
            const setupMissions = readJSONFile(setupMissionsPath);
            const balances = readJSONFile(balancePath); // Load balances data

            // Get the user's inventory by their Discord ID
            const userId = message.author.id;
            const userInventory = inventory[userId];

            if (!userInventory) {
                if (debug) console.log(`User ${userId} has no items in their inventory.`);
                return message.reply('You have no items in your inventory.');
            }

            // Filter out only the businesses
            const businesses = userInventory.filter(item => item.type === 'businessID');

            if (businesses.length === 0) {
                if (debug) console.log(`User ${userId} does not own any businesses.`);
                return message.reply('You do not own any businesses.');
            }

            // Create embed for displaying businesses
            const { embed, actionRows } = createBusinessEmbed(message.author, businesses, allBusinesses);

            // Send the embed with the action buttons
            await message.channel.send({ embeds: [embed], components: actionRows });

            // Handle interactions with buttons
            const filter = i => i.user.id === message.author.id;
            const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (interaction) => {
                // Check if the interaction is for collecting income
                if (interaction.customId.startsWith('collect_income_')) {
                    const businessId = interaction.customId.split('_')[2];
                    const result = handleCollectIncome(message.author.id, businessId, allBusinesses.flatMap(category => category.businesses).find(b => b.shop_id === parseInt(businessId)), completedMissions, balances);
                    if (result.error) {
                        return interaction.reply({ content: result.error, ephemeral: true });
                    }
                    return interaction.reply({ content: result.success, ephemeral: true });
                } else {
                    await handleBusinessInteraction(interaction, allBusinesses, completedMissions, setupMissions, balances);
                }
            });

            collector.on('end', collected => {
                if (debug) console.log(`Collected ${collected.size} interactions`);
            });

        } catch (err) {
            console.error(`Error executing command: ${err.message}`);
            await message.channel.send('An error occurred while executing this command.');
        }
    }
};
