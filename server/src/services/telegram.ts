import { Telegraf, Context } from 'telegraf';
import { Update, Message, Chat } from 'telegraf/types';
import * as dotenv from 'dotenv';
import path from 'path';
import { checkGroupMembership } from '../middleware/authMiddleware';
import { envatoService, resourceService, FreepikService } from './';
const freepikService = new FreepikService();
import { downloader } from './downloader';
import fs from 'fs';
import env from '../config/env';

// Configure dotenv to look for .env in the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug logging
console.log('🔍 Checking environment variables...');
console.log('✅ Bot token:', env.TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing');
console.log('✅ Group ID:', env.TELEGRAM_GROUP_ID ? 'Present' : 'Missing');
console.log('✅ Freepik credentials:', env.FREEPIK_USERNAME ? 'Present' : 'Missing');
console.log('✅ Envato credentials:', env.ENVATO_EMAIL ? 'Present' : 'Missing');

const validateBotToken = (token: string): boolean => {
    // Remove 'bot' prefix if present
    const cleanToken = token.replace(/^bot/i, '');
    
    // Check basic token format
    const tokenParts = cleanToken.split(':');
    if (tokenParts.length !== 2) {
        console.error('Invalid token format: Token must contain exactly one colon');
        return false;
    }

    const [botId, hash] = tokenParts;
    
    // Bot ID should be numeric and hash should be alphanumeric
    if (!/^\d+$/.test(botId) || !/^[A-Za-z0-9_-]+$/.test(hash)) {
        console.error('Invalid token format: Incorrect ID or hash format');
        return false;
    }

    return true;
};

const botToken = env.TELEGRAM_BOT_TOKEN;
if (!botToken || !validateBotToken(botToken)) {
    throw new Error('Invalid TELEGRAM_BOT_TOKEN format. Please get a valid token from @BotFather');
}

// Define custom context type
interface BotContext extends Context<Update> {
    message: Update.New & Update.NonChannel & Message.TextMessage & {
        chat: Exclude<Chat, Chat.ChannelChat>;
    };
}

// Initialize bot with custom context
const bot = new Telegraf<BotContext>(botToken);

// Register commands
const registerCommands = async () => {
    try {
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Start the bot' },
            { command: 'help', description: 'Show help message' },
            { command: 'random', description: 'Get random resources' },
            { command: 'random_freepik', description: 'Get random Freepik resources' },
            { command: 'random_envato', description: 'Get random Envato resources' },
            { command: 'search', description: 'Search resources (usage: /search freepik nature)' },
            { command: 'trending', description: 'Show trending resources' },
            { command: 'categories', description: 'Browse resource categories' }
        ]);
        console.log('✅ Bot commands registered successfully');
    } catch (error) {
        console.error('❌ Failed to register bot commands:', error);
    }
};

// Add middleware to bot
bot.use(checkGroupMembership);

// Add command type for better organization
type SearchSource = 'freepik' | 'envato' | 'both';

// Add keyboard markup helper
const getMainKeyboard = () => {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '🔍 Search' }, { text: '🎲 Random' }],
                [{ text: '🎨 Freepik' }, { text: '🛒 Market' }],
                [{ text: '❓ Help' }]
            ],
            resize_keyboard: true
        }
    };
};

// Move helpText to module scope
const helpText = `*Available Commands* 📚

🔹 *Basic Commands*
/start - Start the bot
/help - Show this help message

🔍 *Search Commands*
/search <query> - Search both Freepik & Envato
/freepik <query> - Search Freepik resources only
/market <query> - Search Envato marketplace only

🎲 *Random Content*
/random - Get random items from both sources
/randomfreepik - Get random resources from Freepik
/randommarket - Get random items from Envato

📥 *Download Command*
/download <url> - Download content from Freepik or Envato

Example: Try "/freepik nature" or "/market icons"`;

// Bot commands setup
bot.command('start', async (ctx) => {
    try {
        await ctx.reply(
            'Welcome to the content bot! 🎉\nUse the buttons below or /help to see available commands.',
            getMainKeyboard()
        );
    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply('Sorry, there was an error processing your request.');
    }
});

// Update help command with keyboard
bot.command('help', async (ctx: Context) => {
    await ctx.replyWithMarkdown(helpText, getMainKeyboard());
});

// Update search command to handle both APIs
bot.command('search', checkGroupMembership, async (ctx: Context) => {
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('⚠️ Please provide a search term');
        return;
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply('Usage: /search <freepik|envato> <query>\nExample: /search freepik nature');
        return;
    }

    const [_, type, ...queryParts] = args;
    const query = queryParts.join(' ');
    
    try {
        const results = await resourceService.search(query, type as 'freepik' | 'envato');
        // Handle results...
        await ctx.reply(`Found ${results.total} results from ${results.type}`);
    } catch (error) {
        console.error('Search error:', error);
        await ctx.reply('❌ An error occurred while searching');
    }
});

bot.command('freepik', checkGroupMembership, async (ctx: Context) => {
    await handleSearch(ctx, 'freepik');
});

bot.command('market', checkGroupMembership, async (ctx: Context) => {
    await handleSearch(ctx, 'envato');
});

// Add handlers for unknown commands and messages
bot.on('text', async (ctx: Context) => {
    if (!ctx.message || !('text' in ctx.message)) {
        return;
    }

    const text = ctx.message.text;
    
    if (text.startsWith('/')) {
        const command = text.split(' ')[0].split('@')[0];
        await ctx.reply(
            `❌ Unknown command: *${command}*\n\nUse /help to see available commands.`, 
            {
                parse_mode: 'Markdown',
                reply_parameters: {
                    message_id: ctx.message.message_id
                }
            }
        );
    } else {
        // Handle regular text messages
        const messageMap: { [key: string]: string } = {
            '🔍 Search': '/search',
            '🎲 Random': '/random',
            '🎨 Freepik': '/freepik',
            '🛒 Market': '/market',
            '❓ Help': '/help'
        };

        if (messageMap[text]) {
            // Handle button clicks with proper instructions
            switch (text) {
                case '🔍 Search':
                    await ctx.reply('To search both platforms:\n/search <query>\nExample: /search nature');
                    break;
                case '🎨 Freepik':
                    await ctx.reply('To search Freepik resources:\n/freepik <query>\nExample: /freepik landscape');
                    break;
                case '🛒 Market':
                    await ctx.reply('To search Envato items:\n/market <query>\nExample: /market icons');
                    break;
                case '🎲 Random':
                    // Directly trigger random content search
                    await handleSearch(ctx, 'both');
                    break;
                case '❓ Help':
                    await ctx.replyWithMarkdown(helpText, getMainKeyboard());
                    break;
            }
        } else {
            // Show help message for other text
            await ctx.reply(
                '👋 Hi! Please use commands or buttons to interact with me.\n\nTry /help to see what I can do!',
                getMainKeyboard()
            );
        }
    }
});

// Helper function to handle searches
async function handleSearch(ctx: Context, source: SearchSource) {
    try {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('⚠️ Please provide a search term');
            return;
        }

        const query = ctx.message.text.split(' ').slice(1).join(' ');
        
        if (!query) {
            await ctx.reply('⚠️ Please provide a search term. Example: /search nature');
            return;
        }

        const loadingMsg = await ctx.reply(`🔍 Searching for "${query}"...`);

        let results: any[] = [];

        if (source === 'both' || source === 'freepik') {
            try {
                const freepikResults = await freepikService.search(query);
                results.push(...freepikResults.map((item: any) => ({
                    type: 'freepik',
                    data: item
                })));
            } catch (error) {
                console.error('Freepik search error:', error);
            }
        }

        if (source === 'both' || source === 'envato') {
            try {
                const envatoResults = await envatoService.searchItems(query);
                results.push(...envatoResults.map(item => ({
                    type: 'envato',
                    data: item
                })));
            } catch (error) {
                console.error('Envato search error:', error);
            }
        }

        // Delete loading message
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        if (results.length === 0) {
            await ctx.reply('😕 No results found for your search.');
            return;
        }

        // Send results
        for (const result of results.slice(0, 5)) {
            if (result.type === 'freepik') {
                const item = result.data;
                const caption = `🎨 *${item.title}*
                
By: ${item.author.name}
📁 Type: ${item.type}

${item.description ? `📝 ${item.description.substring(0, 100)}...` : ''}`;

                await ctx.replyWithPhoto(
                    { url: item.preview_url },
                    { 
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                {
                                    text: '🎨 View on Freepik',
                                    url: item.url
                                },
                                {
                                    text: '📥 Download',
                                    callback_data: `download_freepik:${item.id}`
                                }
                            ]]
                        }
                    }
                );
            } else {
                const item = result.data;
                const caption = `🛒 *${item.name}*
                
By: ${item.author_username}
💰 Price: $${(item.price_cents / 100).toFixed(2)}
📁 Category: ${item.category}

${item.description ? `📝 ${item.description.substring(0, 100)}...` : ''}`;

                await ctx.replyWithPhoto(
                    { url: item.preview_url },
                    { 
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                {
                                    text: '🛒 View on Envato',
                                    url: item.url
                                },
                                {
                                    text: '📥 Download',
                                    callback_data: `download_envato:${item.id}`
                                }
                            ]]
                        }
                    }
                );
            }
            
            // Add delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Search error:', error);
        await ctx.reply('❌ Sorry, there was an error processing your request.');
    }
}

// Update the random command to only use Freepik and Envato
bot.command('random', async (ctx: Context) => {
    try {
        const loadingMsg = await ctx.reply('🎲 Getting random content...');
        let results: any[] = [];

        // Get random items from both services
        try {
            const [freepikResults, envatoResults] = await Promise.all([
                freepikService.getRandomItems(),
                envatoService.getRandomItems()
            ]);

            results = [
                ...freepikResults.slice(0, 2).map((item: any) => ({ type: 'freepik', data: item })),
                ...envatoResults.slice(0, 2).map((item: any) => ({ type: 'envato', data: item }))
            ].sort(() => Math.random() - 0.5);
        } catch (error) {
            console.error('Random content error:', error);
        }

        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        if (results.length === 0) {
            await ctx.reply('😕 No random content available at the moment.');
            return;
        }

        // Send results with delay between messages
        for (const result of results) {
            await sendResourceMessage(ctx, result);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Random command error:', error);
        await ctx.reply('❌ Sorry, there was an error getting random content.');
    }
});

// Helper function to send resource messages
async function sendResourceMessage(ctx: Context, result: any) {
    const { type, data: item } = result;
    
    if (type === 'freepik') {
        const caption = `🎨 *Random from Freepik*\n\n*${item.title}*\nBy: ${item.author.name}\n📁 Type: ${item.type}`;
        await ctx.replyWithPhoto(
            { url: item.preview_url },
            { 
                caption,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🎨 View on Freepik', url: item.url },
                        { text: '📥 Download', callback_data: `download_freepik:${item.id}` }
                    ]]
                }
            }
        );
    } else {
        const caption = `🛒 *Random from Envato*\n\n*${item.name}*\nBy: ${item.author_username}\n💰 Price: $${(item.price_cents / 100).toFixed(2)}\n📁 Category: ${item.category}`;
        await ctx.replyWithPhoto(
            { url: item.preview_url },
            { 
                caption,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '🛒 View on Envato', url: item.url },
                        { text: '📥 Download', callback_data: `download_envato:${item.id}` }
                    ]]
                }
            }
        );
    }
}

// Add random image command handler
bot.command('randommarket', async (ctx: Context) => {
    try {
        const loadingMsg = await ctx.reply('🎲 Getting random items from Envato...');

        const items = await envatoService.getRandomItems();
        
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        for (const item of items) {
            const caption = `🔥 *Popular on Envato*

📸 *${item.name}*
By: ${item.author_username}
💰 Price: $${(item.price_cents / 100).toFixed(2)}
📁 Category: ${item.category}`;

            await ctx.replyWithPhoto(
                { url: item.preview_url },
                { 
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '🛒 View on Envato',
                                url: item.url
                            }
                        ]]
                    }
                }
            );
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Random command error:', error);
        await ctx.reply('❌ Sorry, there was an error getting random items.');
    }
});

bot.command('download', async (ctx: Context) => {
    // Type guard for text messages
    if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('Please send a text message');
        return;
    }

    const message = ctx.message;
    const url = message.text.split(' ')[1];
    
    if (!url) {
        await ctx.reply('Please provide a URL to download');
        return;
    }

    const loadingMsg = await ctx.reply('⏳ Downloading content...');

    try {
        let result;
        if (url.includes('freepik.com')) {
            result = await downloader.downloadFromFreepik(url);
        } else if (url.includes('envato.com')) {
            result = await downloader.downloadFromEnvato(url);
        } else {
            await ctx.reply('❌ Unsupported URL. Please use Freepik or Envato links.');
            return;
        }

        if (result.success && result.filePath) {
            await ctx.replyWithDocument({
                source: fs.createReadStream(result.filePath),
                filename: 'content.zip'
            });
            await ctx.reply('✅ Download complete!');
        } else {
            await ctx.reply('❌ Download failed: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        await ctx.reply('❌ An error occurred during download');
    } finally {
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
    }
});

// Update error handler with correct type signature
bot.catch((err: unknown, ctx: BotContext) => {
    console.error('Bot Error:', err);
    
    // Notify user of error if possible
    if (ctx) {
        ctx.reply('❌ An error occurred while processing your request.')
            .catch(console.error);
    }
});

// Keep the startBot function and graceful shutdown handlers
export const startBot = async () => {
    try {
        console.log('🤖 Starting bot...');
        await registerCommands();
        await bot.launch();
        console.log('✅ Bot successfully started!');
        
        // Test the bot's connection
        const botInfo = await bot.telegram.getMe();
        console.log('🤖 Bot Info:', {
            username: botInfo.username,
            id: botInfo.id,
            isBot: botInfo.is_bot
        });
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        throw error;
    }
};

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot };

// Register bot commands with Telegram
bot.telegram.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help message' },
    { command: 'random', description: 'Get random resources' },
    { command: 'random_freepik', description: 'Get random Freepik resources' },
    { command: 'random_envato', description: 'Get random Envato resources' },
    { command: 'search', description: 'Search resources (usage: /search freepik nature)' },
    { command: 'trending', description: 'Show trending resources' },
    { command: 'categories', description: 'Browse resource categories' }
]);

// Help command
bot.command('help', async (ctx) => {
    const helpMessage = `
🎨 *Available Commands*:

/start - Start the bot
/help - Show this help message
/random - Get random resources from all sources
/random_freepik - Get random Freepik resources
/random_envato - Get random Envato resources
/search <source> <query> - Search resources
/trending - Show trending resources
/categories - Browse resource categories

*Examples*:
• /search freepik nature
• /search envato business template
• /random_freepik
• /trending

*Tips*:
• Use specific keywords for better results
• Check /trending for popular content
• Browse /categories for organized content
    `;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Random command handler
bot.command(['random', 'random_freepik', 'random_envato'], async (ctx) => {
    try {
        const command = ctx.message.text.split('/')[1];
        const type = command === 'random_freepik' ? 'freepik' : 
                    command === 'random_envato' ? 'envato' : 
                    Math.random() < 0.5 ? 'freepik' : 'envato';

        const loadingMsg = await ctx.reply('🎲 Getting random content...');
        
        const results = await resourceService.getRandomItems(type);
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        if (!results.data.length) {
            await ctx.reply('😕 No random content available at the moment.');
            return;
        }

        // Send results with delay between messages
        for (const item of results.data.slice(0, 5)) {
            if ('title' in item) {
                // Freepik item
                const caption = `🎨 *Random from Freepik*\n\n*${item.title}*\nBy: ${item.author.name}\n📁 Type: ${item.type}`;
                await ctx.replyWithPhoto({ url: item.preview_url }, {
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🎨 View on Freepik', url: item.url },
                            { text: '📥 Download', callback_data: `download_freepik:${item.id}` }
                        ]]
                    }
                });
            } else {
                // Envato item
                const caption = `🛒 *Random from Envato*\n\n*${item.name}*\nBy: ${item.author_username}\n💰 Price: $${(item.price_cents / 100).toFixed(2)}`;
                await ctx.replyWithPhoto({ url: item.preview_url }, {
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '🛒 View on Envato', url: item.url },
                            { text: '📥 Download', callback_data: `download_envato:${item.id}` }
                        ]]
                    }
                });
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Random command error:', error);
        await ctx.reply('❌ Sorry, there was an error getting random content.');
    }
});

// Add trending command
bot.command('trending', async (ctx) => {
    try {
        const loadingMsg = await ctx.reply('📈 Getting trending content...');
        const [freepikTrending, envatoTrending] = await Promise.all([
            resourceService.search('trending', 'freepik'),
            resourceService.search('trending', 'envato')
        ]);

        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);
        
        const trendingMessage = `
📈 *Trending Content*

🎨 *Freepik Trending*:
${freepikTrending.data.slice(0, 3).map((item: any) => `• ${item.title}`).join('\n')}

🛒 *Envato Trending*:
${envatoTrending.data.slice(0, 3).map((item: any) => `• ${item.name}`).join('\n')}

Use /random to discover more content!
        `;

        await ctx.reply(trendingMessage, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Trending command error:', error);
        await ctx.reply('❌ Sorry, there was an error getting trending content.');
    }
});

// Add categories command
bot.command('categories', async (ctx) => {
    await ctx.reply('Browse Categories:', {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🖼 Vectors', callback_data: 'category_vectors' },
                    { text: '📸 Photos', callback_data: 'category_photos' }
                ],
                [
                    { text: '🎨 Templates', callback_data: 'category_templates' },
                    { text: '📱 Social Media', callback_data: 'category_social' }
                ],
                [
                    { text: '💼 Business', callback_data: 'category_business' },
                    { text: '🎉 Events', callback_data: 'category_events' }
                ]
            ]
        }
    });
});

// Handle category selection
bot.action(/category_(.+)/, async (ctx) => {
    const category = ctx.match[1];
    try {
        await ctx.reply(`🔍 Searching ${category}...`);
        await resourceService.search(category, 'freepik');
        // ... handle results similar to random command
    } catch (error) {
        console.error('Category search error:', error);
        await ctx.reply('❌ Sorry, there was an error searching the category.');
    }
});
