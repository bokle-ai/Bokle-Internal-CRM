
import React, { useEffect, useState } from 'react';
import { PhoneCall, Code2, CheckCircle2, Users, AlertTriangle, ExternalLink, Key, Check, Cloud, Database } from 'lucide-react';
import { checkConfiguration, saveApiKey } from '../services/geminiService';
import { DataService } from '../services/storageService';
import BrandLogo from './BrandLogo';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
    const [isConfigured, setIsConfigured] = useState(true);
    const [manualKey, setManualKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCloudActive, setIsCloudActive] = useState(false);

    useEffect(() => {
        setIsConfigured(checkConfiguration());
        setIsCloudActive(DataService.isCloudEnabled());
    }, []);

    const handleSaveKey = () => {
        if (!manualKey.trim()) return;
        setIsSaving(true);
        saveApiKey(manualKey);
        
        setTimeout(() => {
            setIsConfigured(checkConfiguration());
            setIsSaving(false);
            setManualKey('');
        }, 500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero Section with Branding */}
            <div className="bg-gradient-to-br from-[#15621B] to-[#0e4412] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                {/* Decorative Background Circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-bokle-neon/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-6">
                        <BrandLogo className="w-20 h-20 shadow-lg border-2 border-white/20 rounded-full bg-white/10 backdrop-blur-sm" />
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h1 className="text-3xl font-bold">Welcome back, Gautam.</h1>
                                <span className="text-xs font-bold bg-bokle-neon text-[#15621B] px-2 py-0.5 rounded-full uppercase tracking-wider">Founder</span>
                            </div>
                            <p className="text-[#FBEFD0] text-lg opacity-90 font-medium max-w-xl leading-relaxed">
                                Bokle AI is ready. Let's make your business glide.
                            </p>
                        </div>
                    </div>
                    
                    {isCloudActive && (
                        <div className="hidden md:flex bg-white/10 backdrop-blur-md px-5 py-3 rounded-xl items-center gap-3 border border-white/20 shadow-sm hover:bg-white/15 transition-colors cursor-default">
                            <div className="p-2 bg-bokle-neon/20 rounded-lg text-bokle-neon">
                                <Cloud size={20} />
                            </div>
                            <div className="text-sm">
                                <p className="font-bold text-white">Cloud Sync Active</p>
                                <p className="text-xs text-white/60">Data is safe on Supabase</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Config Alerts */}
            <div className="space-y-4">
                {!isConfigured && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
                        <div className="flex items-start">
                            <AlertTriangle className="text-red-500 mt-0.5 mr-3 shrink-0" size={20} />
                            <div className="w-full">
                                <h3 className="font-bold text-red-800">Gemini AI Key Missing</h3>
                                <p className="text-red-700 text-sm mt-1 mb-3">
                                    You need a Google Gemini API Key for the AI features to work.
                                </p>
                                
                                <div className="flex flex-col gap-4">
                                    <a 
                                        href="https://aistudio.google.com/app/apikey" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-red-700 text-sm font-semibold hover:underline flex items-center gap-1 w-fit"
                                    >
                                        Step 1: Get a free key from Google AI Studio <ExternalLink size={12} />
                                    </a>

                                    <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Key size={14} className="text-red-400" />
                                            </div>
                                            <input 
                                                type="password"
                                                placeholder="Paste your key here (AIza...)"
                                                className="w-full pl-9 pr-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm shadow-sm"
                                                value={manualKey}
                                                onChange={(e) => setManualKey(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveKey}
                                            disabled={!manualKey || isSaving}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                        >
                                            {isSaving ? 'Saving...' : 'Save & Enable'}
                                            {!isSaving && <Check size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {!isCloudActive && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl shadow-sm">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start">
                                <Database className="text-blue-500 mt-0.5 mr-3 shrink-0" size={20} />
                                <div>
                                    <h3 className="font-bold text-blue-800">Running in Local Mode</h3>
                                    <p className="text-blue-700 text-sm mt-1">
                                        Data is currently saved only to this browser. Connect Supabase in Integrations or Vercel Settings to sync across devices.
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setActiveTab('integrations')}
                                className="text-sm font-medium text-blue-700 underline hover:text-blue-900 whitespace-nowrap ml-4"
                            >
                                Connect Cloud
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div 
                    onClick={() => setActiveTab('crm')}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#15621B] group-hover:text-white transition-colors duration-300">
                        <Users />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#15621B]">CRM Pipeline</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Manage Leads, Deals, and Active Tech Projects.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('sales')}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-green-50 text-[#15621B] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#15621B] group-hover:text-white transition-colors duration-300">
                        <PhoneCall />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#15621B]">Prep for a Call</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Get scripts, questions, and objection handling.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('handover')}
                    className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1"
                >
                    <div className="w-12 h-12 bg-gray-100 text-[#373737] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#373737] group-hover:text-white transition-colors duration-300">
                        <Code2 />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#15621B]">Handover to Tech</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">Generate technical tickets for the dev team.</p>
                </div>
            </div>

            {/* Strategy Card */}
            <div className="bg-[#FBEFD0]/50 rounded-2xl p-6 border border-[#e6dcc0] flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                     <h3 className="font-bold text-[#15621B] flex items-center gap-2 mb-3 text-lg">
                        <CheckCircle2 size={20} />
                        Strategy Snapshot
                    </h3>
                    <div className="text-sm text-[#373737] space-y-2">
                        <p className="font-medium opacity-80">MVP Focus Areas:</p>
                        <div className="flex flex-wrap gap-2">
                            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Lead Scoring</span>
                            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Chatbots</span>
                            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Product Descriptions</span>
                        </div>
                    </div>
                </div>
                <div className="h-px w-full md:w-px md:h-auto bg-[#15621B]/10"></div>
                <div className="flex-1">
                    <h3 className="font-bold text-[#15621B] mb-3 text-lg">Value Props</h3>
                     <ul className="space-y-2 text-sm text-[#373737] font-medium">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-bokle-neon"></div> "Make Your Business Glide"</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-bokle-neon"></div> 5-7 Day Delivery (Speed is key)</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-bokle-neon"></div> Zero-Integration Headache</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
