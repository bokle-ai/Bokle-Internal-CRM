import React, { useState, useEffect } from 'react';
import {
    Plus, ChevronRight, ChevronDown, CheckCircle2, Circle, AlertCircle,
    Clock, Trash2, Edit2, Link, Calendar, Users, X, Save, ArrowLeft,
    BarChart2, Loader2
} from 'lucide-react';
import { DeliveryTimeline, Milestone, MilestoneStatus, TimelineTemplate, Deal } from '../types';
import { DataService } from '../services/storageService';

// ── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const addWeeks = (dateStr: string, weeks: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().slice(0, 10);
};

const today = () => new Date().toISOString().slice(0, 10);

const computeStatus = (dueDate: string, current: MilestoneStatus): MilestoneStatus => {
    if (current === 'completed') return 'completed';
    return dueDate < today() ? 'overdue' : 'upcoming';
};

const MILESTONE_TEMPLATES: Record<TimelineTemplate, { title: string; week: number }[]> = {
    '6-week': [
        { title: 'Project Kickoff', week: 0 },
        { title: 'Week 2 Check-In', week: 2 },
        { title: 'Week 4 Mid-Review', week: 4 },
        { title: 'Final UAT', week: 5 },
        { title: 'Go Live', week: 6 },
        { title: 'Post-Launch Review', week: 7 },
    ],
    '12-week': [
        { title: 'Project Kickoff', week: 0 },
        { title: 'Week 2 Review', week: 2 },
        { title: 'Week 4 Check-In', week: 4 },
        { title: 'Mid-Point Review', week: 6 },
        { title: 'Week 8 Status', week: 8 },
        { title: 'Pre-Launch Review', week: 10 },
        { title: 'Final UAT', week: 11 },
        { title: 'Go Live', week: 12 },
        { title: 'Post-Launch Review', week: 13 },
    ],
    'custom': [],
};

const statusColor = (s: MilestoneStatus) =>
    s === 'completed' ? '#15621B' : s === 'overdue' ? '#ef4444' : '#f59e0b';

const statusBg = (s: MilestoneStatus) =>
    s === 'completed' ? '#f0fdf4' : s === 'overdue' ? '#fef2f2' : '#fffbeb';

const StatusIcon = ({ status, size = 18 }: { status: MilestoneStatus; size?: number }) => {
    if (status === 'completed') return <CheckCircle2 size={size} style={{ color: '#15621B' }} />;
    if (status === 'overdue') return <AlertCircle size={size} style={{ color: '#ef4444' }} />;
    return <Circle size={size} style={{ color: '#f59e0b' }} />;
};

// ── Create Form ───────────────────────────────────────────────────────────────

interface CreateFormProps {
    deals: Deal[];
    onSave: (timeline: DeliveryTimeline, milestones: Milestone[]) => void;
    onCancel: () => void;
}

const CreateForm: React.FC<CreateFormProps> = ({ deals, onSave, onCancel }) => {
    const [clientName, setClientName] = useState('');
    const [dealId, setDealId] = useState('');
    const [template, setTemplate] = useState<TimelineTemplate>('6-week');
    const [customWeeks, setCustomWeeks] = useState(8);
    const [startDate, setStartDate] = useState(today());
    const [standupLink, setStandupLink] = useState('');

    const closedDeals = deals.filter(d => d.status === 'Closed Won');

    const handleDealSelect = (id: string) => {
        setDealId(id);
        const d = deals.find(x => x.id === id);
        if (d) setClientName(d.clientName);
    };

    const handleSave = () => {
        if (!clientName.trim()) return;
        const weeks = template === 'custom' ? customWeeks : parseInt(template);
        const id = uid();
        const newTimeline: DeliveryTimeline = {
            id,
            dealId: dealId || undefined,
            clientName: clientName.trim(),
            templateType: template,
            totalWeeks: weeks,
            startDate,
            status: 'active',
            standupLink: standupLink.trim() || undefined,
            createdAt: new Date().toISOString(),
        };

        const milestoneTemplate = template === 'custom'
            ? [{ title: 'Project Kickoff', week: 0 }, { title: 'Mid-Review', week: Math.floor(weeks / 2) }, { title: 'Go Live', week: weeks }]
            : MILESTONE_TEMPLATES[template];

        const newMilestones: Milestone[] = milestoneTemplate.map(m => ({
            id: uid(),
            timelineId: id,
            title: m.title,
            weekNumber: m.week,
            dueDate: addWeeks(startDate, m.week),
            status: computeStatus(addWeeks(startDate, m.week), 'upcoming'),
            checklist: [],
        }));

        onSave(newTimeline, newMilestones);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-5">New Delivery Timeline</h3>

            <div className="space-y-4">
                {closedDeals.length > 0 && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Link to Deal (optional)</label>
                        <select
                            value={dealId}
                            onChange={e => handleDealSelect(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-bokle-green"
                        >
                            <option value="">— select a closed deal —</option>
                            {closedDeals.map(d => (
                                <option key={d.id} value={d.id}>{d.clientName}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Client Name *</label>
                    <input
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-bokle-green"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Timeline Template</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['6-week', '12-week', 'custom'] as TimelineTemplate[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTemplate(t)}
                                className={`py-2 rounded-lg text-sm font-semibold border transition-all ${template === t ? 'border-bokle-green text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                style={template === t ? { backgroundColor: '#15621B' } : {}}
                            >
                                {t === '6-week' ? '6 Weeks' : t === '12-week' ? '12 Weeks' : 'Custom'}
                            </button>
                        ))}
                    </div>
                    {template === 'custom' && (
                        <div className="mt-2 flex items-center gap-2">
                            <input
                                type="number"
                                min={1} max={52}
                                value={customWeeks}
                                onChange={e => setCustomWeeks(Number(e.target.value))}
                                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-bokle-green"
                            />
                            <span className="text-sm text-gray-500">weeks</span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-bokle-green"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Stand-Up Calendly Link (optional)</label>
                    <input
                        value={standupLink}
                        onChange={e => setStandupLink(e.target.value)}
                        placeholder="https://calendly.com/..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-bokle-green"
                    />
                </div>
            </div>

            <div className="flex gap-3 mt-6">
                <button
                    onClick={handleSave}
                    disabled={!clientName.trim()}
                    className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: '#15621B' }}
                >
                    Create Timeline
                </button>
                <button onClick={onCancel} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
                    Cancel
                </button>
            </div>
        </div>
    );
};

// ── Gantt Bar ─────────────────────────────────────────────────────────────────

const GanttBar: React.FC<{ timeline: DeliveryTimeline; milestones: Milestone[] }> = ({ timeline, milestones }) => {
    const total = timeline.totalWeeks || 6;
    const weeks = Array.from({ length: total + 1 }, (_, i) => i);

    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Timeline</p>
            <div className="relative">
                {/* Week axis */}
                <div className="flex items-center mb-2">
                    {weeks.map(w => (
                        <div key={w} className="flex-1 text-center text-[10px] text-gray-400 font-medium">
                            {w === 0 ? 'Start' : `W${w}`}
                        </div>
                    ))}
                </div>
                {/* Track */}
                <div className="relative h-6 bg-gray-200 rounded-full overflow-visible">
                    <div
                        className="absolute top-0 left-0 h-full rounded-full transition-all"
                        style={{
                            backgroundColor: '#15621B',
                            width: `${(milestones.filter(m => m.status === 'completed').length / Math.max(milestones.length, 1)) * 100}%`,
                            opacity: 0.25,
                        }}
                    />
                    {/* Milestone dots */}
                    {milestones.map(m => {
                        const pct = (m.weekNumber / total) * 100;
                        return (
                            <div
                                key={m.id}
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{
                                    left: `${Math.min(pct, 98)}%`,
                                    backgroundColor: statusColor(m.status),
                                    zIndex: 10,
                                }}
                                title={`${m.title} (Week ${m.weekNumber})`}
                            />
                        );
                    })}
                </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#15621B' }} /> Done</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-yellow-400" /> Upcoming</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-red-400" /> Overdue</span>
            </div>
        </div>
    );
};

// ── Milestone Card ────────────────────────────────────────────────────────────

const MilestoneCard: React.FC<{
    milestone: Milestone;
    onUpdate: (m: Milestone) => void;
    onDelete: (id: string) => void;
}> = ({ milestone, onUpdate, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [editNotes, setEditNotes] = useState(milestone.notes || '');
    const [editOwner, setEditOwner] = useState(milestone.owner || '');
    const [saving, setSaving] = useState(false);

    const toggleStatus = () => {
        const next: MilestoneStatus = milestone.status === 'completed' ? computeStatus(milestone.dueDate, 'upcoming') : 'completed';
        onUpdate({ ...milestone, status: next });
    };

    const saveEdits = async () => {
        setSaving(true);
        onUpdate({ ...milestone, notes: editNotes, owner: editOwner });
        setTimeout(() => setSaving(false), 400);
    };

    const toggleChecklist = (idx: number) => {
        const cl = [...(milestone.checklist || [])];
        cl[idx] = { ...cl[idx], done: !cl[idx].done };
        onUpdate({ ...milestone, checklist: cl });
    };

    return (
        <div
            className="rounded-xl border transition-all"
            style={{ borderColor: expanded ? statusColor(milestone.status) + '40' : '#f1f5f9', backgroundColor: expanded ? statusBg(milestone.status) : 'white' }}
        >
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(x => !x)}>
                <button onClick={e => { e.stopPropagation(); toggleStatus(); }} className="shrink-0 hover:opacity-70 transition-opacity">
                    <StatusIcon status={milestone.status} size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-gray-900 ${milestone.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                        {milestone.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Week {milestone.weekNumber} · Due {milestone.dueDate}{milestone.owner ? ` · ${milestone.owner}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor(milestone.status) + '20', color: statusColor(milestone.status) }}>
                        {milestone.status}
                    </span>
                    {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    {/* Checklist */}
                    {(milestone.checklist || []).length > 0 && (
                        <div className="space-y-1.5">
                            {(milestone.checklist || []).map((item, i) => (
                                <label key={i} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={item.done}
                                        onChange={() => toggleChecklist(i)}
                                        className="accent-bokle-green w-4 h-4"
                                    />
                                    <span className={item.done ? 'line-through text-gray-400' : ''}>{item.item}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Owner</label>
                            <input
                                value={editOwner}
                                onChange={e => setEditOwner(e.target.value)}
                                placeholder="e.g. Rahul"
                                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-bokle-green"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                onClick={saveEdits}
                                disabled={saving}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1 transition-opacity disabled:opacity-50"
                                style={{ backgroundColor: '#15621B' }}
                            >
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                            </button>
                            <button onClick={() => onDelete(milestone.id)} className="text-xs px-2 py-1.5 rounded-lg text-red-400 border border-red-100 hover:bg-red-50">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Notes</label>
                        <textarea
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            placeholder="Add any notes or blockers..."
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-bokle-green"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Timeline Detail ───────────────────────────────────────────────────────────

const TimelineDetail: React.FC<{
    timeline: DeliveryTimeline;
    milestones: Milestone[];
    onBack: () => void;
    onUpdateTimeline: (t: DeliveryTimeline) => void;
    onUpdateMilestone: (m: Milestone) => void;
    onDeleteMilestone: (id: string) => void;
    onDeleteTimeline: (id: string) => void;
}> = ({ timeline, milestones, onBack, onUpdateTimeline, onUpdateMilestone, onDeleteMilestone, onDeleteTimeline }) => {
    const [standupLink, setStandupLink] = useState(timeline.standupLink || '');
    const [addingMilestone, setAddingMilestone] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newWeek, setNewWeek] = useState(1);

    const done = milestones.filter(m => m.status === 'completed').length;
    const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;

    const handleAddMilestone = () => {
        if (!newTitle.trim()) return;
        const m: Milestone = {
            id: uid(),
            timelineId: timeline.id,
            title: newTitle.trim(),
            weekNumber: newWeek,
            dueDate: addWeeks(timeline.startDate, newWeek),
            status: computeStatus(addWeeks(timeline.startDate, newWeek), 'upcoming'),
            checklist: [],
        };
        onUpdateMilestone(m);
        setNewTitle(''); setNewWeek(1); setAddingMilestone(false);
    };

    const saveStandupLink = () => onUpdateTimeline({ ...timeline, standupLink });

    const sortedMilestones = [...milestones].sort((a, b) => a.weekNumber - b.weekNumber);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium transition-colors">
                    <ArrowLeft size={16} /> All Timelines
                </button>
            </div>

            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{timeline.clientName}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{timeline.templateType} · Started {timeline.startDate}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${timeline.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {timeline.status}
                    </span>
                    <button
                        onClick={() => { if (window.confirm('Delete this timeline?')) onDeleteTimeline(timeline.id); }}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-50 border border-red-100 transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
                    <span className="text-sm font-bold" style={{ color: '#15621B' }}>{pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: '#15621B' }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{done} of {milestones.length} milestones completed</p>
            </div>

            {/* Gantt */}
            <GanttBar timeline={timeline} milestones={sortedMilestones} />

            {/* Milestones */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800 text-sm">Milestones</h3>
                    <button
                        onClick={() => setAddingMilestone(x => !x)}
                        className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: '#15621B' }}
                    >
                        <Plus size={13} /> Add
                    </button>
                </div>

                {addingMilestone && (
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Title</label>
                            <input
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                placeholder="Milestone title"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-bokle-green"
                            />
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Week #</label>
                            <input
                                type="number"
                                min={0}
                                value={newWeek}
                                onChange={e => setNewWeek(Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-bokle-green"
                            />
                        </div>
                        <button
                            onClick={handleAddMilestone}
                            className="text-xs font-bold text-white px-4 py-2 rounded-lg"
                            style={{ backgroundColor: '#15621B' }}
                        >
                            Add
                        </button>
                        <button onClick={() => setAddingMilestone(false)} className="p-2 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="p-4 space-y-2">
                    {sortedMilestones.length === 0
                        ? <p className="text-sm text-gray-400 text-center py-6">No milestones yet.</p>
                        : sortedMilestones.map(m => (
                            <MilestoneCard
                                key={m.id}
                                milestone={m}
                                onUpdate={onUpdateMilestone}
                                onDelete={onDeleteMilestone}
                            />
                        ))
                    }
                </div>
            </div>

            {/* Stand-Up */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Link size={16} style={{ color: '#15621B' }} />
                    <h3 className="font-bold text-gray-800 text-sm">Stand-Up Call Link</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">Share this recurring Calendly link with the client for weekly check-ins.</p>
                <div className="flex gap-2">
                    <input
                        value={standupLink}
                        onChange={e => setStandupLink(e.target.value)}
                        placeholder="https://calendly.com/..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-bokle-green"
                    />
                    <button
                        onClick={saveStandupLink}
                        className="text-sm font-bold text-white px-4 py-2 rounded-lg"
                        style={{ backgroundColor: '#15621B' }}
                    >
                        Save
                    </button>
                    {timeline.standupLink && (
                        <a
                            href={timeline.standupLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                            Open
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

const DeliveryTimelineModule: React.FC = () => {
    const [timelines, setTimelines] = useState<DeliveryTimeline[]>([]);
    const [milestonesMap, setMilestonesMap] = useState<Record<string, Milestone[]>>({});
    const [deals, setDeals] = useState<Deal[]>([]);
    const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const [tl, d, ms] = await Promise.all([
                DataService.getTimelines(),
                DataService.getDeals(),
                DataService.getMilestones(),
            ]);
            setTimelines(tl);
            setDeals(d);
            // group milestones by timeline
            const map: Record<string, Milestone[]> = {};
            ms.forEach(m => { if (!map[m.timelineId]) map[m.timelineId] = []; map[m.timelineId].push(m); });
            setMilestonesMap(map);
            setLoading(false);
        })();
    }, []);

    const handleCreateTimeline = async (t: DeliveryTimeline, ms: Milestone[]) => {
        await DataService.saveTimeline(t);
        await Promise.all(ms.map(m => DataService.saveMilestone(m)));
        setTimelines(prev => [t, ...prev]);
        setMilestonesMap(prev => ({ ...prev, [t.id]: ms }));
        setSelectedId(t.id);
        setView('detail');
    };

    const handleUpdateMilestone = async (m: Milestone) => {
        await DataService.saveMilestone(m);
        setMilestonesMap(prev => {
            const list = [...(prev[m.timelineId] || [])];
            const idx = list.findIndex(x => x.id === m.id);
            if (idx >= 0) list[idx] = m; else list.push(m);
            return { ...prev, [m.timelineId]: list };
        });
    };

    const handleDeleteMilestone = async (id: string, timelineId: string) => {
        await DataService.deleteMilestone(id);
        setMilestonesMap(prev => ({ ...prev, [timelineId]: (prev[timelineId] || []).filter(m => m.id !== id) }));
    };

    const handleUpdateTimeline = async (t: DeliveryTimeline) => {
        await DataService.saveTimeline(t);
        setTimelines(prev => prev.map(x => x.id === t.id ? t : x));
    };

    const handleDeleteTimeline = async (id: string) => {
        await DataService.deleteTimeline(id);
        setTimelines(prev => prev.filter(t => t.id !== id));
        setMilestonesMap(prev => { const next = { ...prev }; delete next[id]; return next; });
        setView('list');
    };

    const selected = timelines.find(t => t.id === selectedId);
    const selectedMilestones = selectedId ? (milestonesMap[selectedId] || []) : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-bokle-green" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {view === 'list' && (
                <>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Client Delivery</h2>
                            <p className="text-sm text-gray-400 mt-0.5">Track milestones, timelines, and stand-up calls per client.</p>
                        </div>
                        <button
                            onClick={() => setView('create')}
                            className="flex items-center gap-2 text-sm font-bold text-white px-4 py-2.5 rounded-xl shadow-sm"
                            style={{ backgroundColor: '#15621B' }}
                        >
                            <Plus size={16} /> New Timeline
                        </button>
                    </div>

                    {timelines.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
                            <BarChart2 size={40} className="mx-auto text-gray-200 mb-3" />
                            <p className="text-gray-500 font-semibold">No delivery timelines yet.</p>
                            <p className="text-sm text-gray-400 mt-1">Create one when a deal is Closed Won.</p>
                            <button
                                onClick={() => setView('create')}
                                className="mt-5 text-sm font-bold text-white px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
                                style={{ backgroundColor: '#15621B' }}
                            >
                                <Plus size={15} /> Create Timeline
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {timelines.map(t => {
                                const ms = milestonesMap[t.id] || [];
                                const done = ms.filter(m => m.status === 'completed').length;
                                const overdue = ms.filter(m => m.status === 'overdue').length;
                                const pct = ms.length ? Math.round((done / ms.length) * 100) : 0;
                                const next = ms.filter(m => m.status !== 'completed').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => { setSelectedId(t.id); setView('detail'); }}
                                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover:text-bokle-green transition-colors">{t.clientName}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{t.templateType} · {ms.length} milestones</p>
                                            </div>
                                            {overdue > 0 && (
                                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{overdue} overdue</span>
                                            )}
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-2">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#15621B' }} />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                            <span>{pct}% complete</span>
                                            {next && <span>Next: {next.title}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {view === 'create' && (
                <div>
                    <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 font-medium mb-5 transition-colors">
                        <ArrowLeft size={16} /> Back
                    </button>
                    <CreateForm deals={deals} onSave={handleCreateTimeline} onCancel={() => setView('list')} />
                </div>
            )}

            {view === 'detail' && selected && (
                <TimelineDetail
                    timeline={selected}
                    milestones={selectedMilestones}
                    onBack={() => setView('list')}
                    onUpdateTimeline={handleUpdateTimeline}
                    onUpdateMilestone={handleUpdateMilestone}
                    onDeleteMilestone={id => handleDeleteMilestone(id, selected.id)}
                    onDeleteTimeline={handleDeleteTimeline}
                />
            )}
        </div>
    );
};

export default DeliveryTimelineModule;
