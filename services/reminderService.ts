
import { Deal, FollowUpReminder } from '../types';

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Returns today's date as an ISO date string (YYYY-MM-DD) in local time */
const todayISO = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Strip time component so we compare dates only */
const dateOnly = (iso: string): string => iso.slice(0, 10);

// ── Persistence helpers ───────────────────────────────────────────────────────
// Reminders are stored embedded inside each Deal object in localStorage.
// These helpers read/write the full deals array that storageService already owns,
// so we delegate persistence back to whoever saves the returned Deal.

const DEALS_KEY = 'bokle_data_deals';

const readDealsFromLocal = (): Deal[] => {
    try {
        const raw = localStorage.getItem(DEALS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const writeDealsToLocal = (deals: Deal[]): void => {
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all undone reminders across all deals where dueDate is today or earlier.
 * Includes both today's reminders and any overdue ones.
 */
export const getRemindersForToday = (deals: Deal[]): FollowUpReminder[] => {
    const today = todayISO();
    const results: FollowUpReminder[] = [];
    for (const deal of deals) {
        for (const reminder of deal.reminders ?? []) {
            if (!reminder.isDone && dateOnly(reminder.dueDate) <= today) {
                results.push(reminder);
            }
        }
    }
    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

/**
 * Returns all undone reminders across all deals where dueDate is strictly before today.
 */
export const getOverdueReminders = (deals: Deal[]): FollowUpReminder[] => {
    const today = todayISO();
    const results: FollowUpReminder[] = [];
    for (const deal of deals) {
        for (const reminder of deal.reminders ?? []) {
            if (!reminder.isDone && dateOnly(reminder.dueDate) < today) {
                results.push(reminder);
            }
        }
    }
    return results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

/**
 * Adds a new follow-up reminder to the given deal.
 * Returns the updated Deal — caller is responsible for persisting it.
 */
export const addReminder = (deal: Deal, note: string, dueDate: string): Deal => {
    const reminder: FollowUpReminder = {
        id: crypto.randomUUID(),
        dealId: deal.id,
        dueDate: dateOnly(dueDate),
        note: note.trim(),
        isDone: false,
        createdAt: new Date().toISOString(),
    };

    const updated: Deal = {
        ...deal,
        reminders: [...(deal.reminders ?? []), reminder],
    };

    // Persist immediately into localStorage so it survives without a Supabase round-trip
    const all = readDealsFromLocal();
    const idx = all.findIndex(d => d.id === deal.id);
    if (idx >= 0) {
        all[idx] = updated;
    } else {
        all.push(updated);
    }
    writeDealsToLocal(all);

    return updated;
};

/**
 * Marks a specific reminder as done on the given deal.
 * Returns the updated Deal — caller is responsible for persisting it.
 */
export const markReminderDone = (deal: Deal, reminderId: string): Deal => {
    const updated: Deal = {
        ...deal,
        reminders: (deal.reminders ?? []).map(r =>
            r.id === reminderId ? { ...r, isDone: true } : r
        ),
    };

    // Persist immediately into localStorage
    const all = readDealsFromLocal();
    const idx = all.findIndex(d => d.id === deal.id);
    if (idx >= 0) {
        all[idx] = updated;
    }
    writeDealsToLocal(all);

    return updated;
};

/**
 * Convenience: get all undone reminders for a single deal.
 */
export const getRemindersForDeal = (deal: Deal): FollowUpReminder[] =>
    (deal.reminders ?? []).filter(r => !r.isDone)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

/**
 * Convenience: count overdue reminders across all deals (for badge/alert use).
 */
export const countOverdueReminders = (deals: Deal[]): number =>
    getOverdueReminders(deals).length;
