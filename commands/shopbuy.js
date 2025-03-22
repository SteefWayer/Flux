import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current module's file path and directory path
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

// Define the paths to the JSON files
const carsPath = path.join(currentDir, '..', 'utils', 'cars.json');
const toolsPath = path.join(currentDir, '..', 'utils', 'tools.json');
const itemsPath = path.join(currentDir, '..', 'utils', 'items.json');
const namesPath = path.join(currentDir, '..', 'utils', 'names.json');

// Logging flag
const isLoggingEnabled = false; // Set to false to disable logging

// Function to log messages if logging is enabled
const log = (message, data) => {
    if (isLoggingEnabled) {
        console.log(message, data || '');
    }
};

// Function to load and parse JSON files
const loadJSON = async (filePath) => {
    try {
        log(`Loading data from ${filePath}`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        log(`Error loading data from ${filePath}: ${error.message}`);
        return null;
    }
};

// Function to load all required data
const loadData = async () => {
    log('Loading all data');
    const [carsData, toolsData, itemsData, namesData] = await Promise.all([
        loadJSON(carsPath),
        loadJSON(toolsPath),
        loadJSON(itemsPath),
        loadJSON(namesPath) // Load names data
    ]);

    // Ensure all data is loaded successfully
    if (!carsData || !toolsData || !itemsData || !namesData) {
        throw new Error('Failed to load one or more data files.');
    }

    log('Data loaded successfully');
    return { carsData, toolsData, itemsData, namesData };
};

// Function to find item ID by name
const findItemIdByName = (name, namesData) => {
    const lowerName = name.toLowerCase();

    // Search in namesData
    if (namesData.carNames) {
        const car = namesData.carNames.find(([carName]) => carName.toLowerCase() === lowerName);
        if (car) return { type: 'car', id: car[1] };
    }

    if (namesData.toolNames) {
        const tool = namesData.toolNames.find(([toolName]) => toolName.toLowerCase() === lowerName);
        if (tool) return { type: 'tool', id: tool[1] };
    }

    if (namesData.itemNames) {
        const item = namesData.itemNames.find(([itemName]) => itemName.toLowerCase() === lowerName);
        if (item) return { type: 'item', id: item[1] };
    }

    return null;
};

// Handle purchase interaction
const handlePurchaseInteraction = async (message) => {
    log('Handling purchase interaction...');

    // Get the item name from the message content
    const args = message.content.split(' ').slice(1); // Split message by space and get the part after the command
    const name = args.join(' '); // Join the rest as the item name

    if (!name) {
        log('Item name not provided:', 'warn');
        return await message.reply('You must provide the name of the item to purchase.');
    }

    try {
        const { namesData } = await loadData(); // Load names data

        const item = findItemIdByName(name, namesData);

        log('Found item:', item);

        if (!item) {
            log(`Item "${name}" not found`, 'warn');
            return await message.reply(`Item "${name}" not found.`);
        }

        if (!item.id) {
            log('Item found, but no ID:', item);
            return await message.reply('An error occurred: the item has no ID. Please check the item data.');
        }

        // Create an object with item ID to pass to handlePurchase
        let itemId = item.id;
        if (item.type === 'car') {
            itemId = { type: 'carID', id: itemId };
        } else if (item.type === 'tool') {
            itemId = { type: 'toolID', id: itemId };
        } else {
            throw new Error('Invalid item type.');
        }

        await handlePurchase(message, itemId);
    } catch (error) {
        log('Error handling purchase interaction:', error); // Log the full error object
        await message.reply('An error occurred while processing your purchase. Please try again later.');
    }
};

// Function to handle purchase
export const handlePurchase = async (message, itemId) => {
    const userId = message.author.id;

    // Check if itemId is valid
    if (!itemId || !itemId.id) {
        return message.reply('Invalid item ID.');
    }

    // Load data
    log('Loading data...');
    const { carsData, toolsData, itemsData } = await loadData();
    log('Data loaded successfully.');

    let itemDetails = null;
    let priceField = '';

    // Determine the item type and retrieve item details
    if (itemId.type === 'carID') {
        itemDetails = carsData.manufacturers.flatMap(m => m.cars).find(car => car.car_ID === itemId.id);
        priceField = 'car_price';
    } else if (itemId.type === 'toolID') {
        itemDetails = toolsData.usage.flatMap(t => t.tools).find(tool => tool.tool_ID === itemId.id);
        priceField = 'tool_price';
    } else {
        log(`Invalid item ID type: ${itemId.type}`, 'warn');
        return message.reply('Invalid item ID type.');
    }

    // Check if itemDetails are found
    if (!itemDetails) {
        log(`Item details not found for ID: ${itemId.id}`);
        return message.reply('Item details not found. Please try again.');
    }

    // Log item details and price field
    log(`Item details: ${JSON.stringify(itemDetails)}`);
    log(`Price field: ${priceField}`);

    // Determine item price
    const itemPrice = parseFloat(itemDetails[priceField].replace(/[^0-9.]/g, ''));
    log(`Item price for ID ${itemId.id}: ${itemPrice}`);

    // Fetch user data
    let userData;
    try {
        userData = JSON.parse(await fs.readFile(path.join(currentDir, '..', 'data', 'economy.json'), 'utf-8'));
    } catch (error) {
        log('Error fetching user data:', error);
        return message.reply('Error fetching user data. Please try again later.');
    }

    if (userData[userId].withdrawnCash >= itemPrice) {
        try {
            userData[userId].withdrawnCash -= itemPrice;
            await fs.writeFile(path.join(currentDir, '..', 'data', 'economy.json'), JSON.stringify(userData, null, 2));
        } catch (error) {
            log('Error updating user data:', error);
            return message.reply('Error updating user data. Please try again later.');
        }

        let userInventory;
        try {
            userInventory = JSON.parse(await fs.readFile(path.join(currentDir, '..', 'data', 'inventory.json'), 'utf-8'));
        } catch (readError) {
            log('Error reading inventory data:', readError);
            return message.reply('Error reading inventory data. Please try again later.');
        }

        if (!userInventory[userId]) {
            userInventory[userId] = [];
        }

        // Check if the item already exists in the user's inventory
        const existingItem = userInventory[userId].find(item => item.id === itemId.id && item.type === itemId.type);
        if (existingItem) {
            existingItem.amount += 1; // Update the existing item
            log(`Updated existing item in inventory: ${itemDetails.car_name || itemDetails.tool_name}`);
        } else {
            userInventory[userId].push({
                id: itemId.id,
                type: itemId.type,
                amount: 1,
                name: itemDetails.car_name || itemDetails.tool_name,
                price: itemDetails[priceField]
            });
            log(`Added new item to inventory: ${itemDetails.car_name || itemDetails.tool_name}`);
        }

        try {
            await fs.writeFile(path.join(currentDir, '..', 'data', 'inventory.json'), JSON.stringify(userInventory, null, 2));
            log('Inventory updated successfully.');
        } catch (writeError) {
            log('Error writing inventory data:', writeError);
            return message.reply('Error updating inventory data. Please try again later.');
        }

        await message.reply(`**Purchase Successful!**\n**Name:** ${itemDetails.car_name || itemDetails.tool_name}\n**Price:** ${itemDetails[priceField]}`);
        log(`Purchase successful for ID: ${itemId.id}`);
    } else {
        log('Insufficient funds for purchase.');
        await message.reply('Insufficient withdrawn cash. Please withdraw more funds before making a purchase.');
    }
};

// Export the command object
export default {
    name: 'buy',
    description: 'Buy an item by name.',
    execute: handlePurchaseInteraction
};
