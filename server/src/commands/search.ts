import { Context } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { resourceService } from '../services/resourceService';

// Define resource types
interface FreepikResource {
    id: string;
    title: string;
    url: string;
    preview_url: string;
    author: {
        name: string;
    };
}

interface EnvatoResource {
    id: number;
    name: string;
    url: string;
    preview_url: string;
    author_username: string;
}

export async function handleSearch(ctx: Context<Update>) {
    try {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('⚠️ Please send a text message');
            return;
        }

        const args = ctx.message.text.split(' ');
        if (args.length < 3) {
            await ctx.reply('Usage: /search <freepik|envato> <query>\nExample: /search freepik nature');
            return;
        }

        const [_, type, ...queryParts] = args;
        const query = queryParts.join(' ');

        const validTypes = ['freepik', 'envato'] as const;
        type SearchType = typeof validTypes[number];

        if (!validTypes.includes(type as SearchType)) {
            await ctx.reply('Please specify either "freepik" or "envato" as the source');
            return;
        }

        const loadingMsg = await ctx.reply(`🔍 Searching ${type} for "${query}"...`);
        
        const results = await resourceService.search(query, type as SearchType);
        await ctx.telegram.deleteMessage(loadingMsg.chat.id, loadingMsg.message_id);

        if (!results.data.length) {
            await ctx.reply('No results found');
            return;
        }

        // Format and send results with type checking
        for (const item of results.data.slice(0, 5)) {
            const isFreepikResource = (item: FreepikResource | EnvatoResource): item is FreepikResource => {
                return 'title' in item && 'author' in item;
            };

            const caption = isFreepikResource(item)
                ? `🎨 *${item.title}*\nBy: ${item.author.name}`
                : `🛒 *${item.name}*\nBy: ${item.author_username}`;

            await ctx.replyWithPhoto(
                { url: item.preview_url },
                {
                    caption,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: type === 'freepik' ? '🎨 View on Freepik' : '🛒 View on Envato',
                                url: item.url
                            },
                            {
                                text: '📥 Download',
                                callback_data: `download_${type}:${item.id}`
                            }
                        ]]
                    }
                }
            );

            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error('Search command error:', error);
        await ctx.reply('❌ An error occurred while searching. Please try again later.');
    }
}
