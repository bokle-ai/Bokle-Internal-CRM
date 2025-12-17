
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Deal, DealStatus, DealArtifact } from '../types';
import { generateStageArtifact, generateSalesScript, generateHandover, refineArtifactContent } from '../services/geminiService';
import { DataService } from '../services/storageService';
import { 
    CheckCircle2, Circle, ArrowRight, FileText, Code2, 
    MessageSquare, Loader2, ChevronRight, Download, 
    Save, Send, Sparkles, File, Edit2, Eye, 
    Undo2, Redo2, Maximize2, Minimize2, Copy, X,
    ChevronDown, ChevronUp, Table, Calendar
} from 'lucide-react';

interface LifecycleAutopilotProps {
    deal: Deal;
    onClose: () => void;
    onUpdateStatus: (id: string, status: DealStatus) => void;
}

const STAGES = [
    { id: 'Lead', label: '1. Lead & Qualify', action: 'Generate Sales Script', icon: MessageSquare, artifact: 'Qualification Script' },
    { id: 'Discovery', label: '2. Discovery', action: 'Generate BRD', icon: FileText, artifact: 'Business Requirement Doc (BRD)' },
    { id: 'Proposal', label: '3. Proposal', action: 'Generate SOW', icon: FileText, artifact: 'Statement of Work (SOW)' },
    { id: 'Negotiation', label: '4. Contracting', action: 'Generate Contract', icon: FileText, artifact: 'MSA & Agreement' },
    { id: 'Closed Won', label: '5. Kick-off', action: 'Generate Handover', icon: Code2, artifact: 'Tech Team Ticket' },
];

const SUGGESTIONS = [
    "Make it shorter",
    "Professional tone",
    "Add 'Speed' value prop",
    "Fix grammar"
];

const LifecycleAutopilot: React.FC<LifecycleAutopilotProps> = ({ deal, onClose, onUpdateStatus }) => {
    // Current Active Stage
    const [currentStageIdx, setCurrentStageIdx] = useState(
        STAGES.findIndex(s => s.id === deal.status) !== -1 
            ? STAGES.findIndex(s => s.id === deal.status) 
            : 0
    );

    // Document & Data State
    const [artifacts, setArtifacts] = useState<DealArtifact[]>([]);
    const [currentContent, setCurrentContent] = useState('');
    const [problem, setProblem] = useState(deal.problemStatement || '');
    const [notes, setNotes] = useState(deal.notes || '');
    
    // History (Undo/Redo)
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [refining, setRefining] = useState(false);
    const [isEditing, setIsEditing] = useState(false); // Manual Edit Mode
    const [isFullscreen, setIsFullscreen] = useState(false); // Focus Mode
    const [showContext, setShowContext] = useState(true); // Left sidebar toggle

    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    
    const chatEndRef = useRef<HTMLDivElement>(null);
    const lastSavedContent = useRef<string>('');

    const currentStage = STAGES[currentStageIdx];
    const existingArtifact = artifacts.find(a => a.stage === currentStage.id);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, refining]);

    // Initial Load of Artifacts
    useEffect(() => {
        const loadArtifacts = async () => {
            const saved = await DataService.getArtifacts(deal.id);
            setArtifacts(saved);
            
            // If an artifact exists for the current stage, load it into content
            const current = saved.find(a => a.stage === STAGES[currentStageIdx].id);
            if (current) {
                updateContent(current.content, false);
                setChatHistory([{ role: 'ai', text: `Loaded previous version of ${currentStage.artifact}.` }]);
            } else {
                updateContent('', false);
                setChatHistory([]);
            }
        };
        loadArtifacts();
    }, [deal.id]);

    // Handle Stage Change
    useEffect(() => {
        const art = artifacts.find(a => a.stage === currentStage.id);
        if (art) {
            updateContent(art.content, false);
            setChatHistory([{ role: 'ai', text: `Loaded ${currentStage.artifact}.` }]);
        } else {
            updateContent('', false);
            setChatHistory([]);
        }
    }, [currentStageIdx, artifacts]);

    // Helper to update content and manage history
    const updateContent = (newContent: string, pushToHistory = true) => {
        setCurrentContent(newContent);
        if (pushToHistory) {
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(newContent);
            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        } else {
            // Reset history for new doc load
            setHistory([newContent]);
            setHistoryIndex(0);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1];
            setCurrentContent(prev);
            setHistoryIndex(historyIndex - 1);
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1];
            setCurrentContent(next);
            setHistoryIndex(historyIndex + 1);
        }
    };

    // --- AUTOSAVE LOGIC ---
    const saveCurrentContent = async (content: string) => {
        if (!content) return;
        
        setSaveStatus('saving');
        const artifact: DealArtifact = {
            id: existingArtifact ? existingArtifact.id : `${deal.id}_${currentStage.id}_${Date.now()}`,
            dealId: deal.id,
            stage: currentStage.id,
            title: currentStage.artifact,
            content: content,
            lastUpdated: new Date().toISOString()
        };

        await DataService.saveArtifact(artifact);
        
        lastSavedContent.current = content;
        setArtifacts(prev => {
            const idx = prev.findIndex(a => a.stage === currentStage.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = artifact;
                return updated;
            }
            return [...prev, artifact];
        });
        setSaveStatus('saved');
    };

    useEffect(() => {
        if (currentContent !== lastSavedContent.current) {
            setSaveStatus('unsaved');
            const timer = setTimeout(() => {
                saveCurrentContent(currentContent);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [currentContent]);

    // ----------------------

    const handleGenerate = async () => {
        setLoading(true);
        let result = '';
        const context = `Problem: ${problem}. Service: ${deal.service}. Value: ${deal.value}. Notes: ${notes}`;

        try {
            if (currentStage.id === 'Lead') {
                result = await generateSalesScript(deal.industry || 'General', problem || 'Unknown problem', 'First Discovery Call');
            } else if (currentStage.id === 'Closed Won') {
                result = await generateHandover(deal.clientName, context, '5-7 Days');
            } else {
                result = await generateStageArtifact(currentStage.id, currentStage.artifact, deal.clientName, context);
            }
            updateContent(result);
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Draft generated successfully.' }]);
            await saveCurrentContent(result);
        } catch (e: any) {
            updateContent(`### ⚠️ Error\n\nFailed to generate content: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const runRefinement = async (instruction: string) => {
        if (!instruction.trim() || !currentContent) return;

        setRefining(true);
        setChatHistory(prev => [...prev, { role: 'user', text: instruction }]);
        const oldContent = currentContent;
        
        try {
            const refined = await refineArtifactContent(oldContent, instruction, currentStage.artifact);
            updateContent(refined);
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Document updated.' }]);
            await saveCurrentContent(refined);
        } catch (e) {
            console.error("Refine error", e);
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Failed to update document.' }]);
        } finally {
            setRefining(false);
        }
    };

    const handleRefineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        runRefinement(chatInput);
        setChatInput('');
    };

    const appendText = (text: string) => {
        updateContent(currentContent + "\n\n" + text);
    };

    const handleDownload = () => {
        if (!currentContent) return;
        const element = document.createElement("a");
        const file = new Blob([currentContent], {type: 'text/markdown'});
        element.href = URL.createObjectURL(file);
        const safeClientName = deal.clientName.replace(/[^a-zA-Z0-9]/g, '_');
        const safeArtifactName = currentStage.artifact.replace(/[^a-zA-Z0-9]/g, '_');
        element.download = `BokleAI_${safeClientName}_${safeArtifactName}.md`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleAdvance = () => {
        if (currentStageIdx < STAGES.length - 1) {
            const nextStage = STAGES[currentStageIdx + 1];
            setCurrentStageIdx(currentStageIdx + 1);
            onUpdateStatus(deal.id, nextStage.id as DealStatus);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in fade-in duration-200">
            {/* 1. TOP HEADER */}
            <div className="bg-[#15621B] text-white px-6 py-3 shadow-md flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-[10px] uppercase opacity-80 font-bold tracking-wider mb-0.5">Autopilot Engine</div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            {deal.clientName}
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal border border-white/20">{deal.service}</span>
                        </h2>
                    </div>
                    
                    {/* Status Indicators */}
                    <div className="hidden md:flex items-center gap-4 border-l border-white/20 pl-4 h-8">
                         {saveStatus === 'saving' && (
                            <div className="flex items-center gap-1.5 text-xs bg-white/10 px-3 py-1.5 rounded-full animate-pulse">
                                <Save size={12} /> Saving...
                            </div>
                        )}
                        {saveStatus === 'unsaved' && (
                            <div className="flex items-center gap-1.5 text-xs text-yellow-300 px-3 py-1.5">
                                <Circle size={10} fill="currentColor" /> Unsaved
                            </div>
                        )}
                        {saveStatus === 'saved' && (
                            <div className="flex items-center gap-1.5 text-xs text-green-200 px-3 py-1.5">
                                <CheckCircle2 size={12} /> Cloud Synced
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                     <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white" title="Toggle Fullscreen">
                        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                    <div className="h-6 w-px bg-white/20 mx-1"></div>
                    <button onClick={onClose} className="bg-white text-[#15621B] hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors text-sm font-bold flex items-center gap-2">
                        <X size={16} /> Close
                    </button>
                </div>
            </div>

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 overflow-hidden flex flex-row">
                
                {/* A. LEFT SIDEBAR: STAGES & CONTEXT (Hidden in Fullscreen) */}
                {!isFullscreen && (
                    <div className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0 transition-all duration-300">
                        {/* Stages List */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">Project Stages</h3>
                                <div className="space-y-1 relative pl-3">
                                    <div className="absolute left-[19px] top-2 bottom-6 w-0.5 bg-gray-100 -z-10"></div>
                                    {STAGES.map((stage, idx) => {
                                        const isActive = idx === currentStageIdx;
                                        const hasDoc = artifacts.some(a => a.stage === stage.id);
                                        
                                        return (
                                            <button 
                                                key={stage.id} 
                                                onClick={() => setCurrentStageIdx(idx)}
                                                className={`w-full flex items-center gap-3 py-2 px-2 text-left group transition-all rounded-lg ${isActive ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className={`
                                                    w-5 h-5 rounded-full flex items-center justify-center border transition-colors z-10 shrink-0 shadow-sm
                                                    ${isActive ? 'bg-[#15621B] border-[#15621B] text-white' : 
                                                    hasDoc ? 'bg-green-100 border-green-200 text-green-700' : 
                                                    'bg-white border-gray-200 text-gray-300'}
                                                `}>
                                                    {hasDoc ? <File size={10} /> : <Circle size={8} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className={`font-bold text-xs truncate ${isActive ? 'text-[#15621B]' : 'text-gray-600'}`}>
                                                        {stage.label}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Context Inputs (Collapsible) */}
                            <div className="p-4">
                                <button 
                                    onClick={() => setShowContext(!showContext)}
                                    className="flex items-center justify-between w-full text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 hover:text-[#15621B]"
                                >
                                    Deal Context
                                    {showContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                
                                {showContext && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Core Problem</label>
                                            <textarea 
                                                className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#15621B] focus:border-transparent outline-none text-xs resize-none text-gray-800 transition-all"
                                                rows={4}
                                                value={problem}
                                                onChange={(e) => setProblem(e.target.value)}
                                                placeholder="What is the client trying to solve?"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Private Notes</label>
                                            <textarea 
                                                className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#15621B] focus:border-transparent outline-none text-xs resize-none text-gray-800 transition-all"
                                                rows={6}
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Internal notes, pricing ideas..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* B. CENTER: DOCUMENT CANVAS */}
                <div className="flex-1 bg-gray-100 flex flex-col h-full relative overflow-hidden">
                    {/* Toolbar */}
                    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20">
                        <div className="flex items-center gap-4">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <currentStage.icon size={16} className="text-[#15621B]" />
                                {currentStage.artifact}
                            </h2>
                            <span className="h-4 w-px bg-gray-200"></span>
                            <div className="flex gap-1">
                                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30" title="Undo"><Undo2 size={16} /></button>
                                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30" title="Redo"><Redo2 size={16} /></button>
                            </div>
                        </div>

                        {currentContent && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${isEditing ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                                    {isEditing ? <Eye size={14} /> : <Edit2 size={14} />} {isEditing ? 'Preview' : 'Edit'}
                                </button>
                                <button onClick={() => navigator.clipboard.writeText(currentContent)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Copy Text"><Copy size={16} /></button>
                                <button onClick={handleDownload} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Download MD"><Download size={16} /></button>
                                {currentStageIdx < STAGES.length - 1 && (
                                    <button onClick={handleAdvance} className="ml-2 flex items-center gap-1 text-xs bg-[#15621B] text-white px-3 py-2 rounded-lg hover:bg-green-800 transition-colors font-bold shadow-sm">
                                        Next Stage <ChevronRight size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 relative">
                         {loading && (
                            <div className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                                <Loader2 className="animate-spin text-[#15621B] mb-3" size={40} />
                                <p className="text-[#15621B] font-bold text-lg">Generating Draft...</p>
                                <p className="text-gray-500 text-sm mt-1">Using deal context to write content.</p>
                            </div>
                        )}

                        {!currentContent && !loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                                <div className="w-20 h-20 bg-green-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-green-100">
                                    <Sparkles size={40} className="text-[#15621B]" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-2xl mb-3">Create {currentStage.artifact}</h3>
                                <p className="text-gray-500 mb-8 leading-relaxed">
                                    The Autopilot will analyze your deal's "Problem" and "Service" to generate a professional draft instantly.
                                </p>
                                <button 
                                    onClick={handleGenerate}
                                    disabled={!problem}
                                    className="bg-[#15621B] text-white px-8 py-3.5 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-3"
                                >
                                    <Sparkles size={20} /> Generate Draft
                                </button>
                                {!problem && (
                                    <p className="mt-4 text-xs text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full">
                                        Please add the "Core Problem" in the sidebar first.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto bg-white min-h-[800px] shadow-sm border border-gray-200 rounded-xl overflow-hidden">
                                {isEditing ? (
                                    <textarea 
                                        className="w-full h-full p-12 outline-none resize-none font-mono text-sm leading-relaxed text-gray-800"
                                        value={currentContent}
                                        onChange={(e) => updateContent(e.target.value)}
                                        placeholder="Start typing..."
                                    />
                                ) : (
                                    <div className="prose prose-sm prose-headings:text-[#373737] prose-headings:font-bold max-w-none text-gray-800 p-12">
                                        <ReactMarkdown>{currentContent}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* C. RIGHT SIDEBAR: CHAT & TOOLS (Always Visible or Overlay on mobile) */}
                <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 z-30 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                            <MessageSquare size={14} className="text-[#15621B]" />
                            Refinement Co-Pilot
                        </h3>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {chatHistory.length === 0 && (
                             <div className="text-center mt-10 opacity-50">
                                <MessageSquare size={40} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-xs text-gray-500 font-medium">Chat to refine or rewrite sections.</p>
                             </div>
                        )}
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`
                                    max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm
                                    ${msg.role === 'user' 
                                        ? 'bg-[#15621B] text-white rounded-br-none' 
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'}
                                `}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Insert Tools */}
                    {currentContent && (
                        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 overflow-x-auto">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Quick Actions</p>
                            <div className="flex gap-2">
                                <button onClick={() => appendText("## Pricing\n| Item | Cost |\n|---|---|\n| Service | $1000 |")} className="p-2 bg-white border border-gray-200 rounded hover:border-[#15621B] hover:text-[#15621B] transition-colors" title="Add Pricing Table">
                                    <Table size={16} />
                                </button>
                                <button onClick={() => appendText("## Timeline\n- **Day 1**: Kickoff\n- **Day 3**: Review\n- **Day 7**: Launch")} className="p-2 bg-white border border-gray-200 rounded hover:border-[#15621B] hover:text-[#15621B] transition-colors" title="Add Timeline">
                                    <Calendar size={16} />
                                </button>
                                <button onClick={() => runRefinement("Make it more professional")} className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 whitespace-nowrap">
                                    Make Professional
                                </button>
                                <button onClick={() => runRefinement("Shorten this")} className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium hover:bg-gray-50 whitespace-nowrap">
                                    Shorten
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <form onSubmit={handleRefineSubmit} className="relative">
                            <textarea
                                className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#15621B] outline-none text-xs resize-none text-gray-800 disabled:bg-gray-50 min-h-[80px]"
                                placeholder={currentContent ? "e.g., 'Rewrite the intro to be punchier'..." : "Generate document first..."}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                disabled={!currentContent || refining}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleRefineSubmit(e);
                                    }
                                }}
                            />
                            <button 
                                type="submit"
                                disabled={!currentContent || !chatInput.trim() || refining}
                                className="absolute right-2 bottom-3 p-2 bg-[#15621B] text-white rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {refining ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LifecycleAutopilot;
