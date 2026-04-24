
import React from 'react';
import { LayoutDashboard, PhoneCall, Handshake, FileText, Code2, Menu, X, Users, Settings, Database, Mail, Brain, CalendarDays } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'brain', label: 'The Brain', icon: Brain },
        { id: 'crm', label: 'CRM & Pipeline', icon: Users },
        { id: 'sales', label: 'Call Assistant', icon: PhoneCall },
        { id: 'outreach', label: 'Sales Outreach', icon: Mail },
        { id: 'explainer', label: 'Service Explainer', icon: Handshake },
        { id: 'handover', label: 'Tech Handover', icon: Code2 },
        { id: 'meetings', label: 'Meetings', icon: CalendarDays },
        { id: 'storage', label: 'Data Storage', icon: Database },
        { id: 'integrations', label: 'Integrations', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#15621B] text-white transition-transform duration-200 ease-in-out flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <BrandLogo className="w-10 h-10" />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-wide leading-tight">Bokle AI</span>
                            <span className="text-[10px] text-bokle-peach font-bold uppercase tracking-widest">Founder OS</span>
                        </div>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-white/70 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2 custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                                    isActive 
                                        ? 'bg-[#FBEFD0] text-[#15621B] font-bold shadow-lg shadow-black/10' 
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-bokle-neon"></div>
                                )}
                                <item.icon size={20} className={isActive ? 'text-[#15621B]' : 'text-white/60 group-hover:text-white'} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-6 bg-[#0e4412] shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-bokle-neon animate-pulse"></div>
                        <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">System Online</span>
                    </div>
                    <p className="text-xs text-white/40">Bokle AI v1.2.0</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F3F4F6]">
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between lg:justify-end shrink-0">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-600">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                         <BrandLogo className="w-5 h-5" />
                        <span>AI Assistant Ready</span>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
