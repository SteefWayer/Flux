import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { updateUserInventory } from '../context.js'; // Adjust path if needed

const debug = false; // Set this to false to disable debug logging

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const idsFilePath = resolve(__dirname, '../utils/ID.json');
const inventoryFilePath = resolve(__dirname, '../data/inventory.json');
const adminsFilePath = resolve(__dirname, '../admins.json');
const itemsFilePath = resolve(__dirname, '../utils/items.json');

const idsData = JSON.parse(fs.readFileSync(idsFilePath, 'utf-8'));
const carsFilePath = resolve(__dirname, '../utils/cars.json');
const toolsFilePath = resolve(__dirname, '../utils/tools.json');
const carsData = JSON.parse(fs.readFileSync(carsFilePath, 'utf-8'));
const toolsData = JSON.parse(fs.readFileSync(toolsFilePath, 'utf-8'));
const adminsData = JSON.parse(fs.readFileSync(adminsFilePath, 'utf-8'));
const itemsData = JSON.parse(fs.readFileSync(itemsFilePath, 'utf-8'));

export default {
    name: 'addinventory',
    aliases: ['addinv'],
    description: 'Add an item to your or another user\'s inventory',
    cooldown: 5,
    execute: async (message, args, client, context) => {
        if (!adminsData.includes(message.author.id)) {
            return message.channel.send('You do not have permission to use this command.');
        }

        if (debug) {
            context.logToFile(`Raw command args: ${args.join(' ')}`);
        }

        if (args.length < 2) {
            return message.channel.send('Usage: !addinventory [user] <ID> <amount>');
        }

        let targetUserId = message.author.id;
        let idIndex = args.length - 2;
        let amountIndex = args.length - 1;

        const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
            targetUserId = mentionMatch[1];
            idIndex = args.length - 2;
            amountIndex = args.length - 1;
        }

        const idStr = args[idIndex];
        const itemId = parseInt(idStr, 10);

        if (debug) {
            context.logToFile(`Extracted ID String: ${idStr}, Parsed Number: ${itemId}`);
        }

        if (isNaN(itemId)) {
            return message.channel.send('Invalid ID. Please provide a valid ID.');
        }

        let idType = null;
        if (idsData.carID.includes(itemId)) {
            idType = 'carID';
        } else if (idsData.toolID.includes(itemId)) {
            idType = 'toolID';
        } else if (itemsData.usage.flatMap(category => category.items).some(item => item.item_ID === itemId)) {
            idType = 'itemID';
        } else if (itemsData.crime_items.flatMap(category => category.items).some(item => item.item_ID === itemId)) {
            idType = 'crimeItemID';
        } else {
            return message.channel.send('Invalid ID. Please provide a valid ID.');
        }

        let itemDetails = null;
        if (idType === 'carID') {
            itemDetails = carsData.manufacturers.flatMap(manufacturer => manufacturer.cars).find(car => car.car_ID === itemId);
        } else if (idType === 'toolID') {
            itemDetails = toolsData.usage.flatMap(toolm => toolm.tools).find(tool => tool.tool_ID === itemId);
        } else if (idType === 'itemID') {
            itemDetails = itemsData.usage.flatMap(category => category.items).find(item => item.item_ID === itemId);
        } else if (idType === 'crimeItemID') {
            itemDetails = itemsData.crime_items.flatMap(category => category.items).find(item => item.item_ID === itemId);
        }

        if (!itemDetails) {
            return message.channel.send(`Item not found in ${idType === 'carID' ? 'cars' : idType === 'toolID' ? 'tools' : idType === 'itemID' ? 'items' : 'crime items'}.json. Please provide a valid ID.`);
        }

        const amountStr = args[amountIndex];
        const amountNum = parseFloat(amountStr);

        if (debug) {
            context.logToFile(`Extracted Amount String: ${amountStr}, Parsed Number: ${amountNum}`);
        }

        if (isNaN(amountNum) || amountNum <= 0) {
            return message.channel.send('Invalid amount. It must be a positive number.');
        }

        const newItem = {
            id: itemId,
            type: idType,
            amount: amountNum,
            name: itemDetails.name || itemDetails[`${idType === 'carID' ? 'car_name' : idType === 'toolID' ? 'tool_name' : 'item_name'}`],
            price: itemDetails.price || itemDetails[`${idType === 'carID' ? 'car_price' : idType === 'toolID' ? 'tool_price' : 'item_price'}`] || 'Price not available',
            emoji: itemDetails.item_emoji || itemDetails.emoji || '❓'
        };

        if (idType === 'carID') {
            newItem.km_driven = itemDetails.car_distance_driven_km || "0 km";
            newItem.top_speed = itemDetails.car_top_speed;
            newItem.acceleration = itemDetails["car_0-100_kmh"];
        }

        if (debug) {
            context.logToFile(`New Item Details: ${JSON.stringify(newItem)}`);
        }

        let inventoryData = JSON.parse(fs.readFileSync(inventoryFilePath, 'utf-8'));

        if (!inventoryData[targetUserId]) {
            inventoryData[targetUserId] = [];
        }

        const existingItemIndex = inventoryData[targetUserId].findIndex(item => item.id === itemId && item.type === idType);

        if (existingItemIndex !== -1) {
            const existingItem = inventoryData[targetUserId][existingItemIndex];
            existingItem.amount += amountNum;
            if (idType === 'carID') {
                existingItem.km_driven = newItem.km_driven;
                existingItem.top_speed = newItem.top_speed;
                existingItem.acceleration = newItem.acceleration;
            }
            existingItem.price = newItem.price;
            existingItem.emoji = newItem.emoji;
        } else {
            inventoryData[targetUserId].push(newItem);
        }

        try {
            fs.writeFileSync(inventoryFilePath, JSON.stringify(inventoryData, null, 2));
            if (debug) {
                context.logToFile(`Inventory data updated and saved.`);
            }
        } catch (err) {
            console.error('Error writing to inventory file:', err);
            return message.channel.send('Failed to save inventory data. Please try again later.');
        }

        try {
            const updatedInventory = await updateUserInventory(targetUserId, {
                add: newItem
            });

            if (updatedInventory) {
                message.channel.send(`**Item added to inventory of <@${targetUserId}>:**\n**${idType === 'carID' ? 'Car' : idType === 'toolID' ? 'Tool' : idType === 'itemID' ? 'Item' : 'Crime Item'} ID:** ${itemId}\nName: ${newItem.name}\nPrice: ${newItem.price}\nAmount: ${amountNum}${idType === 'carID' ? `\nDistance Driven: ${newItem.km_driven}\nTop Speed: ${newItem.top_speed}\n0-100 km/h: ${newItem.acceleration}` : ''}`);
            } else {
                message.channel.send('Failed to update inventory. Please try again later.');
            }
        } catch (err) {
            console.error('Error updating user inventory:', err);
            message.channel.send('Failed to update user inventory. Please try again later.');
        }
    }
};
