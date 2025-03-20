export interface FreepikResource {
    id: string;
    title: string;
    description: string;
    url: string;
    preview_url: string;
    author: {
        name: string;
        username: string;
    };
    type: 'vector' | 'photo' | 'psd';
}

export interface EnvatoResource {
    id: number;
    name: string;
    url: string;
    preview_url: string;
    author_username: string;
    price_cents: number;
    category: string;
}

export type ResourceType = 'freepik' | 'envato';

export interface ResourceResponse {
    type: ResourceType;
    data: FreepikResource[] | EnvatoResource[];
    total: number;
    page: number;
}
