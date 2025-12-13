
import React, { useEffect, useState } from 'react';
import { Mail, Linkedin, CheckCircle2, AlertCircle, Key, Trash2, Check } from 'lucide-react';
import { IntegrationState } from '../types';
import { getStoredApiKey, removeApiKey, saveApiKey, checkConfiguration } from '../services/geminiService';

interface IntegrationsProps {
    integrations: IntegrationState;
    setIntegrations: React.Dispatch<React.SetStateAction<IntegrationState>>;
}

const Integrations: React.FC<IntegrationsProps> = ({ integrations, setIntegrations }) => {
    
    // API Key State
    const [storedKey, setStoredKey] = useState<string | null>(null);
    const [newKey, setNewKey] = useState('');
    const [isEnvKeyPresent, setIsEnvKeyPresent] = useState(false);

    useEffect(() => {
        setStoredKey(getStoredApiKey());
        // Simple check if Env key is likely present (if configuration is true but no local key)
        const isConfigured = checkConfiguration();
        const local = getStoredApiKey();
        if (isConfigured && !local) {
            setIsEnvKeyPresent(true);
        }
    }, []);

    const toggleIntegration = (platform: 'gmail' | 'linkedin') => {
        setIntegrations(prev => ({
            ...prev,
            [platform]: !prev[platform]
        }));
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
        // If Env key exists, it will still work, but local override is gone
        if (checkConfiguration()) {
            setIsEnvKeyPresent(true);
        } else {
            setIsEnvKeyPresent(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Integrations & Settings</h2>
                <p className="text-gray-500">Connect your accounts and manage your API keys.</p>
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
                            Required for AI features. You can set this via Environment Variables (Recommended) or save it here in your browser.
                        </p>

                        {/* Status Display */}
                        <div className="flex flex-col gap-3">
                            {isEnvKeyPresent && (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200 w-fit">
                                    <CheckCircle2 size={16} />
                                    <span>Active via Environment Variable (Secure)</span>
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
                                    <button 
                                        onClick={handleRemoveKey}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remove Key"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ) : !isEnvKeyPresent && (
                                <div className="flex gap-2">
                                    <input 
                                        type="password"
                                        placeholder="Paste API Key (AIza...)"
                                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleSaveKey}
                                        disabled={!newKey}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Gmail Card */}
                <div className={`
                    relative p-8 rounded-xl border-2 transition-all
                    ${integrations.gmail ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}
                `}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                            <Mail size={32} />
                        </div>
                        {integrations.gmail && <CheckCircle2 className="text-green-600" size={24} />}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Gmail / Outlook</h3>
                    <p className="text-gray-500 text-sm mb-6 min-h-[40px]">
                        Enable "Send via Email" buttons in Sales Assistant to open drafts in your default mail client instantly.
                    </p>

                    <button
                        onClick={() => toggleIntegration('gmail')}
                        className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                            ${integrations.gmail 
                                ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50' 
                                : 'bg-[#373737] text-white hover:bg-black'}
                        `}
                    >
                        {integrations.gmail ? 'Connected' : 'Connect Email Account'}
                    </button>
                </div>

                {/* LinkedIn Card */}
                <div className={`
                    relative p-8 rounded-xl border-2 transition-all
                    ${integrations.linkedin ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
                `}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                            <Linkedin size={32} />
                        </div>
                        {integrations.linkedin && <CheckCircle2 className="text-blue-600" size={24} />}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">LinkedIn</h3>
                    <p className="text-gray-500 text-sm mb-6 min-h-[40px]">
                        Enable smart search links to find prospects and send connection requests directly from the dashboard.
                    </p>

                    <button
                        onClick={() => toggleIntegration('linkedin')}
                        className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                            ${integrations.linkedin 
                                ? 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50' 
                                : 'bg-[#0077b5] text-white hover:bg-[#005885]'}
                        `}
                    >
                        {integrations.linkedin ? 'Connected' : 'Connect LinkedIn'}
                    </button>
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-bold text-yellow-800 text-sm">Security Note</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                        Bokle AI uses your browser's native storage. Your API key is stored locally on your device and is never sent to our servers, only directly to Google's API.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Integrations;
