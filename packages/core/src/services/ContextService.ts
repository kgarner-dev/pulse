import { Page } from 'playwright';
import { ContextDefinitions } from '../loader.js';

export class ContextService {
    private definitions: ContextDefinitions[];

    constructor(definitions: ContextDefinitions[]) {
        this.definitions = definitions;
    }

    async detectContexts(page: Page, url: string): Promise<string[]> {
        const matches: string[] = [];
        const lowerUrl = url.toLowerCase();

        for (const context of this.definitions) {
            let matched = false;

            if (context.definitions.url_patterns.some(pattern => lowerUrl.includes(pattern.toLowerCase()))) {
                matched = true;
            }

            if (!matched) {
                try {
                    const content = await page.textContent('body');
                    if (content) {
                        const lowerContent = content.toLowerCase();
                        if (context.definitions.content_patterns.some(pattern => lowerContent.includes(pattern.toLowerCase()))) {
                            matched = true;
                        }
                    }
                } catch (e) {
                    console.error(`Context detection failed for ${context.name}:`, e);
                }
            }

            if (matched) {
                matches.push(context.name);
            }
        }

        return matches;
    }

    async detectPhi(page: Page, url: string): Promise<boolean> {
        const contexts = await this.detectContexts(page, url);
        return contexts.length > 0;
    }
}
