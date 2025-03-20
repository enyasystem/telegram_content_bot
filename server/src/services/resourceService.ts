import type { ResourceType, ResourceResponse } from '../types/resources';
import FreepikService from './freepik';
import { envatoService } from './envato';

const freepikService = new FreepikService();

class ResourceService {
    private async rateLimit() {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    }

    async search(query: string, type: ResourceType): Promise<ResourceResponse> {
        await this.rateLimit(); // Add rate limiting
        try {
            switch (type) {
                case 'freepik': {
                    const freepikResults = await freepikService.searchItems(query);
                    return {
                        type: 'freepik',
                        data: freepikResults,
                        total: freepikResults.length,
                        page: 1
                    };
                }

                case 'envato': {
                    const envatoResults = await envatoService.searchItems(query);
                    return {
                        type: 'envato',
                        data: envatoResults,
                        total: envatoResults.length,
                        page: 1
                    };
                }

                default:
                    throw new Error(`Unsupported resource type: ${type}`);
            }
        } catch (error) {
            console.error(`Search error (${type}):`, {
                query,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async getRandomItems(type: ResourceType): Promise<ResourceResponse> {
        try {
            switch (type) {
                case 'freepik': {
                    const freepikResults = await freepikService.searchItems('popular');
                    return {
                        type: 'freepik',
                        data: freepikResults,
                        total: freepikResults.length,
                        page: 1
                    };
                }

                case 'envato': {
                    const envatoResults = await envatoService.searchItems('featured');
                    return {
                        type: 'envato',
                        data: envatoResults,
                        total: envatoResults.length,
                        page: 1
                    };
                }

                default:
                    throw new Error(`Unsupported resource type: ${type}`);
            }
        } catch (error) {
            console.error(`Random items error (${type}):`, error);
            return {
                type,
                data: [],
                total: 0,
                page: 1
            };
        }
    }
}

export const resourceService = new ResourceService();
