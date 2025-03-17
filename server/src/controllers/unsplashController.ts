import { Request, Response } from 'express';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const UNSPLASH_API_URL = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export const searchImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req.query;
        if (!query) {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }

        const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            },
            params: {
                query,
                per_page: 10
            }
        });

        res.json(response.data);
        return;
    } catch (error) {
        console.error('Error searching images:', error);
        res.status(500).json({ error: 'Failed to search images' });
        return;
    }
};

export const getRandomImage = async (_req: Request, res: Response): Promise<void> => {
    try {
        const response = await axios.get(`${UNSPLASH_API_URL}/photos/random`, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
        });

        res.json(response.data);
        return;
    } catch (error) {
        console.error('Error getting random image:', error);
        res.status(500).json({ error: 'Failed to get random image' });
        return;
    }
};
