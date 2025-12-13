import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Deal, DealStatus } from '../types';
import { generateStageArtifact, generateSalesScript, generateHandover } from '../services/geminiService';
import { 
    CheckCircle2, Circle, ArrowRight, FileText, Code2, 
    MessageSquare, Loader2, PlayCircle, ChevronRight, Download 
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

const LifecycleAutopilot: React.FC<LifecycleAutopilotProps> = ({ deal, onClose, onUpdateStatus }) => {
    const [currentStageIdx, setCurrentStageIdx] = useState(
        STAGES.findIndex(s => s.id === deal.status) !== -1 
            ? STAGES.findIndex(s => s.id === deal.status) 
            : 0
    );
    
    // Local context state
    const [problem, setProblem] = useState(deal.problemStatement || '');
    const [notes, setNotes] = useState(deal.notes || '');
    const [generatedContent, setGeneratedContent] = useState('');
    const [loading, setLoading] = useState(false);

    const currentStage = STAGES[currentStageIdx];

    const handleGenerate = async () => {
        setLoading(true);
        setGeneratedContent('');
        
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
            setGeneratedContent(result);
        } catch (e) {
            setGeneratedContent('Error generating content. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedContent) return;
        
        const element = document.createElement("a");
        const file = new Blob([generatedContent], {type: 'text/markdown'});
        element.href = URL.createObjectURL(file);
        
        // Clean filename
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
            setGeneratedContent(''); // Clear content for next stage
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 -m-4 lg:-m-8">
            {/* Header */}
            <div className="bg-[#15621B] text-white p-6 shadow-md flex justify-between items-center">
                <div>
                    <div className="text-xs uppercase opacity-70 font-semibold tracking-wider">Lifecycle Autopilot</div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {deal.clientName}
                        <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full font-normal">{deal.service}</span>
                    </h2>
                </div>
                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    Exit Autopilot
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* Left: Pipeline & Context */}
                <div className="w-full lg:w-1/3 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
                    {/* Stepper */}
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-[#373737] mb-4">Pipeline Progress</h3>
                        <div className="space-y-0 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-3.5 top-2 bottom-6 w-0.5 bg-gray-200 -z-10"></div>
                            
                            {STAGES.map((stage, idx) => {
                                const isActive = idx === currentStageIdx;
                                const isPast = idx < currentStageIdx;
                                
                                return (
                                    <div 
                                        key={stage.id} 
                                        onClick={() => {
                                            // Optional: Allow manual navigation
                                            // setCurrentStageIdx(idx); 
                                        }}
                                        className={`flex items-center gap-3 py-3 ${isActive ? 'opacity-100' : isPast ? 'opacity-60' : 'opacity-40'}`}
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors z-10
                                            ${isActive ? 'bg-[#15621B] border-[#15621B] text-white' : 
                                              isPast ? 'bg-green-100 border-green-200 text-green-700' : 
                                              'bg-white border-gray-300 text-gray-300'}
                                        `}>
                                            {isPast ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${isActive ? 'text-[#15621B]' : 'text-gray-600'}`}>{stage.label}</p>
                                            {isActive && <p className="text-xs text-green-600 font-medium">Current Stage</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Context Inputs */}
                    <div className="p-6 space-y-4 flex-1">
                        <h3 className="font-bold text-[#373737]">Autopilot Context</h3>
                        <p className="text-xs text-gray-500 mb-2">The AI uses this data to generate documents.</p>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Problem Statement</label>
                            <textarea 
                                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#15621B] outline-none text-sm resize-none text-black"
                                rows={3}
                                placeholder="What is the client trying to solve?"
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Notes / Scope / Objections</label>
                            <textarea 
                                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#15621B] outline-none text-sm resize-none text-black"
                                rows={6}
                                placeholder="Enter any meeting notes, agreed scope items, or specific objections here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Action Area */}
                <div className="flex-1 bg-gray-50 p-6 lg:p-10 flex flex-col h-full overflow-hidden">
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                        
                        {/* Action Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-[#373737]">{currentStage.action}</h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Automated task for <span className="font-semibold text-[#15621B]">{currentStage.label}</span>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleGenerate}
                                    disabled={loading || !problem}
                                    className="bg-[#373737] hover:bg-black text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <currentStage.icon size={18} />}
                                    {generatedContent ? 'Regenerate' : 'Run AI Generator'}
                                </button>
                                
                                {generatedContent && (
                                    <>
                                        <button 
                                            onClick={handleDownload}
                                            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm"
                                        >
                                            <Download size={18} />
                                            Download
                                        </button>
                                        
                                        {currentStageIdx < STAGES.length - 1 && (
                                            <button 
                                                onClick={handleAdvance}
                                                className="bg-[#15621B] hover:bg-green-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-md animate-in fade-in"
                                            >
                                                Next Stage <ChevronRight size={18} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Result Display */}
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col">
                            {!generatedContent && !loading && (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <PlayCircle size={32} className="opacity-50" />
                                    </div>
                                    <h3 className="font-bold text-gray-600 text-lg">Ready to Autopilot</h3>
                                    <p className="max-w-md mt-2">
                                        Click "Run AI Generator" to draft the <strong>{currentStage.artifact}</strong> automatically using the context from your CRM.
                                    </p>
                                </div>
                            )}

                            {loading && (
                                <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center">
                                    <Loader2 className="animate-spin text-[#15621B] mb-3" size={40} />
                                    <p className="text-[#15621B] font-medium">Generating {currentStage.artifact}...</p>
                                </div>
                            )}

                            {generatedContent && (
                                <div className="flex-1 overflow-y-auto p-8 prose prose-sm prose-headings:text-[#373737] max-w-none">
                                    <ReactMarkdown>{generatedContent}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LifecycleAutopilot;