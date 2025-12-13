
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Deal, Project, MarketingTask } from '../types';

// --- CONFIGURATION ---
const KEYS = {
    DEALS: 'bokle_data_deals',
    PROJECTS: 'bokle_data_projects',
    MARKETING: 'bokle_data_marketing',
    SUPABASE_URL: 'bokle_sb_url',
    SUPABASE_KEY: 'bokle_sb_key'
};

// --- SUPABASE CLIENT MANAGEMENT ---
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseConfig = () => {
    return {
        url: localStorage.getItem(KEYS.SUPABASE_URL) || '',
        key: localStorage.getItem(KEYS.SUPABASE_KEY) || ''
    };
};

export const saveSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem(KEYS.SUPABASE_URL, url.trim());
    localStorage.setItem(KEYS.SUPABASE_KEY, key.trim());
    // Reset instance to force reconnection
    supabaseInstance = null;
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem(KEYS.SUPABASE_URL);
    localStorage.removeItem(KEYS.SUPABASE_KEY);
    supabaseInstance = null;
};

const getSupabase = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;

    const { url, key } = getSupabaseConfig();
    
    // Check Env Vars first (for Vercel deployment)
    // Cast import.meta to any to avoid TypeScript errors when types aren't available
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    const effectiveUrl = envUrl || url;
    const effectiveKey = envKey || key;

    if (effectiveUrl && effectiveKey) {
        try {
            supabaseInstance = createClient(effectiveUrl, effectiveKey);
            return supabaseInstance;
        } catch (e) {
            console.error("Failed to init Supabase", e);
            return null;
        }
    }
    return null;
};

// --- DATA ADAPTERS (Unified API for LocalStorage & Supabase) ---

// Helper to normalize data structure
const parseLocal = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
};

export const DataService = {
    isCloudEnabled: () => !!getSupabase(),

    // --- DEALS ---
    getDeals: async (): Promise<Deal[]> => {
        const sb = getSupabase();
        if (sb) {
            const { data, error } = await sb.from('deals').select('*');
            if (!error && data) return data as Deal[];
            console.error("Supabase Error (Deals):", error);
        }
        return parseLocal(KEYS.DEALS, []);
    },

    saveDeal: async (deal: Deal) => {
        const sb = getSupabase();
        if (sb) {
            // Upsert handles both insert and update if ID matches
            const { error } = await sb.from('deals').upsert(deal);
            if (error) console.error("Supabase Save Error:", error);
        } else {
            const current = parseLocal<Deal[]>(KEYS.DEALS, []);
            const index = current.findIndex(d => d.id === deal.id);
            if (index >= 0) current[index] = deal;
            else current.push(deal);
            localStorage.setItem(KEYS.DEALS, JSON.stringify(current));
        }
    },

    deleteDeal: async (id: string) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('deals').delete().eq('id', id);
        } else {
            const current = parseLocal<Deal[]>(KEYS.DEALS, []);
            localStorage.setItem(KEYS.DEALS, JSON.stringify(current.filter(d => d.id !== id)));
        }
    },

    // --- PROJECTS ---
    getProjects: async (): Promise<Project[]> => {
        const sb = getSupabase();
        if (sb) {
            const { data, error } = await sb.from('projects').select('*');
            if (!error && data) return data as Project[];
        }
        return parseLocal(KEYS.PROJECTS, []);
    },

    saveProject: async (project: Project) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('projects').upsert(project);
        } else {
            const current = parseLocal<Project[]>(KEYS.PROJECTS, []);
            const index = current.findIndex(p => p.id === project.id);
            if (index >= 0) current[index] = project;
            else current.push(project);
            localStorage.setItem(KEYS.PROJECTS, JSON.stringify(current));
        }
    },

    deleteProject: async (id: string) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('projects').delete().eq('id', id);
        } else {
            const current = parseLocal<Project[]>(KEYS.PROJECTS, []);
            localStorage.setItem(KEYS.PROJECTS, JSON.stringify(current.filter(p => p.id !== id)));
        }
    },

    // --- MARKETING ---
    getMarketing: async (): Promise<MarketingTask[]> => {
        const sb = getSupabase();
        if (sb) {
            const { data, error } = await sb.from('marketing_tasks').select('*');
            if (!error && data) {
                // Map snake_case DB fields to camelCase TS fields if needed, 
                // but usually simpler to keep them consistent. 
                // Assuming DB columns match TS interface for simplicity in this artifact.
                return data as MarketingTask[];
            }
        }
        return parseLocal(KEYS.MARKETING, []);
    },

    saveMarketing: async (task: MarketingTask) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('marketing_tasks').upsert(task);
        } else {
            const current = parseLocal<MarketingTask[]>(KEYS.MARKETING, []);
            const index = current.findIndex(t => t.id === task.id);
            if (index >= 0) current[index] = task;
            else current.push(task);
            localStorage.setItem(KEYS.MARKETING, JSON.stringify(current));
        }
    },

    deleteMarketing: async (id: string) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('marketing_tasks').delete().eq('id', id);
        } else {
            const current = parseLocal<MarketingTask[]>(KEYS.MARKETING, []);
            localStorage.setItem(KEYS.MARKETING, JSON.stringify(current.filter(t => t.id !== id)));
        }
    },

    // --- UTILS ---
    getFullBackup: () => ({
        deals: parseLocal(KEYS.DEALS, []),
        projects: parseLocal(KEYS.PROJECTS, []),
        marketing: parseLocal(KEYS.MARKETING, []),
        timestamp: new Date().toISOString(),
        version: '1.0'
    }),

    clearLocalData: () => {
        localStorage.removeItem(KEYS.DEALS);
        localStorage.removeItem(KEYS.PROJECTS);
        localStorage.removeItem(KEYS.MARKETING);
    }
};
