import { Telegraf, Context } from 'telegraf';
import * as dotenv from 'dotenv';
import path from 'path';
import { Message } from 'telegraf/types';
import { checkGroupMembership } from '../middleware/authMiddleware';
import { searchPhotos, getRandomPhoto } from './unsplash';

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

// Bot commands setup
bot.command('start', async (ctx: Context) => {
    try {
        await ctx.reply('Welcome to the content bot! 🎉\nUse /help to see available commands.');
    } catch (error) {
        console.error('Start command error:', error);
        await ctx.reply('Sorry, there was an error processing your request.');
    }
});

bot.command('help', async (ctx: Context) => {
    await ctx.reply(`Available commands:
/start - Start the bot
/help - Show this help message
/search <query> - Search for images
/random - Get a random image`);
});

// Add search command handler
bot.command('search', checkGroupMembership, async (ctx: Context) => {
    try {
        const message = ctx.message as Message.TextMessage;
        const query = message.text.split(' ').slice(1).join(' ');
        
        if (!query) {
            await ctx.reply('⚠️ Please provide a search term. Example: /search nature');
            return;
        }

        const loadingMsg = await ctx.reply(`🔍 Searching for "${query}" images...`);

        const photos = await searchPhotos(query);

        if (photos.length === 0) {
            await ctx.reply('😕 No images found for your search.');
            return;
        }

        // Delete the loading message
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        // Send each photo with attribution
        for (const photo of photos) {
            const caption = `📸 Photo by ${photo.user.name} (@${photo.user.username})
            
📝 ${photo.description || 'No description available'}

🔗 View on Unsplash: ${photo.links.html}`;

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
            
            // Add a small delay between photos to prevent flooding
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Search command error:', error);
        await ctx.reply('❌ Sorry, there was an error processing your request.');
    }
});

// Add random image command handler
bot.command('random', checkGroupMembership, async (ctx: Context) => {
    try {
        const loadingMsg = await ctx.reply('🎲 Getting a random image...');

        const photo = await getRandomPhoto();

        // Delete the loading message
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        const caption = `📸 Photo by ${photo.user.name} (@${photo.user.username})
        
📝 ${photo.description || 'No description available'}

🔗 View on Unsplash: ${photo.links.html}`;

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
        console.error('Random command error:', error);
        await ctx.reply('❌ Sorry, there was an error getting a random image.');
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
