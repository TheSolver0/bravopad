export type CalendarType = 'personal' | 'team' | 'company' | 'project' | 'shared';
export type CalendarVisibility = 'private' | 'public' | 'team';
export type EventType = 'meeting' | 'appointment' | 'reminder' | 'task' | 'out_of_office' | 'holiday' | 'other';
export type EventStatus = 'confirmed' | 'pending' | 'cancelled' | 'postponed' | 'completed' | 'absent';
export type EventPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AttendeeStatus = 'invited' | 'accepted' | 'declined' | 'tentative' | 'no_response';

export interface AgendaCalendar {
    id: number;
    name: string;
    description?: string;
    color: string;
    type: CalendarType;
    timezone: string;
    visibility: CalendarVisibility;
    is_default: boolean;
    is_archived?: boolean;
    owner_id: number;
    owner_name?: string;
    is_mine: boolean;
}

export interface EventAttendeeData {
    id: number;
    user_id: number;
    name?: string;
    avatar?: string;
    status: AttendeeStatus;
    is_organizer: boolean;
    checked_in: boolean;
}

export interface AgendaEventData {
    id: number;
    title: string;
    description?: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
    location?: string;
    meeting_url?: string;
    type: EventType;
    status: EventStatus;
    priority: EventPriority;
    color?: string;
    tags?: string[];
    internal_notes?: string;
    is_recurring: boolean;
    calendar_id: number;
    calendar_color?: string;
    calendar_name?: string;
    organizer: {
        id: number;
        name: string;
        avatar?: string;
    };
    attendees: EventAttendeeData[];
    my_status?: AttendeeStatus;
    is_organizer: boolean;
    duration_minutes: number;
}

export interface HolidayData {
    id: number;
    name: string;
    name_en?: string;
    date: string;
    type: 'national' | 'regional' | 'company' | 'custom';
    country_code?: string;
}

export interface BirthdayData {
    user_id: number;
    name: string;
    avatar?: string;
    date: string;
    age: number;
    is_me: boolean;
}

export interface TeamMember {
    id: number;
    name: string;
    avatar?: string;
    email: string;
}

export interface AgendaStats {
    today: number;
    week: number;
    pending: number;
}

export type AgendaView = 'day' | 'week' | 'month' | 'agenda' | 'team';

export interface EventFormData {
    title: string;
    description: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
    location: string;
    meeting_url: string;
    type: EventType;
    status: EventStatus;
    priority: EventPriority;
    color: string;
    tags: string[];
    internal_notes: string;
    calendar_id: number | null;
    attendee_ids: number[];
    reminders: { minutes_before: number; channel: 'email' | 'push' }[];
}

// ── Date utilities ────────────────────────────────────────────────────────────

export const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const DAYS_FULL_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function isToday(date: Date): boolean {
    return isSameDay(date, new Date());
}

export function startOfWeek(date: Date, startMonday = true): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = startMonday ? (day === 0 ? -6 : 1 - day) : -day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

export function addMonths(date: Date, n: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    return d;
}

export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Returns the 6×7 grid of dates for a month calendar */
export function getMonthGrid(year: number, month: number): Date[] {
    const firstDay = new Date(year, month, 1);
    const gridStart = startOfWeek(firstDay, true);
    const grid: Date[] = [];
    for (let i = 0; i < 42; i++) {
        grid.push(addDays(gridStart, i));
    }
    return grid;
}

/** Returns the 7 days of the week containing the given date */
export function getWeekDays(date: Date): Date[] {
    const start = startOfWeek(date, true);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatDateLabel(date: Date): string {
    return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTimeLabel(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function toLocalISOString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function combineDateTime(dateStr: string, timeStr: string): string {
    return `${dateStr}T${timeStr}:00`;
}

/** Returns events that fall on a given calendar day */
export function eventsOnDay(events: AgendaEventData[], date: Date): AgendaEventData[] {
    return events.filter(e => {
        const start = new Date(e.start_at);
        const end = new Date(e.end_at);
        // Multi-day events span across the day
        const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
        const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);
        return start <= dayEnd && end >= dayStart;
    });
}

/** Position a timed event in the time grid as % offsets */
export function eventGridPosition(event: AgendaEventData): { top: number; height: number } {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin   = end.getHours() * 60 + end.getMinutes();
    const totalMin = 24 * 60;
    return {
        top:    (startMin / totalMin) * 100,
        height: Math.max(((endMin - startMin) / totalMin) * 100, 1),
    };
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    meeting:       'Réunion',
    appointment:   'Rendez-vous',
    reminder:      'Rappel',
    task:          'Tâche',
    out_of_office: 'Absent',
    holiday:       'Congé',
    other:         'Autre',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
    confirmed:  'Confirmé',
    pending:    'En attente',
    cancelled:  'Annulé',
    postponed:  'Reporté',
    completed:  'Terminé',
    absent:     'Absent',
};

export const EVENT_PRIORITY_LABELS: Record<EventPriority, string> = {
    low:    'Basse',
    normal: 'Normale',
    high:   'Haute',
    urgent: 'Urgente',
};

export const PRIORITY_COLORS: Record<EventPriority, string> = {
    low:    '#6B7280',
    normal: '#3B82F6',
    high:   '#F59E0B',
    urgent: '#EF4444',
};

export const STATUS_COLORS: Record<EventStatus, string> = {
    confirmed:  '#10B981',
    pending:    '#F59E0B',
    cancelled:  '#EF4444',
    postponed:  '#8B5CF6',
    completed:  '#6B7280',
    absent:     '#F97316',
};
