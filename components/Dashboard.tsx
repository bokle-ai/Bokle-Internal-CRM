import React from 'react';
import { PhoneCall, Code2, FileText, CheckCircle2, Users } from 'lucide-react';

interface DashboardProps {
    setActiveTab: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
    return (
        <div className="space-y-8">
            <div className="bg-gradient-to-r from-[#15621B] to-[#1e7a25] rounded-2xl p-8 text-white shadow-lg">
                <h1 className="text-3xl font-bold mb-2">Welcome back, Gautam.</h1>
                <p className="text-[#FBEFD0] text-lg opacity-90">
                    Let's make Bokle AI glide today. What's on your agenda?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                    onClick={() => setActiveTab('crm')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#15621B] group-hover:text-white transition-colors">
                        <Users />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">CRM Pipeline</h3>
                    <p className="text-gray-500 text-sm">Manage Leads, Deals, and Active Tech Projects.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('sales')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-green-100 text-[#15621B] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#15621B] group-hover:text-white transition-colors">
                        <PhoneCall />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Prep for a Call</h3>
                    <p className="text-gray-500 text-sm">Get scripts, questions, and objection handling.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('handover')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-gray-100 text-[#373737] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#373737] group-hover:text-white transition-colors">
                        <Code2 />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Handover to Tech</h3>
                    <p className="text-gray-500 text-sm">Generate technical tickets for the dev team.</p>
                </div>

                <div 
                    onClick={() => setActiveTab('documents')}
                    className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                    <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#FBEFD0] group-hover:text-[#15621B] transition-colors">
                        <FileText />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Create Proposal</h3>
                    <p className="text-gray-500 text-sm">Draft proposals and contracts instantly.</p>
                </div>
            </div>

            <div className="bg-[#FBEFD0] rounded-xl p-6 border border-[#e6dcc0]">
                <h3 className="font-bold text-[#15621B] flex items-center gap-2 mb-4">
                    <CheckCircle2 size={20} />
                    Quick Strategy Reminder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[#373737]">
                    <ul className="space-y-2">
                        <li className="font-semibold">MVP Focus:</li>
                        <li>1. Sales & Marketing (Lead Scoring, Chatbots)</li>
                        <li>2. Retail & E-Commerce (Product Desc, Pricing)</li>
                    </ul>
                    <ul className="space-y-2">
                        <li className="font-semibold">Bokle Value Props:</li>
                        <li>• "Make Your Business Glide"</li>
                        <li>• 5-7 Day Delivery (Speed is key)</li>
                        <li>• No complex integration needed</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;