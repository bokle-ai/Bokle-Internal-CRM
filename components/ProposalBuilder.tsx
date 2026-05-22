
import React, { useState, useEffect, useRef } from 'react';
import { FileText, ChevronDown, Wand2, Printer, Upload, Trash2, Plus, Eye, Edit3, Download, RefreshCw, X, Check, Sparkles, ExternalLink } from 'lucide-react';
import { DataService } from '../services/storageService';
import { generateStageDocument, fillProposalTokens, STAGE_DOC_TYPES, refineArtifactContent, generateProposalJSON } from '../services/geminiService';
import { buildProposalHTML, ProposalData } from '../services/proposalTemplate';
import { Deal, ProposalTemplate, DealArtifact } from '../types';

const STAGES = Object.keys(STAGE_DOC_TYPES);

// ── Token extractor ──────────────────────────────────────────────────────────
const extractTokens = (html: string): string[] => {
    const matches = html.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))];
};

// ── Stage badge colours ──────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
    'Lead':          { bg: '#EFF6EE', text: '#15621B' },
    'Discovery':     { bg: '#E8F4FD', text: '#1565C0' },
    'Proposal':      { bg: '#FFF8E1', text: '#F57F17' },
    'Negotiation':   { bg: '#FBE9E7', text: '#BF360C' },
    'Closed Won':    { bg: '#E8F5E9', text: '#2E7D32' },
    'Tech Handover': { bg: '#F3E5F5', text: '#6A1B9A' },
    'Delivery':      { bg: '#E0F2F1', text: '#00695C' },
    'Completed':     { bg: '#F5F5F5', text: '#424242' },
};

// ── Markdown → simple HTML (for display only) ────────────────────────────────
const mdToHtml = (md: string) =>
    md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[hul])/gm, '<p>')
        .replace(/(?<![>])$/gm, '</p>');

// ── Print styles injected when printing ──────────────────────────────────────
const PRINT_STYLES = `
    @media print {
        body * { visibility: hidden; }
        #bokle-print-area, #bokle-print-area * { visibility: visible; }
        #bokle-print-area { position: fixed; left: 0; top: 0; width: 100%; padding: 40px; }
    }
`;

// ── Sub-components ───────────────────────────────────────────────────────────

interface DocCardProps {
    artifact: DealArtifact;
    onView: (a: DealArtifact) => void;
    onDelete: (id: string) => void;
}

const DocCard: React.FC<DocCardProps> = ({ artifact, onView, onDelete }) => {
    const colors = STAGE_COLORS[artifact.stage] || { bg: '#F5F5F5', text: '#424242' };
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text }}>
                        {artifact.stage}
                    </span>
                    <span className="text-xs text-gray-400 truncate">{artifact.title}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{artifact.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">Updated {new Date(artifact.lastUpdated).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onView(artifact)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-bokle-green transition-colors">
                    <Eye size={15} />
                </button>
                <button onClick={() => onDelete(artifact.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                </button>
            </div>
        </div>
    );
};

// ── Template Manager ─────────────────────────────────────────────────────────

interface TemplateMgrProps {
    onClose: () => void;
    onSelect: (t: ProposalTemplate) => void;
}

const TemplateManager: React.FC<TemplateMgrProps> = ({ onClose, onSelect }) => {
    const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('Proposal');
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { DataService.getProposalTemplates().then(setTemplates); }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const html = await file.text();
        const t: ProposalTemplate = {
            id: crypto.randomUUID(),
            name: newName || file.name.replace('.html', ''),
            category: newCategory,
            htmlContent: html,
            createdAt: new Date().toISOString(),
        };
        await DataService.saveProposalTemplate(t);
        setTemplates(await DataService.getProposalTemplates());
        setNewName('');
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleDelete = async (id: string) => {
        await DataService.deleteProposalTemplate(id);
        setTemplates(await DataService.getProposalTemplates());
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">HTML Templates</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Upload */}
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upload New Template</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Template name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bokle-green/30"
                            />
                            <select
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bokle-green/30"
                            >
                                {STAGES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-bokle-green font-medium">
                            <Upload size={15} />
                            Choose .html file
                            <input ref={fileRef} type="file" accept=".html" className="hidden" onChange={handleUpload} />
                        </label>
                    </div>
                    {/* List */}
                    {templates.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">No templates yet. Upload an HTML file above.</p>
                    )}
                    {templates.map(t => (
                        <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                                <p className="text-xs text-gray-400">{t.category} · {extractTokens(t.htmlContent).length} tokens</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => { onSelect(t); onClose(); }} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#15621B' }}>
                                    Use
                                </button>
                                <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Document Viewer / Editor ─────────────────────────────────────────────────

interface DocViewerProps {
    artifact: DealArtifact;
    onClose: () => void;
    onSave: (updated: DealArtifact) => void;
}

const DocViewer: React.FC<DocViewerProps> = ({ artifact, onClose, onSave }) => {
    const [mode, setMode] = useState<'preview' | 'edit'>('preview');
    const [content, setContent] = useState(artifact.content);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [refining, setRefining] = useState(false);
    const printAreaRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const styleEl = document.createElement('style');
        styleEl.id = 'bokle-print-style';
        styleEl.innerHTML = PRINT_STYLES;
        document.head.appendChild(styleEl);
        window.print();
        setTimeout(() => document.getElementById('bokle-print-style')?.remove(), 1000);
    };

    const handleRefine = async () => {
        if (!refinePrompt.trim()) return;
        setRefining(true);
        const refined = await refineArtifactContent(content, refinePrompt, artifact.title);
        setContent(refined);
        setRefining(false);
        setRefinePrompt('');
    };

    const handleSave = () => {
        onSave({ ...artifact, content, lastUpdated: new Date().toISOString() });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">{artifact.title}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{artifact.stage} stage document</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
                            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            {mode === 'preview' ? <><Edit3 size={14} /> Edit</> : <><Eye size={14} /> Preview</>}
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <Printer size={14} /> Export PDF
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90" style={{ backgroundColor: '#15621B' }}>
                            <Check size={14} /> Save
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {mode === 'edit' ? (
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full h-full min-h-[400px] text-sm font-mono border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-bokle-green/30 resize-none"
                        />
                    ) : (
                        <div
                            id="bokle-print-area"
                            ref={printAreaRef}
                            className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
                        />
                    )}
                </div>

                {/* Refine bar */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
                    <input
                        type="text"
                        placeholder="Refine with AI... (e.g. 'make it more formal', 'add a pricing table')"
                        value={refinePrompt}
                        onChange={e => setRefinePrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRefine()}
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-bokle-green/30"
                    />
                    <button
                        onClick={handleRefine}
                        disabled={refining || !refinePrompt.trim()}
                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#15621B' }}
                    >
                        {refining ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                        {refining ? 'Refining...' : 'Refine'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Module ──────────────────────────────────────────────────────────────

const ProposalBuilder: React.FC = () => {
    const [deals, setDeals] = useState<Deal[]>([]);
    const [artifacts, setArtifacts] = useState<DealArtifact[]>([]);

    // Generator form state
    const [selectedStage, setSelectedStage] = useState<string>('Discovery');
    const [selectedDocType, setSelectedDocType] = useState<string>('');
    const [selectedDealId, setSelectedDealId] = useState<string>('');
    const [extraNotes, setExtraNotes] = useState('');
    const [generating, setGenerating] = useState(false);

    // Template fill state
    const [activeTemplate, setActiveTemplate] = useState<ProposalTemplate | null>(null);
    const [tokenValues, setTokenValues] = useState<Record<string, string>>({});
    const [fillingTokens, setFillingTokens] = useState(false);
    const [templatePreview, setTemplatePreview] = useState('');

    // One-click proposal state
    const [proposalDealId, setProposalDealId] = useState<string>('');
    const [generatingProposal, setGeneratingProposal] = useState(false);
    const [proposalStatus, setProposalStatus] = useState('');

    // UI state
    const [viewingArtifact, setViewingArtifact] = useState<DealArtifact | null>(null);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [filterStage, setFilterStage] = useState<string>('All');

    useEffect(() => {
        DataService.getDeals().then(setDeals);
        DataService.getDealArtifacts().then(setArtifacts);
    }, []);

    // Keep doc type in sync when stage changes
    useEffect(() => {
        const types = STAGE_DOC_TYPES[selectedStage] || [];
        setSelectedDocType(types[0] || '');
    }, [selectedStage]);

    // Update template preview when tokens change
    useEffect(() => {
        if (!activeTemplate) return;
        let html = activeTemplate.htmlContent;
        Object.entries(tokenValues).forEach(([k, v]) => {
            html = html.replaceAll(`{{${k}}}`, v || `{{${k}}}`);
        });
        setTemplatePreview(html);
    }, [tokenValues, activeTemplate]);

    const selectedDeal = deals.find(d => d.id === selectedDealId);

    const buildDealContext = () => {
        if (!selectedDeal) return 'No specific deal selected.';
        return `Client: ${selectedDeal.clientName}
Service: ${selectedDeal.service}
Deal Value: ${selectedDeal.value}
Stage: ${selectedDeal.status}
Industry: ${selectedDeal.industry || 'Not specified'}
Problem Statement: ${selectedDeal.problemStatement || 'Not specified'}
Notes: ${selectedDeal.notes || 'None'}
Last Contact: ${selectedDeal.lastContact}`;
    };

    const handleGenerate = async () => {
        if (!selectedDocType) return;
        setGenerating(true);
        const context = buildDealContext();
        const content = await generateStageDocument(selectedStage, selectedDocType, context, extraNotes || undefined);
        const artifact: DealArtifact = {
            id: crypto.randomUUID(),
            dealId: selectedDealId || '',
            stage: selectedStage,
            title: selectedDocType,
            content,
            lastUpdated: new Date().toISOString(),
        };
        await DataService.saveDealArtifact(artifact);
        const updated = await DataService.getDealArtifacts();
        setArtifacts(updated);
        setViewingArtifact(artifact);
        setGenerating(false);
        setExtraNotes('');
    };

    const handleAutoFillTokens = async () => {
        if (!activeTemplate) return;
        setFillingTokens(true);
        const tokens = extractTokens(activeTemplate.htmlContent);
        const context = buildDealContext();
        const filled = await fillProposalTokens(context, tokens);
        setTokenValues(filled);
        setFillingTokens(false);
    };

    const handleSelectTemplate = (t: ProposalTemplate) => {
        setActiveTemplate(t);
        const tokens = extractTokens(t.htmlContent);
        const initial: Record<string, string> = {};
        tokens.forEach(tok => { initial[tok] = ''; });
        setTokenValues(initial);
        setTemplatePreview(t.htmlContent);
    };

    const handleSaveTemplateArtifact = async () => {
        if (!activeTemplate || !templatePreview) return;
        const artifact: DealArtifact = {
            id: crypto.randomUUID(),
            dealId: selectedDealId || '',
            stage: selectedStage,
            title: activeTemplate.name,
            content: templatePreview,
            lastUpdated: new Date().toISOString(),
        };
        await DataService.saveDealArtifact(artifact);
        setArtifacts(await DataService.getDealArtifacts());
        setViewingArtifact(artifact);
        setActiveTemplate(null);
    };

    const handleDeleteArtifact = async (id: string) => {
        await DataService.deleteDealArtifact(id);
        setArtifacts(await DataService.getDealArtifacts());
    };

    const handleSaveArtifact = async (updated: DealArtifact) => {
        await DataService.saveDealArtifact(updated);
        setArtifacts(await DataService.getDealArtifacts());
    };

    const filteredArtifacts = filterStage === 'All'
        ? artifacts
        : artifacts.filter(a => a.stage === filterStage);

    const docTypes = STAGE_DOC_TYPES[selectedStage] || [];

    const handleGenerateProposal = async () => {
        const deal = deals.find(d => d.id === proposalDealId);
        if (!deal) return;
        setGeneratingProposal(true);
        setProposalStatus('Building context...');
        const context = `Client: ${deal.clientName}
Service: ${deal.service}
Deal Value: ${deal.value}
Stage: ${deal.status}
Industry: ${deal.industry || 'Not specified'}
Problem Statement: ${deal.problemStatement || 'Not specified'}
Notes: ${deal.notes || 'None'}
Last Contact: ${deal.lastContact}`;
        try {
            setProposalStatus('AI generating proposal content...');
            const proposalData: ProposalData = await generateProposalJSON(context);
            setProposalStatus('Rendering design...');
            const baseUrl = window.location.origin;
            const html = buildProposalHTML(proposalData, baseUrl);
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
                win.focus();
            }
        } catch (e) {
            console.error(e);
            setProposalStatus('Failed — check API key and try again');
            setTimeout(() => setProposalStatus(''), 4000);
        } finally {
            setGeneratingProposal(false);
            if (!proposalStatus.startsWith('Failed')) setProposalStatus('');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Generate and manage stage-specific documents for every deal</p>
                </div>
                <button
                    onClick={() => setShowTemplateManager(true)}
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                >
                    <Upload size={15} />
                    HTML Templates
                </button>
            </div>

            {/* ── One-Click Proposal ── */}
            <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'linear-gradient(135deg, #010801 0%, #0d2e0d 100%)' }}>
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#15621B' }}>
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white mb-0.5">One-Click Full Proposal</h2>
                            <p className="text-sm text-white/50">Generates a complete branded PDF proposal — cover page, TOC, problem statement, solution, project plan, pricing — all in one shot.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 sm:pl-4">
                        <select
                            value={proposalDealId}
                            onChange={e => setProposalDealId(e.target.value)}
                            className="text-sm border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-bokle-green/40 min-w-[180px]"
                        >
                            <option value="" className="text-gray-800 bg-white">— Select a deal —</option>
                            {deals.map(d => (
                                <option key={d.id} value={d.id} className="text-gray-800 bg-white">{d.clientName} ({d.status})</option>
                            ))}
                        </select>
                        <button
                            onClick={handleGenerateProposal}
                            disabled={generatingProposal || !proposalDealId}
                            className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
                            style={{ backgroundColor: '#15621B' }}
                        >
                            {generatingProposal
                                ? <><RefreshCw size={15} className="animate-spin" /> {proposalStatus || 'Generating...'}</>
                                : <><ExternalLink size={15} /> Generate Proposal</>
                            }
                        </button>
                    </div>
                </div>
                <div className="px-5 py-3 bg-white border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Cover Page</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Table of Contents</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Problem Statement</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Proposed Solution</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Project Plan</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Payment Terms</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Generator */}
                <div className="lg:col-span-2 space-y-4">
                    {/* AI Document Generator */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EFF6EE' }}>
                                <Wand2 size={16} style={{ color: '#15621B' }} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-gray-900">AI Generator</h2>
                                <p className="text-xs text-gray-400">Generate docs by stage</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Stage */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Stage</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {STAGES.map(s => {
                                        const colors = STAGE_COLORS[s] || { bg: '#F5F5F5', text: '#424242' };
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => setSelectedStage(s)}
                                                className="text-xs font-semibold px-2 py-1.5 rounded-lg border transition-all text-left"
                                                style={selectedStage === s
                                                    ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.text + '40' }
                                                    : { backgroundColor: '#FAFAFA', color: '#9CA3AF', borderColor: '#E5E7EB' }
                                                }
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Doc Type */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Document Type</label>
                                <select
                                    value={selectedDocType}
                                    onChange={e => setSelectedDocType(e.target.value)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-bokle-green/30 bg-white"
                                >
                                    {docTypes.map(d => <option key={d}>{d}</option>)}
                                </select>
                            </div>

                            {/* Deal */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Deal (Optional)</label>
                                <select
                                    value={selectedDealId}
                                    onChange={e => setSelectedDealId(e.target.value)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-bokle-green/30 bg-white"
                                >
                                    <option value="">— No deal selected —</option>
                                    {deals.map(d => (
                                        <option key={d.id} value={d.id}>{d.clientName} ({d.status})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Extra notes */}
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Extra Notes</label>
                                <textarea
                                    value={extraNotes}
                                    onChange={e => setExtraNotes(e.target.value)}
                                    placeholder="Any specific instructions or context..."
                                    rows={3}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-bokle-green/30 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={generating || !selectedDocType}
                                className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: '#15621B' }}
                            >
                                {generating ? <><RefreshCw size={15} className="animate-spin" /> Generating...</> : <><Wand2 size={15} /> Generate Document</>}
                            </button>
                        </div>
                    </div>

                    {/* Template Fill */}
                    {activeTemplate && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">{activeTemplate.name}</h2>
                                    <p className="text-xs text-gray-400">{extractTokens(activeTemplate.htmlContent).length} tokens to fill</p>
                                </div>
                                <button onClick={() => setActiveTemplate(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                            </div>

                            <button
                                onClick={handleAutoFillTokens}
                                disabled={fillingTokens || !selectedDealId}
                                className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg mb-3 border border-dashed border-bokle-green text-bokle-green hover:bg-bokle-green/5 disabled:opacity-50 transition-colors"
                            >
                                {fillingTokens ? <><RefreshCw size={12} className="animate-spin" /> Auto-filling...</> : <><Wand2 size={12} /> AI Auto-Fill from Deal</>}
                            </button>

                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {Object.keys(tokenValues).map(tok => (
                                    <div key={tok}>
                                        <label className="text-xs text-gray-500 block mb-0.5">{`{{${tok}}}`}</label>
                                        <input
                                            type="text"
                                            value={tokenValues[tok]}
                                            onChange={e => setTokenValues(prev => ({ ...prev, [tok]: e.target.value }))}
                                            className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-bokle-green/40"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSaveTemplateArtifact}
                                className="w-full mt-3 flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
                                style={{ backgroundColor: '#15621B' }}
                            >
                                <Download size={14} /> Save & Preview
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Document Library */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-gray-500" />
                                <h2 className="text-sm font-bold text-gray-900">Document Library</h2>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{filteredArtifacts.length}</span>
                            </div>
                            {/* Filter */}
                            <select
                                value={filterStage}
                                onChange={e => setFilterStage(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white text-gray-600"
                            >
                                <option value="All">All Stages</option>
                                {STAGES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>

                        {filteredArtifacts.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText size={32} className="text-gray-200 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">No documents yet.</p>
                                <p className="text-xs text-gray-300 mt-1">Generate one using the panel on the left.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredArtifacts.map(a => (
                                    <DocCard key={a.id} artifact={a} onView={setViewingArtifact} onDelete={handleDeleteArtifact} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {viewingArtifact && (
                <DocViewer
                    artifact={viewingArtifact}
                    onClose={() => setViewingArtifact(null)}
                    onSave={handleSaveArtifact}
                />
            )}
            {showTemplateManager && (
                <TemplateManager
                    onClose={() => setShowTemplateManager(false)}
                    onSelect={handleSelectTemplate}
                />
            )}
        </div>
    );
};

export default ProposalBuilder;
