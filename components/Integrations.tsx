
import React from 'react';
import { Mail, Linkedin, CheckCircle2, Link2, AlertCircle } from 'lucide-react';
import { IntegrationState } from '../types';

interface IntegrationsProps {
    integrations: IntegrationState;
    setIntegrations: React.Dispatch<React.SetStateAction<IntegrationState>>;
}

const Integrations: React.FC<IntegrationsProps> = ({ integrations, setIntegrations }) => {
    
    const toggleIntegration = (platform: 'gmail' | 'linkedin') => {
        setIntegrations(prev => ({
            ...prev,
            [platform]: !prev[platform]
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Integrations</h2>
                <p className="text-gray-500">Connect your accounts to enable one-click outreach.</p>
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
                    <h4 className="font-bold text-yellow-800 text-sm">How this works securely</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                        Bokle AI uses your browser's native capabilities to handle outreach. We do not store your passwords. 
                        "Connect" enables deep-linking features that open your local apps with pre-filled AI content.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Integrations;
