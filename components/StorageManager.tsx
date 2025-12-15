
import React, { useState, useEffect } from 'react';
import { Database, Trash2, RefreshCw, AlertTriangle, FileText, CheckCircle2, Server, Cloud, Package, Users, Megaphone, Send } from 'lucide-react';
import { DataService } from '../services/storageService';
import { Deal, Project, MarketingTask, DealArtifact, OutreachLead } from '../types';

type Category = 'deals' | 'projects' | 'marketing_tasks' | 'deal_artifacts' | 'outreach_leads';

const StorageManager: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<Category>('deals');
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCloud, setIsCloud] = useState(false);
    
    // Stats
    const [counts, setCounts] = useState({
        deals: 0,
        projects: 0,
        marketing: 0,
        artifacts: 0,
        outreach_leads: 0
    });

    const refreshData = async () => {
        setIsLoading(true);
        setIsCloud(DataService.isCloudEnabled());
        
        // Fetch All
        const [d, p, m, a, l] = await Promise.all([
            DataService.getDeals(),
            DataService.getProjects(),
            DataService.getMarketing(),
            DataService.getArtifacts(),
            DataService.getOutreachLeads()
        ]);

        setCounts({
            deals: d.length,
            projects: p.length,
            marketing: m.length,
            artifacts: a.length,
            outreach_leads: l.length
        });

        // Set Active Data
        if (activeCategory === 'deals') setData(d);
        else if (activeCategory === 'projects') setData(p);
        else if (activeCategory === 'marketing_tasks') setData(m);
        else if (activeCategory === 'deal_artifacts') setData(a);
        else if (activeCategory === 'outreach_leads') setData(l);

        setIsLoading(false);
    };

    useEffect(() => {
        refreshData();
    }, [activeCategory]);

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this record?")) return;
        
        if (activeCategory === 'deals') await DataService.deleteDeal(id);
        else if (activeCategory === 'projects') await DataService.deleteProject(id);
        else if (activeCategory === 'marketing_tasks') await DataService.deleteMarketing(id);
        else if (activeCategory === 'outreach_leads') await DataService.deleteOutreachLead(id);
        // Artifacts don't have a specific deleteSingle method in service yet
        
        refreshData();
    };

    const handleClearTable = async () => {
        const confirmMsg = `WARNING: This will delete ALL ${activeCategory.replace('_', ' ').toUpperCase()} records. This cannot be undone. Are you sure?`;
        if (window.confirm(confirmMsg)) {
            await DataService.clearTable(activeCategory);
            refreshData();
        }
    };

    // Helper to render row based on type with High Contrast Text
    const renderRow = (item: any) => {
        if (activeCategory === 'deals') {
            const d = item as Deal;
            return (
                <>
                    <td className="p-4">
                        <div className="font-bold text-gray-900 text-base">{d.clientName}</div>
                        <div className="text-xs text-gray-600 mt-1">ID: {d.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-4 text-gray-800 font-medium">{d.service}</td>
                    <td className="p-4 text-gray-800 font-mono">{d.value}</td>
                    <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            d.status === 'Closed Won' 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                            {d.status}
                        </span>
                    </td>
                </>
            );
        }
        if (activeCategory === 'projects') {
            const p = item as Project;
            return (
                <>
                    <td className="p-4">
                        <div className="font-bold text-gray-900 text-base">{p.clientName}</div>
                    </td>
                    <td className="p-4 text-gray-700 truncate max-w-xs text-sm">{p.featureSummary}</td>
                    <td className="p-4 text-gray-800 font-medium">{p.deadline}</td>
                    <td className="p-4">
                        <span className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-200">
                            {p.status}
                        </span>
                    </td>
                </>
            );
        }
        if (activeCategory === 'marketing_tasks') {
            const m = item as MarketingTask;
            return (
                <>
                    <td className="p-4">
                        <div className="font-bold text-gray-900 text-base">{m.title}</div>
                    </td>
                    <td className="p-4 text-gray-800">{m.platform}</td>
                    <td className="p-4 text-gray-800">{m.contentType}</td>
                    <td className="p-4">
                        <span className="bg-pink-50 text-pink-800 px-3 py-1.5 rounded-full text-xs font-bold border border-pink-200">
                            {m.status}
                        </span>
                    </td>
                </>
            );
        }
        if (activeCategory === 'deal_artifacts') {
            const a = item as DealArtifact;
            return (
                <>
                    <td className="p-4">
                        <div className="font-bold text-gray-900 text-base">{a.title}</div>
                        <div className="text-xs text-gray-500 mt-1">Doc ID: {a.id.slice(0, 6)}...</div>
                    </td>
                    <td className="p-4 text-gray-800 font-medium">{a.stage}</td>
                    <td className="p-4 text-gray-600 text-sm font-medium">{new Date(a.lastUpdated).toLocaleString()}</td>
                    <td className="p-4">
                        <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-bold border border-blue-100">Saved Doc</span>
                    </td>
                </>
            );
        }
        if (activeCategory === 'outreach_leads') {
            const l = item as OutreachLead;
            return (
                <>
                    <td className="p-4">
                        <div className="font-bold text-gray-900 text-base">{l.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{l.role} @ {l.company}</div>
                    </td>
                    <td className="p-4 text-gray-800 text-sm truncate max-w-[150px]">{l.email || '-'}</td>
                    <td className="p-4 text-gray-600 text-sm">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="p-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                            l.status === 'Contacted' ? 'bg-green-100 text-green-800 border-green-200' : 
                            l.status === 'Generated' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                            'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                            {l.status}
                        </span>
                    </td>
                </>
            );
        }
        return null;
    };

    const getCategoryIcon = (cat: Category) => {
        if (cat === 'deals') return <Users size={24} />;
        if (cat === 'projects') return <Package size={24} />;
        if (cat === 'marketing_tasks') return <Megaphone size={24} />;
        if (cat === 'outreach_leads') return <Send size={24} />;
        return <FileText size={24} />;
    };

    const getCategoryLabel = (cat: Category) => {
        if (cat === 'deals') return 'Active Deals';
        if (cat === 'projects') return 'Projects';
        if (cat === 'marketing_tasks') return 'Marketing';
        if (cat === 'outreach_leads') return 'Outreach Leads';
        return 'Documents';
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Data Storage</h2>
                    <p className="text-gray-600 font-medium mt-1">Manage {isCloud ? 'Supabase' : 'Local'} records.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold border flex items-center gap-2 shadow-sm ${isCloud ? 'bg-green-50 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                        {isCloud ? <Cloud size={16} /> : <Database size={16} />}
                        {isCloud ? 'Supabase Connected' : 'Local Storage'}
                    </span>
                    <button 
                        onClick={refreshData} 
                        className="p-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-sm transition-all hover:border-gray-400"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Stats Cards - Large Click Targets */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {(['deals', 'projects', 'marketing_tasks', 'outreach_leads', 'deal_artifacts'] as Category[]).map((cat) => {
                    const isActive = activeCategory === cat;
                    // @ts-ignore
                    const count = counts[cat];
                    
                    return (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`
                                relative p-4 rounded-2xl border-2 transition-all duration-200 text-left group
                                ${isActive 
                                    ? 'bg-gray-900 border-gray-900 text-white shadow-lg scale-[1.02]' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'}
                            `}
                        >
                            <div className={`mb-3 ${isActive ? 'text-[#FBEFD0]' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                {getCategoryIcon(cat)}
                            </div>
                            <div className={`text-2xl font-extrabold ${isActive ? 'text-white' : 'text-gray-900'}`}>
                                {count}
                            </div>
                            <div className={`text-xs font-bold uppercase tracking-wider mt-1 truncate ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                                {getCategoryLabel(cat)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Main Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 capitalize">
                        <Server size={20} className="text-gray-500" />
                        {activeCategory.replace('_', ' ')} Records
                    </h3>
                    
                    {data.length > 0 && (
                        <button 
                            onClick={handleClearTable}
                            className="text-sm bg-white text-red-700 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 hover:border-red-300 flex items-center gap-2 font-bold transition-colors shadow-sm"
                        >
                            <Trash2 size={16} /> 
                            Delete Table ({data.length})
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b-2 border-gray-200">
                            <tr>
                                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wide w-1/3">Name / ID</th>
                                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wide">Detail 1</th>
                                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wide">Detail 2</th>
                                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wide">Status</th>
                                <th className="p-4 text-sm font-bold text-gray-700 uppercase tracking-wide text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500">
                                            <div className="animate-spin mb-2"><RefreshCw size={24} /></div>
                                            <p className="font-medium">Loading data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <p className="font-bold text-lg text-gray-400">No records found.</p>
                                        <p className="text-sm mt-1">This table is clean.</p>
                                    </td>
                                </tr>
                            ) : (
                                data.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                        {renderRow(item)}
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs text-gray-500 font-medium text-center">
                    Showing {data.length} records • {isCloud ? 'Synced with Supabase' : 'Stored Locally'}
                </div>
            </div>
        </div>
    );
};

export default StorageManager;
