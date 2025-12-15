
import React, { useEffect, useState } from 'react';
import { Mail, Linkedin, CheckCircle2, AlertCircle, Key, Trash2, Database, Download, RefreshCw, Cloud } from 'lucide-react';
import { IntegrationState } from '../types';
import { getStoredApiKey, removeApiKey, saveApiKey, checkConfiguration } from '../services/geminiService';
import { DataService, getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from '../services/storageService';

interface IntegrationsProps {
    integrations: IntegrationState;
    setIntegrations: React.Dispatch<React.SetStateAction<IntegrationState>>;
}

const Integrations: React.FC<IntegrationsProps> = ({ integrations, setIntegrations }) => {
    
    // API Key State
    const [storedKey, setStoredKey] = useState<string | null>(null);
    const [newKey, setNewKey] = useState('');
    const [isEnvKeyPresent, setIsEnvKeyPresent] = useState(false);

    // Supabase State
    const [sbUrl, setSbUrl] = useState('');
    const [sbKey, setSbKey] = useState('');
    const [isSbConfigured, setIsSbConfigured] = useState(false);
    const [showSql, setShowSql] = useState(false);

    useEffect(() => {
        setStoredKey(getStoredApiKey());
        const isConfigured = checkConfiguration();
        const local = getStoredApiKey();
        if (isConfigured && !local) {
            setIsEnvKeyPresent(true);
        }

        // Check Supabase
        const sbConf = getSupabaseConfig();
        if (sbConf.url && sbConf.key) {
            setIsSbConfigured(true);
            setSbUrl(sbConf.url);
            // Don't show key for security visual
            setSbKey('••••••••••••••••••••••••••••••••');
        }
    }, []);

    const toggleIntegration = (platform: 'gmail' | 'linkedin') => {
        setIntegrations(prev => ({ ...prev, [platform]: !prev[platform] }));
    };

    const handleSaveKey = () => {
        if (!newKey.trim()) return;
        saveApiKey(newKey);
        setStoredKey(newKey);
        setNewKey('');
    };

    const handleRemoveKey = () => {
        removeApiKey();
        setStoredKey(null);
        if (checkConfiguration()) setIsEnvKeyPresent(true); else setIsEnvKeyPresent(false);
    };

    const handleSaveSupabase = () => {
        if (!sbUrl.trim() || !sbKey.trim()) return;
        if (sbKey.includes('•••')) { 
            // Prevent saving masked key
            return; 
        }
        saveSupabaseConfig(sbUrl, sbKey);
        setIsSbConfigured(true);
        window.location.reload(); // Force reload to init supabase client
    };

    const handleRemoveSupabase = () => {
        clearSupabaseConfig();
        setIsSbConfigured(false);
        setSbUrl('');
        setSbKey('');
        window.location.reload();
    };

    const handleDownloadBackup = () => {
        const data = DataService.getFullBackup();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bokle_crm_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleResetData = () => {
        if (window.confirm("Are you sure? This will delete all Deals, Projects, and Tasks locally.")) {
            DataService.clearLocalData();
            window.location.reload(); 
        }
    };

    const setupSQL = `
-- Run this in Supabase SQL Editor to create your tables

-- 1. DEALS TABLE
create table public.deals (
  "id" text primary key,
  "clientName" text,
  "value" text,
  "service" text,
  "status" text,
  "lastContact" text,
  "problemStatement" text,
  "notes" text,
  "industry" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROJECTS TABLE
create table public.projects (
  "id" text primary key,
  "clientName" text,
  "featureSummary" text,
  "deadline" text,
  "status" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. MARKETING TABLE
create table public.marketing_tasks (
  "id" text primary key,
  "title" text,
  "contentType" text,
  "platform" text,
  "status" text,
  "dueDate" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ARTIFACTS TABLE (For Saved Documents)
create table public.deal_artifacts (
  "id" text primary key,
  "dealId" text,
  "stage" text,
  "title" text,
  "content" text,
  "lastUpdated" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ENABLE ACCESS (Row Level Security)
alter table public.deals enable row level security;
alter table public.projects enable row level security;
alter table public.marketing_tasks enable row level security;
alter table public.deal_artifacts enable row level security;

-- 6. ALLOW PUBLIC ACCESS (For this internal tool)
-- Note: In a real production app with multiple users, you would restrict this.
create policy "Enable all access" on public.deals for all using (true) with check (true);
create policy "Enable all access" on public.projects for all using (true) with check (true);
create policy "Enable all access" on public.marketing_tasks for all using (true) with check (true);
create policy "Enable all access" on public.deal_artifacts for all using (true) with check (true);
    `.trim();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Integrations & Settings</h2>
                <p className="text-gray-500">Connect your accounts and manage your database.</p>
            </div>

            {/* Supabase Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                        <Cloud size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Supabase Cloud Database</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Connect a free Supabase project to sync your CRM data across devices.
                        </p>

                        {!isSbConfigured ? (
                            <div className="space-y-3 max-w-lg">
                                <input 
                                    className="w-full p-2 border border-gray-300 rounded text-sm" 
                                    placeholder="Project URL (https://xyz.supabase.co)"
                                    value={sbUrl} onChange={e => setSbUrl(e.target.value)}
                                />
                                <input 
                                    type="password"
                                    className="w-full p-2 border border-gray-300 rounded text-sm" 
                                    placeholder="Anon Public Key"
                                    value={sbKey} onChange={e => setSbKey(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSaveSupabase}
                                        className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700"
                                    >
                                        Connect
                                    </button>
                                    <button 
                                        onClick={() => setShowSql(!showSql)}
                                        className="text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-100 underline"
                                    >
                                        {showSql ? 'Hide SQL' : 'View SQL Setup Code'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-green-50 p-4 rounded-md border border-green-200">
                                <CheckCircle2 className="text-green-600" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-green-800">Connected to Supabase</h4>
                                    <p className="text-xs text-green-700">Data is being synced to the cloud.</p>
                                </div>
                                <button onClick={handleRemoveSupabase} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={18} /></button>
                            </div>
                        )}

                        {showSql && (
                            <div className="mt-4 bg-gray-900 p-4 rounded-md overflow-x-auto relative">
                                <button 
                                    onClick={() => navigator.clipboard.writeText(setupSQL)}
                                    className="absolute top-2 right-2 text-xs bg-white/10 text-white px-2 py-1 rounded hover:bg-white/20"
                                >
                                    Copy
                                </button>
                                <pre className="text-xs text-green-400 font-mono">{setupSQL}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* API Key Management Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                        <Key size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Gemini API Key</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Required for AI features.
                        </p>

                        <div className="flex flex-col gap-3">
                            {isEnvKeyPresent && (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200 w-fit">
                                    <CheckCircle2 size={16} />
                                    <span>Active via Environment Variable</span>
                                </div>
                            )}

                            {storedKey ? (
                                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-md border border-gray-200">
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">Stored in Browser</div>
                                        <div className="font-mono text-sm text-gray-800">
                                            {storedKey.substring(0, 8)}...{storedKey.substring(storedKey.length - 4)}
                                        </div>
                                    </div>
                                    <button onClick={handleRemoveKey} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={18} /></button>
                                </div>
                            ) : !isEnvKeyPresent && (
                                <div className="flex gap-2">
                                    <input 
                                        type="password"
                                        placeholder="Paste API Key (AIza...)"
                                        className="flex-1 p-2 border border-gray-300 rounded-md outline-none text-sm"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleSaveKey}
                                        disabled={!newKey}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-bold"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Local Backup Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                        <Database size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Local Data & Backup</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Manage the data stored in your browser (if not using Supabase).
                        </p>
                        
                        <div className="flex gap-3">
                            <button onClick={handleDownloadBackup} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700">
                                <Download size={16} /> Download Backup
                            </button>
                            <button onClick={handleResetData} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 text-sm font-medium">
                                <RefreshCw size={16} /> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Integrations;
