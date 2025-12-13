import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateDocument } from '../services/geminiService';
import { Loader2, FileText } from 'lucide-react';

type DocType = 'Proposal' | 'ScopeOfWork' | 'Email';

const DocumentGenerator: React.FC = () => {
    const [docType, setDocType] = useState<DocType>('Proposal');
    const [details, setDetails] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!details.trim()) return;
        
        setLoading(true);
        // Keep previous output visible or clear it? Better to clear or show loading overlay.
        // Let's clear to indicate fresh start.
        setOutput(''); 
        
        try {
            const result = await generateDocument(docType, details);
            setOutput(result);
        } catch (e) {
            console.error("Component Error:", e);
            setOutput("An unexpected error occurred while trying to generate the document.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Document Generator</h2>
                <p className="text-gray-500">Create professional proposals, SOWs, and client updates instantly.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
                    {(['Proposal', 'ScopeOfWork', 'Email'] as DocType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setDocType(type)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                docType === type
                                    ? 'bg-[#15621B] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {type === 'ScopeOfWork' ? 'Scope of Work' : type}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4 flex flex-col">
                        <label className="block text-sm font-medium text-gray-700">
                            Key Details (Client, Needs, Pricing, Timeline)
                        </label>
                        <textarea
                            className="w-full flex-1 min-h-[250px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15621B] outline-none resize-none font-mono text-sm text-black"
                            placeholder="Client: ABC Corp. Service: WhatsApp Bot. Price: $1500. Timeline: 7 days. Note: They are worried about security."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !details.trim()}
                            className="w-full bg-[#15621B] text-white py-3 rounded-lg font-bold hover:bg-[#0e4412] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <FileText />}
                            {loading ? 'Generating...' : `Generate ${docType}`}
                        </button>
                        {!details.trim() && (
                            <p className="text-xs text-amber-600">Please enter details to enable generation.</p>
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 h-[600px] overflow-y-auto relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                <Loader2 className="animate-spin text-[#15621B] mb-2" size={40} />
                                <p className="text-[#15621B] font-medium animate-pulse">Drafting your document...</p>
                            </div>
                        )}
                        
                        {output ? (
                            <div className="prose prose-sm prose-headings:text-[#15621B] text-gray-800 max-w-none">
                                <ReactMarkdown>{output}</ReactMarkdown>
                            </div>
                        ) : (
                            !loading && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <FileText size={48} className="mb-4 opacity-20" />
                                    <p>Generated document will appear here</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentGenerator;