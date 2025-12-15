
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Deal, DealStatus, DealArtifact } from '../types';
import { generateStageArtifact, generateSalesScript, generateHandover, refineArtifactContent } from '../services/geminiService';
import { DataService } from '../services/storageService';
import { 
    CheckCircle2, Circle, ArrowRight, FileText, Code2, 
    MessageSquare, Loader2, PlayCircle, ChevronRight, Download, 
    AlertTriangle, Save, Send, Sparkles, File, Wand2, RotateCcw
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
    "More professional tone",
    "Add a pricing table",
    "Focus on 'Speed' value prop",
    "Fix grammar & formatting"
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
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [refining, setRefining] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    
    const chatEndRef = useRef<HTMLDivElement>(null);

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
                setCurrentContent(current.content);
                setChatHistory([{ role: 'ai', text: `Loaded previous version of ${currentStage.artifact}.` }]);
            } else {
                setCurrentContent('');
                setChatHistory([]);
            }
        };
        loadArtifacts();
    }, [deal.id]);

    // Handle Stage Change (Load content for new stage)
    useEffect(() => {
        const art = artifacts.find(a => a.stage === currentStage.id);
        if (art) {
            setCurrentContent(art.content);
            setChatHistory([{ role: 'ai', text: `Loaded ${currentStage.artifact}.` }]);
        } else {
            setCurrentContent('');
            setChatHistory([]);
        }
    }, [currentStageIdx, artifacts]);

    // Save Content Helper
    const saveCurrentContent = async (content: string) => {
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
        
        // Update local state list
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
            setCurrentContent(result);
            setChatHistory(prev => [...prev, { role: 'ai', text: 'Draft generated successfully.' }]);
            await saveCurrentContent(result);
        } catch (e: any) {
            setCurrentContent(`### ⚠️ Error\n\nFailed to generate content: ${e.message}`);
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
            setCurrentContent(refined);
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
        <div className="flex flex-col h-full bg-gray-50 -m-4 lg:-m-8">
            {/* Header */}
            <div className="bg-[#15621B] text-white px-6 py-4 shadow-md flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="text-xs uppercase opacity-70 font-semibold tracking-wider">Lifecycle Autopilot</div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {deal.clientName}
                            <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full font-normal">{deal.service}</span>
                        </h2>
                    </div>
                    {saveStatus === 'saving' && (
                        <div className="flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded animate-pulse">
                            <Save size={12} /> Saving...
                        </div>
                    )}
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-1 text-xs text-white/50 px-2 py-1">
                            <CheckCircle2 size={12} /> Saved to Cloud
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors text-sm">
                    Exit
                </button>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* 1. Left Sidebar: Stages & Context */}
                <div className="w-full lg:w-64 border-r border-gray-200 bg-white flex flex-col overflow-y-auto shrink-0">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-[#373737] text-sm mb-3">Project Stages</h3>
                        <div className="space-y-1 relative">
                            <div className="absolute left-3 top-2 bottom-6 w-0.5 bg-gray-200 -z-10"></div>
                            {STAGES.map((stage, idx) => {
                                const isActive = idx === currentStageIdx;
                                const hasDoc = artifacts.some(a => a.stage === stage.id);
                                
                                return (
                                    <button 
                                        key={stage.id} 
                                        onClick={() => setCurrentStageIdx(idx)}
                                        className={`w-full flex items-center gap-2 py-2 px-1 text-left group transition-all rounded-md ${isActive ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className={`
                                            w-6 h-6 rounded-full flex items-center justify-center border transition-colors z-10 shrink-0
                                            ${isActive ? 'bg-[#15621B] border-[#15621B] text-white' : 
                                              hasDoc ? 'bg-green-100 border-green-200 text-green-700' : 
                                              'bg-white border-gray-300 text-gray-300'}
                                        `}>
                                            {hasDoc ? <File size={12} /> : <Circle size={10} />}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className={`font-medium text-xs truncate ${isActive ? 'text-[#15621B]' : 'text-gray-600'}`}>
                                                {stage.label}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Context Inputs */}
                    <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                        <h3 className="font-bold text-[#373737] text-sm">Context</h3>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Problem</label>
                            <textarea 
                                className="w-full p-2 border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#15621B] outline-none text-xs resize-none text-black"
                                rows={3}
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                placeholder="Problem..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Notes</label>
                            <textarea 
                                className="w-full p-2 border border-gray-200 rounded bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#15621B] outline-none text-xs resize-none text-black"
                                rows={6}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes..."
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Middle: Document Canvas */}
                <div className="flex-1 bg-gray-100 p-4 lg:p-8 flex flex-col h-full overflow-hidden relative">
                    <div className="max-w-3xl mx-auto w-full h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Doc Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                    <currentStage.icon size={18} className="text-[#15621B]" />
                                    {currentStage.artifact}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">Last updated: {existingArtifact ? new Date(existingArtifact.lastUpdated).toLocaleTimeString() : 'Never'}</p>
                            </div>
                            {currentContent && (
                                <div className="flex gap-2">
                                    <button onClick={handleDownload} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Download">
                                        <Download size={18} />
                                    </button>
                                    {currentStageIdx < STAGES.length - 1 && (
                                        <button onClick={handleAdvance} className="flex items-center gap-1 text-xs bg-[#15621B] text-white px-3 py-1.5 rounded hover:bg-green-800 transition-colors">
                                            Next Stage <ChevronRight size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Doc Content / Empty State */}
                        <div className="flex-1 overflow-y-auto p-8 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
                                    <Loader2 className="animate-spin text-[#15621B] mb-3" size={40} />
                                    <p className="text-[#15621B] font-medium">Drafting Document...</p>
                                </div>
                            )}

                            {!currentContent && !loading ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles size={32} className="text-[#15621B]" />
                                    </div>
                                    <h3 className="font-bold text-gray-700 text-lg mb-2">Create {currentStage.artifact}</h3>
                                    <p className="text-gray-500 text-sm max-w-sm mb-6">
                                        Use the AI to draft the initial version based on your deal context.
                                    </p>
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={!problem}
                                        className="bg-[#15621B] text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Generate Draft
                                    </button>
                                </div>
                            ) : (
                                <div className="prose prose-sm prose-headings:text-[#373737] max-w-none text-gray-800">
                                    <ReactMarkdown>{currentContent}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Right Sidebar: Refinement Chat */}
                <div className="w-full lg:w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 h-[40vh] lg:h-auto">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-[#373737] text-sm flex items-center gap-2">
                            <MessageSquare size={16} />
                            Refine Document
                        </h3>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-3">
                        {chatHistory.length === 0 && (
                            <p className="text-xs text-gray-400 text-center italic mt-4">No changes yet.</p>
                        )}
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`
                                    max-w-[85%] p-3 rounded-lg text-xs leading-relaxed
                                    ${msg.role === 'user' 
                                        ? 'bg-[#15621B] text-white rounded-tr-none' 
                                        : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm'}
                                `}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="p-3 bg-white border-t border-gray-100 overflow-x-auto flex gap-2">
                        {SUGGESTIONS.map(s => (
                            <button 
                                key={s}
                                onClick={() => runRefinement(s)}
                                disabled={!currentContent || refining}
                                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs hover:bg-green-50 hover:text-green-700 border border-transparent hover:border-green-200 transition-all disabled:opacity-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-white">
                        <form onSubmit={handleRefineSubmit} className="relative">
                            <textarea
                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15621B] outline-none text-sm resize-none text-black disabled:bg-gray-100"
                                rows={3}
                                placeholder={currentContent ? "Describe changes (e.g., 'Make it punchier')" : "Generate a document first..."}
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
                                className="absolute right-2 bottom-2 p-1.5 bg-[#15621B] text-white rounded-md hover:bg-green-800 transition-colors disabled:opacity-50"
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
