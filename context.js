import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const economyFilePath = path.join(__dirname, 'data', 'economy.json');
const inventoryFilePath = path.join(__dirname, 'data', 'inventory.json');

const logToFile = (message) => {
    const excludedMessages = [
        '[updateUserData] Called with User ID: ',
        '[updateUserData] Updated balance for User ID: ',
        '[updateUserData] Updated withdrawnCash for User ID: ',
        '[updateUserData] User ID: ',
        'Economy data updated and saved.'
    ];

    const shouldExclude = excludedMessages.some(excluded => message.includes(excluded));

    if (!shouldExclude) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(logMessage);
        fs.appendFileSync('log.txt', logMessage);
    }
};

const getRandomWorkReward = () => Math.floor(Math.random() * (2000 - 100 + 1)) + 100;
const getRandomBegReward = () => Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
const getRandomCrimeReward = () => Math.floor(Math.random() * (3000 - 100 + 1)) + 100;

const loadEconomyData = () => {
    try {
        if (fs.existsSync(economyFilePath)) {
            const data = fs.readFileSync(economyFilePath, 'utf8');
            context.economy = JSON.parse(data);
            logToFile('Economy data loaded from file.');
        } else {
            context.economy = {};
            logToFile('No economy data file found. Initialized new economy data.');
        }
    } catch (error) {
        logToFile(`Error loading economy data: ${error.message}`);
        context.economy = {};
    }
};

const saveEconomyData = async () => {
    try {
        fs.writeFileSync(economyFilePath, JSON.stringify(context.economy, null, 2), 'utf8');
        logToFile('Economy data updated and saved.');
    } catch (error) {
        logToFile(`Error saving economy data: ${error.message}`);
    }
};

const loadInventoryData = () => {
    try {
        if (fs.existsSync(inventoryFilePath)) {
            const data = fs.readFileSync(inventoryFilePath, 'utf8');
            context.inventory = JSON.parse(data);
            logToFile('Inventory data loaded from file.');
        } else {
            context.inventory = {};
            logToFile('No inventory data file found. Initialized new inventory data.');
        }
    } catch (error) {
        logToFile(`Error loading inventory data: ${error.message}`);
        context.inventory = {};
    }
};

const saveInventoryData = async () => {
    try {
        fs.writeFileSync(inventoryFilePath, JSON.stringify(context.inventory, null, 2), 'utf8');
        logToFile('Inventory data updated and saved.');
    } catch (error) {
        logToFile(`Error saving inventory data: ${error.message}`);
    }
};

const getUserData = async (userId) => {
    logToFile(`[getUserData] Called with User ID: ${userId}`);

    if (typeof userId !== 'string' || !userId) {
        logToFile(`[getUserData] Error: Invalid or missing userId. Got: ${userId}`);
        return { balance: 0, bankBalance: 0, withdrawnCash: 0 };
    }

    if (!context.economy[userId]) {
        context.economy[userId] = { balance: 0, bankBalance: 0, withdrawnCash: 0 };
        logToFile(`[getUserData] Initialized data object for User ID: ${userId}`);
    }

    const userData = context.economy[userId];

    userData.balance = typeof userData.balance === 'number' ? userData.balance : 0;
    userData.bankBalance = typeof userData.bankBalance === 'number' ? userData.bankBalance : 0;
    userData.withdrawnCash = typeof userData.withdrawnCash === 'number' ? userData.withdrawnCash : 0;

    context.economy[userId] = userData;
    logToFile(`[getUserData] Returning data for User ID: ${userId}, Data: ${JSON.stringify(userData)}`);
    return userData;
};

const updateUserData = async (userId, changes) => {
    logToFile(`[updateUserData] Called with User ID: ${userId}, Changes: ${JSON.stringify(changes)}`);

    if (typeof userId !== 'string' || typeof changes !== 'object') {
        logToFile(`[updateUserData] Error: Invalid types. User ID: ${typeof userId}, Changes: ${typeof changes}`);
        return;
    }

    if (!userId) {
        logToFile(`[updateUserData] Error: Missing userId. Got: ${userId}`);
        return;
    }

    if (!context.economy[userId]) {
        context.economy[userId] = { balance: 0, bankBalance: 0, withdrawnCash: 0 };
        logToFile(`[updateUserData] Initialized data object for User ID: ${userId}`);
    }

    const userData = context.economy[userId];

    for (const [key, value] of Object.entries(changes)) {
        if (typeof userData[key] === 'number') {
            const oldValue = userData[key];
            userData[key] = value;
            if (userData[key] < 0) userData[key] = 0;
            logToFile(`[updateUserData] Updated ${key} for User ID: ${userId}. Old Value: ${oldValue}, New Value: ${userData[key]}`);
        } else {
            logToFile(`[updateUserData] Error: Invalid data type for ${key}. Expected number, got ${typeof userData[key]}`);
        }
    }

    context.economy[userId] = userData;
    logToFile(`[updateUserData] User ID: ${userId}, Updated Data: ${JSON.stringify(userData)}`);

    await saveEconomyData();

    return userData;
};

const updateUserBalance = async (userId, amount) => {
    if (typeof amount !== 'number') {
        logToFile(`[updateUserBalance] Error: Invalid amount. Amount: ${amount}`);
        return;
    }

    logToFile(`[updateUserBalance] Called with User ID: ${userId}, Amount: ${amount}`);

    const userData = await getUserData(userId);

    if (!userData) {
        logToFile(`[updateUserBalance] Error: User data not found. User ID: ${userId}`);
        return;
    }

    const newBalance = userData.balance + amount;
    
    const finalBalance = newBalance < 0 ? 0 : newBalance;

    const changes = { balance: finalBalance, withdrawnCash: userData.withdrawnCash + amount };
    const updatedUser = await updateUserData(userId, changes);

    if (updatedUser) {
        logToFile(`[updateUserBalance] New balance for User ID: ${userId}: ${updatedUser.balance}`);
        return updatedUser.balance;
    } else {
        logToFile(`[updateUserBalance] Error: Failed to update balance for User ID: ${userId}`);
        return null;
    }
};

const getUserInventory = async (userId) => {
    logToFile(`[getUserInventory] Called with User ID: ${userId}`);

    if (typeof userId !== 'string' || !userId) {
        logToFile(`[getUserInventory] Error: Invalid or missing userId. Got: ${userId}`);
        return [];
    }

    if (!context.inventory[userId]) {
        context.inventory[userId] = [];
        logToFile(`[getUserInventory] Initialized new inventory for User ID: ${userId}`);
    }

    const userInventory = context.inventory[userId];
    logToFile(`[getUserInventory] Returning inventory for User ID: ${userId}: ${JSON.stringify(userInventory)}`);
    return userInventory;
};

const updateUserInventory = async (userId, changes) => {
    logToFile(`[updateUserInventory] Called with User ID: ${userId}, Changes: ${JSON.stringify(changes)}`);

    if (typeof userId !== 'string' || typeof changes !== 'object') {
        logToFile(`[updateUserInventory] Error: Invalid types. User ID: ${typeof userId}, Changes: ${typeof changes}`);
        return;
    }

    if (!userId) {
        logToFile(`[updateUserInventory] Error: Missing userId. Got: ${userId}`);
        return;
    }

    if (!context.inventory[userId]) {
        context.inventory[userId] = [];
        logToFile(`[updateUserInventory] Initialized new inventory for User ID: ${userId}`);
    }

    const userInventory = context.inventory[userId];

    for (const [action, item] of Object.entries(changes)) {
        if (action === 'add') {
            const existingItem = userInventory.find(i => i.name === item.name && i.description === item.description);
            if (existingItem) {
                existingItem.amount += item.amount;
                logToFile(`[updateUserInventory] Updated amount of "${item.name}" in inventory for User ID: ${userId}`);
            } else {
                userInventory.push(item);
                logToFile(`[updateUserInventory] Added new "${item.name}" to inventory for User ID: ${userId}`);
            }
        } else if (action === 'remove') {
            let itemFound = false;
            for (let i = 0; i < userInventory.length; i++) {
                const inventoryItem = userInventory[i];
                if (inventoryItem.name === item.name && (item.description === undefined || inventoryItem.description === item.description)) {
                    if (inventoryItem.amount >= item.amount) {
                        inventoryItem.amount -= item.amount;
                        if (inventoryItem.amount === 0) {
                            userInventory.splice(i, 1);
                        }
                        itemFound = true;
                        logToFile(`[updateUserInventory] Removed ${item.amount} of "${item.name}" from inventory for User ID: ${userId}`);
                        break; 
                    } else {
                        logToFile(`[updateUserInventory] Error: Not enough amount of "${item.name}" to remove for User ID: ${userId}`);
                        return;
                    }
                }
            }
            if (!itemFound) {
                logToFile(`[updateUserInventory] Item "${item.name}" not found in inventory for User ID: ${userId}`);
            }
        } else {
            logToFile(`[updateUserInventory] Error: Unknown action "${action}"`);
        }
    }

    context.inventory[userId] = userInventory;
    logToFile(`[updateUserInventory] Updated inventory for User ID: ${userId}: ${JSON.stringify(userInventory)}`);

    await saveInventoryData();

    return userInventory;
};

const addInventoryItem = async (userId, amount, name, description) => {
    logToFile(`[addInventoryItem] Called with User ID: ${userId}, Amount: ${amount}, Name: ${name}, Description: ${description}`);

    if (typeof userId !== 'string' || typeof amount !== 'number' || typeof name !== 'string' || typeof description !== 'string') {
        logToFile(`[addInventoryItem] Error: Invalid types. User ID: ${typeof userId}, Amount: ${typeof amount}, Name: ${typeof name}, Description: ${typeof description}`);
        return;
    }

    if (!context.economy[userId]) {
        context.economy[userId] = { balance: 0, bankBalance: 0, withdrawnCash: 0, inventory: [] };
        logToFile(`[addInventoryItem] Initialized data object for User ID: ${userId}`);
    }

    const userData = context.economy[userId];

    userData.inventory.push({ amount, name, description });
    context.economy[userId] = userData;
    logToFile(`[addInventoryItem] Added item to inventory for User ID: ${userId}. Inventory: ${JSON.stringify(userData.inventory)}`);

    await saveEconomyData();

    return userData.inventory;
};


const context = {
    economy: {},
    inventory: {}, 
    dailyReward: 50000, 
    workReward: getRandomWorkReward, 
    begReward: getRandomBegReward,
    crimeReward: getRandomCrimeReward,
    admins: [],
    ownerId: '1271600306383355979',
    specificGuildId: '1276929369545248889', // specific guild ID where the command is allowed
    logToFile,
    getUserData,
    updateUserData,
    updateUserBalance,
    getUserInventory,
    updateUserInventory,
    addInventoryItem,
    loadEconomyData,
    saveEconomyData, 
    loadInventoryData, 
    saveInventoryData,
};

loadEconomyData();
loadInventoryData();

export { context, logToFile, getRandomWorkReward, getRandomBegReward, getRandomCrimeReward, getUserData, updateUserData, updateUserBalance, getUserInventory, updateUserInventory, addInventoryItem };
