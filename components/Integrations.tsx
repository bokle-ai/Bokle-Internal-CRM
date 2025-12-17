
import React, { useEffect, useState } from 'react';
import { Mail, Linkedin, CheckCircle2, AlertCircle, Key, Trash2, Database, Download, RefreshCw, Cloud, Instagram, Workflow, Image, Upload } from 'lucide-react';
import { IntegrationState } from '../types';
import { DataService, getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from '../services/storageService';

interface IntegrationsProps {
    integrations: IntegrationState;
    setIntegrations: React.Dispatch<React.SetStateAction<IntegrationState>>;
}

const Integrations: React.FC<IntegrationsProps> = ({ integrations, setIntegrations }) => {
    
    // Supabase State
    const [sbUrl, setSbUrl] = useState('');
    const [sbKey, setSbKey] = useState('');
    const [isSbConfigured, setIsSbConfigured] = useState(false);
    const [showSql, setShowSql] = useState(false);

    // Brand Logo State
    const [customLogo, setCustomLogo] = useState<string | null>(null);

    useEffect(() => {
        // Check Supabase
        const sbConf = getSupabaseConfig();
        if (sbConf.url && sbConf.key) {
            setIsSbConfigured(true);
            setSbUrl(sbConf.url);
            // Don't show key for security visual
            setSbKey('••••••••••••••••••••••••••••••••');
        }

        // Check Logo
        const logo = localStorage.getItem('bokle_brand_logo');
        if (logo) setCustomLogo(logo);

    }, []);

    const toggleIntegration = (platform: 'gmail' | 'linkedin' | 'instagram') => {
        setIntegrations(prev => ({ ...prev, [platform]: !prev[platform] }));
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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            localStorage.setItem('bokle_brand_logo', base64);
            setCustomLogo(base64);
            // Reload to update sidebar instantly
            window.location.reload();
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        localStorage.removeItem('bokle_brand_logo');
        setCustomLogo(null);
        window.location.reload();
    };

    const setupSQL = `
-- Run this in Supabase SQL Editor to create your tables.
-- This script is "Idempotent" - it is safe to run multiple times.

-- 1. DEALS TABLE (Sales CRM)
create table if not exists public.deals (
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

-- 2. PROJECTS TABLE (Tech Handover)
create table if not exists public.projects (
  "id" text primary key,
  "clientName" text,
  "featureSummary" text,
  "deadline" text,
  "status" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. MARKETING TABLE (Content Calendar)
create table if not exists public.marketing_tasks (
  "id" text primary key,
  "title" text,
  "contentType" text,
  "platform" text,
  "status" text,
  "dueDate" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ARTIFACTS TABLE (Saved Documents)
create table if not exists public.deal_artifacts (
  "id" text primary key,
  "dealId" text,
  "stage" text,
  "title" text,
  "content" text,
  "lastUpdated" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. OUTREACH LEADS TABLE (For Bulk Import & Sequences)
create table if not exists public.outreach_leads (
  "id" text primary key,
  "name" text,
  "company" text,
  "role" text,
  "email" text,
  "website" text,
  "status" text,
  "painPoint" text,
  "generatedSequence" text,
  "lastContact" text,
  "createdAt" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. ENABLE ACCESS (Row Level Security)
alter table public.deals enable row level security;
alter table public.projects enable row level security;
alter table public.marketing_tasks enable row level security;
alter table public.deal_artifacts enable row level security;
alter table public.outreach_leads enable row level security;

-- 7. ALLOW PUBLIC ACCESS (For this internal tool)
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Enable all access' and tablename = 'deals') then
    create policy "Enable all access" on public.deals for all using (true) with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Enable all access' and tablename = 'projects') then
    create policy "Enable all access" on public.projects for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Enable all access' and tablename = 'marketing_tasks') then
    create policy "Enable all access" on public.marketing_tasks for all using (true) with check (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Enable all access' and tablename = 'deal_artifacts') then
    create policy "Enable all access" on public.deal_artifacts for all using (true) with check (true);
  end if;
  
  if not exists (select 1 from pg_policies where policyname = 'Enable all access' and tablename = 'outreach_leads') then
    create policy "Enable all access" on public.outreach_leads for all using (true) with check (true);
  end if;
end
$$;
    `.trim();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Integrations & Settings</h2>
                <p className="text-gray-600 font-medium">Connect your accounts and manage your database.</p>
            </div>

             {/* Brand Settings */}
             <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-lg flex items-center justify-center shrink-0">
                        <Image size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Brand Settings</h3>
                        <p className="text-gray-700 text-sm mb-4 font-medium">
                            Upload your custom logo to display in the sidebar and dashboard.
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                                {customLogo ? (
                                    <img src={customLogo} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-gray-400 font-medium">No Logo</span>
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center gap-2">
                                    <Upload size={16} />
                                    Upload Logo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                                {customLogo && (
                                    <button 
                                        onClick={handleRemoveLogo}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium text-left"
                                    >
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflow Integrations */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center shrink-0">
                        <Workflow size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Workflow Integrations</h3>
                        <p className="text-gray-700 text-sm mb-4 font-medium">
                            Enable quick actions for your sales outreach.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Gmail */}
                            <button 
                                onClick={() => toggleIntegration('gmail')}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    integrations.gmail 
                                        ? 'bg-red-50 border-red-200 text-red-900' 
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${integrations.gmail ? 'bg-red-100' : 'bg-gray-100'}`}>
                                    <Mail size={16} className={integrations.gmail ? 'text-red-600' : 'text-gray-400'} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold">Gmail / Email</div>
                                    <div className="text-xs">{integrations.gmail ? 'Enabled' : 'Disabled'}</div>
                                </div>
                            </button>

                            {/* LinkedIn */}
                            <button 
                                onClick={() => toggleIntegration('linkedin')}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    integrations.linkedin 
                                        ? 'bg-blue-50 border-blue-200 text-blue-900' 
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${integrations.linkedin ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <Linkedin size={16} className={integrations.linkedin ? 'text-blue-600' : 'text-gray-400'} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold">LinkedIn</div>
                                    <div className="text-xs">{integrations.linkedin ? 'Enabled' : 'Disabled'}</div>
                                </div>
                            </button>

                            {/* Instagram */}
                            <button 
                                onClick={() => toggleIntegration('instagram')}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    integrations.instagram 
                                        ? 'bg-pink-50 border-pink-200 text-pink-900' 
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${integrations.instagram ? 'bg-pink-100' : 'bg-gray-100'}`}>
                                    <Instagram size={16} className={integrations.instagram ? 'text-pink-600' : 'text-gray-400'} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold">Instagram</div>
                                    <div className="text-xs">{integrations.instagram ? 'Enabled' : 'Disabled'}</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Supabase Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-700 rounded-lg flex items-center justify-center shrink-0">
                        <Cloud size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Supabase Cloud Database</h3>
                        <p className="text-gray-700 text-sm mb-4 font-medium">
                            Connect a free Supabase project to sync your CRM data across devices.
                        </p>

                        {!isSbConfigured ? (
                            <div className="space-y-3 max-w-lg">
                                <input 
                                    className="w-full p-2.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-500 focus:border-green-600 outline-none" 
                                    placeholder="Project URL (https://xyz.supabase.co)"
                                    value={sbUrl} onChange={e => setSbUrl(e.target.value)}
                                />
                                <input 
                                    type="password"
                                    className="w-full p-2.5 border border-gray-300 rounded text-sm text-gray-900 placeholder:text-gray-500 focus:border-green-600 outline-none" 
                                    placeholder="Anon Public Key"
                                    value={sbKey} onChange={e => setSbKey(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleSaveSupabase}
                                        className="bg-green-700 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-800"
                                    >
                                        Connect
                                    </button>
                                    <button 
                                        onClick={() => setShowSql(!showSql)}
                                        className="text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-100 underline font-medium"
                                    >
                                        {showSql ? 'Hide SQL' : 'View SQL Setup Code'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-green-50 p-4 rounded-md border border-green-200">
                                <CheckCircle2 className="text-green-700" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-green-900">Connected to Supabase</h4>
                                    <p className="text-xs text-green-800 font-medium">Data is being synced to the cloud.</p>
                                </div>
                                <button onClick={handleRemoveSupabase} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={18} /></button>
                            </div>
                        )}

                        {showSql && (
                            <div className="mt-4 bg-gray-900 p-4 rounded-md overflow-x-auto relative">
                                <button 
                                    onClick={() => navigator.clipboard.writeText(setupSQL)}
                                    className="absolute top-2 right-2 text-xs bg-white/10 text-white px-2 py-1 rounded hover:bg-white/20 font-bold"
                                >
                                    Copy
                                </button>
                                <pre className="text-xs text-green-400 font-mono font-medium">{setupSQL}</pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Local Backup Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-700 rounded-lg flex items-center justify-center shrink-0">
                        <Database size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">Local Data & Backup</h3>
                        <p className="text-gray-700 text-sm mb-4 font-medium">
                            Manage the data stored in your browser (if not using Supabase).
                        </p>
                        
                        <div className="flex gap-3">
                            <button onClick={handleDownloadBackup} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-bold text-gray-800">
                                <Download size={16} /> Download Backup
                            </button>
                            <button onClick={handleResetData} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-md hover:bg-red-50 text-sm font-bold">
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
