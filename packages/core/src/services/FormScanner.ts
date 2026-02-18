import { Page } from 'playwright';
import { Scanner, Finding } from '../types.js';
import { Rule } from '../loader.js';

export class FormScanner implements Scanner {
    name = 'FormScanner';
    private rules: Rule[] = [];
    private page: Page | null = null;
    private phiFieldPatterns: string[] = [];

    async init(page: Page, rules: Rule[], phiPatterns: string[] = []): Promise<void> {
        this.page = page;
        this.rules = rules;
        this.phiFieldPatterns = phiPatterns;
    }

    async analyze(): Promise<Finding[]> {
        if (!this.page) return [];
        const page = this.page;
        const findings: Finding[] = [];

        const formAnalysis = await page.evaluate((phiPatterns) => {
            const forms = Array.from(document.querySelectorAll('form'));
            const results: any[] = [];

            forms.forEach((form, index) => {
                const inputs = Array.from(form.querySelectorAll('input, select, textarea, [role="textbox"]'));
                const inputDetails = inputs.map(input => ({
                    name: input.getAttribute('name') || '',
                    id: input.getAttribute('id') || '',
                    type: input.getAttribute('type') || '',
                    autocomplete: input.getAttribute('autocomplete') || '',
                    hasLabel: !!document.querySelector(`label[for="${input.id}"]`) || !!input.closest('label') || !!input.getAttribute('aria-label') || !!input.getAttribute('aria-labelledby'),
                    placeholder: input.getAttribute('placeholder') || ''
                }));

                const hasPhiFields = inputDetails.some(input =>
                    phiPatterns.some(pattern =>
                        input.name.toLowerCase().includes(pattern) ||
                        input.id.toLowerCase().includes(pattern) ||
                        input.placeholder.toLowerCase().includes(pattern)
                    )
                );

                results.push({
                    index,
                    method: form.getAttribute('method')?.toUpperCase() || 'GET',
                    action: form.getAttribute('action') || '',
                    hasPhiFields,
                    inputs: inputDetails
                });
            });

            return results;
        }, this.phiFieldPatterns);

        for (const rule of this.rules) {
            const checkType = rule.check.type;

            if (checkType === 'form_submission_check') {
                formAnalysis.forEach(form => {
                    if (form.hasPhiFields) {
                        let issueFound = false;
                        let reason = '';

                        if (form.method === 'GET') {
                            issueFound = true;
                            reason = 'GET method';
                        } else if (form.action.startsWith('http://')) {
                            issueFound = true;
                            reason = 'HTTP action URL';
                        } else if (form.action.includes('?')) {
                            issueFound = true;
                            reason = 'query parameters in action URL';
                        }

                        if (issueFound) {
                            findings.push({
                                rule: { ...rule, what_happened: rule.what_happened.replace('{method}', reason) },
                                targetUrl: page.url(),
                                details: { formIndex: form.index, method: form.method, action: form.action }
                            });
                        }
                    }
                });
            }

            if (checkType === 'form_autocomplete_check') {
                formAnalysis.forEach(form => {
                    form.inputs.forEach((input: any) => {
                        const isSensitive = this.phiFieldPatterns.some(pattern =>
                            input.name.toLowerCase().includes(pattern) ||
                            input.id.toLowerCase().includes(pattern)
                        );

                        if (isSensitive && (input.autocomplete === 'on' || !input.autocomplete)) {
                            findings.push({
                                rule: { ...rule, what_happened: rule.what_happened.replace('{field}', input.name || input.id || 'unknown') },
                                targetUrl: page.url(),
                                details: { inputName: input.name, inputId: input.id, autocomplete: input.autocomplete }
                            });
                        }
                    });
                });
            }

            if (checkType === 'form_label_check') {
                formAnalysis.forEach(form => {
                    form.inputs.forEach((input: any) => {
                        if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'hidden' && !input.hasLabel) {
                            findings.push({
                                rule: { ...rule, what_happened: rule.what_happened.replace('{field}', input.name || input.id || 'unknown') },
                                targetUrl: page.url(),
                                details: { inputName: input.name, inputId: input.id }
                            });
                        }
                    });
                });
            }
        }

        return findings;
    }
}
