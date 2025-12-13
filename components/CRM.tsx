
import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Calendar, Zap, Trash2, Megaphone, Instagram, Linkedin, Video, Image, FileText, Code, Briefcase, Loader2, Cloud, CloudOff } from 'lucide-react';
import { Deal, DealStatus, Project, ProjectStatus, MarketingTask, MarketingStatus } from '../types';
import LifecycleAutopilot from './LifecycleAutopilot';
import { DataService } from '../services/storageService';

const CRM: React.FC = () => {
    const [view, setView] = useState<'sales' | 'tech' | 'marketing'>('sales');
    const [isLoading, setIsLoading] = useState(true);
    const [isCloud, setIsCloud] = useState(false);
    
    // State
    const [deals, setDeals] = useState<Deal[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [marketingTasks, setMarketingTasks] = useState<MarketingTask[]>([]);
    
    // Load Data Effect
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setIsCloud(DataService.isCloudEnabled());
            
            const [d, p, m] = await Promise.all([
                DataService.getDeals(),
                DataService.getProjects(),
                DataService.getMarketing()
            ]);

            setDeals(d);
            setProjects(p);
            setMarketingTasks(m);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    // Autopilot State
    const [autopilotDeal, setAutopilotDeal] = useState<Deal | null>(null);

    // Form States
    const [isAdding, setIsAdding] = useState(false);
    
    // Shared inputs
    const [input1, setInput1] = useState(''); // ClientName or Title
    const [input2, setInput2] = useState(''); // Value or Deadline or DueDate
    const [input3, setInput3] = useState(''); // Service or Feature or ContentType
    const [input4, setInput4] = useState(''); // Platform (Marketing only)

    // Sales Columns
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
            setDeals(prev => [...prev, newDeal]); // Optimistic Update
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
        
        resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setInput1('');
        setInput2('');
        setInput3('');
        setInput4('');
    };

    const updateDealStatus = async (id: string, newStatus: DealStatus) => {
        const deal = deals.find(d => d.id === id);
        if (deal) {
            const updated = { ...deal, status: newStatus };
            setDeals(prev => prev.map(d => d.id === id ? updated : d));
            await DataService.saveDeal(updated);
        }
    };

    const updateProjectStatus = async (id: string, newStatus: ProjectStatus) => {
        const project = projects.find(p => p.id === id);
        if (project) {
            const updated = { ...project, status: newStatus };
            setProjects(prev => prev.map(p => p.id === id ? updated : p));
            await DataService.saveProject(updated);
        }
    };

    const updateMarketingStatus = async (id: string, newStatus: MarketingStatus) => {
        const task = marketingTasks.find(t => t.id === id);
        if (task) {
            const updated = { ...task, status: newStatus };
            setMarketingTasks(prev => prev.map(t => t.id === id ? updated : t));
            await DataService.saveMarketing(updated);
        }
    };

    const deleteItem = async (id: string) => {
        if (view === 'sales') {
            setDeals(prev => prev.filter(d => d.id !== id));
            await DataService.deleteDeal(id);
        }
        if (view === 'tech') {
            setProjects(prev => prev.filter(p => p.id !== id));
            await DataService.deleteProject(id);
        }
        if (view === 'marketing') {
            setMarketingTasks(prev => prev.filter(t => t.id !== id));
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
                            <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                                <Cloud size={12} /> Supabase Sync Active
                            </span>
                        ) : (
                            <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1" title="Data stored in browser only">
                                <CloudOff size={12} /> Local Mode
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-500">One place for Sales, Development, and Marketing.</p>
                </div>
                
                <div className="flex bg-gray-200 p-1 rounded-lg self-start overflow-x-auto">
                    <button onClick={() => setView('sales')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${view === 'sales' ? 'bg-white text-[#15621B] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Briefcase size={16} /> Sales
                    </button>
                    <button onClick={() => setView('marketing')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${view === 'marketing' ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Megaphone size={16} /> Content
                    </button>
                    <button onClick={() => setView('tech')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${view === 'tech' ? 'bg-white text-[#373737] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                        <Code size={16} /> Tech
                    </button>
                </div>
            </div>

            {/* Add New Button Area */}
            {!isAdding ? (
                <button 
                    onClick={() => setIsAdding(true)}
                    className={`flex items-center gap-2 font-medium hover:bg-opacity-10 p-2 rounded-lg w-fit transition-colors ${
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
                    className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2"
                >
                    <div className="flex-1 w-full">
                        <label className="text-xs font-semibold text-gray-500 uppercase">
                            {view === 'sales' ? 'Client Name' : view === 'marketing' ? 'Content Topic' : 'Client Name'}
                        </label>
                        <input className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none text-black" value={input1} onChange={e => setInput1(e.target.value)} required placeholder={view === 'marketing' ? "e.g. 5 AI Hacks" : "e.g. Acme Corp"} />
                    </div>
                    
                    {view === 'marketing' ? (
                        <>
                            <div className="w-32">
                                <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
                                <select className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none bg-white text-black" value={input3} onChange={e => setInput3(e.target.value)}>
                                    <option value="Post">Post</option>
                                    <option value="Reel">Reel</option>
                                    <option value="Carousel">Carousel</option>
                                </select>
                            </div>
                            <div className="w-32">
                                <label className="text-xs font-semibold text-gray-500 uppercase">Platform</label>
                                <select className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none bg-white text-black" value={input4} onChange={e => setInput4(e.target.value)}>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="Instagram">Instagram</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 w-full">
                            <label className="text-xs font-semibold text-gray-500 uppercase">{view === 'sales' ? 'Service' : 'Feature Summary'}</label>
                            <input className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none text-black" value={input3} onChange={e => setInput3(e.target.value)} required placeholder={view === 'sales' ? "Chatbot" : "Core API"} />
                        </div>
                    )}

                    <div className="w-32">
                        <label className="text-xs font-semibold text-gray-500 uppercase">{view === 'sales' ? 'Value' : 'Deadline'}</label>
                        <input className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#15621B] outline-none text-black" value={input2} onChange={e => setInput2(e.target.value)} required placeholder={view === 'sales' ? "$1000" : "Oct 30"} />
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#15621B] text-white rounded hover:bg-[#0e4412]">Add</button>
                    </div>
                </form>
            )}

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-2 text-[#15621B]" />
                    <p>Loading your data...</p>
                </div>
            ) : (
                /* Kanban Board */
                <div className="flex-1 overflow-x-auto">
                    <div className="flex gap-4 min-w-[1200px] h-full pb-4">
                        {(view === 'sales' ? salesColumns : view === 'marketing' ? marketingColumns : techColumns).map((col) => (
                            <div key={col} className="flex-1 min-w-[200px] flex flex-col bg-gray-100/50 rounded-xl border border-gray-200">
                                <div className={`p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl ${view === 'marketing' ? 'border-t-4 border-t-pink-200' : ''} ${view === 'tech' ? 'border-t-4 border-t-gray-300' : ''} ${view === 'sales' ? 'border-t-4 border-t-green-200' : ''}`}>
                                    <span className="font-bold text-gray-700 text-sm">{col}</span>
                                    <span className="bg-white text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200">
                                        {view === 'sales' ? deals.filter(d => d.status === col).length : view === 'marketing' ? marketingTasks.filter(t => t.status === col).length : projects.filter(p => p.status === col).length}
                                    </span>
                                </div>
                                <div className="p-2 space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                                    {/* Render Cards Logic (Identical to previous but using new async handlers) */}
                                    {view === 'sales' && deals.filter(d => d.status === col).map(deal => (
                                        <div key={deal.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-shadow relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-[#373737]">{deal.clientName}</h4>
                                                <button onClick={() => deleteItem(deal.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3">{deal.service}</p>
                                            <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-3">
                                                <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded"><DollarSign size={10} /> {deal.value}</span>
                                                <span className="text-gray-400 font-normal">{deal.lastContact}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <select className="w-full text-xs p-1 border border-gray-200 rounded bg-gray-50 text-gray-600 outline-none focus:border-[#15621B] text-black bg-white" value={deal.status} onChange={(e) => updateDealStatus(deal.id, e.target.value as DealStatus)}>
                                                    {salesColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <button onClick={() => setAutopilotDeal(deal)} className="w-full flex items-center justify-center gap-1 text-xs bg-[#373737] text-white py-1.5 rounded hover:bg-black transition-colors"><Zap size={12} className="text-[#FBEFD0]" /> Manage / Autopilot</button>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Marketing & Tech Cards rendered similarly... */}
                                    {view === 'marketing' && marketingTasks.filter(t => t.status === col).map(task => (
                                        <div key={task.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-shadow border-l-4 border-l-pink-500">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-[#373737] text-sm line-clamp-2">{task.title}</h4>
                                                <button onClick={() => deleteItem(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 font-medium ${task.platform === 'Instagram' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>{getPlatformIcon(task.platform)} {task.platform}</span>
                                                <span className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 flex items-center gap-1">{getTypeIcon(task.contentType)} {task.contentType}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-400 mb-2"><span className="flex items-center gap-1"><Calendar size={10} /> {task.dueDate}</span></div>
                                            <select className="w-full text-xs p-1 border border-gray-200 rounded bg-gray-50 text-gray-600 outline-none focus:border-pink-500 text-black bg-white" value={task.status} onChange={(e) => updateMarketingStatus(task.id, e.target.value as MarketingStatus)}>
                                                {marketingColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    {view === 'tech' && projects.filter(p => p.status === col).map(proj => (
                                        <div key={proj.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 group hover:shadow-md transition-shadow border-l-4 border-l-gray-700">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-[#373737]">{proj.clientName}</h4>
                                                <button onClick={() => deleteItem(proj.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{proj.featureSummary}</p>
                                            <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-3">
                                                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${proj.status === 'Deployed' ? 'bg-green-100 text-green-800' : 'bg-orange-50 text-orange-700'}`}><Calendar size={10} /> {proj.deadline}</span>
                                            </div>
                                            <select className="w-full text-xs p-1 border border-gray-200 rounded bg-gray-50 text-gray-600 outline-none focus:border-[#373737] text-black bg-white" value={proj.status} onChange={(e) => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}>
                                                {techColumns.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRM;
