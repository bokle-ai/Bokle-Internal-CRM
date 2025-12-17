
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateOutreachSequence, researchCompany, refineOutreachSequence } from '../services/geminiService';
import { DataService } from '../services/storageService';
import { IntegrationState, OutreachLead, Deal } from '../types';
import { Loader2, Mail, Linkedin, Copy, Check, Upload, Send, Search, Sparkles, User, RefreshCw, X, MessageSquare, ArrowRight, Briefcase, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

type Mode = 'generator' | 'manager';

interface SalesOutreachProps {
    integrations?: IntegrationState;
}

const REFINEMENT_SUGGESTIONS = ["Make it shorter", "More casual tone", "Focus on value prop", "Translate to Spanish"];

const SalesOutreach: React.FC<SalesOutreachProps> = ({ integrations }) => {
    const [mode, setMode] = useState<Mode>('manager');
    
    // --- MODE: SINGLE GENERATOR ---
    const [genName, setGenName] = useState('');
    const [genRole, setGenRole] = useState('');
    const [genCompany, setGenCompany] = useState('');
    const [genPain, setGenPain] = useState('');
    const [genOutput, setGenOutput] = useState('');
    const [genLoading, setGenLoading] = useState(false);
    
    // --- MODE: LEAD MANAGER ---
    const [leads, setLeads] = useState<OutreachLead[]>([]);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    
    // Action States
    const [isProcessingAction, setIsProcessingAction] = useState(false);
    const [editingSequence, setEditingSequence] = useState(false);
    const [tempSequence, setTempSequence] = useState('');

    // Chat / Refinement State
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [isRefining, setIsRefining] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Shared: Email Modal
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailDraft, setEmailDraft] = useState({ to: '', subject: '', body: '' });

    // Load Leads on Mount
    useEffect(() => {
        loadLeads();
    }, []);

    // Scroll chat on update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isRefining]);

    const loadLeads = async () => {
        setIsLoadingLeads(true);
        const data = await DataService.getOutreachLeads();
        setLeads(data);
        setIsLoadingLeads(false);
    };

    // --- CSV IMPORT ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            const headers = lines[0].toLowerCase().split(',');
            
            const nameIdx = headers.findIndex(h => h.includes('name'));
            const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('account'));
            const roleIdx = headers.findIndex(h => h.includes('title') || h.includes('role') || h.includes('position'));
            const emailIdx = headers.findIndex(h => h.includes('email'));
            const webIdx = headers.findIndex(h => h.includes('web') || h.includes('url') || h.includes('linkedin'));

            setIsImporting(true);
            
            const newLeads: OutreachLead[] = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const simpleValues = lines[i].split(',');
                const vals = values.length > simpleValues.length ? values : simpleValues;

                const name = (vals[nameIdx]?.replace(/['"]+/g, '') || "Unknown").trim();
                
                if (name && name !== "Unknown") {
                    const newLead: OutreachLead = {
                        id: `lead_${Date.now()}_${i}`,
                        name: name,
                        company: (vals[companyIdx]?.replace(/['"]+/g, '') || "Unknown Company").trim(),
                        role: (vals[roleIdx]?.replace(/['"]+/g, '') || "Unknown Role").trim(),
                        email: (vals[emailIdx]?.replace(/['"]+/g, '') || "").trim(),
                        website: (vals[webIdx]?.replace(/['"]+/g, '') || "").trim(),
                        status: 'New',
                        createdAt: new Date().toISOString()
                    };
                    newLeads.push(newLead);
                }
            }
            
            if (newLeads.length > 0) {
                try {
                    await DataService.saveOutreachLeadsBulk(newLeads);
                    await loadLeads();
                } catch (error) {
                    console.error("CSV Import Error", error);
                    alert("Import Failed: If using Supabase, please run the SQL setup query in Integrations tab.");
                }
            }
            
            setIsImporting(false);
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    // --- ACTIONS ---
    const selectedLead = leads.find(l => l.id === selectedLeadId);

    const handleGenerateForLead = async (lead: OutreachLead) => {
        setIsProcessingAction(true);
        setChatHistory([]); // Reset chat for new generation
        try {
            let pain = lead.painPoint;
            if (!pain && lead.website) {
                 const res = await researchCompany(lead.website);
                 pain = res.painPoint || "Generic Growth";
            } else if (!pain) {
                pain = "Manual Sales processes";
            }

            const seq = await generateOutreachSequence(lead.name, lead.role, lead.company, pain);
            
            const updatedLead: OutreachLead = {
                ...lead,
                painPoint: pain,
                generatedSequence: seq,
                status: 'Generated'
            };
            
            await DataService.saveOutreachLead(updatedLead);
            setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
            setChatHistory([{ role: 'ai', text: 'Sequence generated based on role & company.' }]);
        } catch (e) {
            console.error("Gen Error", e);
            alert("Failed to generate sequence");
        } finally {
            setIsProcessingAction(false);
        }
    };

    const runRefinement = async (text: string) => {
        if (!selectedLead || !text.trim()) return;

        setIsRefining(true);
        setChatHistory(prev => [...prev, { role: 'user', text: text }]);
        const oldSequence = selectedLead.generatedSequence || '';

        try {
            const refined = await refineOutreachSequence(oldSequence, text);
            
            const updatedLead: OutreachLead = { ...selectedLead, generatedSequence: refined };
            await DataService.saveOutreachLead(updatedLead);
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
            
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Sequence updated.' }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Failed to refine sequence.' }]);
        } finally {
            setIsRefining(false);
            setChatInput('');
        }
    }

    const handleRefineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runRefinement(chatInput);
    };

    const handleConvertToDeal = async () => {
        if (!selectedLead) return;
        if (!window.confirm(`Create a Deal for ${selectedLead.company} in the CRM?`)) return;

        const newDeal: Deal = {
            id: `deal_${Date.now()}`,
            clientName: selectedLead.company,
            value: '$0',
            service: 'Pending',
            status: 'Discovery', 
            lastContact: 'Today',
            notes: `Converted from Outreach Lead. Contact: ${selectedLead.name} (${selectedLead.role}). Pain: ${selectedLead.painPoint}`,
            problemStatement: selectedLead.painPoint
        };

        await DataService.saveDeal(newDeal);
        
        const updatedLead: OutreachLead = { ...selectedLead, status: 'Contacted' };
        await DataService.saveOutreachLead(updatedLead);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));

        alert("Deal created in CRM Pipeline!");
    };

    const handleSaveSequence = async () => {
        if (!selectedLead) return;
        const updatedLead: OutreachLead = { ...selectedLead, generatedSequence: tempSequence };
        await DataService.saveOutreachLead(updatedLead);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
        setEditingSequence(false);
    };

    const handleDeleteLead = async (id: string) => {
        if(window.confirm("Delete this lead?")) {
            await DataService.deleteOutreachLead(id);
            if (selectedLeadId === id) setSelectedLeadId(null);
            setLeads(prev => prev.filter(l => l.id !== id));
        }
    };

    const openLinkedIn = () => {
        if (!selectedLead) return;
        // Check if website looks like linkedin
        if (selectedLead.website && selectedLead.website.includes('linkedin.com')) {
            window.open(selectedLead.website, '_blank');
        } else {
            // Search by name and company
            const query = encodeURIComponent(`${selectedLead.name} ${selectedLead.company} linkedin`);
            window.open(`https://www.linkedin.com/search/results/all/?keywords=${query}`, '_blank');
        }
    };

    const initiateEmail = (content: string, prospectEmail: string = "") => {
        let subject = "Quick question";
        let body = content;

        const subjectMatch = content.match(/\*\*Subject\*\*:(.*?)(\n|$)/i) || content.match(/Subject:(.*?)(\n|$)/i);
        if (subjectMatch) {
            subject = subjectMatch[1].trim();
            body = content.replace(subjectMatch[0], '').trim();
        }

        setEmailDraft({
            to: prospectEmail,
            subject: subject,
            body: body
        });
        setShowEmailModal(true);
    };

    const sendEmail = async (method: 'default' | 'gmail') => {
        const { to, subject, body } = emailDraft;
        
        if (method === 'gmail') {
            const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.open(gmailUrl, '_blank');
        } else {
            const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        }

        if (selectedLead) {
            const updated: OutreachLead = { ...selectedLead, status: 'Contacted' };
            await DataService.saveOutreachLead(updated);
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
        }

        setShowEmailModal(false);
    };

    // --- PARSING LOGIC ---
    const renderParsedSequence = (fullText: string) => {
        // Fallback for unstructured text
        if (!fullText.includes("## Step")) {
            return (
                <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown>{fullText}</ReactMarkdown>
                </div>
            );
        }

        // Split by Steps
        const steps = fullText.split(/## Step \d+:/).filter(s => s.trim().length > 0);
        const headers = fullText.match(/## Step \d+: (.*?)(\n|$)/g) || [];

        return (
            <div className="space-y-4">
                {steps.map((stepContent, idx) => {
                    const header = headers[idx]?.replace(/## Step \d+: /, '').trim() || `Step ${idx + 1}`;
                    const isEmail = header.toLowerCase().includes('email');
                    const isLinkedIn = header.toLowerCase().includes('linkedin');

                    return (
                        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                <h5 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                    <span className="bg-[#15621B] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">{idx + 1}</span>
                                    {header}
                                </h5>
                                <div className="flex gap-2">
                                    {isEmail && (
                                        <button 
                                            onClick={() => initiateEmail(stepContent, selectedLead?.email)}
                                            className="text-xs flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-700 font-medium"
                                        >
                                            <Mail size={12} /> Send Draft
                                        </button>
                                    )}
                                    {isLinkedIn && (
                                        <button 
                                            onClick={openLinkedIn}
                                            className="text-xs flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 text-blue-700 font-medium"
                                        >
                                            <Linkedin size={12} /> Open Profile
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(stepContent.trim())}
                                        className="text-xs flex items-center gap-1 bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-700 font-medium"
                                    >
                                        <Copy size={12} /> Copy
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                <ReactMarkdown>{stepContent}</ReactMarkdown>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- RENDER HELPERS ---
    const filteredLeads = leads.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-[#373737]">Sales Outreach</h2>
                    <p className="text-gray-500">Manage your pipeline and generate AI sequences.</p>
                </div>
                
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button onClick={() => setMode('manager')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'manager' ? 'bg-white text-[#15621B] shadow-sm' : 'text-gray-600'}`}>
                        Lead Manager (Bulk)
                    </button>
                    <button onClick={() => setMode('generator')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mode === 'generator' ? 'bg-white text-[#15621B] shadow-sm' : 'text-gray-600'}`}>
                        Quick Generator
                    </button>
                </div>
            </div>

            {mode === 'manager' ? (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* LEFT: LIST */}
                    <div className="w-1/3 bg-white rounded-xl border border-gray-200 flex flex-col shadow-sm">
                        <div className="p-4 border-b border-gray-100 flex gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                                <input 
                                    className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#15621B]"
                                    placeholder="Search leads..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <label className="bg-[#15621B] hover:bg-[#0e4412] text-white p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center min-w-[40px]">
                                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                            </label>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto">
                            {isLoadingLeads ? (
                                <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" />Loading...</div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    No leads found. <br/> Upload a CSV to get started.
                                </div>
                            ) : (
                                filteredLeads.map(lead => (
                                    <button
                                        key={lead.id}
                                        onClick={() => {
                                            setSelectedLeadId(lead.id);
                                            setEditingSequence(false);
                                            setChatHistory([]);
                                        }}
                                        className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex justify-between items-center group ${selectedLeadId === lead.id ? 'bg-blue-50/50 border-l-4 border-l-[#15621B]' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-bold text-gray-900 text-sm truncate">{lead.name}</div>
                                            <div className="text-xs text-gray-500 truncate">{lead.company}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             {lead.status === 'New' && <span className="w-2 h-2 rounded-full bg-red-400" title="New" />}
                                             {lead.status === 'Generated' && <span className="w-2 h-2 rounded-full bg-blue-400" title="Ready" />}
                                             {lead.status === 'Contacted' && <Check size={14} className="text-green-600" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-2 border-t border-gray-100 text-xs text-center text-gray-400">
                            {filteredLeads.length} Leads
                        </div>
                    </div>

                    {/* RIGHT: DETAIL */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        {selectedLead ? (
                            <>
                                {/* Lead Header & Actions */}
                                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-start shrink-0">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedLead.name}</h3>
                                        <div className="text-gray-600 text-sm font-medium flex items-center gap-2 mt-1">
                                            {selectedLead.role} <span className="text-gray-300">|</span> {selectedLead.company}
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                            {selectedLead.email && <span className="flex items-center gap-1"><Mail size={12} /> {selectedLead.email}</span>}
                                            {selectedLead.status === 'Contacted' && <span className="text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full">Contacted</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleConvertToDeal}
                                            className="bg-white border border-green-200 text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                                        >
                                            <Briefcase size={14} /> Convert to Deal
                                        </button>
                                        <button onClick={() => handleDeleteLead(selectedLead.id)} className="text-gray-400 hover:text-red-500 p-2"><X size={18} /></button>
                                    </div>
                                </div>

                                {/* Main Content Split: Sequence (Top) & Chat (Bottom) */}
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    
                                    {selectedLead.status === 'New' && !selectedLead.generatedSequence ? (
                                         <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                            <Sparkles className="text-[#15621B] mb-4 opacity-80" size={48} />
                                            <h4 className="font-bold text-gray-800 text-lg mb-2">Generate Sequence</h4>
                                            <p className="text-gray-500 max-w-sm mb-6">Create a personalized 4-step outreach plan for {selectedLead.name}.</p>
                                            <button 
                                                onClick={() => handleGenerateForLead(selectedLead)}
                                                disabled={isProcessingAction}
                                                className="bg-[#15621B] text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-[#0e4412] transition-colors disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {isProcessingAction ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
                                                Generate
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Top: The Generated Sequence */}
                                            <div className="flex-1 overflow-y-auto p-6 border-b border-gray-100 bg-gray-50/30">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Outreach Steps</h4>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        {!editingSequence ? (
                                                            <button 
                                                                onClick={() => {
                                                                    setTempSequence(selectedLead.generatedSequence || '');
                                                                    setEditingSequence(true);
                                                                }}
                                                                className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded font-medium shadow-sm"
                                                            >
                                                                Edit Raw Text
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={handleSaveSequence}
                                                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold"
                                                            >
                                                                Save
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {editingSequence ? (
                                                    <textarea 
                                                        className="w-full h-96 p-4 border border-gray-300 rounded-lg outline-none focus:border-[#15621B] resize-none font-mono text-sm bg-white"
                                                        value={tempSequence}
                                                        onChange={e => setTempSequence(e.target.value)}
                                                    />
                                                ) : (
                                                    renderParsedSequence(selectedLead.generatedSequence || '')
                                                )}
                                            </div>

                                            {/* Bottom: Refinement Chat */}
                                            <div className="h-48 bg-gray-50 flex flex-col shrink-0 border-t border-gray-200">
                                                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-white">
                                                    <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                        <MessageSquare size={14} /> AI Refinement
                                                    </span>
                                                    <div className="flex gap-2 overflow-x-auto">
                                                        {REFINEMENT_SUGGESTIONS.map(s => (
                                                            <button 
                                                                key={s}
                                                                onClick={() => runRefinement(s)}
                                                                className="text-[10px] bg-gray-100 hover:bg-[#15621B] hover:text-white px-2 py-1 rounded-full border border-gray-200 transition-colors whitespace-nowrap"
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                                    {chatHistory.map((msg, idx) => (
                                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`
                                                                max-w-[85%] px-3 py-2 rounded-lg text-xs
                                                                ${msg.role === 'user' ? 'bg-[#15621B] text-white' : 'bg-white border border-gray-200 text-gray-700'}
                                                            `}>
                                                                {msg.text}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div ref={chatEndRef} />
                                                </div>
                                                <div className="p-3 bg-white border-t border-gray-200">
                                                    <form onSubmit={handleRefineSubmit} className="relative">
                                                        <input 
                                                            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#15621B] bg-gray-50 focus:bg-white transition-colors"
                                                            placeholder="Ask to change the sequence (e.g. 'Make email 1 funnier')"
                                                            value={chatInput}
                                                            onChange={e => setChatInput(e.target.value)}
                                                            disabled={isRefining}
                                                        />
                                                        <button 
                                                            type="submit"
                                                            disabled={!chatInput.trim() || isRefining}
                                                            className="absolute right-2 top-2 text-[#15621B] hover:text-[#0e4412] disabled:opacity-30"
                                                        >
                                                            {isRefining ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <User size={48} className="mb-4 opacity-20" />
                                <p>Select a lead to view details.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // MODE: GENERATOR (Simplified)
                <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 space-y-4">
                        <h3 className="font-bold text-lg text-[#15621B]">Quick Generator</h3>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prospect Name</label>
                            <input className="w-full p-2 border border-gray-300 rounded focus:border-[#15621B] outline-none" value={genName} onChange={e => setGenName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company</label>
                            <input className="w-full p-2 border border-gray-300 rounded focus:border-[#15621B] outline-none" value={genCompany} onChange={e => setGenCompany(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                            <input className="w-full p-2 border border-gray-300 rounded focus:border-[#15621B] outline-none" value={genRole} onChange={e => setGenRole(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pain Point</label>
                            <input className="w-full p-2 border border-gray-300 rounded focus:border-[#15621B] outline-none" value={genPain} onChange={e => setGenPain(e.target.value)} />
                        </div>
                        <button 
                            onClick={async () => {
                                setGenLoading(true);
                                const res = await generateOutreachSequence(genName, genRole, genCompany, genPain);
                                setGenOutput(res);
                                setGenLoading(false);
                            }}
                            disabled={genLoading}
                            className="w-full bg-[#15621B] text-white py-2 rounded font-bold hover:bg-[#0e4412]"
                        >
                            {genLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-6 border border-gray-200 overflow-y-auto prose prose-sm max-w-none">
                        {genOutput ? <ReactMarkdown>{genOutput}</ReactMarkdown> : <div className="text-gray-400 text-center mt-20">Generated content will appear here</div>}
                    </div>
                </div>
            )}

             {/* Email Composer Modal */}
             {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Mail size={18} className="text-gray-500" />
                                Compose Email
                            </h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                                <input 
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none"
                                    value={emailDraft.to}
                                    onChange={e => setEmailDraft({...emailDraft, to: e.target.value})}
                                    placeholder="prospect@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                                <input 
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none font-medium"
                                    value={emailDraft.subject}
                                    onChange={e => setEmailDraft({...emailDraft, subject: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Body</label>
                                <textarea 
                                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none h-48 resize-none font-sans"
                                    value={emailDraft.body}
                                    onChange={e => setEmailDraft({...emailDraft, body: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
                            <span className="text-xs text-gray-500">Opens your default email client or Gmail web.</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => sendEmail('gmail')}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50"
                                >
                                    Open Gmail Web
                                </button>
                                <button 
                                    onClick={() => sendEmail('default')}
                                    className="px-4 py-2 bg-[#15621B] text-white font-bold rounded-lg hover:bg-[#0e4412] flex items-center gap-2"
                                >
                                    <Send size={16} /> Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesOutreach;
