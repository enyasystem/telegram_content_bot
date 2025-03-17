import { Context, MiddlewareFn } from 'telegraf';
import { ChatMember, ChatMemberAdministrator } from 'telegraf/types';

// Type guard function using Telegraf's built-in types
function isAdminChatMember(member: ChatMember): member is ChatMemberAdministrator {
    return member.status === 'administrator';
}

export const checkGroupMembership: MiddlewareFn<Context> = async (ctx, next) => {
    try {
        const groupId = process.env.TELEGRAM_GROUP_ID?.trim();
        const userId = ctx.from?.id;
        
        // Enhanced debug logging
        console.log('🔍 Auth Check:', {
            botInfo: {
                id: ctx.botInfo?.id,
                username: ctx.botInfo?.username
            },
            groupId: groupId,
            messageFrom: {
                id: userId,
                username: ctx.from?.username
            }
        });

        if (!groupId || !userId) {
            throw new Error('Missing required IDs');
        }

        try {
            const numericGroupId = Number(groupId);
            console.log('🤖 Checking bot membership with ID:', numericGroupId);
            
            const botMember = await ctx.telegram.getChatMember(numericGroupId, ctx.botInfo.id);
            
            if (!isAdminChatMember(botMember)) {
                console.log('❌ Bot is not an administrator:', botMember.status);
                await ctx.reply('⚠️ Bot needs administrator rights in the group.');
                return;
            }

            // Now TypeScript knows botMember is ChatMemberAdministrator
            console.log('📊 Bot Member Status:', {
                status: botMember.status,
                permissions: {
                    canManageChat: botMember.can_manage_chat,
                    canDeleteMessages: botMember.can_delete_messages,
                    canRestrictMembers: botMember.can_restrict_members,
                    isAnonymous: botMember.is_anonymous,
                    canBeEdited: botMember.can_be_edited
                }
            });

            const userMember = await ctx.telegram.getChatMember(numericGroupId, userId);
            console.log('👤 User Member Status:', userMember.status);

            if (!['creator', 'administrator', 'member'].includes(userMember.status)) {
                await ctx.reply('⚠️ You must be a member of our group to use this bot.');
                return;
            }

            return next();
        } catch (error: any) {
            console.error('❌ Bot Check Error:', {
                message: error.message,
                code: error.response?.error_code,
                description: error.response?.description
            });
            await ctx.reply('❌ Error checking permissions. Please ensure the bot is in the group and has admin rights.');
            return;
        }
    } catch (error) {
        console.error('❌ Auth Error:', error);
        await ctx.reply('Authentication error occurred');
    }
};
