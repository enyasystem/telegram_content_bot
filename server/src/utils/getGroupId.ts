import { Telegraf, Context } from 'telegraf';
import { Chat } from 'telegraf/types';
import * as dotenv from 'dotenv';
dotenv.config();

// Define chat types for better type safety
interface GroupChat extends Chat.GroupChat {
    title: string;
}

interface SupergroupChat extends Chat.SupergroupChat {
    title: string;
}

type SupportedChat = Chat.PrivateChat | GroupChat | SupergroupChat;

// Initialize bot with type checking
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('getid', async (ctx: Context) => {
    try {
        const chat = ctx.chat as SupportedChat;
        const chatId = chat.id;
        const chatType = chat.type;
        
        let chatInfo = {
            id: chatId,
            type: chatType,
            title: 'Private Chat',
            isGroup: false
        };

        if (chatType === 'group' || chatType === 'supergroup') {
            chatInfo = {
                id: chatId,
                type: chatType,
                title: (chat as GroupChat | SupergroupChat).title,
                isGroup: true
            };
        }

        console.log('Chat Details:', chatInfo);

        const message = `*Chat Details*:\n` +
            `🆔 \`${chatId}\`\n` +
            `📝 Type: \`${chatType}\`\n` +
            `📌 Title: \`${chatInfo.title}\`\n\n` +
            `${chatInfo.isGroup ? '✅ This is a group chat' : '⚠️ This is not a group chat'}`;

        await ctx.replyWithMarkdown(message);
    } catch (error) {
        console.error('Error getting chat details:', error);
        await ctx.reply('❌ Error getting chat details. Please try again.');
    }
});

// Start the bot
bot.launch()
    .then(() => {
        console.log('✅ Bot started successfully');
        console.log('📝 Send /getid in your group to get the correct ID');
    })
    .catch((error) => {
        console.error('❌ Bot failed to start:', error);
        process.exit(1);
    });

// Enable graceful stop
process.once('SIGINT', () => {
    bot.stop('SIGINT');
    process.exit(0);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    process.exit(0);
});
