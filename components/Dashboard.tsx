import React, { useEffect, useState } from 'react';
import { PhoneCall, Code2, FileText, CheckCircle2, Users, AlertTriangle, ExternalLink, Key, Check } from 'lucide-react';
import { checkConfiguration, saveApiKey } from '../services/geminiService';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
    const [isConfigured, setIsConfigured] = useState(true);
    const [manualKey, setManualKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setIsConfigured(checkConfiguration());
    }, []);

    const handleSaveKey = () => {
        if (!manualKey.trim()) return;
        setIsSaving(true);
        saveApiKey(manualKey);
        
        // Small delay for UX
        setTimeout(() => {
            setIsConfigured(checkConfiguration());
            setIsSaving(false);
            setManualKey('');
        }, 500);
    };

    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-[#15621B] to-[#1e7a25] rounded-2xl p-8 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">Welcome back, Gautam.</h1>
                <p className="text-[#FBEFD0] text-lg opacity-90">
                    Let's make Bokle AI glide today. What's on your agenda?
                </p>
            </div>

            {!isConfigured && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start">
                        <AlertTriangle className="text-red-500 mt-0.5 mr-3 shrink-0" size={20} />
                        <div className="w-full">
                            <h3 className="font-bold text-red-800">API Configuration Missing</h3>
                            <p className="text-red-700 text-sm mt-1 mb-3">
                                You need a Google Gemini API Key for the AI features to work.
                            </p>
                            
                            <div className="flex flex-col gap-4">
                                {/* Step 1: Link to Google */}
                                <a 
                                    href="https://aistudio.google.com/app/apikey" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-red-700 text-sm font-semibold hover:underline flex items-center gap-1 w-fit"
                                >
                                    Step 1: Get a free key from Google AI Studio <ExternalLink size={12} />
                                </a>

                                {/* Step 2: Input Field */}
                                <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Key size={14} className="text-red-400" />
                                        </div>
                                        <input 
                                            type="password"
                                            placeholder="Paste your key here (AIza...)"
                                            className="w-full pl-9 pr-3 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none text-sm"
                                            value={manualKey}
                                            onChange={(e) => setManualKey(e.target.value)}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSaveKey}
                                        disabled={!manualKey || isSaving}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? 'Saving...' : 'Save & Enable'}
                                        {!isSaving && <Check size={16} />}
                                    </button>
                                </div>
                                <p className="text-xs text-red-600/70">
                                    This will be saved to your browser's local storage securely.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                    onClick={() => setActiveTab('crm')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#15621B] group-hover:text-white transition-colors">
                        <Users />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">CRM Pipeline</h3>
                    <p className="text-gray-500 text-sm">Manage Leads, Deals, and Active Tech Projects.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('sales')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-green-100 text-[#15621B] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#15621B] group-hover:text-white transition-colors">
                        <PhoneCall />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Prep for a Call</h3>
                    <p className="text-gray-500 text-sm">Get scripts, questions, and objection handling.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('handover')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-gray-100 text-[#373737] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#373737] group-hover:text-white transition-colors">
                        <Code2 />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Handover to Tech</h3>
                    <p className="text-gray-500 text-sm">Generate technical tickets for the dev team.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('documents')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#FBEFD0] group-hover:text-[#15621B] transition-colors">
                        <FileText />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Create Proposal</h3>
                    <p className="text-gray-500 text-sm">Draft proposals and contracts instantly.</p>
                </div>
            </div>

            <div className="bg-[#FBEFD0] rounded-xl p-6 border border-[#e6dcc0]">
                <h3 className="font-bold text-[#15621B] flex items-center gap-2 mb-4">
                    <CheckCircle2 size={20} />
                    Quick Strategy Reminder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[#373737]">
                    <ul className="space-y-2">
                        <li className="font-semibold">MVP Focus:</li>
                        <li>1. Sales & Marketing (Lead Scoring, Chatbots)</li>
                        <li>2. Retail & E-Commerce (Product Desc, Pricing)</li>
                    </ul>
                    <ul className="space-y-2">
                        <li className="font-semibold">Bokle Value Props:</li>
                        <li>• "Make Your Business Glide"</li>
                        <li>• 5-7 Day Delivery (Speed is key)</li>
                        <li>• No complex integration needed</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;