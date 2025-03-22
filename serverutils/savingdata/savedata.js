import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname in an ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const inventoryFilePath = path.join(__dirname, '..', '..', 'data', 'inventory.json');
const economyFilePath = path.join(__dirname, '..', '..', 'data', 'economy.json');

export const saveData = async (economy, inventory) => {
    try {
        await fs.writeFile(economyFilePath, JSON.stringify(economy, null, 2), 'utf8');
        console.log('Economy data saved successfully.');
    } catch (error) {
        console.error('Error saving economy data:', error.message);
    }

    try {
        await fs.writeFile(inventoryFilePath, JSON.stringify(inventory, null, 2), 'utf8');
        console.log('Inventory data saved successfully.');
    } catch (error) {
        console.error('Error saving inventory data:', error.message);
    }
};
