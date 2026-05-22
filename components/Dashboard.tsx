import React, { useEffect, useState } from 'react';
import { PhoneCall, Code2, Users, Cloud, Brain, Mail, Handshake, AlertCircle, CalendarCheck } from 'lucide-react';
import { DataService } from '../services/storageService';
import { Milestone } from '../types';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
}

const quickActions = [
    {
        id: 'crm',
        icon: Users,
        title: 'Pipeline',
        desc: 'View and manage your deals and leads.',
        color: '#15621B',
    },
    {
        id: 'sales',
        icon: PhoneCall,
        title: 'Call Prep',
        desc: 'Get a script, objection handling, and talking points.',
        color: '#239A2C',
    },
    {
        id: 'handover',
        icon: Code2,
        title: 'Handover',
        desc: 'Turn agreed scope into technical tickets for your dev team.',
        color: '#010801',
    },
    {
        id: 'brain',
        icon: Brain,
        title: 'AI Brain',
        desc: 'Ask anything about your pipeline, strategy, or clients.',
        color: '#15621B',
    },
    {
        id: 'outreach',
        icon: Mail,
        title: 'Outreach',
        desc: 'Build and manage your prospect list and sequences.',
        color: '#239A2C',
    },
    {
        id: 'explainer',
        icon: Handshake,
        title: 'Services',
        desc: 'Explain any Bokle AI service clearly to a client.',
        color: '#010801',
    },
];

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
    const [isCloudActive, setIsCloudActive] = useState(false);
    const [overdueMilestones, setOverdueMilestones] = useState<Milestone[]>([]);
    const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);

    useEffect(() => {
        setIsCloudActive(DataService.isCloudEnabled());
        DataService.getMilestones().then(all => {
            const today = new Date();
            const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            setOverdueMilestones(all.filter(m => m.status === 'overdue'));
            setUpcomingMilestones(all.filter(m => {
                if (m.status !== 'upcoming') return false;
                const due = new Date(m.dueDate);
                return due <= sevenDaysOut && due >= today;
            }));
        });
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">

            {/* Hero */}
            <div className="rounded-2xl p-8 text-white relative overflow-hidden" style={{ backgroundColor: '#010801' }}>
                <div className="absolute inset-0 opacity-20" style={{
                    background: 'radial-gradient(ellipse at 70% 50%, #15621B 0%, transparent 70%)'
                }} />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">Bokle AI · Internal CRM</p>
                        <h1 className="text-3xl font-bold tracking-tight mb-1">Welcome back, Gautam.</h1>
                        <p className="text-white/55 text-sm font-medium">Make Your Business Glide.</p>
                    </div>
                    {isCloudActive && (
                        <div className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 shrink-0">
                            <Cloud size={15} className="text-bokle-rainbow" />
                            <span className="text-white/70">Synced with Supabase</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={() => setActiveTab(action.id)}
                            className="bg-white text-left p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-opacity"
                                style={{ backgroundColor: action.color + '12' }}
                            >
                                <action.icon size={18} style={{ color: action.color }} />
                            </div>
                            <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-bokle-green transition-colors">
                                {action.title}
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{action.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Milestone alerts */}
            {(overdueMilestones.length > 0 || upcomingMilestones.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {overdueMilestones.length > 0 && (
                        <button
                            onClick={() => setActiveTab('delivery')}
                            className="flex items-start gap-3 bg-white rounded-xl border border-red-100 px-5 py-4 shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FEF2F2' }}>
                                <AlertCircle size={16} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{overdueMilestones.length} Overdue Milestone{overdueMilestones.length > 1 ? 's' : ''}</p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                    {overdueMilestones.slice(0, 2).map(m => m.title).join(', ')}
                                    {overdueMilestones.length > 2 ? ` +${overdueMilestones.length - 2} more` : ''}
                                </p>
                            </div>
                        </button>
                    )}
                    {upcomingMilestones.length > 0 && (
                        <button
                            onClick={() => setActiveTab('delivery')}
                            className="flex items-start gap-3 bg-white rounded-xl border border-amber-100 px-5 py-4 shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFFBEB' }}>
                                <CalendarCheck size={16} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{upcomingMilestones.length} Due This Week</p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">
                                    {upcomingMilestones.slice(0, 2).map(m => m.title).join(', ')}
                                    {upcomingMilestones.length > 2 ? ` +${upcomingMilestones.length - 2} more` : ''}
                                </p>
                            </div>
                        </button>
                    )}
                </div>
            )}

            {/* Cloud prompt if not connected */}
            {!isCloudActive && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-5 py-4 shadow-sm">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">You're in local mode</p>
                        <p className="text-xs text-gray-400 mt-0.5">Data is only saved to this browser. Connect Supabase to sync across devices.</p>
                    </div>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        className="text-sm font-semibold px-4 py-2 rounded-lg text-white shrink-0 ml-4 transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#15621B' }}
                    >
                        Connect
                    </button>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
