import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs/promises';

// Resolve the directory of the current module file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Construct the paths to the required files
const idsFilePath = resolve(__dirname, '../utils/ID.json');
const namesFilePath = resolve(__dirname, '../utils/names.json');
const carsFilePath = resolve(__dirname, '../utils/cars.json');
const toolsFilePath = resolve(__dirname, '../utils/tools.json');
const inventoryFilePath = resolve(__dirname, '../data/inventory.json');
const economyFilePath = resolve(__dirname, '../data/economy.json');

// Load and parse the JSON data
let idsData, namesData, carsData, toolsData;

const loadData = async () => {
    try {
        console.log('Loading data from files...');
        idsData = JSON.parse(await fs.readFile(idsFilePath, 'utf-8'));
        namesData = JSON.parse(await fs.readFile(namesFilePath, 'utf-8'));
        carsData = JSON.parse(await fs.readFile(carsFilePath, 'utf-8'));
        toolsData = JSON.parse(await fs.readFile(toolsFilePath, 'utf-8'));
        console.log('Data loaded successfully.');
    } catch (error) {
        console.error('Error loading JSON data:', error);
        throw new Error('Error loading data.');
    }
};

await loadData(); // Ensure data is loaded before handling any purchase

// Function to fetch user data
const fetchUserData = async (userId) => {
    try {
        console.log(`Fetching user data for user ID: ${userId}`);
        const economyData = JSON.parse(await fs.readFile(economyFilePath, 'utf-8'));
        return economyData[userId] || { bankBalance: 0, withdrawnCash: 0 };
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw new Error('Error fetching user data.');
    }
};

// Function to update user data
const updateUserData = async (userId, updates) => {
    try {
        console.log(`Updating user data for user ID: ${userId}`);
        const economyData = JSON.parse(await fs.readFile(economyFilePath, 'utf-8'));
        economyData[userId] = { ...economyData[userId], ...updates };
        await fs.writeFile(economyFilePath, JSON.stringify(economyData, null, 2));
        console.log('User data updated successfully.');
    } catch (error) {
        console.error('Error updating user data:', error);
        throw new Error('Error updating user data.');
    }
};

// Function to handle purchase
export const handlePurchase = async (interaction, itemId) => {
    const userId = interaction.user.id;
    const itemIdNumber = Number(itemId);

    console.log(`Processing purchase for item ID: ${itemIdNumber} by user ID: ${userId}`);

    let idType = null;
    let itemDetails = null;

    // Determine the ID type and get item details
    if (idsData.carID.includes(itemIdNumber)) {
        idType = 'carID';
        itemDetails = carsData.manufacturers.flatMap(m => m.cars).find(car => car.car_ID === itemIdNumber);
    } else if (idsData.toolID.includes(itemIdNumber)) {
        idType = 'toolID';
        itemDetails = toolsData.usage.flatMap(t => t.tools).find(tool => tool.tool_ID === itemIdNumber);
    } else {
        console.error(`Invalid item ID: ${itemIdNumber}`);
        return await interaction.reply({ content: 'Invalid item ID. Please try again.', ephemeral: true });
    }

    if (!itemDetails) {
        console.error('Item details not found for item ID:', itemIdNumber);
        return await interaction.reply({ content: 'Item details not found. Please try again.', ephemeral: true });
    }

    // Determine the correct price field based on the item type
    const priceField = idType === 'carID' ? 'car_price' : idType === 'toolID' ? 'tool_price' : 'shop_price';
    const itemPrice = parseFloat(itemDetails[priceField].replace(/[^0-9.]/g, ''));
    console.log(`Item price for item ID ${itemIdNumber}: ${itemPrice}`);

    let userData;
    try {
        userData = await fetchUserData(userId);
    } catch (error) {
        console.error('Error fetching user data:', error);
        return await interaction.reply({ content: 'Error fetching user data. Please try again later.', ephemeral: true });
    }

    console.log(`User withdrawn cash: ${userData.withdrawnCash}`);
    if (userData.withdrawnCash >= itemPrice) {
        // Update user's withdrawn cash
        try {
            await updateUserData(userId, { withdrawnCash: userData.withdrawnCash - itemPrice });
        } catch (error) {
            console.error('Error updating user data:', error);
            return await interaction.reply({ content: 'Error updating user data. Please try again later.', ephemeral: true });
        }

        // Load and update user inventory
        let userInventory;
        try {
            userInventory = JSON.parse(await fs.readFile(inventoryFilePath, 'utf-8'));
        } catch (readError) {
            console.error('Error reading inventory data:', readError);
            return await interaction.reply({ content: 'Error reading inventory data. Please try again later.', ephemeral: true });
        }

        if (!userInventory[userId]) {
            userInventory[userId] = [];
        }

        // Check if the item already exists in the user's inventory
        const existingItem = userInventory[userId].find(item => item.id === itemIdNumber && item.type === idType);
        const itemEmoji = itemDetails.emoji; // Assuming `emoji` field exists in item details
        if (existingItem) {
            existingItem.amount += 1; // Update the existing item
            console.log(`Updated existing item in inventory: ${itemDetails[`${idType === 'carID' ? 'car_name' : idType === 'toolID' ? 'tool_name' : 'shop_name'}`]}`);
        } else {
            userInventory[userId].push({
                id: itemIdNumber,
                type: idType,
                amount: 1,
                name: itemDetails[`${idType === 'carID' ? 'car_name' : idType === 'toolID' ? 'tool_name' : 'shop_name'}`],
                price: itemDetails[priceField],
                emoji: itemEmoji // Add emoji to inventory
            });
            console.log(`Added new item to inventory: ${itemDetails[`${idType === 'carID' ? 'car_name' : idType === 'toolID' ? 'tool_name' : 'shop_name'}`]}`);
        }

        // Write the updated inventory back to the file
        try {
            await fs.writeFile(inventoryFilePath, JSON.stringify(userInventory, null, 2));
            console.log('Inventory updated successfully.');
        } catch (writeError) {
            console.error('Error writing inventory data:', writeError);
            return await interaction.reply({ content: 'Error updating inventory data. Please try again later.', ephemeral: true });
        }

        await interaction.reply({
            content: `**Purchase Successful!**\n**${idType === 'carID' ? 'Car' : 'Tool'} Name:** ${itemDetails[`${idType === 'carID' ? 'car_name' : 'tool_name'}`]}\n**Price:** ${itemDetails[priceField]}`,
            ephemeral: true
        });
        console.log(`Purchase successful for item ID: ${itemIdNumber}`);
    } else {
        console.warn('Insufficient funds for purchase.');
        await interaction.reply({ content: 'Insufficient withdrawn cash. Please withdraw more funds before making a purchase.', ephemeral: true });
    }
};
