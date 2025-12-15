
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Deal, Project, MarketingTask, DealArtifact, OutreachLead } from '../types';

// --- CONFIGURATION ---
const KEYS = {
    DEALS: 'bokle_data_deals',
    PROJECTS: 'bokle_data_projects',
    MARKETING: 'bokle_data_marketing',
    ARTIFACTS: 'bokle_data_artifacts',
    LEADS: 'bokle_data_outreach_leads',
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
    
    // Check Env Vars (Injected via vite.config.ts define)
    const envUrl = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = process.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    // Priority: 1. Environment Variables (Vercel), 2. Local Storage (Manual Override)
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

    // --- ARTIFACTS (DOCUMENTS) ---
    getArtifacts: async (dealId?: string): Promise<DealArtifact[]> => {
        const sb = getSupabase();
        if (sb) {
            let query = sb.from('deal_artifacts').select('*');
            if (dealId) query = query.eq('dealId', dealId);
            
            const { data, error } = await query;
            if (!error && data) return data as DealArtifact[];
            console.error("Supabase Error (Artifacts):", error);
        }
        const all = parseLocal<DealArtifact[]>(KEYS.ARTIFACTS, []);
        return dealId ? all.filter(a => a.dealId === dealId) : all;
    },

    saveArtifact: async (artifact: DealArtifact) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('deal_artifacts').upsert(artifact);
            if (error) console.error("Supabase Artifact Save Error:", error);
        } else {
            const all = parseLocal<DealArtifact[]>(KEYS.ARTIFACTS, []);
            const index = all.findIndex(a => a.id === artifact.id);
            if (index >= 0) all[index] = artifact;
            else all.push(artifact);
            localStorage.setItem(KEYS.ARTIFACTS, JSON.stringify(all));
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

    // --- OUTREACH LEADS (NEW) ---
    getOutreachLeads: async (): Promise<OutreachLead[]> => {
        const sb = getSupabase();
        if (sb) {
            const { data, error } = await sb.from('outreach_leads').select('*').order('created_at', { ascending: false });
            if (!error && data) return data as OutreachLead[];
        }
        return parseLocal<OutreachLead[]>(KEYS.LEADS, []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    saveOutreachLead: async (lead: OutreachLead) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('outreach_leads').upsert(lead);
            if (error) console.error("Supabase Save Lead Error:", error);
        } else {
            const current = parseLocal<OutreachLead[]>(KEYS.LEADS, []);
            const index = current.findIndex(l => l.id === lead.id);
            if (index >= 0) current[index] = lead;
            else current.push(lead);
            localStorage.setItem(KEYS.LEADS, JSON.stringify(current));
        }
    },

    saveOutreachLeadsBulk: async (leads: OutreachLead[]) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('outreach_leads').upsert(leads);
            if (error) {
                console.error("Supabase Bulk Save Error:", error);
                throw error; // Throw to caller to handle
            }
        } else {
            const current = parseLocal<OutreachLead[]>(KEYS.LEADS, []);
            // Merge arrays (inefficient but okay for local storage scale)
            const newLeads = [...current];
            leads.forEach(lead => {
                const index = newLeads.findIndex(l => l.id === lead.id);
                if (index >= 0) newLeads[index] = lead;
                else newLeads.push(lead);
            });
            localStorage.setItem(KEYS.LEADS, JSON.stringify(newLeads));
        }
    },

    deleteOutreachLead: async (id: string) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('outreach_leads').delete().eq('id', id);
        } else {
            const current = parseLocal<OutreachLead[]>(KEYS.LEADS, []);
            localStorage.setItem(KEYS.LEADS, JSON.stringify(current.filter(l => l.id !== id)));
        }
    },

    // --- BULK OPERATIONS ---
    
    // table: 'deals' | 'projects' | 'marketing_tasks' | 'deal_artifacts' | 'outreach_leads'
    clearTable: async (table: string): Promise<boolean> => {
        const sb = getSupabase();
        if (sb) {
            // Delete all rows where ID is not empty string (effective truncate)
            const { error } = await sb.from(table).delete().neq('id', 'PLACEHOLDER_ZERO'); 
            if (error) {
                console.error(`Error clearing table ${table}:`, error);
                return false;
            }
            return true;
        } else {
            const map: Record<string, string> = {
                'deals': KEYS.DEALS,
                'projects': KEYS.PROJECTS,
                'marketing_tasks': KEYS.MARKETING,
                'deal_artifacts': KEYS.ARTIFACTS,
                'outreach_leads': KEYS.LEADS
            };
            if (map[table]) {
                localStorage.removeItem(map[table]);
                return true;
            }
            return false;
        }
    },

    // --- UTILS ---
    getFullBackup: () => ({
        deals: parseLocal(KEYS.DEALS, []),
        projects: parseLocal(KEYS.PROJECTS, []),
        marketing: parseLocal(KEYS.MARKETING, []),
        artifacts: parseLocal(KEYS.ARTIFACTS, []),
        outreach_leads: parseLocal(KEYS.LEADS, []),
        timestamp: new Date().toISOString(),
        version: '1.1'
    }),

    clearLocalData: () => {
        localStorage.removeItem(KEYS.DEALS);
        localStorage.removeItem(KEYS.PROJECTS);
        localStorage.removeItem(KEYS.MARKETING);
        localStorage.removeItem(KEYS.ARTIFACTS);
        localStorage.removeItem(KEYS.LEADS);
    }
};
