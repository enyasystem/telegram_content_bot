import { Request, Response } from 'express';
import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

const unsplash = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY!,
    fetch: nodeFetch as unknown as typeof fetch
});

export const searchPhotos = async (query: string, page = 1) => {
    try {
        const result = await unsplash.search.getPhotos({
            query,
            page,
            perPage: 5,
            orientation: 'landscape'
        });

        if (result.type === 'success') {
            return result.response.results;
        }
        throw new Error('Failed to fetch photos');
    } catch (error) {
        console.error('🔍 Unsplash search error:', error);
        throw new Error('Failed to search photos');
    }
};

export const getRandomPhoto = async () => {
    try {
        const result = await unsplash.photos.getRandom({
            orientation: 'landscape'
        });

        if (result.type === 'success') {
            return result.response;
        }
        throw new Error('Failed to fetch random photo');
    } catch (error) {
        console.error('🎲 Unsplash random photo error:', error);
        throw new Error('Failed to get random photo');
    }
};

export const searchImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req.query;
        if (!query) {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }

        const results = await searchPhotos(query as string);

        res.json(results);
        return;
    } catch (error) {
        console.error('Error searching images:', error);
        res.status(500).json({ error: 'Failed to search images' });
        return;
    }
};

export const getRandomImage = async (_req: Request, res: Response): Promise<void> => {
    try {
        const result = await getRandomPhoto();

        res.json(result);
        return;
    } catch (error) {
        console.error('Error getting random image:', error);
        res.status(500).json({ error: 'Failed to get random image' });
        return;
    }
};
