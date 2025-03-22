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
const idsFilePath = path.join(__dirname, '../utils/ID.json');

// Load and parse the JSON data
let carsData, toolsData, itemsData, idsData;
try {
    carsData = JSON.parse(fs.readFileSync(carsFilePath, 'utf-8'));
    toolsData = JSON.parse(fs.readFileSync(toolsFilePath, 'utf-8'));
    itemsData = JSON.parse(fs.readFileSync(itemsFilePath, 'utf-8'));
    idsData = JSON.parse(fs.readFileSync(idsFilePath, 'utf-8'));
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

// Function to update and check for missing IDs
const updateIDs = () => {
    // Extract new IDs from the data
    const newCarIDs = new Set(
        (carsData.manufacturers || []).flatMap(manufacturer =>
            (manufacturer.cars || []).map(car => car.car_ID)
        )
    );
    const newToolIDs = new Set(
        (toolsData.usage || []).flatMap(toolm =>
            (toolm.tools || []).map(tool => tool.tool_ID)
        )
    );
    const newItemIDs = new Set([
        // Extract IDs from 'usage'
        ...(itemsData.usage || []).flatMap(category =>
            (category.items || []).map(item => item.item_ID)
        ),
        // Extract IDs from 'crime_items'
        ...(itemsData.crime_items || []).flatMap(category =>
            (category.items || []).map(item => item.item_ID)
        )
    ]);

    const currentCarIDs = new Set(idsData.carID || []);
    const currentToolIDs = new Set(idsData.toolID || []);
    const currentItemIDs = new Set(idsData.itemID || []);

    // Identify missing and removed IDs
    const missingCarIDs = [...newCarIDs].filter(id => !currentCarIDs.has(id));
    const missingToolIDs = [...newToolIDs].filter(id => !currentToolIDs.has(id));
    const missingItemIDs = [...newItemIDs].filter(id => !currentItemIDs.has(id));

    const removedCarIDs = [...currentCarIDs].filter(id => !newCarIDs.has(id));
    const removedToolIDs = [...currentToolIDs].filter(id => !newToolIDs.has(id));
    const removedItemIDs = [...currentItemIDs].filter(id => !newItemIDs.has(id));

    // Log missing and removed IDs
    if (missingCarIDs.length > 0) {
        log('Missing car IDs:', missingCarIDs);
    }
    if (missingToolIDs.length > 0) {
        log('Missing tool IDs:', missingToolIDs);
    }
    if (missingItemIDs.length > 0) {
        log('Missing item IDs:', missingItemIDs);
    }

    if (removedCarIDs.length > 0) {
        log('Removed car IDs:', removedCarIDs);
    }
    if (removedToolIDs.length > 0) {
        log('Removed tool IDs:', removedToolIDs);
    }
    if (removedItemIDs.length > 0) {
        log('Removed item IDs:', removedItemIDs);
    }

    // Update IDs in idsData
    idsData.carID = [...newCarIDs];
    idsData.toolID = [...newToolIDs];
    idsData.itemID = [...newItemIDs];

    // Write the updated IDs to the ID.json file if any IDs were missing or removed
    if (
        missingCarIDs.length > 0 ||
        missingToolIDs.length > 0 ||
        missingItemIDs.length > 0 ||
        removedCarIDs.length > 0 ||
        removedToolIDs.length > 0 ||
        removedItemIDs.length > 0
    ) {
        try {
            fs.writeFileSync(idsFilePath, JSON.stringify(idsData, null, 2));
            log('ID file updated successfully.');
        } catch (error) {
            console.error('Error writing ID file:', error.message);
        }
    } else {
        log('No IDs to remove or add.');
    }
};

// Execute the update
updateIDs();
