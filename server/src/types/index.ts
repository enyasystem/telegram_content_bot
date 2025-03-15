// This file exports TypeScript types and interfaces used throughout the server-side application.

export interface User {
    id: string;
    username: string;
    groupMembership: boolean;
}

export interface UnsplashImage {
    id: string;
    description: string | null;
    urls: {
        small: string;
        regular: string;
        full: string;
    };
}

export interface TelegramMessage {
    chat: {
        id: string;
        type: string;
    };
    text: string;
    from: {
        id: string;
        username: string;
    };
}