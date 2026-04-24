
import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Calendar, Link2, Copy, Check, RefreshCw, AlertCircle,
  ExternalLink, ChevronLeft, ChevronRight, Clock, User,
  Video, MapPin, Settings, X, Plus, Loader2, FileText, ChevronDown, ChevronUp, Key
} from 'lucide-react';
import { TldvService, getTldvApiKey, saveTldvApiKey, clearTldvApiKey, TldvMeeting, TldvNotes } from '../services/tldvService';
import { DataService } from '../services/storageService';
import { DealArtifact } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendlyUser {
  uri: string;
  name: string;
  slug: string;
  email: string;
  scheduling_url: string;
  timezone: string;
  avatar_url: string;
}

interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  slug: string;
  scheduling_url: string;
  duration: number;
  kind: string; // 'solo' | 'group'
  description_plain: string | null;
  color: string;
}

interface CalendlyInvitee {
  name: string;
  email: string;
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: string; // 'active' | 'canceled'
  start_time: string;
  end_time: string;
  event_type: string;
  location: { type: string; location?: string; join_url?: string } | null;
  invitees_counter: { total: number; active: number; limit: number };
  created_at: string;
  updated_at: string;
  invitees?: CalendlyInvitee[];
}

interface OneOffLink {
  booking_url: string;
  owner: string;
  owner_type: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CALENDLY_BASE = 'https://api.calendly.com';
const TOKEN_KEY = 'bokle_calendly_token';
const CACHED_USER_KEY = 'bokle_calendly_user';
const CACHED_EVENTS_KEY = 'bokle_calendly_events';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calendlyFetch(token: string, path: string, options: RequestInit = {}) {
  return fetch(`${CALENDLY_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDurationLabel(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const KindBadge: React.FC<{ kind: string }> = ({ kind }) => (
  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
    kind === 'group' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
  }`}>{kind}</span>
);

const StatusDot: React.FC<{ status: string }> = ({ status }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-red-400'}`} />
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Meetings: React.FC = () => {
  // -- Auth
  const [token, setToken] = useState<string>(() => {
    const envToken = (process.env.VITE_CALENDLY_TOKEN as string) || '';
    const stored = localStorage.getItem(TOKEN_KEY) || '';
    // Persist env token to localStorage so cached user can be reused
    if (envToken && !stored) localStorage.setItem(TOKEN_KEY, envToken);
    return stored || envToken;
  });
  const [tokenInput, setTokenInput] = useState('');
  const [user, setUser] = useState<CalendlyUser | null>(() => {
    const cached = localStorage.getItem(CACHED_USER_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [authError, setAuthError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // -- Tabs
  const [activeTab, setActiveTab] = useState<'calendar' | 'event-types' | 'upcoming' | 'connect' | 'transcripts'>('calendar');

  // -- Event types
  const [eventTypes, setEventTypes] = useState<CalendlyEventType[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);

  // -- Scheduled events
  const [events, setEvents] = useState<CalendlyEvent[]>(() => {
    const cached = localStorage.getItem(CACHED_EVENTS_KEY);
    return cached ? JSON.parse(cached) : [];
  });
  const [loadingEvents, setLoadingEvents] = useState(false);

  // -- Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // -- One-off link
  const [oneOffEventUri, setOneOffEventUri] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // -- tl.dv Transcripts
  const [tldvApiKey, setTldvApiKey] = useState<string>(() => getTldvApiKey());
  const [tldvKeyInput, setTldvKeyInput] = useState('');
  const [tldvMeetings, setTldvMeetings] = useState<TldvMeeting[]>([]);
  const [tldvLoading, setTldvLoading] = useState(false);
  const [tldvError, setTldvError] = useState('');
  const [selectedTldvId, setSelectedTldvId] = useState<string | null>(null);
  const [tldvNotes, setTldvNotes] = useState<Record<string, TldvNotes>>({});
  const [tldvNotesLoading, setTldvNotesLoading] = useState(false);
  const [savedSummaries, setSavedSummaries] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // ── Connect ──────────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    const t = tokenInput.trim();
    if (!t) return;
    setConnecting(true);
    setAuthError('');
    try {
      const res = await calendlyFetch(t, '/users/me');
      if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
      const data = await res.json();
      const u: CalendlyUser = data.resource;
      setUser(u);
      setToken(t);
      localStorage.setItem(TOKEN_KEY, t);
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(u));
      setTokenInput('');
      setActiveTab('calendar');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setAuthError(msg.includes('Failed to fetch')
        ? 'Could not reach Calendly. Check your token or try a CORS-friendly browser.'
        : msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setToken('');
    setUser(null);
    setEvents([]);
    setEventTypes([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CACHED_USER_KEY);
    localStorage.removeItem(CACHED_EVENTS_KEY);
    setActiveTab('connect');
  };

  // ── Fetch Event Types ─────────────────────────────────────────────────────────

  const fetchEventTypes = useCallback(async () => {
    if (!token || !user) return;
    setLoadingEventTypes(true);
    try {
      const res = await calendlyFetch(token, `/event_types?user=${encodeURIComponent(user.uri)}&active=true&count=100`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setEventTypes(data.collection || []);
    } catch (e) {
      console.error('fetchEventTypes', e);
    } finally {
      setLoadingEventTypes(false);
    }
  }, [token, user]);

  // ── Fetch Scheduled Events ───────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    if (!token || !user) return;
    setLoadingEvents(true);
    try {
      // Fetch 3 months back to 3 months ahead
      const minTime = new Date();
      minTime.setMonth(minTime.getMonth() - 3);
      const maxTime = new Date();
      maxTime.setMonth(maxTime.getMonth() + 3);

      const params = new URLSearchParams({
        user: user.uri,
        min_start_time: minTime.toISOString(),
        max_start_time: maxTime.toISOString(),
        status: 'active',
        count: '100',
        sort: 'start_time:asc',
      });

      const res = await calendlyFetch(token, `/scheduled_events?${params}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const fetched: CalendlyEvent[] = data.collection || [];
      setEvents(fetched);
      localStorage.setItem(CACHED_EVENTS_KEY, JSON.stringify(fetched));
    } catch (e) {
      console.error('fetchEvents', e);
    } finally {
      setLoadingEvents(false);
    }
  }, [token, user]);

  // ── Auto-fetch when connected ────────────────────────────────────────────────

  useEffect(() => {
    if (token && user) {
      fetchEventTypes();
      fetchEvents();
    }
  }, [token, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate One-Off Link ────────────────────────────────────────────────────

  const generateLink = async (eventTypeUri: string) => {
    if (!token) return;
    setGeneratingLink(true);
    setOneOffEventUri(eventTypeUri);
    try {
      const res = await calendlyFetch(token, '/scheduling_links', {
        method: 'POST',
        body: JSON.stringify({
          max_event_count: 1,
          owner: eventTypeUri,
          owner_type: 'EventType',
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const link: OneOffLink = data.resource;
      setGeneratedLinks(prev => ({ ...prev, [eventTypeUri]: link.booking_url }));
    } catch (e) {
      console.error('generateLink', e);
    } finally {
      setGeneratingLink(false);
      setOneOffEventUri('');
    }
  };

  // ── tl.dv handlers ───────────────────────────────────────────────────────────

  const handleTldvConnect = async () => {
    const key = tldvKeyInput.trim();
    if (!key) return;
    setTldvLoading(true);
    setTldvError('');
    try {
      const meetings = await TldvService.getMeetings(key);
      saveTldvApiKey(key);
      setTldvApiKey(key);
      setTldvMeetings(meetings);
      setTldvKeyInput('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTldvError(msg.includes('401') ? 'Invalid API key.' : msg.includes('403') ? 'Plan upgrade required for API access.' : msg);
    } finally {
      setTldvLoading(false);
    }
  };

  const handleTldvDisconnect = () => {
    clearTldvApiKey();
    setTldvApiKey('');
    setTldvMeetings([]);
    setTldvNotes({});
    setSelectedTldvId(null);
  };

  const loadTldvMeetings = useCallback(async () => {
    if (!tldvApiKey) return;
    setTldvLoading(true);
    setTldvError('');
    try {
      const meetings = await TldvService.getMeetings(tldvApiKey);
      setTldvMeetings(meetings);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTldvError(msg);
    } finally {
      setTldvLoading(false);
    }
  }, [tldvApiKey]);

  const handleSelectTldvMeeting = async (meeting: TldvMeeting) => {
    setSelectedTldvId(meeting.id);
    if (tldvNotes[meeting.id]) return; // already loaded
    setTldvNotesLoading(true);
    try {
      const notes = await TldvService.getNotes(tldvApiKey, meeting.id);
      setTldvNotes(prev => ({ ...prev, [meeting.id]: notes }));
    } catch (e) {
      console.error('tl.dv notes error', e);
    } finally {
      setTldvNotesLoading(false);
    }
  };

  const handleSaveSummary = async (meeting: TldvMeeting) => {
    const notes = tldvNotes[meeting.id];
    if (!notes) return;
    const artifact: DealArtifact = {
      id: `tldv_${meeting.id}`,
      dealId: 'meetings',
      stage: 'Meeting Transcript',
      title: `Summary: ${meeting.name}`,
      content: notes.markdownContent || '*(No summary available)*',
      lastUpdated: new Date().toISOString(),
    };
    await DataService.saveArtifact(artifact);
    setSavedSummaries(prev => ({ ...prev, [meeting.id]: true }));
  };

  // Auto-load tl.dv meetings when tab is active and key exists
  useEffect(() => {
    if (activeTab === 'transcripts' && tldvApiKey && tldvMeetings.length === 0) {
      loadTldvMeetings();
    }
  }, [activeTab, tldvApiKey, tldvMeetings.length, loadTldvMeetings]);

  // ── Transcripts tab render ────────────────────────────────────────────────────

  const renderTranscripts = () => {
    if (!tldvApiKey) {
      return (
        <div className="max-w-lg mx-auto mt-8 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50 mb-4">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Connect tl.dv</h2>
            <p className="text-gray-500 mt-1 text-sm">Paste your tl.dv API key to pull AI meeting summaries.</p>
            <p className="text-gray-400 text-xs mt-1">Find it at: tldv.io → Settings → API Keys</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">tl.dv API Key</label>
              <input
                type="password"
                value={tldvKeyInput}
                onChange={e => setTldvKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTldvConnect()}
                placeholder="tldv_..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 font-mono"
              />
            </div>
            {tldvError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
                <AlertCircle size={14} /> {tldvError}
              </div>
            )}
            <button
              onClick={handleTldvConnect}
              disabled={!tldvKeyInput.trim() || tldvLoading}
              className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {tldvLoading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              Connect tl.dv
            </button>
          </div>
        </div>
      );
    }

    const selectedMeeting = tldvMeetings.find(m => m.id === selectedTldvId);
    const selectedNotes = selectedTldvId ? tldvNotes[selectedTldvId] : null;

    return (
      <div className="flex gap-6 h-full">
        {/* Left: Meeting list */}
        <div className="w-72 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recorded Meetings</span>
            <button onClick={loadTldvMeetings} disabled={tldvLoading} className="text-gray-400 hover:text-purple-600 transition">
              <RefreshCw size={14} className={tldvLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {tldvLoading && tldvMeetings.length === 0 ? (
              <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={20} /><p className="text-xs">Loading meetings…</p></div>
            ) : tldvError ? (
              <div className="p-4 text-center text-red-500 text-xs">{tldvError}</div>
            ) : tldvMeetings.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">No recorded meetings found.</div>
            ) : (
              tldvMeetings.map(meeting => (
                <button
                  key={meeting.id}
                  onClick={() => handleSelectTldvMeeting(meeting)}
                  className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors border-l-4 ${selectedTldvId === meeting.id ? 'border-l-purple-500 bg-purple-50/30' : 'border-l-transparent'}`}
                >
                  <div className="font-semibold text-gray-800 text-xs truncate">{meeting.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(meeting.happenedAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  {meeting.duration > 0 && (
                    <div className="text-[10px] text-gray-400">{Math.round(meeting.duration / 60)} min</div>
                  )}
                  {savedSummaries[meeting.id] && (
                    <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full mt-1 inline-block">Saved</span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-100">
            <button onClick={handleTldvDisconnect} className="text-[10px] text-gray-400 hover:text-red-500 transition w-full text-center">Disconnect tl.dv</button>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {!selectedMeeting ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-8">
              <FileText size={40} className="mb-3 text-gray-200" />
              <p className="text-sm font-semibold text-gray-500">Select a meeting</p>
              <p className="text-xs mt-1">AI summary will appear here</p>
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedMeeting.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(selectedMeeting.happenedAt).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {selectedMeeting.duration > 0 && ` · ${Math.round(selectedMeeting.duration / 60)} min`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={selectedMeeting.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-semibold px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1 transition">
                    <ExternalLink size={12} /> View in tl.dv
                  </a>
                  <button
                    onClick={() => handleSaveSummary(selectedMeeting)}
                    disabled={!selectedNotes || savedSummaries[selectedMeeting.id]}
                    className="text-xs font-bold px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 transition"
                  >
                    <Check size={12} /> {savedSummaries[selectedMeeting.id] ? 'Saved!' : 'Save Summary'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {tldvNotesLoading ? (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    <Loader2 className="animate-spin mr-2" size={18} /> Loading summary…
                  </div>
                ) : !selectedNotes ? (
                  <div className="text-center text-gray-400 text-sm mt-8">No summary available for this meeting.</div>
                ) : (
                  <div className="space-y-4">
                    {/* Topics index */}
                    {selectedNotes.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100">
                        {selectedNotes.topics.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setExpandedTopics(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                            className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-purple-100 transition"
                          >
                            {t.title}
                            {expandedTopics[t.id] ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Markdown summary */}
                    <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-800 prose-headings:font-bold prose-li:marker:text-purple-400">
                      <ReactMarkdown>{selectedNotes.markdownContent || '*No summary content available.*'}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  // ── Calendar helpers ─────────────────────────────────────────────────────────

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  const eventsInMonth = events.filter(e => {
    const d = new Date(e.start_time);
    return d.getFullYear() === calYear && d.getMonth() === calMonth;
  });

  const eventsOnDay = (day: number) =>
    eventsInMonth.filter(e => new Date(e.start_time).getDate() === day);

  const selectedDayEvents = selectedDay
    ? events.filter(e => isSameDay(new Date(e.start_time), selectedDay))
    : [];

  // ── Tab content ──────────────────────────────────────────────────────────────

  const renderConnect = () => (
    <div className="max-w-xl mx-auto mt-8 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#15621B]/10 mb-4">
          <Calendar className="w-8 h-8 text-[#15621B]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Connect Calendly</h2>
        <p className="text-gray-500 mt-1">Paste your Personal Access Token to sync meetings</p>
      </div>

      {/* Token input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-1">Personal Access Token</label>
          <input
            type="password"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
            placeholder="eyJhbGciOiJIUzI1NiJ9..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#15621B]/30"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Get your token at{' '}
            <span className="text-[#15621B] font-medium">calendly.com → Integrations → API & Webhooks</span>
          </p>
        </div>

        {authError && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {authError}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={!tokenInput.trim() || connecting}
          className="w-full py-3 bg-[#15621B] text-white font-bold rounded-xl hover:bg-[#0e4412] disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          {connecting ? 'Connecting…' : 'Connect Calendly'}
        </button>
      </div>

      {/* Info card */}
      <div className="bg-[#FBEFD0] rounded-2xl border border-[#e8c98f]/40 p-5 text-sm text-gray-700 space-y-2">
        <p className="font-semibold text-[#15621B]">What you'll get:</p>
        <ul className="space-y-1 list-disc list-inside text-gray-600">
          <li>View all your Calendly event types</li>
          <li>Generate one-off scheduling links per contact</li>
          <li>See all upcoming meetings in a calendar view</li>
          <li>Quickly copy & share booking links</li>
        </ul>
      </div>
    </div>
  );

  const renderEventTypes = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-lg">Event Types</h3>
        <button
          onClick={fetchEventTypes}
          disabled={loadingEventTypes}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#15621B] transition"
        >
          <RefreshCw size={14} className={loadingEventTypes ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loadingEventTypes ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p>No active event types found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eventTypes.map(et => {
            const generatedLink = generatedLinks[et.uri];
            const isCopied = copiedKey === et.uri + '_link';
            const isCopiedScheduling = copiedKey === et.uri + '_scheduling';
            const isGenerating = generatingLink && oneOffEventUri === et.uri;

            return (
              <div key={et.uri} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* Color bar + title */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-3 h-full min-h-[40px] rounded-full shrink-0"
                    style={{ backgroundColor: et.color || '#15621B' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 truncate">{et.name}</span>
                      <KindBadge kind={et.kind} />
                    </div>
                    {et.description_plain && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{et.description_plain}</p>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                  <Clock size={13} />
                  <span>{getDurationLabel(et.duration)}</span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* Copy scheduling URL */}
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={et.scheduling_url}
                      className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(et.scheduling_url, et.uri + '_scheduling')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      title="Copy scheduling URL"
                    >
                      {isCopiedScheduling ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                    </button>
                    <a
                      href={et.scheduling_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      title="Open in Calendly"
                    >
                      <ExternalLink size={14} className="text-gray-500" />
                    </a>
                  </div>

                  {/* Generate one-off link */}
                  {generatedLink ? (
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={generatedLink}
                        className="flex-1 text-xs px-3 py-2 bg-green-50 border border-green-200 rounded-lg font-mono truncate text-green-800"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedLink, et.uri + '_link')}
                        className="px-3 py-2 bg-green-100 hover:bg-green-200 rounded-lg transition"
                        title="Copy one-off link"
                      >
                        {isCopied ? <Check size={14} className="text-green-700" /> : <Copy size={14} className="text-green-700" />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateLink(et.uri)}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-[#15621B] border border-[#15621B]/30 rounded-lg hover:bg-[#15621B]/5 disabled:opacity-50 transition"
                    >
                      {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      {isGenerating ? 'Generating…' : 'Generate One-Off Link'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderUpcoming = () => {
    const upcoming = events
      .filter(e => e.status === 'active' && new Date(e.start_time) >= new Date())
      .slice(0, 30);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">Upcoming Meetings</h3>
          <button
            onClick={fetchEvents}
            disabled={loadingEvents}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#15621B] transition"
          >
            <RefreshCw size={14} className={loadingEvents ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loadingEvents ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>No upcoming meetings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(ev => {
              const start = new Date(ev.start_time);
              const isToday = isSameDay(start, today);
              return (
                <div
                  key={ev.uri}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex gap-4 ${isToday ? 'border-[#15621B]/40 ring-1 ring-[#15621B]/20' : 'border-gray-200'}`}
                >
                  {/* Date block */}
                  <div className={`shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center ${isToday ? 'bg-[#15621B] text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <span className="text-[10px] font-bold uppercase">{MONTH_NAMES[start.getMonth()].slice(0,3)}</span>
                    <span className="text-xl font-black leading-none">{start.getDate()}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{ev.name}</span>
                      <StatusDot status={ev.status} />
                      {isToday && <span className="text-[10px] font-bold bg-[#15621B]/10 text-[#15621B] px-2 py-0.5 rounded-full">TODAY</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={12} />{formatTime(ev.start_time)} – {formatTime(ev.end_time)}</span>
                      {ev.location && (
                        ev.location.join_url
                          ? <a href={ev.location.join_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline"><Video size={12} />Join</a>
                          : ev.location.location
                            ? <span className="flex items-center gap-1"><MapPin size={12} />{ev.location.location}</span>
                            : null
                      )}
                      <span className="flex items-center gap-1"><User size={12} />{ev.invitees_counter.active} invitee{ev.invitees_counter.active !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const prevMonth = () => {
      if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
      else setCalMonth(m => m - 1);
      setSelectedDay(null);
    };
    const nextMonth = () => {
      if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
      else setCalMonth(m => m + 1);
      setSelectedDay(null);
    };

    // Build cells: empty leading cells + day cells
    const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    // pad to full weeks
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="space-y-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">
            {MONTH_NAMES[calMonth]} {calYear}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={fetchEvents} disabled={loadingEvents} className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#15621B] transition mr-2">
              <RefreshCw size={13} className={loadingEvents ? 'animate-spin' : ''} />
            </button>
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition"><ChevronLeft size={18} /></button>
            <button
              onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); setSelectedDay(null); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
            >Today</button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[80px] border-r border-b border-gray-50 bg-gray-50/50" />;

              const dayDate = new Date(calYear, calMonth, day);
              const isToday = isSameDay(dayDate, today);
              const isSelected = selectedDay ? isSameDay(dayDate, selectedDay) : false;
              const dayEvents = eventsOnDay(day);
              const isPast = dayDate < today && !isToday;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : dayDate)}
                  className={`min-h-[80px] border-r border-b border-gray-100 p-1.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#15621B]/5 ring-1 ring-inset ring-[#15621B]/30' :
                    isToday ? 'bg-[#FBEFD0]/50' : 'hover:bg-gray-50'
                  } ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-[#15621B] text-white' : isSelected ? 'text-[#15621B]' : 'text-gray-700'
                  }`}>{day}</div>

                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.uri}
                        className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-[#15621B]/10 text-[#15621B] font-semibold truncate"
                        title={ev.name}
                      >
                        {formatTime(ev.start_time)} {ev.name}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-gray-400 font-medium px-1">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day panel */}
        {selectedDay && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-bold text-gray-800">
                {selectedDay.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </h4>
              <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400">No meetings scheduled</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedDayEvents.map(ev => (
                  <div key={ev.uri} className="px-5 py-4 flex gap-4 items-start">
                    <div className="shrink-0 text-center w-14">
                      <p className="text-xs text-gray-400">{formatTime(ev.start_time)}</p>
                      <p className="text-xs text-gray-300">↕</p>
                      <p className="text-xs text-gray-400">{formatTime(ev.end_time)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{ev.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <StatusDot status={ev.status} />
                        <span>{ev.status}</span>
                        {ev.location?.join_url && (
                          <a href={ev.location.join_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <Video size={11} /> Join meeting
                          </a>
                        )}
                        {ev.location?.location && !ev.location.join_url && (
                          <span className="flex items-center gap-1"><MapPin size={11} />{ev.location.location}</span>
                        )}
                        <span className="flex items-center gap-1"><User size={11} />{ev.invitees_counter.active} invitee{ev.invitees_counter.active !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (!token || !user) {
    return (
      <div className="h-full">
        {renderConnect()}
      </div>
    );
  }

  const tabs = [
    { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
    { id: 'upcoming' as const, label: 'Upcoming', icon: Clock },
    { id: 'event-types' as const, label: 'Event Types', icon: Link2 },
    { id: 'transcripts' as const, label: 'Transcripts', icon: FileText },
    { id: 'connect' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Calendly connected as <span className="font-semibold text-[#15621B]">{user.name}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={user.scheduling_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-[#15621B]/10 text-[#15621B] rounded-xl hover:bg-[#15621B]/20 transition"
          >
            <ExternalLink size={14} />
            My Calendly
          </a>
          <button
            onClick={() => copyToClipboard(user.scheduling_url, 'profile')}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-[#15621B] text-white rounded-xl hover:bg-[#0e4412] transition"
          >
            {copiedKey === 'profile' ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey === 'profile' ? 'Copied!' : 'Share Link'}
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Event Types', value: eventTypes.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Upcoming', value: events.filter(e => e.status === 'active' && new Date(e.start_time) >= today).length, color: 'bg-green-50 text-green-700' },
          { label: 'This Month', value: eventsInMonth.filter(e => e.status === 'active').length, color: 'bg-purple-50 text-purple-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl px-4 py-3 ${s.color} flex items-center justify-between`}>
            <span className="text-sm font-semibold">{s.label}</span>
            <span className="text-2xl font-black">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#15621B] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'upcoming' && renderUpcoming()}
        {activeTab === 'event-types' && renderEventTypes()}
        {activeTab === 'transcripts' && renderTranscripts()}
        {activeTab === 'connect' && (
          <div className="max-w-xl space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                {user.avatar_url
                  ? <img src={user.avatar_url} className="w-14 h-14 rounded-full object-cover" alt={user.name} />
                  : <div className="w-14 h-14 rounded-full bg-[#15621B]/10 flex items-center justify-center"><User size={24} className="text-[#15621B]" /></div>
                }
                <div>
                  <p className="font-bold text-gray-800 text-lg">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{user.timezone}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Scheduling URL</p>
                <div className="flex gap-2">
                  <input readOnly value={user.scheduling_url} className="flex-1 text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono truncate" />
                  <button onClick={() => copyToClipboard(user.scheduling_url, 'settings_url')} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    {copiedKey === 'settings_url' ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-gray-500" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                Disconnect Calendly
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Meetings;
