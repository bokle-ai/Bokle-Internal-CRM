
import React, { useState, useEffect, useRef } from 'react';
import { Plus, DollarSign, Calendar, Zap, Trash2, Megaphone, Instagram, Linkedin, Video, Image, FileText, Code, Briefcase, Loader2, Cloud, CloudOff, Save, CheckCircle2, RotateCcw, Users, Mail, Phone, Globe, Building2 } from 'lucide-react';
import { Deal, DealStatus, Project, ProjectStatus, MarketingTask, MarketingStatus, OutreachLead } from '../types';
import LifecycleAutopilot from './LifecycleAutopilot';
import DealDetailPanel from './DealDetailPanel';
import { DataService } from '../services/storageService';

const CRM: React.FC = () => {
    const [view, setView] = useState<'leads' | 'sales' | 'tech' | 'marketing'>('leads');
    const [isLoading, setIsLoading] = useState(true);
    const [isCloud, setIsCloud] = useState(false);
    
    // Data State
    const [deals, setDeals] = useState<Deal[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [marketingTasks, setMarketingTasks] = useState<MarketingTask[]>([]);
    const [outreachLeads, setOutreachLeads] = useState<OutreachLead[]>([]);
    
    // Autosave & Dirty Tracking Refs
    const dealsRef = useRef<Deal[]>([]);
    const projectsRef = useRef<Project[]>([]);
    const tasksRef = useRef<MarketingTask[]>([]);
    
    const dirtyDeals = useRef<Set<string>>(new Set());
    const dirtyProjects = useRef<Set<string>>(new Set());
    const dirtyTasks = useRef<Set<string>>(new Set());

    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

    // Keep Refs synced with State
    useEffect(() => { dealsRef.current = deals; }, [deals]);
    useEffect(() => { projectsRef.current = projects; }, [projects]);
    useEffect(() => { tasksRef.current = marketingTasks; }, [marketingTasks]);

    // Load Data Effect
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setIsCloud(DataService.isCloudEnabled());
            
            const [d, p, m, ol, fl] = await Promise.all([
                DataService.getDeals(),
                DataService.getProjects(),
                DataService.getMarketing(),
                DataService.getOutreachLeads(),
                DataService.getFormLeads(),
            ]);

            setDeals(d);
            setProjects(p);
            setMarketingTasks(m);

            // Merge outreach leads: form leads first, then manual/csv, deduplicated
            const existingIds = new Set(ol.map((l: OutreachLead) => l.id));
            const newFormLeads = fl.filter((fl: OutreachLead) => !existingIds.has(fl.id));
            setOutreachLeads([...newFormLeads, ...ol]);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // --- AUTOSAVE ENGINE ---
    const flushChanges = async () => {
        if (dirtyDeals.current.size === 0 && dirtyProjects.current.size === 0 && dirtyTasks.current.size === 0) {
            return;
        }

        setSaveStatus('saving');

        const dealsToSave = dealsRef.current.filter(d => dirtyDeals.current.has(d.id));
        for (const d of dealsToSave) await DataService.saveDeal(d);
        dirtyDeals.current.clear();

        const projectsToSave = projectsRef.current.filter(p => dirtyProjects.current.has(p.id));
        for (const p of projectsToSave) await DataService.saveProject(p);
        dirtyProjects.current.clear();

        const tasksToSave = tasksRef.current.filter(t => dirtyTasks.current.has(t.id));
        for (const t of tasksToSave) await DataService.saveMarketing(t);
        dirtyTasks.current.clear();

        setTimeout(() => setSaveStatus('saved'), 500);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            flushChanges();
        }, 30000); 

        return () => {
            clearInterval(interval);
            flushChanges();
        };
    }, []);

    // --- FORM DRAFT AUTOSAVE ---
    const [input1, setInput1] = useState(''); 
    const [input2, setInput2] = useState(''); 
    const [input3, setInput3] = useState(''); 
    const [input4, setInput4] = useState(''); 

    useEffect(() => {
        const draft = localStorage.getItem('crm_draft_inputs');
        if (draft) {
            const parsed = JSON.parse(draft);
            if (parsed.view === view) {
                setInput1(parsed.input1 || '');
                setInput2(parsed.input2 || '');
                setInput3(parsed.input3 || '');
                setInput4(parsed.input4 || '');
            }
        }
    }, [view]);

    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('crm_draft_inputs', JSON.stringify({ view, input1, input2, input3, input4 }));
        }, 1000);
        return () => clearTimeout(timer);
    }, [input1, input2, input3, input4, view]);


    const [autopilotDeal, setAutopilotDeal] = useState<Deal | null>(null);
    const [detailDeal, setDetailDeal] = useState<Deal | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    
    const salesColumns: DealStatus[] = ['Lead', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won'];
    const techColumns: ProjectStatus[] = ['Backlog', 'In Progress', 'Review', 'Deployed'];
    const marketingColumns: MarketingStatus[] = ['Idea', 'Scripting', 'Design', 'Review', 'Scheduled', 'Published'];

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = Date.now().toString();

        if (view === 'sales') {
            const newDeal: Deal = {
                id,
                clientName: input1,
                value: input2 || '$0',
                service: input3 || 'General AI',
                status: 'Lead',
                lastContact: 'Today',
                notes: '',
                problemStatement: ''
            };
            setDeals(prev => [...prev, newDeal]); 
            await DataService.saveDeal(newDeal); 
        } else if (view === 'tech') {
            const newProject: Project = {
                id,
                clientName: input1,
                featureSummary: input3,
                deadline: input2,
                status: 'Backlog'
            };
            setProjects(prev => [...prev, newProject]);
            await DataService.saveProject(newProject);
        } else {
            const newTask: MarketingTask = {
                id,
                title: input1,
                contentType: (input3 as MarketingTask['contentType']) || 'Post',
                platform: (input4 as MarketingTask['platform']) || 'LinkedIn',
                status: 'Idea',
                dueDate: input2
            };
            setMarketingTasks(prev => [...prev, newTask]);
            await DataService.saveMarketing(newTask);
        }
        
        localStorage.removeItem('crm_draft_inputs');
        resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setInput1('');
        setInput2('');
        setInput3('');
        setInput4('');
    };

    const updateDealStatus = (id: string, newStatus: DealStatus) => {
        setDeals(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
        dirtyDeals.current.add(id);
        setSaveStatus('unsaved');
    };

    // Called by DealDetailPanel on any edit — syncs panel changes back to kanban
    const handlePanelUpdate = (updated: Deal) => {
        setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
        // Keep detailDeal in sync so panel reflects latest state
        setDetailDeal(updated);
        dirtyDeals.current.add(updated.id);
        setSaveStatus('unsaved');
    };

    const updateProjectStatus = (id: string, newStatus: ProjectStatus) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        dirtyProjects.current.add(id);
        setSaveStatus('unsaved');
    };

    const updateMarketingStatus = (id: string, newStatus: MarketingStatus) => {
        setMarketingTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
        dirtyTasks.current.add(id);
        setSaveStatus('unsaved');
    };

    const deleteItem = async (id: string) => {
        if (view === 'sales') {
            setDeals(prev => prev.filter(d => d.id !== id));
            dirtyDeals.current.delete(id);
            await DataService.deleteDeal(id);
        }
        if (view === 'tech') {
            setProjects(prev => prev.filter(p => p.id !== id));
            dirtyProjects.current.delete(id);
            await DataService.deleteProject(id);
        }
        if (view === 'marketing') {
            setMarketingTasks(prev => prev.filter(t => t.id !== id));
            dirtyTasks.current.delete(id);
            await DataService.deleteMarketing(id);
        }
    };

    const getTypeIcon = (type: string) => {
        if (type === 'Reel') return <Video size={12} />;
        if (type === 'Carousel') return <Image size={12} />;
        return <FileText size={12} />;
    };

    const getPlatformIcon = (platform: string) => {
        if (platform === 'Instagram') return <Instagram size={12} className="text-pink-600" />;
        return <Linkedin size={12} className="text-blue-600" />;
    };

    if (autopilotDeal) {
        return (
            <LifecycleAutopilot 
                deal={autopilotDeal} 
                onClose={() => setAutopilotDeal(null)}
                onUpdateStatus={(id, status) => {
                    updateDealStatus(id, status);
                    setAutopilotDeal({...autopilotDeal, status});
                }}
            />
        );
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#373737] flex items-center gap-3">
                        Bokle CRM
                        {isCloud ? (
                            <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1 border border-green-200">
                                <Cloud size={12} /> Supabase Sync
                            </span>
                        ) : (
                            <span className="text-xs font-normal bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex items-center gap-1 border border-gray-200" title="Data stored in browser only">
                                <CloudOff size={12} /> Local
                            </span>
                        )}
                        {saveStatus === 'saving' && (
                            <span className="text-xs font-normal bg-gray-50 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse border border-gray-200">
                                <Save size={12} /> Saving...
                            </span>
                        )}
                        {saveStatus === 'unsaved' && (
                            <span className="text-xs font-normal bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full flex items-center gap-1 border border-yellow-200">
                                <RotateCcw size={12} /> Unsaved Changes
                            </span>
                        )}
                        {saveStatus === 'saved' && (
                            <span className="text-xs font-normal bg-white text-green-700 border border-green-200 px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={12} /> Saved
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-600 font-medium">One place for Sales, Development, and Marketing.</p>
                </div>
                
                <div className="flex bg-gray-200 p-1 rounded-lg self-start overflow-x-auto">
                    <button onClick={() => setView('leads')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${view === 'leads' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Users size={16} /> Leads
                    </button>
                    <button onClick={() => setView('sales')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${view === 'sales' ? 'bg-white text-[#15621B] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Briefcase size={16} /> Sales
                    </button>
                    <button onClick={() => setView('marketing')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${view === 'marketing' ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Megaphone size={16} /> Content
                    </button>
                    <button onClick={() => setView('tech')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${view === 'tech' ? 'bg-white text-[#373737] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Code size={16} /> Tech
                    </button>
                </div>
            </div>

            {view !== 'leads' && !isAdding ? (
                <button
                    onClick={() => setIsAdding(true)}
                    className={`flex items-center gap-2 font-bold hover:bg-opacity-10 p-2.5 rounded-lg w-fit transition-colors border border-transparent hover:border-current ${
                        view === 'marketing' ? 'text-pink-700 hover:bg-pink-100' :
                        view === 'tech' ? 'text-[#373737] hover:bg-gray-200' :
                        'text-[#15621B] hover:bg-green-50'
                    }`}
                >
                    <Plus size={20} />
                    Add New {view === 'sales' ? 'Deal' : view === 'marketing' ? 'Content Piece' : 'Project'}
                </button>
            ) : (
                <form 
                    onSubmit={handleAdd}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2"
                >
                    <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-gray-700 uppercase">
                            {view === 'sales' ? 'Client Name' : view === 'marketing' ? 'Content Topic' : 'Client Name'}
                        </label>
                        <input className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none text-gray-900 font-medium placeholder:text-gray-400" value={input1} onChange={e => setInput1(e.target.value)} required placeholder={view === 'marketing' ? "e.g. 5 AI Hacks" : "e.g. Acme Corp"} />
                    </div>
                    
                    {view === 'marketing' ? (
                        <>
                            <div className="w-32">
                                <label className="text-xs font-bold text-gray-700 uppercase">Type</label>
                                <select className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none bg-white text-gray-900 font-medium" value={input3} onChange={e => setInput3(e.target.value)}>
                                    <option value="Post">Post</option>
                                    <option value="Reel">Reel</option>
                                    <option value="Carousel">Carousel</option>
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="text-xs font-bold text-gray-700 uppercase">Platform</label>
                                <select className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none bg-white text-gray-900 font-medium" value={input4} onChange={e => setInput4(e.target.value)}>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Instagram">Instagram</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-gray-700 uppercase">{view === 'sales' ? 'Service' : 'Feature Summary'}</label>
                            <input className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none text-gray-900 font-medium placeholder:text-gray-400" value={input3} onChange={e => setInput3(e.target.value)} required placeholder={view === 'sales' ? "Chatbot" : "Core API"} />
                        </div>
                    )}

                    <div className="w-32">
                        <label className="text-xs font-bold text-gray-700 uppercase">{view === 'sales' ? 'Value' : 'Deadline'}</label>
                        <input className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none text-gray-900 font-medium placeholder:text-gray-400" value={input2} onChange={e => setInput2(e.target.value)} required placeholder={view === 'sales' ? "$1000" : "Oct 30"} />
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={resetForm} className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded font-medium">Cancel</button>
                        <button type="submit" className="px-4 py-2.5 bg-[#15621B] text-white rounded hover:bg-[#0e4412] font-bold shadow-sm">Add</button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <Loader2 size={32} className="animate-spin mb-2 text-[#15621B]" />
                    <p className="font-medium">Loading your data...</p>
                </div>
            ) : view === 'leads' ? (
                /* Leads from Sales Outreach */
                <div className="flex-1 overflow-y-auto">
                    {outreachLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <Users size={36} className="mb-3 text-blue-200" />
                            <p className="font-medium text-gray-500">No leads yet.</p>
                            <p className="text-sm text-gray-400 mt-1">Capture leads in Sales Outreach and they'll appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {outreachLeads.map(lead => {
                                const statusColor =
                                    lead.status === 'Contacted' ? 'bg-green-100 text-green-800 border-green-200' :
                                    lead.status === 'Generated' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                    'bg-gray-100 text-gray-700 border-gray-200';
                                return (
                                    <div key={lead.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm">{lead.name}</h4>
                                                {lead.role && <p className="text-xs text-gray-500 font-medium">{lead.role}</p>}
                                            </div>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{lead.status}</span>
                                        </div>
                                        <div className="space-y-1.5 mt-3">
                                            {lead.company && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                                    <Building2 size={12} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{lead.company}</span>
                                                </div>
                                            )}
                                            {lead.email && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                                    <Mail size={12} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{lead.email}</span>
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                                    <Phone size={12} className="text-gray-400 shrink-0" />
                                                    <span>{lead.phone}</span>
                                                </div>
                                            )}
                                            {lead.website && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                                    <Globe size={12} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{lead.website}</span>
                                                </div>
                                            )}
                                        </div>
                                        {lead.painPoint && (
                                            <p className="mt-3 text-xs text-gray-500 italic line-clamp-2 border-t border-gray-100 pt-2">{lead.painPoint}</p>
                                        )}
                                        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                            {lead.source && <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded font-medium text-gray-500">{lead.source}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Kanban Board */
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-4 min-w-[1200px] h-full pb-4">
                        {(view === 'sales' ? salesColumns : view === 'marketing' ? marketingColumns : techColumns).map((col) => {
                            // Helper for styles
                            let headerStyle = '';
                            let titleColor = '';
                            let badgeStyle = '';
                            let columnBorder = 'border-gray-200';
                            
                            if (view === 'sales') {
                                headerStyle = 'bg-[#15621B]/10 border-t-[#15621B] border-b-[#15621B]/10';
                                titleColor = 'text-[#15621B]';
                                badgeStyle = 'bg-[#15621B] text-white border-transparent';
                            } else if (view === 'marketing') {
                                headerStyle = 'bg-pink-50 border-t-pink-500 border-b-pink-100';
                                titleColor = 'text-pink-700';
                                badgeStyle = 'bg-pink-500 text-white border-transparent';
                            } else {
                                headerStyle = 'bg-[#373737]/5 border-t-[#373737] border-b-[#373737]/10';
                                titleColor = 'text-[#373737]';
                                badgeStyle = 'bg-[#373737] text-white border-transparent';
                            }

                            return (
                                <div key={col} className={`flex-1 min-w-[200px] flex flex-col bg-gray-50/50 rounded-xl border ${columnBorder}`}>
                                    <div className={`p-3 border-b flex items-center justify-between rounded-t-xl border-t-4 ${headerStyle}`}>
                                        <span className={`font-bold text-sm ${titleColor}`}>{col}</span>
                                        <span className={`font-bold text-xs px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                            {view === 'sales' ? deals.filter(d => d.status === col).length : view === 'marketing' ? marketingTasks.filter(t => t.status === col).length : projects.filter(p => p.status === col).length}
                                        </span>
                                    </div>
                                    <div className="p-2 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                                        {/* Render Cards Logic */}
                                        {view === 'sales' && deals.filter(d => d.status === col).map(deal => (
                                            <div
                                                key={deal.id}
                                                className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-shadow relative hover:border-[#15621B]/40 cursor-pointer"
                                                onClick={() => setDetailDeal(deal)}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-gray-900 text-sm">{deal.clientName}</h4>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); deleteItem(deal.id); }}
                                                        className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-600 font-medium mb-3">{deal.service}</p>
                                                <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-3">
                                                    <span className="flex items-center gap-1 bg-green-50 text-green-800 border border-green-100 px-1.5 py-0.5 rounded font-bold"><DollarSign size={10} /> {deal.value}</span>
                                                    <span className="text-gray-500 font-medium">{deal.lastContact}</span>
                                                </div>
                                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                                    <select className="w-full text-xs p-1.5 border border-gray-300 rounded bg-gray-50 text-gray-800 outline-none focus:border-[#15621B] font-medium" value={deal.status} onChange={(e) => updateDealStatus(deal.id, e.target.value as DealStatus)}>
                                                        {salesColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                    <button onClick={() => setAutopilotDeal(deal)} className="w-full flex items-center justify-center gap-1 text-xs bg-gray-800 text-white py-1.5 rounded hover:bg-black transition-colors font-bold"><Zap size={12} className="text-[#FBEFD0]" /> Manage / Autopilot</button>
                                                </div>
                                            </div>
                                        ))}
                                        {view === 'marketing' && marketingTasks.filter(t => t.status === col).map(task => (
                                            <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-shadow border-l-4 border-l-pink-500">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{task.title}</h4>
                                                    <button onClick={() => deleteItem(task.id)} className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                                </div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 font-bold ${task.platform === 'Instagram' ? 'bg-pink-50 text-pink-800 border border-pink-100' : 'bg-blue-50 text-blue-800 border border-blue-100'}`}>{getPlatformIcon(task.platform)} {task.platform}</span>
                                                    <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 font-medium">{getTypeIcon(task.contentType)} {task.contentType}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-2"><span className="flex items-center gap-1 font-medium"><Calendar size={10} /> {task.dueDate}</span></div>
                                                <select className="w-full text-xs p-1.5 border border-gray-300 rounded bg-gray-50 text-gray-800 outline-none focus:border-pink-500 font-medium" value={task.status} onChange={(e) => updateMarketingStatus(task.id, e.target.value as MarketingStatus)}>
                                                    {marketingColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                        {view === 'tech' && projects.filter(p => p.status === col).map(proj => (
                                            <div key={proj.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-shadow border-l-4 border-l-gray-700">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-gray-900 text-sm">{proj.clientName}</h4>
                                                    <button onClick={() => deleteItem(proj.id)} className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                                </div>
                                                <p className="text-xs text-gray-700 mb-3 line-clamp-2 font-medium">{proj.featureSummary}</p>
                                                <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-3">
                                                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-bold border ${proj.status === 'Deployed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-orange-50 text-orange-800 border-orange-200'}`}><Calendar size={10} /> {proj.deadline}</span>
                                                </div>
                                                <select className="w-full text-xs p-1.5 border border-gray-300 rounded bg-gray-50 text-gray-800 outline-none focus:border-[#373737] font-medium" value={proj.status} onChange={(e) => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}>
                                                    {techColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Deal Detail Panel ── */}
            <DealDetailPanel
                deal={detailDeal}
                onClose={() => setDetailDeal(null)}
                onUpdateDeal={handlePanelUpdate}
            />
        </div>
    );
};

export default CRM;
