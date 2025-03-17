import { createApi } from 'unsplash-js';
import nodeFetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

interface UnsplashPhoto {
    id: string;
    urls: {
        regular: string;
        small: string;
        raw: string;
    };
    description: string | null;
    user: {
        name: string;
        username: string;
        links: {
            html: string;
        };
    };
    links: {
        html: string;
    };
}

const unsplash = createApi({
    accessKey: process.env.UNSPLASH_ACCESS_KEY!,
    fetch: nodeFetch as unknown as typeof fetch,
});

export async function searchPhotos(query: string, page = 1): Promise<UnsplashPhoto[]> {
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
}

export async function getRandomPhoto(): Promise<UnsplashPhoto> {
    try {
        const result = await unsplash.photos.getRandom({
            orientation: 'landscape'
        });

        if (result.type === 'success') {
            return result.response as UnsplashPhoto;
        }
        throw new Error('Failed to fetch random photo');
    } catch (error) {
        console.error('🎲 Unsplash random photo error:', error);
        throw new Error('Failed to get random photo');
    }
}
