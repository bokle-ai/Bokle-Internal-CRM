import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { explainService } from '../services/geminiService';
import { Loader2, Sparkles } from 'lucide-react';

const SERVICES = [
    "AI Sales Assistant (Chatbot)",
    "Lead Scoring Model",
    "WhatsApp/Email Follow-up Agent",
    "Automated Product Description Generator",
    "Dynamic Pricing Engine",
    "Customer Review Sentiment Analysis",
    "Cold Email Generator",
    "Custom AI Agent"
];

const ServiceExplainer: React.FC = () => {
    const [selectedService, setSelectedService] = useState(SERVICES[0]);
    const [clientContext, setClientContext] = useState('');
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExplain = async () => {
        if (!clientContext) return;
        setLoading(true);
        const result = await explainService(selectedService, clientContext);
        setExplanation(result);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Service Explainer</h2>
                <p className="text-gray-500">Translate complex tech into simple business value. No jargon.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service to Explain</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] focus:border-transparent outline-none text-black bg-white"
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                        >
                            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Who is the client?</label>
                        <input
                            type="text"
                            placeholder="e.g. Non-tech owner of a shoe store"
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] focus:border-transparent outline-none text-black"
                            value={clientContext}
                            onChange={(e) => setClientContext(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleExplain}
                            disabled={loading || !clientContext}
                            className="w-full md:w-auto bg-[#FBEFD0] text-[#15621B] py-2 px-6 rounded-md font-bold hover:bg-[#f5e6b5] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            Simplify
                        </button>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    {explanation ? (
                         <div className="prose prose-sm prose-headings:text-[#373737] text-gray-800 max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <ReactMarkdown>{explanation}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-12">
                            Select a service and context to get a jargon-free pitch.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceExplainer;