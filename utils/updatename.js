import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute paths to the JSON files
const carsFilePath = path.join(__dirname, '../utils/cars.json');
const toolsFilePath = path.join(__dirname, '../utils/tools.json');
const itemsFilePath = path.join(__dirname, '../utils/items.json');
const namesFilePath = path.join(__dirname, '../utils/names.json');

// Load and parse the JSON data
let carsData, toolsData, itemsData, namesData;
try {
    carsData = JSON.parse(fs.readFileSync(carsFilePath, 'utf-8'));
    toolsData = JSON.parse(fs.readFileSync(toolsFilePath, 'utf-8'));
    itemsData = JSON.parse(fs.readFileSync(itemsFilePath, 'utf-8'));
    namesData = JSON.parse(fs.readFileSync(namesFilePath, 'utf-8'));
    console.log('Data loaded from files.');
} catch (error) {
    console.error('Error reading JSON files:', error.message);
    process.exit(1);
}

// Configuration: Enable or disable logging
const isLoggingEnabled = true; // Set to `false` to disable logging

// Utility function to log messages if logging is enabled
const log = (message, data) => {
    if (isLoggingEnabled) {
        console.log(message, data || '');
    }
};

// Function to update and check for missing names and IDs
const updateNames = () => {
    // Extract new names and IDs from the data
    const newCarEntries = (carsData.manufacturers || []).flatMap(manufacturer =>
        (manufacturer.cars || []).map(car => ({ name: car.car_name, id: car.car_ID }))
    );
    const newToolEntries = (toolsData.usage || []).flatMap(toolm =>
        (toolm.tools || []).map(tool => ({ name: tool.tool_name, id: tool.tool_ID }))
    );
    const newItemEntries = (itemsData.usage || []).flatMap(itemm =>
        (itemm.items || []).map(item => ({ name: item.item_name, id: item.item_ID }))
    );

    // Extract new crime item entries
    const newCrimeItemEntries = (itemsData.crime_items || []).flatMap(category =>
        (category.items || []).map(item => ({ name: item.item_name, id: item.item_ID }))
    );

    const currentCarEntries = new Map(namesData.carNames || []);
    const currentToolEntries = new Map(namesData.toolNames || []);
    const currentItemEntries = new Map(namesData.itemNames || []);
    const currentCrimeItemEntries = new Map(namesData.crimeItemNames || []); // New map for crime items

    // Convert new entries to maps
    const newCarEntriesMap = new Map(newCarEntries.map(entry => [entry.name.toLowerCase(), entry.id]));
    const newToolEntriesMap = new Map(newToolEntries.map(entry => [entry.name.toLowerCase(), entry.id]));
    const newItemEntriesMap = new Map(newItemEntries.map(entry => [entry.name.toLowerCase(), entry.id]));
    const newCrimeItemEntriesMap = new Map(newCrimeItemEntries.map(entry => [entry.name.toLowerCase(), entry.id])); // New map for crime items

    // Identify missing and removed names
    const missingCarEntries = [...newCarEntriesMap].filter(([name]) => !currentCarEntries.has(name));
    const missingToolEntries = [...newToolEntriesMap].filter(([name]) => !currentToolEntries.has(name));
    const missingItemEntries = [...newItemEntriesMap].filter(([name]) => !currentItemEntries.has(name));
    const missingCrimeItemEntries = [...newCrimeItemEntriesMap].filter(([name]) => !currentCrimeItemEntries.has(name)); // Check for missing crime items

    const removedCarEntries = [...currentCarEntries].filter(([name]) => !newCarEntriesMap.has(name));
    const removedToolEntries = [...currentToolEntries].filter(([name]) => !newToolEntriesMap.has(name));
    const removedItemEntries = [...currentItemEntries].filter(([name]) => !newItemEntriesMap.has(name));
    const removedCrimeItemEntries = [...currentCrimeItemEntries].filter(([name]) => !newCrimeItemEntriesMap.has(name)); // Check for removed crime items

    // Log missing and removed names
    if (missingCarEntries.length > 0) {
        log('Missing car names and IDs:', missingCarEntries);
    }
    if (missingToolEntries.length > 0) {
        log('Missing tool names and IDs:', missingToolEntries);
    }
    if (missingItemEntries.length > 0) {
        log('Missing item names and IDs:', missingItemEntries);
    }
    if (missingCrimeItemEntries.length > 0) {
        log('Missing crime item names and IDs:', missingCrimeItemEntries); // Log for crime items
    }

    if (removedCarEntries.length > 0) {
        log('Removed car names and IDs:', removedCarEntries);
    }
    if (removedToolEntries.length > 0) {
        log('Removed tool names and IDs:', removedToolEntries);
    }
    if (removedItemEntries.length > 0) {
        log('Removed item names and IDs:', removedItemEntries);
    }
    if (removedCrimeItemEntries.length > 0) {
        log('Removed crime item names and IDs:', removedCrimeItemEntries); // Log for crime items
    }

    // Update names in namesData
    namesData.carNames = [...newCarEntriesMap];
    namesData.toolNames = [...newToolEntriesMap];
    namesData.itemNames = [...newItemEntriesMap];
    namesData.crimeItemNames = [...newCrimeItemEntriesMap]; // Update for crime items

    // Write the updated names to the names.json file if any names were missing or removed
    if (
        missingCarEntries.length > 0 ||
        missingToolEntries.length > 0 ||
        missingItemEntries.length > 0 ||
        missingCrimeItemEntries.length > 0 || // Check for missing crime items
        removedCarEntries.length > 0 ||
        removedToolEntries.length > 0 ||
        removedItemEntries.length > 0 ||
        removedCrimeItemEntries.length > 0 // Check for removed crime items
    ) {
        try {
            fs.writeFileSync(namesFilePath, JSON.stringify(namesData, null, 2));
            log('Names file updated successfully.');
        } catch (error) {
            console.error('Error writing names file:', error.message);
        }
    } else {
        log('No names to remove or add.');
    }
};

// Execute the update
updateNames();
