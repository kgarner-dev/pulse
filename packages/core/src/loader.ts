import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface Rule {
    id: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    why_it_matters: string;
    what_happened: string;
    resolution: string;
    check: {
        type: string;
        patterns?: string[];
        context_required?: boolean;
    };
    citations?: string[];
}

export interface ContextDefinitions {
    id: string;
    name: string;
    definitions: {
        url_patterns: string[];
        form_field_patterns: string[];
        content_patterns: string[];
    };
}

export interface Manifest {
    version: string;
    updated: string;
    categories: Record<string, {
        active: boolean;
        version: string;
        name: string;
    }>;
}

export class RuleLoader {
    private rulesPath: string;
    private contextPath: string;
    private rootDir: string;

    constructor() {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        this.rootDir = path.join(__dirname, '..');

        this.rulesPath = path.join(this.rootDir, 'rules/categories');
        this.contextPath = path.join(this.rootDir, 'rules/context');
    }

    loadManifest(): Manifest | null {
        const manifestPath = path.join(this.rootDir, 'rules/manifest.json');
        if (!fs.existsSync(manifestPath)) return null;

        try {
            return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch (error) {
            console.error('Failed to load manifest:', error);
            return null;
        }
    }

    loadRules(category?: string): Rule[] {
        const manifest = this.loadManifest();
        if (!manifest) return [];

        if (!category) {
            let allRules: Rule[] = [];
            for (const [catName, config] of Object.entries(manifest.categories)) {
                if (config.active) {
                    allRules = allRules.concat(this.loadRules(catName));
                }
            }
            return allRules;
        }

        const config = manifest.categories[category];
        if (!config) {
            console.warn(`Category ${category} not found in manifest.`);
            return [];
        }

        const version = config.version;
        const filePath = path.join(this.rulesPath, category, version, 'rules.json');

        if (!fs.existsSync(filePath)) {
            console.warn(`Rule file not found at: ${filePath}`);
            return [];
        }

        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            return (data.rules || []);
        } catch (error) {
            console.error(`Error loading rules for category ${category} v${version}:`, error);
            return [];
        }
    }

    loadContext(type: string): ContextDefinitions {
        const filePath = path.join(this.contextPath, `${type}.json`);
        if (!fs.existsSync(filePath)) {
            console.warn(`Context file not found: ${filePath}`);
            return {
                id: type,
                name: type,
                definitions: {
                    url_patterns: [],
                    form_field_patterns: [],
                    content_patterns: []
                }
            };
        }

        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(rawData);
        } catch (error) {
            console.error(`Error loading context ${type}:`, error);
            return {
                id: type,
                name: type,
                definitions: {
                    url_patterns: [],
                    form_field_patterns: [],
                    content_patterns: []
                }
            };
        }
    }

    loadAllContexts(): ContextDefinitions[] {
        if (!fs.existsSync(this.contextPath)) return [];

        try {
            const files = fs.readdirSync(this.contextPath).filter(f => f.endsWith('.json'));
            return files.map(file => this.loadContext(path.basename(file, '.json')));
        } catch (error) {
            console.error('Failed to load all contexts:', error);
            return [];
        }
    }

    getContextDefinition(type: string): ContextDefinitions['definitions'] | null {
        const context = this.loadContext(type);
        return context ? context.definitions : null;
    }
}
