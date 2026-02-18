import { Page } from 'playwright';
import { Rule } from './loader.js';

export interface Finding {
    rule: Rule;
    targetUrl: string;
    details?: any;
}

export interface Scanner {
    name: string;
    init(page: Page, rules: Rule[]): Promise<void>;
    analyze(): Promise<Finding[]>;
}
