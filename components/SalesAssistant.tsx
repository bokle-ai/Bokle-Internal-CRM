
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateSalesScript } from '../services/geminiService';
import { ClientStage, IntegrationState } from '../types';
import { Loader2, PhoneCall, Copy, Check } from 'lucide-react';

interface SalesAssistantProps {
    integrations?: IntegrationState;
}

const SalesAssistant: React.FC<SalesAssistantProps> = ({ integrations }) => {
    // Meeting Mode State
    const [clientType, setClientType] = useState('');
    const [problem, setProblem] = useState('');
    const [stage, setStage] = useState<ClientStage>(ClientStage.FIRST_CALL);
    
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setOutput('');
        
        try {
            const result = await generateSalesScript(clientType, problem, stage);
            setOutput(result);
        } catch (error) {
            console.error(error);
            setOutput("Failed to generate script.");
        }
        setLoading(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#373737]">Call Assistant</h2>
                    <p className="text-gray-500">Prepare scripts, questions, and objection handling for your meetings.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-[#15621B]">Call Details</h3>
                    
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">What type of client?</label>
                            <input type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] outline-none text-black" placeholder="e.g., SME Retail Owner" value={clientType} onChange={(e) => setClientType(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">One-line Problem?</label>
                            <input type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] outline-none text-black" placeholder="e.g., Losing leads on WhatsApp" value={problem} onChange={(e) => setProblem(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Stage</label>
                            <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] outline-none text-black bg-white" value={stage} onChange={(e) => setStage(e.target.value as ClientStage)}>
                                {Object.values(ClientStage).map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[#15621B] text-white py-2 px-4 rounded-md font-medium hover:bg-[#0e4412] transition-colors flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <PhoneCall size={20} />}
                            Generate Script
                        </button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-[#15621B]">Assistant Guidance</h3>
                        {output && (
                            <button 
                                onClick={() => handleCopy(output)}
                                className="text-gray-400 hover:text-[#15621B] transition-colors"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                            </button>
                        )}
                    </div>
                    
                    {output ? (
                        <div className="prose prose-sm prose-headings:text-[#373737] prose-a:text-[#15621B] text-gray-800 max-w-none overflow-y-auto max-h-[600px] pr-2 flex-1">
                            <ReactMarkdown>{output}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[300px]">
                            <PhoneCall size={48} className="mb-4 opacity-20" />
                            <p className="text-center max-w-xs">Enter details to get your call strategy.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesAssistant;
