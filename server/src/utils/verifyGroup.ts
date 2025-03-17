import { Telegraf, Context } from 'telegraf';
import { Chat } from 'telegraf/types';
import * as dotenv from 'dotenv';
dotenv.config();

// Type guard for group chats
function isGroupChat(chat: Chat): chat is Chat.GroupChat | Chat.SupergroupChat {
    return chat.type === 'group' || chat.type === 'supergroup';
}

// Format group ID correctly
function formatGroupId(chat: Chat): string {
    if (chat.type === 'supergroup') {
        const strId = chat.id.toString();
        return strId.startsWith('-100') ? strId : `-100${Math.abs(chat.id)}`;
    }
    return chat.id.toString();
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

bot.command('verify', async (ctx: Context) => {
    try {
        const chat = ctx.chat;
        
        if (!chat) {
            throw new Error('Chat context is undefined');
        }

        const formattedId = formatGroupId(chat);
        const chatTitle = isGroupChat(chat) ? chat.title : 'N/A';
        
        // Debug logging
        console.log('🔍 Verification Request:', {
            chatId: chat.id,
            formattedId,
            type: chat.type,
            from: ctx.from?.username
        });

        const message = `
🔍 *Chat Information*
Original ID: \`${chat.id}\`
Formatted ID: \`${formattedId}\`
Type: \`${chat.type}\`
Title: \`${chatTitle}\`

${isGroupChat(chat) ? `✅ This is a group chat!
Add this to your .env file:
\`\`\`
TELEGRAM_GROUP_ID=${formattedId}
\`\`\`
` : '⚠️ This is not a group chat. Please run this command in your group.'}`;

        await ctx.replyWithMarkdown(message);
        
        // Enhanced console logging
        console.log('📊 Chat Details:', {
            originalId: chat.id,
            formattedId,
            type: chat.type,
            title: chatTitle,
            isGroup: isGroupChat(chat)
        });
    } catch (error) {
        console.error('❌ Verification error:', error);
        await ctx.reply('Error getting chat details. Please try again.');
    }
});

// Start the bot
bot.launch()
    .then(() => {
        console.clear();
        console.log('✅ Verification bot started successfully');
        console.log('📝 Instructions:');
        console.log('1. Add the bot to your group');
        console.log('2. Make the bot an admin');
        console.log('3. Send /verify in your group');
        console.log('\nPress Ctrl+C to stop the bot');
    })
    .catch(console.error);

// Enable graceful stop
process.once('SIGINT', () => {
    console.log('\n👋 Stopping bot...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('\n👋 Stopping bot...');
    bot.stop('SIGTERM');
});
