import { Page, Response } from 'playwright';
import { Scanner, Finding } from '../types.js';
import { Rule } from '../loader.js';

export class SecurityScanner implements Scanner {
    name = 'SecurityScanner';
    private rules: Rule[] = [];
    private findings: Finding[] = [];
    private essentialHeaders = [
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy'
    ];

    async init(page: Page, rules: Rule[]): Promise<void> {
        this.rules = rules;

        page.on('response', (response: Response) => {
            const request = response.request();
            if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                this.handleMainResponse(response);
            }
        });
    }

    private async handleMainResponse(response: Response): Promise<void> {
        const url = response.url();
        const headers = response.headers();
        const protocol = new URL(url).protocol;

        for (const rule of this.rules) {
            if (!rule.check) continue;
            const checkType = rule.check.type;

            if (checkType === 'header_check') {
                const missingHeaders = this.essentialHeaders.filter(
                    h => !headers[h.toLowerCase()]
                );

                if (missingHeaders.length > 0) {
                    this.findings.push({
                        rule,
                        targetUrl: url,
                        details: {
                            missingHeaders,
                            foundHeaders: Object.keys(headers)
                        }
                    });

                    rule.what_happened = rule.what_happened.replace('{headers}', missingHeaders.join(', '));
                }
            }

            if (checkType === 'protocol_check') {
                if (protocol !== 'https:') {
                    this.findings.push({
                        rule,
                        targetUrl: url,
                        details: { protocol }
                    });
                }
            }
        }
    }

    async analyze(): Promise<Finding[]> {
        return this.findings;
    }
}
