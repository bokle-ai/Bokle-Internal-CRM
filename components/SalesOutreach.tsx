
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateOutreachSequence, researchCompany, refineOutreachSequence } from '../services/geminiService';
import { DataService } from '../services/storageService';
import { IntegrationState, OutreachLead, Deal } from '../types';
import { 
    Loader2, Mail, Linkedin, Copy, Check, Upload, Send, 
    Search, Sparkles, User, RefreshCw, X, MessageSquare, 
    ArrowRight, Briefcase, ExternalLink, ChevronDown, ChevronUp,
    Globe, Wand2, Info, Trash2, Calendar
} from 'lucide-react';

type Mode = 'generator' | 'manager';

interface SalesOutreachProps {
    integrations?: IntegrationState;
}

const REFINEMENT_SUGGESTIONS = ["Make it shorter", "More casual", "Focus on Value", "Add CTA"];

const SalesOutreach: React.FC<SalesOutreachProps> = ({ integrations }) => {
    const [mode, setMode] = useState<Mode>('manager');
    
    // --- MODE: SINGLE GENERATOR ---
    const [genUrl, setGenUrl] = useState('');
    const [genName, setGenName] = useState('');
    const [genRole, setGenRole] = useState('');
    const [genCompany, setGenCompany] = useState('');
    const [genPain, setGenPain] = useState('');
    const [genOutput, setGenOutput] = useState('');
    const [genLoading, setGenLoading] = useState(false);
    const [isResearching, setIsResearching] = useState(false);
    
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

    const handleResearch = async () => {
        const url = mode === 'generator' ? genUrl : selectedLead?.website;
        if (!url) return;
        
        setIsResearching(true);
        try {
            const result = await researchCompany(url);
            if (mode === 'generator') {
                if (result.company) setGenCompany(result.company);
                if (result.painPoint) setGenPain(result.painPoint);
            } else if (selectedLead) {
                const updatedLead: OutreachLead = {
                    ...selectedLead,
                    company: result.company || selectedLead.company,
                    painPoint: result.painPoint || selectedLead.painPoint
                };
                await DataService.saveOutreachLead(updatedLead);
                setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
            }
        } catch (e) {
            console.error("Research failed", e);
        } finally {
            setIsResearching(false);
        }
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
                    alert("Import Failed: Database check required.");
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
        setChatHistory([]);
        try {
            let pain = lead.painPoint;
            if (!pain && lead.website) {
                 const res = await researchCompany(lead.website);
                 pain = res.painPoint || "Manual workflows";
            } else if (!pain) {
                pain = "Scaling sales operations";
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
            setChatHistory([{ role: 'ai', text: 'Sequence ready. You can refine it in the side panel.' }]);
        } catch (e) {
            console.error("Gen Error", e);
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
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Failed to update.' }]);
        } finally {
            setIsRefining(false);
            setChatInput('');
        }
    }

    const handleRefineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runRefinement(chatInput);
    };

    const handleMarkContacted = async () => {
        if (!selectedLead) return;
        const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const updatedLead: OutreachLead = { 
            ...selectedLead, 
            status: 'Contacted',
            lastContact: now
        };
        await DataService.saveOutreachLead(updatedLead);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
    };

    const handleConvertToDeal = async () => {
        if (!selectedLead) return;
        if (!window.confirm(`Move ${selectedLead.company} to CRM?`)) return;

        const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const newDeal: Deal = {
            id: `deal_${Date.now()}`,
            clientName: selectedLead.company,
            value: '$0',
            service: 'Pending',
            status: 'Discovery', 
            lastContact: selectedLead.lastContact || now,
            notes: `Source: Outreach. Contact: ${selectedLead.name}.`,
            problemStatement: selectedLead.painPoint
        };

        await DataService.saveDeal(newDeal);
        const updatedLead: OutreachLead = { ...selectedLead, status: 'Contacted', lastContact: selectedLead.lastContact || now };
        await DataService.saveOutreachLead(updatedLead);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
    };

    const handleSaveSequence = async () => {
        if (!selectedLead) return;
        const updatedLead: OutreachLead = { ...selectedLead, generatedSequence: tempSequence };
        await DataService.saveOutreachLead(updatedLead);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updatedLead : l));
        setEditingSequence(false);
    };

    const handleDeleteLead = async (id: string) => {
        if(window.confirm("Delete lead?")) {
            await DataService.deleteOutreachLead(id);
            if (selectedLeadId === id) setSelectedLeadId(null);
            setLeads(prev => prev.filter(l => l.id !== id));
        }
    };

    const openLinkedIn = () => {
        if (!selectedLead) return;
        if (selectedLead.website && selectedLead.website.includes('linkedin.com')) {
            window.open(selectedLead.website, '_blank');
        } else {
            const query = encodeURIComponent(`${selectedLead.name} ${selectedLead.company} linkedin`);
            window.open(`https://www.linkedin.com/search/results/all/?keywords=${query}`, '_blank');
        }
    };

    const initiateEmail = (content: string, prospectEmail: string = "") => {
        let subject = "Bokle AI Quick Question";
        let body = content;
        const subjectMatch = content.match(/\*\*Subject\*\*:(.*?)(\n|$)/i) || content.match(/Subject:(.*?)(\n|$)/i);
        if (subjectMatch) {
            subject = subjectMatch[1].trim();
            body = content.replace(subjectMatch[0], '').trim();
        }
        setEmailDraft({ to: prospectEmail, subject, body });
        setShowEmailModal(true);
    };

    const sendEmail = async (method: 'default' | 'gmail') => {
        const { to, subject, body } = emailDraft;
        if (method === 'gmail') {
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        } else {
            window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        if (selectedLead) {
            const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const updated: OutreachLead = { ...selectedLead, status: 'Contacted', lastContact: now };
            await DataService.saveOutreachLead(updated);
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
        }
        setShowEmailModal(false);
    };

    const renderParsedSequence = (fullText: string) => {
        if (!fullText.includes("## Step")) {
            return <div className="prose prose-sm max-w-none text-gray-800 p-4"><ReactMarkdown>{fullText}</ReactMarkdown></div>;
        }
        const steps = fullText.split(/## Step \d+:/).filter(s => s.trim().length > 0);
        const headers = fullText.match(/## Step \d+: (.*?)(\n|$)/g) || [];

        return (
            <div className="space-y-4">
                {steps.map((stepContent, idx) => {
                    const header = headers[idx]?.replace(/## Step \d+: /, '').trim() || `Step ${idx + 1}`;
                    return (
                        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-[#15621B]/30 transition-colors">
                            <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h5 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                    <span className="bg-[#15621B] text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px]">{idx + 1}</span>
                                    {header}
                                </h5>
                                <div className="flex gap-1.5">
                                    <button onClick={() => navigator.clipboard.writeText(stepContent.trim())} className="p-1.5 text-gray-400 hover:text-[#15621B] hover:bg-white rounded-lg transition-all" title="Copy"><Copy size={16} /></button>
                                    {header.toLowerCase().includes('email') && (
                                        <button onClick={() => initiateEmail(stepContent, selectedLead?.email)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all" title="Draft Email"><Mail size={16} /></button>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                <ReactMarkdown>{stepContent}</ReactMarkdown>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const filteredLeads = leads.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1">
                <div>
                    <h2 className="text-2xl font-bold text-[#373737]">Sales Outreach</h2>
                    <p className="text-gray-500 font-medium">Auto-pilot sequences & lead engagement.</p>
                </div>
                
                <div className="flex bg-gray-200 p-1 rounded-xl border border-gray-300">
                    <button onClick={() => setMode('manager')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'manager' ? 'bg-white text-[#15621B] shadow-sm' : 'text-gray-600'}`}>
                        Lead Manager
                    </button>
                    <button onClick={() => setMode('generator')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'generator' ? 'bg-white text-[#15621B] shadow-sm' : 'text-gray-600'}`}>
                        Quick Draft
                    </button>
                </div>
            </div>

            {mode === 'manager' ? (
                <div className="flex-1 flex gap-6 overflow-hidden pb-4">
                    {/* LEFT: LIST */}
                    <div className="w-80 bg-white rounded-2xl border border-gray-200 flex flex-col shadow-sm shrink-0">
                        <div className="p-4 border-b border-gray-100 flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input 
                                    className="w-full pl-9 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#15621B]"
                                    placeholder="Search leads..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <label className="bg-[#15621B] hover:bg-[#0e4412] text-white p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-center shrink-0 w-9 h-9">
                                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
                            </label>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {isLoadingLeads ? (
                                <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" /></div>
                            ) : filteredLeads.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-xs">No leads. Import CSV to start.</div>
                            ) : (
                                filteredLeads.map(lead => (
                                    <button
                                        key={lead.id}
                                        onClick={() => { setSelectedLeadId(lead.id); setEditingSequence(false); setChatHistory([]); }}
                                        className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors flex justify-between items-center group ${selectedLeadId === lead.id ? 'bg-green-50/50 border-l-4 border-l-[#15621B]' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-gray-900 text-xs truncate">{lead.name}</div>
                                            <div className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-tight">{lead.company}</div>
                                            {lead.lastContact && (
                                                <div className="flex items-center gap-1 text-[9px] text-[#15621B] mt-1 font-bold">
                                                    <Calendar size={8} /> {lead.lastContact}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                             {lead.status === 'New' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" title="New" />}
                                             {lead.status === 'Generated' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Generated" />}
                                             {lead.status === 'Contacted' && <Check size={12} className="text-green-600" title="Contacted" />}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT: DETAIL (SIDE-BY-SIDE SEQUENCE & CHAT) */}
                    <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                        {selectedLead ? (
                            <>
                                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between md:items-center gap-4 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-[#15621B] font-bold text-lg shadow-sm shrink-0">
                                            {selectedLead.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{selectedLead.name}</h3>
                                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                                                {selectedLead.role} <span className="w-1 h-1 rounded-full bg-gray-300" /> {selectedLead.company}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLead.status !== 'Contacted' && (
                                            <button 
                                                onClick={handleMarkContacted}
                                                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-gray-50 transition-all"
                                            >
                                                <Check size={14} /> Mark Contacted
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleConvertToDeal}
                                            className="bg-[#15621B] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                                        >
                                            <Briefcase size={14} /> Move to CRM
                                        </button>
                                        <button onClick={() => handleDeleteLead(selectedLead.id)} className="text-gray-400 hover:text-red-500 p-2 transition-colors"><Trash2 size={18} /></button>
                                    </div>
                                </div>

                                <div className="flex-1 flex overflow-hidden">
                                    {/* SEQUENCE SECTION */}
                                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar border-r border-gray-100">
                                        {!selectedLead.generatedSequence ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4 border border-green-100">
                                                    <Sparkles size={32} className="text-[#15621B]" />
                                                </div>
                                                <h4 className="font-bold text-gray-800 text-base mb-2">Create AI Sequence</h4>
                                                <p className="text-gray-500 text-xs mb-6">Analyze this lead and generate a personalized 4-step outreach strategy.</p>
                                                
                                                {selectedLead.website && !selectedLead.painPoint && (
                                                    <button 
                                                        onClick={handleResearch}
                                                        disabled={isResearching}
                                                        className="mb-3 w-full border border-gray-300 text-gray-700 bg-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-50"
                                                    >
                                                        {isResearching ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                                        Research Company Website
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleGenerateForLead(selectedLead)}
                                                    disabled={isProcessingAction}
                                                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isProcessingAction ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                                                    Generate Autopilot
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200">
                                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Outreach Pipeline</div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => { setTempSequence(selectedLead.generatedSequence || ''); setEditingSequence(!editingSequence); }}
                                                            className="text-[10px] font-bold text-[#15621B] bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100"
                                                        >
                                                            {editingSequence ? 'Cancel' : 'Raw Edit'}
                                                        </button>
                                                        {editingSequence && (
                                                            <button onClick={handleSaveSequence} className="text-[10px] font-bold text-white bg-[#15621B] px-3 py-1.5 rounded-lg">Save</button>
                                                        )}
                                                    </div>
                                                </div>

                                                {editingSequence ? (
                                                    <textarea 
                                                        className="w-full h-[500px] p-6 border border-gray-300 rounded-2xl outline-none focus:ring-2 focus:ring-[#15621B] resize-none font-mono text-sm bg-white shadow-inner"
                                                        value={tempSequence}
                                                        onChange={e => setTempSequence(e.target.value)}
                                                    />
                                                ) : (
                                                    renderParsedSequence(selectedLead.generatedSequence || '')
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* CO-PILOT SIDEBAR (CHAT) */}
                                    {selectedLead.generatedSequence && (
                                        <div className="w-80 flex flex-col bg-white shrink-0 border-l border-gray-100">
                                            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Refinement Co-Pilot</h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {REFINEMENT_SUGGESTIONS.map(s => (
                                                        <button 
                                                            key={s} onClick={() => runRefinement(s)}
                                                            className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded-md hover:border-[#15621B] hover:text-[#15621B] transition-all"
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-white">
                                                {chatHistory.length === 0 && (
                                                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-6">
                                                        <MessageSquare size={24} className="mb-2" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest">Chat to refine steps</p>
                                                    </div>
                                                )}
                                                {chatHistory.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs shadow-sm ${msg.role === 'user' ? 'bg-[#15621B] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'}`}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div ref={chatEndRef} />
                                            </div>
                                            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                                                <form onSubmit={handleRefineSubmit} className="relative">
                                                    <input 
                                                        className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#15621B] bg-white transition-all shadow-sm"
                                                        placeholder="Try 'make it punchier'..."
                                                        value={chatInput} onChange={e => setChatInput(e.target.value)}
                                                        disabled={isRefining}
                                                    />
                                                    <button type="submit" disabled={!chatInput.trim() || isRefining} className="absolute right-2 top-2 p-1.5 text-[#15621B] disabled:opacity-30">
                                                        {isRefining ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={18} />}
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                                <User size={64} className="mb-4 opacity-10" />
                                <h3 className="text-gray-900 font-bold text-lg mb-1">No Lead Selected</h3>
                                <p className="text-xs max-w-xs font-medium">Select a prospect from the left to start building your outreach sequence.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* QUICK GENERATOR */
                <div className="flex-1 flex gap-6 overflow-hidden pb-4">
                    <div className="w-96 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm overflow-y-auto shrink-0 space-y-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={20} className="text-[#15621B]" />
                            <h3 className="font-bold text-lg text-gray-900">Quick Draft</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Website URL (AI Research)</label>
                                <div className="relative">
                                    <input 
                                        className="w-full pl-9 pr-12 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#15621B] outline-none text-sm bg-gray-50 focus:bg-white transition-all" 
                                        placeholder="https://company.com" 
                                        value={genUrl} 
                                        onChange={e => setGenUrl(e.target.value)} 
                                    />
                                    <Globe size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <button 
                                        onClick={handleResearch}
                                        disabled={!genUrl || isResearching}
                                        className="absolute right-2 top-2 p-1 text-[#15621B] hover:bg-green-50 rounded-lg disabled:opacity-30 transition-colors"
                                        title="Analyze Website"
                                    >
                                        {isResearching ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1 font-medium italic"><Info size={10} /> Analyze URL to auto-fill details.</p>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Prospect Name</label>
                                    <input className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#15621B] text-sm" value={genName} onChange={e => setGenName(e.target.value)} placeholder="Full Name" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Company</label>
                                    <input className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#15621B] text-sm" value={genCompany} onChange={e => setGenCompany(e.target.value)} placeholder="Acme Inc" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Role</label>
                                    <input className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#15621B] text-sm" value={genRole} onChange={e => setGenRole(e.target.value)} placeholder="Founder" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Pain Point / Context</label>
                                <textarea className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#15621B] text-sm h-24 resize-none" value={genPain} onChange={e => setGenPain(e.target.value)} placeholder="What are they struggling with?" />
                            </div>
                            
                            <button 
                                onClick={async () => {
                                    setGenLoading(true);
                                    const res = await generateOutreachSequence(genName, genRole, genCompany, genPain);
                                    setGenOutput(res);
                                    setGenLoading(false);
                                }}
                                disabled={genLoading || !genName}
                                className="w-full bg-[#15621B] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-green-900/10 hover:shadow-green-900/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {genLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                {genLoading ? 'Building Sequence...' : 'Generate AI Sequence'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preview Area</span>
                            {genOutput && (
                                <button onClick={() => navigator.clipboard.writeText(genOutput)} className="text-xs font-bold text-[#15621B] flex items-center gap-1.5 hover:underline">
                                    <Copy size={12} /> Copy All
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {genOutput ? (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    {renderParsedSequence(genOutput)}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-40 text-center p-12">
                                    <Sparkles size={64} className="mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Draft will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

             {/* Email Composer Modal */}
             {showEmailModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/20">
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <Mail size={18} className="text-[#15621B]" />
                                Draft Sequence Email
                            </h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Recipient</label>
                                    <input className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#15621B] outline-none text-sm" value={emailDraft.to} onChange={e => setEmailDraft({...emailDraft, to: e.target.value})} placeholder="email@company.com" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
                                    <input className="w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#15621B] outline-none text-sm font-bold" value={emailDraft.subject} onChange={e => setEmailDraft({...emailDraft, subject: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Body</label>
                                <textarea className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#15621B] outline-none h-64 resize-none text-sm font-sans leading-relaxed" value={emailDraft.body} onChange={e => setEmailDraft({...emailDraft, body: e.target.value})} />
                            </div>
                        </div>
                        <div className="bg-gray-50 border-t border-gray-200 px-6 py-5 flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bokle AI Assistant</span>
                            <div className="flex gap-2">
                                <button onClick={() => sendEmail('gmail')} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 text-xs shadow-sm">Open Gmail</button>
                                <button onClick={() => sendEmail('default')} className="px-5 py-2.5 bg-[#15621B] text-white font-bold rounded-xl hover:bg-[#0e4412] flex items-center gap-2 text-xs shadow-lg shadow-green-900/20">
                                    <Send size={14} /> Send Now
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
