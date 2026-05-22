import React from 'react';
import { LayoutDashboard, PhoneCall, Code2, Menu, X, Users, Settings, Database, Mail, Brain, CalendarDays, Handshake, GitBranch, FileText } from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
        { id: 'brain',       label: 'AI Brain',     icon: Brain },
        { id: 'crm',         label: 'Pipeline',     icon: Users },
        { id: 'sales',       label: 'Call Prep',    icon: PhoneCall },
        { id: 'outreach',    label: 'Outreach',     icon: Mail },
        { id: 'explainer',   label: 'Services',     icon: Handshake },
        { id: 'handover',    label: 'Handover',     icon: Code2 },
        { id: 'delivery',    label: 'Delivery',     icon: GitBranch },
        { id: 'documents',   label: 'Documents',    icon: FileText },
        { id: 'meetings',    label: 'Meetings',     icon: CalendarDays },
        { id: 'storage',     label: 'Storage',      icon: Database },
        { id: 'integrations',label: 'Integrations', icon: Settings },
    ];

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F4F6F4', fontFamily: "'DM Sans', sans-serif" }}>
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-30 w-60 flex flex-col transition-transform duration-200 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `} style={{ backgroundColor: '#010801' }}>

                {/* Logo */}
                <div className="px-6 py-6 shrink-0 flex items-center justify-between">
                    <BrandLogo variant="white" className="h-7" />
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto py-2">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                    isActive
                                        ? 'text-white'
                                        : 'text-white/45 hover:text-white/80 hover:bg-white/5'
                                }`}
                                style={isActive ? { backgroundColor: '#15621B' } : {}}
                            >
                                <item.icon size={17} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-6 py-5 shrink-0 border-t border-white/8">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-bokle-erin animate-pulse"></div>
                        <span className="text-[11px] text-white/30 font-medium tracking-wide">Online</span>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F4F6F4]">
                {/* Header */}
                <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between shrink-0">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-500">
                        <Menu size={22} />
                    </button>
                    <div className="hidden lg:block" />
                    <div className="flex items-center gap-2">
                        <BrandLogo variant="mascot" className="h-7 w-7" />
                        <span className="text-sm font-semibold text-gray-700">Bokle AI</span>
                        <span className="ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider" style={{ backgroundColor: '#15621B' }}>
                            Internal
                        </span>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
