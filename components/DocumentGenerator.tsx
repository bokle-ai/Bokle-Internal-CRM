
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateDocument } from '../services/geminiService';
import { Loader2, FileText, Save, CheckCircle2, RotateCcw } from 'lucide-react';

type DocType = 'Proposal' | 'ScopeOfWork' | 'Email';

const STORAGE_KEYS = {
    DETAILS: 'bokle_docgen_details',
    OUTPUT: 'bokle_docgen_output',
    TYPE: 'bokle_docgen_type'
};

const DocumentGenerator: React.FC = () => {
    const [docType, setDocType] = useState<DocType>('Proposal');
    const [details, setDetails] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    
    // Refs for autosave comparison
    const lastSavedDetails = useRef('');
    const lastSavedOutput = useRef('');

    // Load from Local Storage on Mount
    useEffect(() => {
        const savedDetails = localStorage.getItem(STORAGE_KEYS.DETAILS);
        const savedOutput = localStorage.getItem(STORAGE_KEYS.OUTPUT);
        const savedType = localStorage.getItem(STORAGE_KEYS.TYPE);

        if (savedDetails) {
            setDetails(savedDetails);
            lastSavedDetails.current = savedDetails;
        }
        if (savedOutput) {
            setOutput(savedOutput);
            lastSavedOutput.current = savedOutput;
        }
        if (savedType) {
            setDocType(savedType as DocType);
        }
    }, []);

    // Save Logic (Debounced)
    useEffect(() => {
        const hasChanges = details !== lastSavedDetails.current || output !== lastSavedOutput.current;
        
        if (hasChanges) {
            setSaveStatus('unsaved');
            
            const timer = setTimeout(() => {
                setSaveStatus('saving');
                localStorage.setItem(STORAGE_KEYS.DETAILS, details);
                localStorage.setItem(STORAGE_KEYS.OUTPUT, output);
                localStorage.setItem(STORAGE_KEYS.TYPE, docType);
                
                lastSavedDetails.current = details;
                lastSavedOutput.current = output;
                
                // Visual delay to show "Saving..." briefly
                setTimeout(() => setSaveStatus('saved'), 500);
            }, 1000); // 1s Debounce

            return () => clearTimeout(timer);
        }
    }, [details, output, docType]);

    const handleGenerate = async () => {
        if (!details.trim()) return;
        
        setLoading(true);
        // Do not clear output immediately to avoid flicker, just overwrite when done
        
        try {
            const result = await generateDocument(docType, details);
            setOutput(result);
            // Will trigger autosave via useEffect
        } catch (e) {
            console.error("Component Error:", e);
            setOutput("An unexpected error occurred while trying to generate the document.");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        if(window.confirm("Clear all text?")) {
            setDetails('');
            setOutput('');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-[#373737]">Document Generator</h2>
                    <p className="text-gray-500">Create professional proposals, SOWs, and client updates instantly.</p>
                </div>
                
                <div className="flex items-center gap-3">
                     {saveStatus === 'saving' && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 animate-pulse bg-white px-2 py-1 rounded border border-gray-100">
                            <Save size={12} /> Saving...
                        </div>
                    )}
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-1 text-xs text-green-600 bg-white px-2 py-1 rounded border border-gray-100">
                            <CheckCircle2 size={12} /> Draft Saved
                        </div>
                    )}
                    <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                        <RotateCcw size={12} /> Clear
                    </button>
                </div>
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
                    <div className="space-y-4 flex flex-col h-full">
                        <label className="block text-sm font-medium text-gray-700">
                            Key Details (Client, Needs, Pricing, Timeline)
                        </label>
                        <textarea
                            className="w-full flex-1 min-h-[300px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15621B] outline-none resize-none font-mono text-sm text-black"
                            placeholder="Client: ABC Corp. Service: WhatsApp Bot. Price: $1500. Timeline: 7 days. Note: They are worried about security."
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={loading || !details.trim()}
                            className="w-full bg-[#15621B] text-white py-3 rounded-lg font-bold hover:bg-[#0e4412] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <FileText />}
                            {loading ? 'Generating...' : `Generate ${docType}`}
                        </button>
                    </div>

                    <div className="flex flex-col h-full">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                             Result (Editable)
                        </label>
                        <div className="bg-gray-50 rounded-lg border border-gray-200 h-[600px] relative overflow-hidden flex flex-col">
                            {loading && (
                                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                    <Loader2 className="animate-spin text-[#15621B] mb-2" size={40} />
                                    <p className="text-[#15621B] font-medium animate-pulse">Drafting your document...</p>
                                </div>
                            )}
                            
                            {output ? (
                                <textarea 
                                    className="flex-1 w-full p-6 bg-transparent outline-none resize-none text-gray-800 text-sm leading-relaxed font-mono"
                                    value={output}
                                    onChange={(e) => setOutput(e.target.value)}
                                    spellCheck={false}
                                />
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
        </div>
    );
};

export default DocumentGenerator;
