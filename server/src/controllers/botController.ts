import { Request, Response } from 'express';
import { checkUserMembership } from '../middleware/auth';
import { fetchUnsplashContent } from '../services/unsplash';
import { sendMessageToTelegram } from '../services/telegram';

export const handleIncomingMessage = async (req: Request, res: Response) => {
    const { message } = req.body;

    // Check user group membership
    const isMember = await checkUserMembership(message.from.id);
    if (!isMember) {
        return res.status(403).send('User is not a member of the required group.');
    }

    // Fetch content from Unsplash
    const content = await fetchUnsplashContent();
    if (!content) {
        return res.status(500).send('Failed to fetch content from Unsplash.');
    }

    // Send content to Telegram
    await sendMessageToTelegram(message.chat.id, content);
    return res.status(200).send('Message sent successfully.');
};