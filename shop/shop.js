import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { handlePurchase } from './shoppurchase.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const carsPath = path.join(currentDir, '..', 'utils', 'cars.json');
const toolsPath = path.join(currentDir, '..', 'utils', 'tools.json');
const idsPath = path.join(currentDir, '..', 'utils', 'ID.json');

const isLoggingEnabled = false; // Set to false to disable logging

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

const loadData = async () => {
    log('Loading all data');
    const [carsData, toolsData, idsData] = await Promise.all([
        loadJSON(carsPath),
        loadJSON(toolsPath),
        loadJSON(idsPath),
    ]);
    
    if (!carsData || !toolsData || !idsData) {
        throw new Error('Failed to load one or more data files.');
    }

    log('Data loaded successfully');
    return [carsData, toolsData, idsData];
};

// Create home page embed
const createHomePageEmbed = () => {
    return new EmbedBuilder()
        .setTitle('🏪 Shop Categories')
        .setColor('#3498db')
        .setDescription('Select a category to browse.')
        .addFields(
            { name: '🚗 Cars', value: 'Browse cars by brand.', inline: true },
            { name: '🛠️ Tools', value: 'Browse tools by type.', inline: true },
        );
};

// Function to create a pagination row
const createPaginationRow = (page, totalPages, type) => {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`previous_${type}_${page}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 1),
            new ButtonBuilder()
                .setCustomId(`next_${type}_${page}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages)
        );
};

// Function to create a dropdown menu for selecting amounts
const createAmountSelectMenu = (toolId) => {
    const options = Array.from({ length: 100 }, (_, i) => i + 1).map(amount => ({
        label: `${amount}`,
        value: `${amount}`
    }));

    return new StringSelectMenuBuilder()
        .setCustomId(`amount_${toolId}`)
        .setPlaceholder('Select amount')
        .addOptions(options);
};

// Function to log messages conditionally
const log = (message, type = 'info') => {
    if (isLoggingEnabled) {
        console.log(`[${new Date().toISOString()}] [${type}] ${message}`);
    }
};

// Function to log interaction data
const logInteraction = async (data) => {
    try {
        log('Logging interaction data...');
        await fs.appendFile(interactionLogPath, JSON.stringify(data) + '\n');
        log('Interaction data logged successfully.');
    } catch (error) {
        log(`Error logging interaction data: ${error.message}`, 'error');
    }
};

export { loadData, createHomePageEmbed, createPaginationRow, createAmountSelectMenu, logInteraction };

// Create car brands embed with pagination
const createCarBrandsEmbed = (carsData, page = 1, itemsPerPage = 6) => {
    const brands = carsData.manufacturers.map(manufacturer => ({
        label: manufacturer.carm_name,
        customId: `brand_${manufacturer.carm_name}`
    }));

    const totalItems = brands.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    if (page < 1 || page > totalPages) {
        console.warn('Page number out of range:', page);
        return { embed: null, rows: [] };
    }

    const brandButtons = brands.slice(start, end).map(brand =>
        new ButtonBuilder()
            .setCustomId(brand.customId)
            .setLabel(brand.label)
            .setStyle(ButtonStyle.Primary)
    );

    const fields = brands.slice(start, end).map(brand => ({
        name: brand.label,
        value: 'Click to view models',
        inline: true
    }));

    const rows = [];
    for (let i = 0; i < brandButtons.length; i += 3) {
        rows.push(new ActionRowBuilder().addComponents(brandButtons.slice(i, i + 3)));
    }

    const paginationRow = createPaginationRow(page, totalPages, 'brands');

    return {
        embed: new EmbedBuilder()
            .setTitle('🚗 Car Brands')
            .setColor('#3498db')
            .setDescription(`Page ${page}/${totalPages}`)
            .addFields(fields),
        rows: [...rows, paginationRow],
        totalPages
    };
};


// Create car models embed with buttons
const createCarModelsEmbed = (brand, carsData, idsData, page = 1, itemsPerPage = 5) => {
    const manufacturer = carsData.manufacturers.find(m => m.carm_name === brand);
    if (!manufacturer) return { embed: null, rows: [], totalPages: 0 };

    const totalItems = manufacturer.cars.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    const models = manufacturer.cars.slice(start, end).map((car, index) => {
        const carId = idsData.carID.find(id => id === car.car_ID);
        return {
            name: car.car_name,
            value: `Price: ${car.car_price}\nTop Speed: ${car.car_top_speed}\n0-100 km/h: ${car['car_0-100_kmh']}\nEngine: ${car.car_engine}\nFuel Consumption per km: ${car.car_fuel_consumption_per_km}\nTank Capacity: ${car.car_tank_capacity_liters}`,
            inline: true,
            button: new ButtonBuilder()
                .setCustomId(`model_${carId}_${brand}_${index}`)
                .setLabel(car.car_name)
                .setStyle(ButtonStyle.Primary)
        };
    });

    const modelRows = [];
    for (let i = 0; i < models.length; i += 3) {
        modelRows.push(new ActionRowBuilder().addComponents(models.slice(i, i + 3).map(m => m.button)));
    }

    const returnButton = new ButtonBuilder()
        .setCustomId('return_brands')
        .setLabel('Return')
        .setStyle(ButtonStyle.Danger);

    modelRows.push(new ActionRowBuilder().addComponents(returnButton));

    const paginationRow = createPaginationRow(page, totalPages, 'model');

    return {
        embed: new EmbedBuilder()
            .setTitle(`🚗 ${brand} Models (Page ${page}/${totalPages})`)
            .setColor('#3498db')
            .setDescription(`Here are the models available for ${brand}.`)
            .addFields(models),
        rows: [...modelRows, paginationRow],
        totalPages
    };
};

// Create tool types embed with pagination
const createToolTypesEmbed = (toolsData, page = 1, itemsPerPage = 6) => {
    const totalItems = toolsData.usage.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    const types = toolsData.usage.slice(start, end).map(category => ({
        name: category.toolm_name,
        value: `Browse ${category.toolm_name} tools`,
        inline: true,
        button: new ButtonBuilder()
            .setCustomId(`type_${category.toolm_name}`)
            .setLabel(category.toolm_name)
            .setStyle(ButtonStyle.Primary)
    }));

    const rows = [];
    for (let i = 0; i < types.length; i += 3) {
        rows.push(new ActionRowBuilder().addComponents(types.slice(i, i + 3).map(t => t.button)));
    }

    const paginationRow = createPaginationRow(page, totalPages, 'types');

    return {
        embed: new EmbedBuilder()
            .setTitle(`🛠️ Tool Types (Page ${page}/${totalPages})`)
            .setColor('#e67e22')
            .setDescription('Select a type to browse tools.')
            .addFields(types),
        rows: [...rows, paginationRow],
        totalPages
    };
};

// Create tools embed with pagination
const createToolsEmbed = (type, toolsData, idsData, page = 1, itemsPerPage = 6) => {
    const category = toolsData.usage.find(c => c.toolm_name === type);
    if (!category) return { embed: null, rows: [], totalPages: 0 };

    const totalItems = category.tools.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;

    const tools = category.tools.slice(start, end).map(tool => {
        const toolId = idsData.toolID.find(id => id === tool.tool_ID);
        return {
            name: tool.tool_name,
            value: `Price: ${tool.tool_price}`,
            inline: true,
            button: new ButtonBuilder()
                .setCustomId(`tool_${toolId}_${tool.tool_name}_${type}`)
                .setLabel(tool.tool_name)
                .setStyle(ButtonStyle.Primary)
        };
    });

    const toolRows = [];
    for (let i = 0; i < tools.length; i += 3) {
        toolRows.push(new ActionRowBuilder().addComponents(tools.slice(i, i + 3).map(t => t.button)));
    }

    const paginationRow = createPaginationRow(page, totalPages, 'tools');

    return {
        embed: new EmbedBuilder()
            .setTitle(`🛠️ ${type} Tools (Page ${page}/${totalPages})`)
            .setColor('#e67e22')
            .setDescription(`Here are the tools available for ${type}.`)
            .addFields(tools),
        rows: [...toolRows, paginationRow],
        totalPages
    };
};

export default {
    name: 'shop',
    description: 'Show available cars, tools, and others based on categories and brands',

    async execute(message) {
        try {
            log('Loading data...');
            const [carsData, toolsData, idsData] = await this.loadData();
            log('Data loaded successfully.');

            if (!carsData || !toolsData || !idsData) {
                log('One or more data sources failed to load.', 'error');
                return this.handleDataLoadError(message);
            }

            log('Sending home page embed...');
            const homeMessage = await this.sendHomePageEmbed(message);
            log('Home page embed sent.');

            log('Creating interaction collector...');
            this.createInteractionCollector(homeMessage, carsData, toolsData, idsData);
            log('Interaction collector created.');

        } catch (error) {
            log('Error executing shop command:', 'error');
            await message.channel.send('An error occurred while executing the shop command.');
        }
    },

    async loadData() {
        try {
            log('Loading data from JSON files...');
            const data = await Promise.all([
                loadJSON(carsPath),
                loadJSON(toolsPath),
                loadJSON(idsPath),
            ]);
            log('Data loaded successfully.');
            return data;
        } catch (error) {
            log('Error loading data:', 'error');
            throw new Error('Failed to load data');
        }
    },

    handleDataLoadError(message) {
        log('Handling data load error.');
        return message.channel.send('Error loading data. Please try again later.');
    },

    async sendHomePageEmbed(message) {
        log('Creating home page embed...');
        const homeEmbed = createHomePageEmbed();
        const homeRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('cars')
                    .setLabel('🚗 Cars')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('tools')
                    .setLabel('🛠️ Tools')
                    .setStyle(ButtonStyle.Secondary),
            );

        return message.channel.send({ embeds: [homeEmbed], components: [homeRow] });
    },

    createInteractionCollector(homeMessage, carsData, toolsData, idsData) {
        log('Creating interaction collector...');
        
        const interactionPrefixes = [
            'cars', 'tools', 'brand_', 'model_', 
            'return_brands', 'type_', 'tool_', 'shop_', 
            'previous_', 'next_', 'purchase_'
        ];
    
        const filter = i => interactionPrefixes.some(prefix => i.customId.startsWith(prefix));
    
        const collector = homeMessage.createMessageComponentCollector({ filter, time: 60000 });
    
        collector.on('collect', async (interaction) => {
            try {
                log(`Received interaction: ${interaction.customId}`);
                await this.handleInteraction(interaction, carsData, toolsData, idsData);
            } catch (err) {
                log('Error handling interaction:', 'error');
                try {
                    await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
                } catch (replyErr) {
                    log('Error sending reply for interaction:', 'error');
                }
            }
        });
    
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                log('Interaction collector timed out.');
            } else {
                log(`Interaction collector ended due to: ${reason}`);
            }
        });
    },
    

    async handleInteraction(interaction, carsData, toolsData, idsData) {
        const handlers = {
            'cars': () => this.handleCarsInteraction(interaction, carsData),
            'brand_': () => this.handleBrandInteraction(interaction, carsData, idsData),
            'model_': () => this.handleModelInteraction(interaction, carsData),
            'return_brands': () => this.handleReturnBrandsInteraction(interaction, carsData),
            'tools': () => this.handleToolsInteraction(interaction, toolsData),
            'type_': () => this.handleTypeInteraction(interaction, toolsData, idsData),
            'tool_': () => this.handleToolInteraction(interaction, toolsData),
            'previous_': () => this.handlePaginationInteraction(interaction, carsData, toolsData),
            'next_': () => this.handlePaginationInteraction(interaction, carsData, toolsData),
            'purchase_': () => this.handlePurchaseInteraction(interaction)
        };
    
        const customId = interaction.customId;
        log(`Handling interaction with customId: ${customId}`);
        
        // Determine which handler to use based on the customId prefix
        for (const [prefix, handler] of Object.entries(handlers)) {
            if (customId.startsWith(prefix)) {
                try {
                    log(`Using handler for prefix: ${prefix}`);
                    await handler(); // Ensure handler returns a promise
                    return; // Exit after handling
                } catch (err) {
                    log(`Error handling interaction with ${prefix}:`, 'error');
                    await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
                    return;
                }
            }
        }
        
        log('Unhandled interaction:', 'warn');
        await interaction.reply({ content: 'Unhandled interaction.', ephemeral: true });
    },
    
async handleCarsInteraction(interaction, carsData) {
    log('Handling cars interaction...');
    const page = 1;
    const { embed: brandsEmbed, rows } = createCarBrandsEmbed(carsData, page);

    await interaction.update({ embeds: [brandsEmbed], components: rows });
    log('Cars interaction updated successfully');
},

// Handle brand interaction
async handleBrandInteraction(interaction, carsData, idsData) {
    log('Handling brand interaction...');
    const brand = interaction.customId.split('_')[1];
    if (!brand) {
        log('Brand not specified in interaction customId:', 'warn');
        return await interaction.reply({ content: 'Brand not specified.', ephemeral: true });
    }
    const page = 1;
    const { embed: modelsEmbed, rows } = createCarModelsEmbed(brand, carsData, idsData, page);

    if (modelsEmbed) {
        await interaction.update({ embeds: [modelsEmbed], components: rows });
        log('Brand interaction updated successfully');
    } else {
        await interaction.reply({ content: 'Models not found for selected brand.', ephemeral: true });
    }
},

// Handle model interaction
async handleModelInteraction(interaction, carsData) {
    log('Handling model interaction...');
    const [_, carId, brand, modelIndex] = interaction.customId.split('_');
    if (!carId || !brand || !modelIndex) {
        log('Missing data in interaction customId:', 'warn');
        return await interaction.reply({ content: 'Invalid model data.', ephemeral: true });
    }
    const car = carsData.manufacturers.find(m => m.carm_name === brand)?.cars[modelIndex];

    if (!car) {
        return await interaction.reply({ content: 'Car not found.', ephemeral: true });
    }

    const carDetailEmbed = new EmbedBuilder()
        .setTitle(`🚗 ${car.car_name} Details`)
        .setColor('#3498db')
        .setDescription(`Here are the details for ${car.car_name}.`)
        .addFields({
            name: car.car_name,
            value: `Price: ${car.car_price}\nTop Speed: ${car.car_top_speed}\n0-100 km/h: ${car['car_0-100_kmh']}\nEngine: ${car.car_engine}\nFuel Consumption per km: ${car.car_fuel_consumption_per_km}\n`,
            inline: false
        });

    log(`Created embed for car model: ${car.car_name}`);

    const purchaseButton = new ButtonBuilder()
        .setCustomId(`purchase_${car.car_ID}`)
        .setLabel('Buy Car')
        .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(purchaseButton);

    await interaction.update({ embeds: [carDetailEmbed], components: [buttonRow] });
    log('Model interaction updated successfully');
},

// Handle return brands interaction
async handleReturnBrandsInteraction(interaction, carsData) {
    log('Handling return brands interaction...');
    const { embed: brandsEmbed, rows } = createCarBrandsEmbed(carsData, 1);
    await interaction.update({ embeds: [brandsEmbed], components: rows });
    log('Return brands interaction updated successfully');
},

// Handle tools interaction
async handleToolsInteraction(interaction, toolsData) {
    log('Handling tools interaction...');
    const page = 1;
    const { embed: typesEmbed, rows } = createToolTypesEmbed(toolsData, page);

    await interaction.update({ embeds: [typesEmbed], components: rows });
    log('Tools interaction updated successfully');
},

// Handle type interaction
async handleTypeInteraction(interaction, toolsData, idsData) {
    log('Handling type interaction...');
    const type = interaction.customId.split('_')[1];
    if (!type) {
        log('Type not specified in interaction customId:', 'warn');
        return await interaction.reply({ content: 'Type not specified.', ephemeral: true });
    }
    const page = 1;
    const { embed: toolsEmbed, rows } = createToolsEmbed(type, toolsData, idsData, page);

    await interaction.update({ embeds: [toolsEmbed], components: rows });
    log('Type interaction updated successfully');
},

// Handle tool interaction
async handleToolInteraction(interaction, toolsData) {
    log('Handling tool interaction...');

    const [prefix, toolIdStr, toolName] = interaction.customId.split('_');
    log(`Received toolId: ${toolIdStr}, toolName: ${toolName}`);

    if (!toolIdStr || !toolName) {
        log('Tool ID or name not specified in interaction customId:', 'warn');
        return await interaction.reply({ content: 'Tool ID or name not specified.', ephemeral: true });
    }

    const toolId = parseInt(toolIdStr, 10);
    log('Parsed toolId:', toolId);

    if (!toolsData || !toolsData.usage || !Array.isArray(toolsData.usage)) {
        log('toolsData is not in the expected format:', 'error');
        return await interaction.reply({ content: 'Internal error: tools data is not in the expected format.', ephemeral: true });
    }

    const category = toolsData.usage.find(c => c.tools.some(t => t.tool_ID === toolId));

    if (!category) {
        log('Tool category not found for ID:', toolId, 'warn');
        return await interaction.reply({ content: 'Tool category not found.', ephemeral: true });
    }

    const tool = category.tools.find(t => t.tool_ID === toolId);

    if (!tool) {
        log('Tool not found for ID:', toolId, 'warn');
        return await interaction.reply({ content: 'Tool not found.', ephemeral: true });
    }

    if (!tool.tool_name || !tool.tool_price || !tool.tool_emoji) {
        log('Incomplete tool details:', tool, 'error');
        return await interaction.reply({ content: 'Tool details are incomplete.', ephemeral: true });
    }

    const toolDetailEmbed = new EmbedBuilder()
        .setTitle(`🛠️ ${tool.tool_name} Details`)
        .setColor('#e74c3c')
        .setDescription(`Here are the details for ${tool.tool_name}.`)
        .addFields({
            name: tool.tool_name,
            value: `Price: ${tool.tool_price}\nDescription: ${tool.tool_emoji}\n`,
            inline: false
        });

    const purchaseButton = new ButtonBuilder()
        .setCustomId(`purchase_${tool.tool_ID}`)
        .setLabel('Buy Tool')
        .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(purchaseButton);

    try {
        await interaction.update({ embeds: [toolDetailEmbed], components: [buttonRow] });
        log('Tool interaction updated successfully with purchase button.');
    } catch (error) {
        log('Error updating tool interaction:', 'error');
        await interaction.reply({ content: 'Error updating tool details. Please try again later.', ephemeral: true });
    }
},

// Handle purchase interaction
    async handlePurchaseInteraction(interaction) {
        log('Handling purchase interaction...');
        const [prefix, itemId] = interaction.customId.split('_');

        if (prefix !== 'purchase') {
            log('Unexpected customId prefix:', prefix, 'warn');
            return await interaction.reply({ content: 'Invalid interaction.', ephemeral: true });
        }
        if (!itemId) {
        log('Item ID not specified in interaction customId:', 'warn');
        return await interaction.reply({ content: 'Item ID not specified.', ephemeral: true });
    }

    try {
        await handlePurchase(interaction, itemId);
    } catch (error) {
        log('Error handling purchase interaction:', 'error');
        if (!interaction.replied) {
            await interaction.reply({ content: 'An error occurred while processing your purchase. Please try again later.', ephemeral: true });
        }
        }
    }
}