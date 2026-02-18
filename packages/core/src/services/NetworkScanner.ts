import { Page, Request } from 'playwright';
import { Scanner, Finding } from '../types.js';
import { Rule } from '../loader.js';

export class NetworkScanner implements Scanner {
    name = 'NetworkScanner';
    private rules: Rule[] = [];
    private findings: Finding[] = [];

    async init(page: Page, rules: Rule[]): Promise<void> {
        this.rules = rules;
        page.on('request', (request: Request) => this.handleRequest(request));
    }

    private handleRequest(request: Request): void {
        const requestUrl = request.url();

        for (const rule of this.rules) {
            if (!rule.check) continue;
            const patterns = rule.check.patterns || [];
            const matchType = rule.check.type;

            const isMatch = patterns.some((pattern: string) => {
                if (matchType === 'contains') return requestUrl.includes(pattern);
                return false;
            });

            if (isMatch) {
                const exists = this.findings.some(f => f.rule.id === rule.id && f.targetUrl === requestUrl);
                if (!exists) {
                    this.findings.push({ rule, targetUrl: requestUrl });
                }
            }
        }
    }

    async analyze(): Promise<Finding[]> {
        return this.findings;
    }
}
