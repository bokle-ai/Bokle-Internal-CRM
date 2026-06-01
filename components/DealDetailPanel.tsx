
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Deal, DealStatus, DealActivity, LeadSource } from '../types';
import { addReminder, markReminderDone } from '../services/reminderService';
import { DataService } from '../services/storageService';

// ── Constants ────────────────────────────────────────────────────────────────

const DEAL_STAGES: DealStatus[] = ['Lead', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won'];

const ACTIVITY_ICONS: Record<DealActivity['type'], string> = {
    call:          '📞',
    email:         '✉️',
    whatsapp:      '💬',
    note:          '📝',
    stage_change:  '🔄',
    reminder_set:  '🔔',
};

const ACTIVITY_LABELS: Record<string, string> = {
    call: 'Call Made',
    email: 'Email Sent',
    whatsapp: 'WhatsApp Sent',
    note: 'Note Added',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayISO = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const relativeTime = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString();
};

const getSourceStyle = (source: LeadSource): React.CSSProperties => {
    const map: Record<LeadSource, React.CSSProperties> = {
        'Meta Ads':        { background: 'rgba(249,115,22,0.15)',  color: '#fb923c', borderColor: 'rgba(249,115,22,0.3)' },
        'Apollo Outbound': { background: 'rgba(59,130,246,0.15)',  color: '#60a5fa', borderColor: 'rgba(59,130,246,0.3)' },
        'WhatsApp':        { background: 'rgba(0,198,15,0.15)',    color: '#4ade80', borderColor: 'rgba(0,198,15,0.3)' },
        'Website Form':    { background: 'rgba(168,85,247,0.15)',  color: '#c084fc', borderColor: 'rgba(168,85,247,0.3)' },
        'Referral':        { background: 'rgba(234,179,8,0.15)',   color: '#fbbf24', borderColor: 'rgba(234,179,8,0.3)' },
        'Manual':          { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' },
    };
    return map[source] ?? map['Manual'];
};

// ── Shared inline style objects ───────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(21,98,27,0.10)',
    border: '1px solid rgba(0,198,15,0.2)',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    paddingRight: '28px',
};

const formCardStyle: React.CSSProperties = {
    background: 'rgba(21,98,27,0.10)',
    border: '1px solid rgba(0,198,15,0.15)',
    borderRadius: '10px',
    padding: '14px 16px',
};

const formLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: '0 0 10px',
};

const actionBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px dashed rgba(0,198,15,0.3)',
    color: 'rgba(0,198,15,0.7)',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.3px',
};

const primaryBtnStyle: React.CSSProperties = {
    padding: '7px 18px',
    background: '#15621B',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
};

const ghostBtnStyle: React.CSSProperties = {
    padding: '7px 14px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '7px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
};

// ── Sub-components ────────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p style={{
        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 6px',
    }}>
        {children}
    </p>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <FieldLabel>{label}</FieldLabel>
        {children}
    </div>
);

const EditableValue: React.FC<{
    value?: string;
    placeholder: string;
    onClick: () => void;
}> = ({ value, placeholder, onClick }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%',
            textAlign: 'left',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(21,98,27,0.10)',
            border: '1px solid rgba(0,198,15,0.2)',
            color: value ? '#fff' : 'rgba(255,255,255,0.28)',
            fontSize: '13px',
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'text',
            boxSizing: 'border-box',
        }}
    >
        {value || placeholder}
    </button>
);

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DealDetailPanelProps {
    deal: Deal | null;
    onClose: () => void;
    onUpdateDeal: (deal: Deal) => void;
}

// ── Main Component ────────────────────────────────────────────────────────────

const DealDetailPanel: React.FC<DealDetailPanelProps> = ({ deal, onClose, onUpdateDeal }) => {
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'reminders'>('overview');
    const [local, setLocal] = useState<Deal | null>(null);

    // Inline edit flags
    const [editingEmail, setEditingEmail] = useState(false);
    const [editingPhone, setEditingPhone] = useState(false);

    // Activity form
    const [showActForm, setShowActForm] = useState(false);
    const [actType, setActType] = useState<'call' | 'email' | 'whatsapp' | 'note'>('call');
    const [actDesc, setActDesc] = useState('');

    // Reminder form
    const [showRemForm, setShowRemForm] = useState(false);
    const [remDate, setRemDate] = useState('');
    const [remNote, setRemNote] = useState('');

    const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Drive slide animation
    useEffect(() => {
        if (deal) {
            setLocal({ ...deal });
            setActiveTab('overview');
            setShowActForm(false);
            setShowRemForm(false);
            setEditingEmail(false);
            setEditingPhone(false);
            // Tiny delay so CSS transition fires
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [deal]);

    // Persist + notify parent
    const persist = useCallback(async (updated: Deal) => {
        setLocal(updated);
        onUpdateDeal(updated);
        await DataService.saveDeal(updated);
    }, [onUpdateDeal]);

    // Handle Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // ── Overview handlers ─────────────────────────────────────────────────────

    const handleStageChange = (newStatus: DealStatus) => {
        if (!local) return;
        const activity: DealActivity = {
            id: crypto.randomUUID(),
            dealId: local.id,
            type: 'stage_change',
            description: `Stage changed to ${newStatus}`,
            timestamp: new Date().toISOString(),
            createdBy: 'Gautam',
        };
        persist({
            ...local,
            status: newStatus,
            activities: [activity, ...(local.activities ?? [])],
        });
    };

    const handleField = (field: keyof Deal, value: string) => {
        if (!local) return;
        const updated = { ...local, [field]: value };
        setLocal(updated);
        if (field === 'notes') {
            if (notesTimer.current) clearTimeout(notesTimer.current);
            notesTimer.current = setTimeout(() => persist(updated), 800);
        } else {
            persist(updated);
        }
    };

    // ── Activity handlers ─────────────────────────────────────────────────────

    const handleLogActivity = () => {
        if (!local || !actDesc.trim()) return;
        const activity: DealActivity = {
            id: crypto.randomUUID(),
            dealId: local.id,
            type: actType,
            description: actDesc.trim(),
            timestamp: new Date().toISOString(),
            createdBy: 'Gautam',
        };
        persist({ ...local, activities: [activity, ...(local.activities ?? [])] });
        setActDesc('');
        setShowActForm(false);
    };

    // ── Reminder handlers ─────────────────────────────────────────────────────

    const handleAddReminder = () => {
        if (!local || !remDate || !remNote.trim()) return;
        const updated = addReminder(local, remNote, remDate);
        setLocal(updated);
        onUpdateDeal(updated);
        setRemDate('');
        setRemNote('');
        setShowRemForm(false);
    };

    const handleMarkDone = (reminderId: string) => {
        if (!local) return;
        const updated = markReminderDone(local, reminderId);
        setLocal(updated);
        onUpdateDeal(updated);
    };

    // Don't mount at all if no deal ever opened
    if (!deal && !visible) return null;

    const today = todayISO();
    const activities = [...(local?.activities ?? [])]; // newest first (stored newest-first)
    const activeReminders = (local?.reminders ?? []).filter(r => !r.isDone)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const doneReminders = (local?.reminders ?? []).filter(r => r.isDone);

    return (
        <>
            {/* ── Backdrop ── */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 40,
                    background: 'rgba(0,0,0,0.28)',
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 280ms ease-out',
                    pointerEvents: visible ? 'auto' : 'none',
                }}
            />

            {/* ── Panel ── */}
            <div
                ref={panelRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    height: '100%',
                    zIndex: 50,
                    width: 'min(480px, 100vw)',
                    background: '#010801',
                    borderLeft: '1px solid rgba(0,198,15,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: visible ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 280ms ease-out',
                    fontFamily: "'DM Sans', sans-serif",
                    overflowX: 'hidden',
                }}
            >
                {/* ── Panel Header ── */}
                <div style={{
                    background: 'rgba(21,98,27,0.08)',
                    borderBottom: '1px solid rgba(0,198,15,0.15)',
                    padding: '16px 20px 0',
                    flexShrink: 0,
                }}>
                    {/* Close row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                        <button
                            onClick={onClose}
                            aria-label="Close panel"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.35)', fontSize: '18px',
                                lineHeight: 1, padding: '4px 6px', borderRadius: '6px',
                                transition: 'color 150ms',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,198,15,0.85)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Client name + source badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
                            {local?.clientName}
                        </h2>
                        {local?.source && (
                            <span style={{
                                fontSize: '11px', fontWeight: 500, padding: '2px 9px',
                                borderRadius: '999px', border: '1px solid',
                                ...getSourceStyle(local.source),
                            }}>
                                {local.source}
                            </span>
                        )}
                    </div>

                    {/* Value */}
                    <p style={{ fontSize: '18px', fontWeight: 500, color: '#00C60F', margin: '0 0 16px' }}>
                        {local?.value}
                    </p>

                    {/* Tabs */}
                    <div style={{ display: 'flex' }}>
                        {(['overview', 'activity', 'reminders'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'none', border: 'none',
                                    borderBottom: `2px solid ${activeTab === tab ? '#00C60F' : 'transparent'}`,
                                    color: activeTab === tab ? '#00C60F' : 'rgba(255,255,255,0.4)',
                                    fontSize: '11px', fontWeight: 700,
                                    letterSpacing: '0.9px', textTransform: 'uppercase',
                                    cursor: 'pointer', transition: 'all 150ms',
                                    fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                {tab}
                                {tab === 'reminders' && activeReminders.length > 0 && (
                                    <span style={{
                                        marginLeft: '6px', fontSize: '9px', fontWeight: 700,
                                        background: '#00C60F', color: '#010801',
                                        borderRadius: '999px', padding: '1px 5px',
                                    }}>
                                        {activeReminders.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Tab Body ── */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '20px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0,198,15,0.2) transparent',
                }}>

                    {/* ══ OVERVIEW ══ */}
                    {activeTab === 'overview' && local && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                            <Field label="Service">
                                <p style={{ color: '#fff', fontSize: '14px', margin: 0 }}>{local.service}</p>
                            </Field>

                            <Field label="Stage">
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={local.status}
                                        onChange={e => handleStageChange(e.target.value as DealStatus)}
                                        style={selectStyle}
                                    >
                                        {DEAL_STAGES.map(s => (
                                            <option key={s} value={s} style={{ background: '#0d1f0d', color: '#fff' }}>{s}</option>
                                        ))}
                                    </select>
                                    <span style={{
                                        position: 'absolute', right: '10px', top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(0,198,15,0.6)', pointerEvents: 'none', fontSize: '12px',
                                    }}>▾</span>
                                </div>
                            </Field>

                            <Field label="Email">
                                {editingEmail ? (
                                    <input
                                        autoFocus
                                        type="email"
                                        value={local.email ?? ''}
                                        onChange={e => handleField('email', e.target.value)}
                                        onBlur={() => setEditingEmail(false)}
                                        style={inputStyle}
                                        placeholder="client@company.com"
                                    />
                                ) : (
                                    <EditableValue
                                        value={local.email}
                                        placeholder="Add email address"
                                        onClick={() => setEditingEmail(true)}
                                    />
                                )}
                            </Field>

                            <Field label="Phone">
                                {editingPhone ? (
                                    <input
                                        autoFocus
                                        type="tel"
                                        value={local.phone ?? ''}
                                        onChange={e => handleField('phone', e.target.value)}
                                        onBlur={() => setEditingPhone(false)}
                                        style={inputStyle}
                                        placeholder="+61 400 000 000"
                                    />
                                ) : (
                                    <EditableValue
                                        value={local.phone}
                                        placeholder="Add phone number"
                                        onClick={() => setEditingPhone(true)}
                                    />
                                )}
                            </Field>

                            <Field label="Lead Source">
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={local.source ?? ''}
                                        onChange={e => handleField('source', e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="" style={{ background: '#0d1f0d', color: '#fff' }}>— Not set —</option>
                                        {(['Meta Ads', 'Apollo Outbound', 'Website Form', 'WhatsApp', 'Referral', 'Manual'] as LeadSource[]).map(s => (
                                            <option key={s} value={s} style={{ background: '#0d1f0d', color: '#fff' }}>{s}</option>
                                        ))}
                                    </select>
                                    <span style={{
                                        position: 'absolute', right: '10px', top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'rgba(0,198,15,0.6)', pointerEvents: 'none', fontSize: '12px',
                                    }}>▾</span>
                                </div>
                            </Field>

                            <Field label="Notes">
                                <textarea
                                    value={local.notes ?? ''}
                                    onChange={e => handleField('notes', e.target.value)}
                                    rows={5}
                                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
                                    placeholder="Deal notes, context, objections, pricing discussed..."
                                />
                            </Field>

                            {/* Divider */}
                            <div style={{ borderTop: '1px solid rgba(0,198,15,0.1)', paddingTop: '14px' }}>
                                <FieldLabel>Last Contact</FieldLabel>
                                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: 0 }}>{local.lastContact}</p>
                            </div>
                        </div>
                    )}

                    {/* ══ ACTIVITY ══ */}
                    {activeTab === 'activity' && local && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* Log Activity form toggle */}
                            {!showActForm ? (
                                <button style={actionBtnStyle} onClick={() => setShowActForm(true)}>
                                    + Log Activity
                                </button>
                            ) : (
                                <div style={formCardStyle}>
                                    <p style={formLabelStyle}>Log Activity</p>

                                    {/* Type pills */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                        {(['call', 'email', 'whatsapp', 'note'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setActType(t)}
                                                style={{
                                                    padding: '5px 11px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px', fontWeight: 600,
                                                    border: '1px solid',
                                                    cursor: 'pointer',
                                                    fontFamily: "'DM Sans', sans-serif",
                                                    transition: 'all 150ms',
                                                    background: actType === t ? 'rgba(0,198,15,0.15)' : 'transparent',
                                                    borderColor: actType === t ? 'rgba(0,198,15,0.55)' : 'rgba(255,255,255,0.15)',
                                                    color: actType === t ? '#00C60F' : 'rgba(255,255,255,0.45)',
                                                }}
                                            >
                                                {ACTIVITY_ICONS[t]} {ACTIVITY_LABELS[t]}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        value={actDesc}
                                        onChange={e => setActDesc(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleLogActivity(); }}
                                        placeholder="What happened? Add details..."
                                        rows={3}
                                        style={{ ...inputStyle, resize: 'none', marginBottom: '10px' }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button style={primaryBtnStyle} onClick={handleLogActivity}>Save</button>
                                        <button style={ghostBtnStyle} onClick={() => { setShowActForm(false); setActDesc(''); }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {/* Activity list */}
                            {activities.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '13px', textAlign: 'center', paddingTop: '32px' }}>
                                    No activity logged yet.<br />
                                    <span style={{ fontSize: '11px' }}>Use "Log Activity" above to start tracking.</span>
                                </p>
                            ) : (
                                activities.map(act => (
                                    <div
                                        key={act.id}
                                        style={{
                                            display: 'flex', gap: '12px', alignItems: 'flex-start',
                                            padding: '10px 12px', borderRadius: '8px',
                                            background: 'rgba(21,98,27,0.07)',
                                            border: '1px solid rgba(0,198,15,0.08)',
                                        }}
                                    >
                                        <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
                                            {ACTIVITY_ICONS[act.type]}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 3px', lineHeight: 1.5 }}>
                                                {act.description}
                                            </p>
                                            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '11px', margin: 0 }}>
                                                {relativeTime(act.timestamp)}
                                                {act.createdBy ? ` · ${act.createdBy}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ══ REMINDERS ══ */}
                    {activeTab === 'reminders' && local && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* Set Reminder form toggle */}
                            {!showRemForm ? (
                                <button style={actionBtnStyle} onClick={() => setShowRemForm(true)}>
                                    + Set Reminder
                                </button>
                            ) : (
                                <div style={formCardStyle}>
                                    <p style={formLabelStyle}>New Reminder</p>
                                    <div style={{ marginBottom: '8px' }}>
                                        <FieldLabel>Due Date</FieldLabel>
                                        <input
                                            type="date"
                                            value={remDate}
                                            onChange={e => setRemDate(e.target.value)}
                                            min={today}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <FieldLabel>Note</FieldLabel>
                                        <textarea
                                            value={remNote}
                                            onChange={e => setRemNote(e.target.value)}
                                            placeholder="e.g. Call back, said busy this week"
                                            rows={2}
                                            style={{ ...inputStyle, resize: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button style={primaryBtnStyle} onClick={handleAddReminder}>Save</button>
                                        <button style={ghostBtnStyle} onClick={() => { setShowRemForm(false); setRemDate(''); setRemNote(''); }}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {/* Active reminders */}
                            {activeReminders.length === 0 && doneReminders.length === 0 ? (
                                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '13px', textAlign: 'center', paddingTop: '32px' }}>
                                    No reminders set.<br />
                                    <span style={{ fontSize: '11px' }}>Set one above to stay on top of follow-ups.</span>
                                </p>
                            ) : (
                                <>
                                    {activeReminders.map(rem => {
                                        const isOverdue = rem.dueDate < today;
                                        const isToday   = rem.dueDate === today;
                                        const accentColor = isOverdue ? '#ef4444' : isToday ? '#00C60F' : 'rgba(255,255,255,0.1)';
                                        return (
                                            <div
                                                key={rem.id}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                    padding: '10px 12px 10px 14px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(21,98,27,0.07)',
                                                    borderLeft: `3px solid ${accentColor}`,
                                                    border: `1px solid rgba(0,198,15,0.08)`,
                                                    borderLeftWidth: '3px',
                                                    borderLeftColor: accentColor,
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 4px', lineHeight: 1.5 }}>
                                                        {rem.note}
                                                    </p>
                                                    <p style={{
                                                        fontSize: '11px', margin: 0, fontWeight: isOverdue || isToday ? 600 : 400,
                                                        color: isOverdue ? '#ef4444' : isToday ? '#00C60F' : 'rgba(255,255,255,0.4)',
                                                    }}>
                                                        {isOverdue ? '⚠️ Overdue · ' : isToday ? '🟢 Due today · ' : '📅 '}
                                                        {new Date(rem.dueDate + 'T00:00:00').toLocaleDateString('en-AU', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                        })}
                                                    </p>
                                                </div>
                                                {/* Mark done button */}
                                                <button
                                                    onClick={() => handleMarkDone(rem.id)}
                                                    title="Mark done"
                                                    style={{
                                                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                                        border: '1.5px solid rgba(0,198,15,0.4)',
                                                        background: 'transparent', cursor: 'pointer',
                                                        color: 'rgba(0,198,15,0.5)', fontSize: '13px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 150ms',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.background = 'rgba(0,198,15,0.15)';
                                                        e.currentTarget.style.borderColor = '#00C60F';
                                                        e.currentTarget.style.color = '#00C60F';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = 'rgba(0,198,15,0.4)';
                                                        e.currentTarget.style.color = 'rgba(0,198,15,0.5)';
                                                    }}
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Done reminders */}
                                    {doneReminders.length > 0 && (
                                        <>
                                            <p style={{
                                                fontSize: '10px', fontWeight: 700,
                                                color: 'rgba(255,255,255,0.22)', letterSpacing: '1px',
                                                textTransform: 'uppercase', margin: '8px 0 0',
                                            }}>
                                                Completed
                                            </p>
                                            {doneReminders.map(rem => (
                                                <div
                                                    key={rem.id}
                                                    style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                        padding: '8px 12px 8px 14px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(255,255,255,0.02)',
                                                        borderLeft: '3px solid rgba(255,255,255,0.08)',
                                                        opacity: 0.45,
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ color: '#fff', fontSize: '12px', margin: '0 0 3px', textDecoration: 'line-through' }}>
                                                            {rem.note}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                                                            {new Date(rem.dueDate + 'T00:00:00').toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span style={{ color: '#00C60F', fontSize: '14px', flexShrink: 0 }}>✓</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DealDetailPanel;
