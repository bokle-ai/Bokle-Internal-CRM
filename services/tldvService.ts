
const TLDV_BASE = 'https://pasta.tldv.io/v1alpha1';
const TLDV_KEY = 'bokle_tldv_api_key';

export interface TldvMeeting {
    id: string;
    name: string;
    happenedAt: string;
    url: string;
    duration: number;
    organizer: { email: string; name: string } | null;
}

export interface TldvNotes {
    markdownContent: string;
    topics: { id: string; order: number; title: string }[];
}

export interface TldvTranscriptSegment {
    startTime: number;
    endTime: number;
    speaker: string;
    text: string;
}

export const getTldvApiKey = (): string => {
    const envKey = (process.env.VITE_TLDV_API_KEY as string) || '';
    const stored = localStorage.getItem(TLDV_KEY) || '';
    if (envKey && !stored) localStorage.setItem(TLDV_KEY, envKey);
    return stored || envKey;
};

export const saveTldvApiKey = (key: string) => {
    localStorage.setItem(TLDV_KEY, key.trim());
};

export const clearTldvApiKey = () => {
    localStorage.removeItem(TLDV_KEY);
};

const tldvFetch = (apiKey: string, path: string) =>
    fetch(`${TLDV_BASE}${path}`, {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    });

export const TldvService = {
    getMeetings: async (apiKey: string): Promise<TldvMeeting[]> => {
        const res = await tldvFetch(apiKey, '/meetings');
        if (!res.ok) throw new Error(`tl.dv API error: ${res.status}`);
        const data = await res.json();
        // API returns array or { meetings: [...] }
        return Array.isArray(data) ? data : (data.meetings || data.data || []);
    },

    getNotes: async (apiKey: string, meetingId: string): Promise<TldvNotes> => {
        const res = await tldvFetch(apiKey, `/meetings/${meetingId}/notes`);
        if (!res.ok) throw new Error(`tl.dv Notes error: ${res.status}`);
        return res.json();
    },

    getTranscript: async (apiKey: string, meetingId: string): Promise<TldvTranscriptSegment[]> => {
        const res = await tldvFetch(apiKey, `/meetings/${meetingId}/transcript`);
        if (!res.ok) throw new Error(`tl.dv Transcript error: ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : (data.segments || data.transcript || []);
    },
};
