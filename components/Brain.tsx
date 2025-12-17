
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { DataService } from '../services/storageService';
import { queryCompanyBrain } from '../services/geminiService';
import { 
    Brain as BrainIcon, Send, Sparkles, Loader2, Database, 
    RefreshCw, MessageSquare, Zap, Activity, Users, 
    Code, Megaphone, Target
} from 'lucide-react';

const SUGGESTED_QUERIES = [
    "Summarize the health of my sales pipeline.",
    "What are my next 3 tech deadlines?",
    "Suggest a LinkedIn content strategy based on active deals.",
    "Draft a project update email for my biggest client."
];

const Brain: React.FC = () => {
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [knowledgeBase, setKnowledgeBase] = useState('');
    
    // Stats for knowledge visualization
    const [stats, setStats] = useState({
        deals: 0,
        projects: 0,
        tasks: 0,
        leads: 0,
        artifacts: 0
    });

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadKnowledge();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isStreaming]);

    const loadKnowledge = async () => {
        setIsLoadingData(true);
        try {
            const [deals, projects, tasks, leads, artifacts] = await Promise.all([
                DataService.getDeals(),
                DataService.getProjects(),
                DataService.getMarketing(),
                DataService.getOutreachLeads(),
                DataService.getArtifacts()
            ]);

            setStats({
                deals: deals.length,
                projects: projects.length,
                tasks: tasks.length,
                leads: leads.length,
                artifacts: artifacts.length
            });

            // Flatten database into a structured text context for the model
            const ctx = `
                CURRENT PIPELINE (DEALS):
                ${deals.map(d => `- Client: ${d.clientName} | Service: ${d.service} | Value: ${d.value} | Status: ${d.status} | Notes: ${d.notes || 'None'}`).join('\n')}

                TECH PROJECTS:
                ${projects.map(p => `- Client: ${p.clientName} | Deadline: ${p.deadline} | Status: ${p.status} | Feature: ${p.featureSummary}`).join('\n')}

                MARKETING/CONTENT:
                ${tasks.map(t => `- Topic: ${t.title} | Platform: ${t.platform} | Status: ${t.status}`).join('\n')}

                OUTREACH LEADS:
                ${leads.map(l => `- Name: ${l.name} | Company: ${l.company} | Status: ${l.status}`).join('\n')}

                SAVED DOCUMENTS:
                ${artifacts.map(a => `- Doc: ${a.title} for ${a.stage} stage`).join('\n')}
            `.trim();

            setKnowledgeBase(ctx);
        } catch (error) {
            console.error("Knowledge retrieval failed", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSend = async (customQuery?: string) => {
        const query = customQuery || input;
        if (!query.trim() || isStreaming) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: query }]);
        setIsStreaming(true);

        // Start local "current message" for streaming
        setMessages(prev => [...prev, { role: 'ai', text: '' }]);

        try {
            const stream = await queryCompanyBrain(query, messages, knowledgeBase);
            let fullResponse = '';
            
            for await (const chunk of stream) {
                fullResponse += chunk;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = fullResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = "Error connecting to the Brain. Please check your API key.";
                return newMessages;
            });
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header / Stats Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                <div>
                    <h2 className="text-2xl font-bold text-[#373737] flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center">
                            <BrainIcon size={24} />
                        </div>
                        The Brain
                    </h2>
                    <p className="text-gray-500 font-medium">Strategic intelligence across all business modules.</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto max-w-full">
                    <div className="flex items-center gap-4 px-2">
                        <div className="flex items-center gap-1.5" title="Deals">
                            <Users size={14} className="text-[#15621B]" />
                            <span className="text-xs font-bold text-gray-700">{stats.deals}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Projects">
                            <Code size={14} className="text-gray-700" />
                            <span className="text-xs font-bold text-gray-700">{stats.projects}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Content">
                            <Megaphone size={14} className="text-pink-600" />
                            <span className="text-xs font-bold text-gray-700">{stats.tasks}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Knowledge Base">
                            <Target size={14} className="text-blue-600" />
                            <span className="text-xs font-bold text-gray-700">{stats.artifacts}</span>
                        </div>
                    </div>
                    <button 
                        onClick={loadKnowledge} 
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                        title="Sync Database"
                    >
                        <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Main Chat Interface */}
            <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
                {/* Knowledge Base Status Pulse */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Knowledge Context Connected</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 custom-scrollbar">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-8 py-20">
                            <div className="w-24 h-24 bg-indigo-50 text-indigo-700 rounded-3xl flex items-center justify-center shadow-inner">
                                <Activity size={48} className="animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">How can I help you lead, Gautam?</h3>
                                <p className="text-gray-500 text-sm font-medium">I have read your CRM, Tech Sprints, and Marketing goals. Ask me for a high-level summary or a cross-platform strategy.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                                {SUGGESTED_QUERIES.map(q => (
                                    <button 
                                        key={q} 
                                        onClick={() => handleSend(q)}
                                        className="text-left p-4 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 transition-all hover:shadow-md"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[#15621B] text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {msg.role === 'user' ? <Zap size={16} /> : <BrainIcon size={16} />}
                                    </div>
                                    <div className={`
                                        p-5 rounded-3xl text-sm leading-relaxed shadow-sm
                                        ${msg.role === 'user' 
                                            ? 'bg-[#15621B] text-white rounded-tr-none' 
                                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}
                                    `}>
                                        <div className="prose prose-sm max-w-none prose-headings:text-inherit prose-p:text-inherit">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Section */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="max-w-4xl mx-auto relative group"
                    >
                        <textarea 
                            className="w-full pl-6 pr-14 py-4 border border-gray-300 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white transition-all shadow-lg text-sm resize-none h-16 custom-scrollbar"
                            placeholder="Ask the Brain anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={isStreaming}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isStreaming}
                            className="absolute right-3 top-3 p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                    <div className="mt-3 text-center">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Sparkles size={10} /> Powered by Gemini 3 Pro reasoning over your entire database
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Brain;
