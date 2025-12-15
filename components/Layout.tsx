
import React from 'react';
import { LayoutDashboard, PhoneCall, Handshake, FileText, Code2, Menu, X, Users, Settings, Database } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'crm', label: 'CRM & Pipeline', icon: Users },
        { id: 'sales', label: 'Call Assistant', icon: PhoneCall },
        { id: 'explainer', label: 'Service Explainer', icon: Handshake },
        { id: 'handover', label: 'Tech Handover', icon: Code2 },
        { id: 'documents', label: 'Doc Generator', icon: FileText },
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
                fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#15621B] text-white transition-transform duration-200 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Custom Sugar Glider Mascot Logo - Updated to match Brand Image */}
                        <div className="w-10 h-10 bg-[#FBEFD0] rounded-full flex items-center justify-center shadow-md overflow-hidden border-2 border-white shrink-0">
                            <svg viewBox="0 0 120 120" className="w-full h-full">
                                {/* Ears */}
                                <path d="M15 25 Q5 5 40 10" fill="#373737" /> {/* Left Ear Outer */}
                                <path d="M105 25 Q115 5 80 10" fill="#373737" /> {/* Right Ear Outer */}
                                <path d="M22 28 Q15 15 35 18" fill="#E8A996" /> {/* Left Ear Inner */}
                                <path d="M98 28 Q105 15 85 18" fill="#E8A996" /> {/* Right Ear Inner */}
                                
                                {/* Head Outline/Face */}
                                <path d="M20 50 C20 90 40 105 60 105 C80 105 100 90 100 50 C100 25 80 20 60 20 C40 20 20 25 20 50" fill="#FDF6E3" stroke="#373737" strokeWidth="2" />
                                
                                {/* Forehead Dark Pattern */}
                                <path d="M60 20 L40 45 Q60 65 80 45 Z" fill="#373737" />
                                
                                {/* Green Tech Lines - Distinctive Brand Feature */}
                                <path d="M60 25 L60 40" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" /> 
                                <path d="M50 32 L55 37" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />
                                <path d="M70 32 L65 37" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" />

                                {/* Side Stripes on Face (Dark) */}
                                <path d="M22 60 L35 70 L25 80 Z" fill="#373737" opacity="0.9" />
                                <path d="M98 60 L85 70 L95 80 Z" fill="#373737" opacity="0.9" />

                                {/* Eyes */}
                                <ellipse cx="40" cy="65" rx="12" ry="15" fill="#15803d" stroke="#373737" strokeWidth="2" />
                                <ellipse cx="80" cy="65" rx="12" ry="15" fill="#15803d" stroke="#373737" strokeWidth="2" />
                                <circle cx="44" cy="60" r="4" fill="white" />
                                <circle cx="76" cy="60" r="4" fill="white" />

                                {/* Nose & Mouth */}
                                <path d="M52 88 Q60 95 68 88" stroke="#373737" strokeWidth="2" fill="none" strokeLinecap="round" />
                                <ellipse cx="60" cy="84" rx="5" ry="3" fill="#E8A996" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-wide">Bokle AI</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                activeTab === item.id 
                                    ? 'bg-[#FBEFD0] text-[#15621B] font-medium shadow-md' 
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="absolute bottom-0 w-full p-6 bg-[#0e4412]">
                    <p className="text-xs text-white/60">Bokle AI Internal Tool</p>
                    <p className="text-xs text-white/40 mt-1">v1.1.0 • Founder Edition</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between lg:justify-end">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-gray-600">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        AI Systems Operational
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
