import { Telegraf, Context } from 'telegraf';
import { Message } from 'telegraf/types';
import * as dotenv from 'dotenv';
import path from 'path';
import { checkGroupMembership } from '../middleware/authMiddleware';
import { searchPhotos, getRandomPhoto } from './unsplash';
import { envatoService } from './envato';

// Configure dotenv to look for .env in the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug logging
console.log('Environment variables loaded:', {
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
    tokenPrefix: process.env.TELEGRAM_BOT_TOKEN?.substring(0, 5)
});

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

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken || !validateBotToken(botToken)) {
    throw new Error('Invalid TELEGRAM_BOT_TOKEN format. Please get a valid token from @BotFather');
}

const bot = new Telegraf(botToken);

// Add middleware to bot
bot.use(checkGroupMembership);

// Add command type for better organization
type SearchSource = 'unsplash' | 'envato' | 'both';

// Add keyboard markup helper
const getMainKeyboard = () => {
    return {
        reply_markup: {
            keyboard: [
                [{ text: '🔍 Search' }, { text: '🎲 Random' }],
                [{ text: '📷 Photos' }, { text: '🛒 Market' }],
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
/search <query> - Search both Unsplash & Envato
/photos <query> - Search Unsplash photos only
/market <query> - Search Envato marketplace only

🎲 *Random Content*
/random - Get random items from both sources
/randomphoto - Get random photo from Unsplash
/randommarket - Get random items from Envato

Example: Try "/photos nature" or "/market icons"`;

// Bot commands setup
bot.command('start', async (ctx: Context) => {
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
    await handleSearch(ctx, 'both');
});

bot.command('photos', checkGroupMembership, async (ctx: Context) => {
    await handleSearch(ctx, 'unsplash');
});

bot.command('market', checkGroupMembership, async (ctx: Context) => {
    await handleSearch(ctx, 'envato');
});

// Add handlers for unknown commands and messages
bot.on('text', async (ctx) => {
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
            '📷 Photos': '/photos',
            '🛒 Market': '/market',
            '❓ Help': '/help'
        };

        if (messageMap[text]) {
            // Handle button clicks with proper instructions
            switch (text) {
                case '🔍 Search':
                    await ctx.reply('To search both platforms:\n/search <query>\nExample: /search nature');
                    break;
                case '📷 Photos':
                    await ctx.reply('To search Unsplash photos:\n/photos <query>\nExample: /photos landscape');
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
        const message = ctx.message as Message.TextMessage;
        const query = message.text.split(' ').slice(1).join(' ');
        
        if (!query) {
            await ctx.reply('⚠️ Please provide a search term. Example: /search nature');
            return;
        }

        const loadingMsg = await ctx.reply(`🔍 Searching for "${query}"...`);

        let results: any[] = [];

        if (source === 'both' || source === 'unsplash') {
            try {
                const unsplashResults = await searchPhotos(query);
                results.push(...unsplashResults.map(photo => ({
                    type: 'unsplash',
                    data: photo
                })));
            } catch (error) {
                console.error('Unsplash search error:', error);
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

        // Shuffle results if showing both sources
        if (source === 'both') {
            results = results.sort(() => Math.random() - 0.5);
        }

        // Send results
        for (const result of results) {
            if (result.type === 'unsplash') {
                const photo = result.data;
                const caption = `📸 *Photo by ${photo.user.name}*
                
📝 ${photo.description || 'No description available'}

🔗 [View on Unsplash](${photo.links.html})`;

                await ctx.replyWithPhoto(
                    { url: photo.urls.regular },
                    { 
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                {
                                    text: '📷 View on Unsplash',
                                    url: photo.links.html
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

// Add random photo command handler
bot.command('randomphoto', checkGroupMembership, async (ctx: Context) => {
    try {
        const loadingMsg = await ctx.reply('🎲 Getting a random photo...');
        
        const photo = await getRandomPhoto();
        
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        const caption = `📸 *Photo by ${photo.user.name}*
        
📝 ${photo.description || 'No description available'}

🔗 [View on Unsplash](${photo.links.html})`;

        await ctx.replyWithPhoto(
            { url: photo.urls.regular },
            { 
                caption,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '📷 View on Unsplash',
                            url: photo.links.html
                        }
                    ]]
                }
            }
        );
    } catch (error) {
        console.error('Random photo error:', error);
        await ctx.reply('❌ Sorry, there was an error getting a random photo.');
    }
});

// Update random command to handle both sources
bot.command('random', async (ctx: Context) => {
    try {
        const loadingMsg = await ctx.reply('🎲 Getting random content...');
        
        let results: any[] = [];

        // Get random photo from Unsplash
        try {
            const randomPhoto = await getRandomPhoto();
            results.push({
                type: 'unsplash',
                data: randomPhoto
            });
        } catch (error) {
            console.error('Random Unsplash error:', error);
        }

        // Get random items from Envato
        try {
            const randomItems = await envatoService.getRandomItems();
            results.push(...randomItems.slice(0, 2).map(item => ({
                type: 'envato',
                data: item
            })));
        } catch (error) {
            console.error('Random Envato error:', error);
        }

        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        if (results.length === 0) {
            await ctx.reply('😕 No random content available at the moment.');
            return;
        }

        // Shuffle results
        results = results.sort(() => Math.random() - 0.5);

        // Send results
        for (const result of results) {
            if (result.type === 'unsplash') {
                const photo = result.data;
                const caption = `📸 *Random Photo by ${photo.user.name}*
                
📝 ${photo.description || 'No description available'}

🔗 [View on Unsplash](${photo.links.html})`;

                await ctx.replyWithPhoto(
                    { url: photo.urls.regular },
                    { 
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                {
                                    text: '📷 View on Unsplash',
                                    url: photo.links.html
                                }
                            ]]
                        }
                    }
                );
            } else {
                const item = result.data;
                const caption = `🔥 *Random from Envato*

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
            }
            
            // Add delay between messages
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Random command error:', error);
        await ctx.reply('❌ Sorry, there was an error getting random content.');
    }
});

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

// Error handling
bot.catch((err: any) => {
    console.error('Telegraf error:', err);
});

export const startBot = async () => {
    try {
        // Verify bot token before launching
        const me = await bot.telegram.getMe();
        console.log('Bot initialized:', {
            username: me.username,
            id: me.id,
            isBot: me.is_bot,
            commands: ['/start', '/help', '/search', '/random']
        });
        
        await bot.launch();
        console.log('🤖 Telegram bot started successfully');
    } catch (error: any) {
        console.error('❌ Bot initialization error:', error.message);
        if (error.response?.error_code === 404) {
            throw new Error('Invalid bot token. Please create a new bot with @BotFather');
        }
        throw error;
    }
};

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot };
