import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateHandover } from '../services/geminiService';
import { Loader2, ArrowRight } from 'lucide-react';

const HandoverHelper: React.FC = () => {
    const [clientName, setClientName] = useState('');
    const [scope, setScope] = useState('');
    const [timeline, setTimeline] = useState('5-7 Days');
    const [handoverDoc, setHandoverDoc] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await generateHandover(clientName, scope, timeline);
        setHandoverDoc(result);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-[#373737]">Internal Handover Helper</h2>
                <p className="text-gray-500">Convert your client conversations into strict technical requirements for the team.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="font-bold text-lg mb-4 text-[#15621B]">Deal Info</h3>
                    <form onSubmit={handleGenerate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] outline-none text-black"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Scope (Your words)</label>
                            <textarea
                                rows={6}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] outline-none resize-none text-black"
                                placeholder="e.g. They want a chatbot on their site that answers FAQs and collects emails. Needs to look like their brand."
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Promised Timeline</label>
                            <input
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#15621B] outline-none text-black"
                                value={timeline}
                                onChange={(e) => setTimeline(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#373737] text-white py-2 px-4 rounded-md font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                            Translate for Tech Team
                        </button>
                    </form>
                </div>

                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[500px]">
                    <h3 className="font-bold text-lg mb-4 text-[#15621B] flex items-center justify-between">
                        <span>Technical Ticket</span>
                        {handoverDoc && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Ready to Copy</span>
                        )}
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 h-full min-h-[400px]">
                        {handoverDoc ? (
                            <div className="prose prose-sm prose-headings:text-[#373737] text-gray-800 max-w-none">
                                <ReactMarkdown>{handoverDoc}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center mt-20">Input the deal details to generate a clean tech ticket.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HandoverHelper;