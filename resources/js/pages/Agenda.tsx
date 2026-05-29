import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
    ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users, Video,
    Trash2, Edit3, Check, X, Bell, Loader2, Search, CheckCircle2,
    List, CalendarDays, CalendarRange, Grid3x3, PanelLeft, PanelLeftClose,
    Globe, Building2, Cake,
} from 'lucide-react';
import { useInitials } from '@/hooks/use-initials';
import type {
    AgendaCalendar, AgendaEventData, HolidayData, BirthdayData,
    TeamMember, AgendaStats, AgendaView, EventFormData,
    EventType, EventStatus, EventPriority, AttendeeStatus,
    AgendaDisplayFilter,
} from '@/types/agenda';
import {
    AGENDA_DISPLAY_FILTERS,
    DAYS_FR, MONTHS_FR,
    isSameDay, isToday, addDays, addMonths,
    getMonthGrid, getWeekDays,
    formatDateLabel, formatTimeLabel, toDateInputValue,
    eventsOnDay, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_PRIORITY_LABELS,
} from '@/types/agenda';

interface AgendaProps {
    calendars: AgendaCalendar[];
    holidays: HolidayData[];
    birthdays: BirthdayData[];
    teamMembers: TeamMember[];
    stats: AgendaStats;
    network_count: number;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const PRESET_COLORS = [
    '#007AFF','#34C759','#FF9500','#FF3B30','#AF52DE',
    '#5AC8FA','#FF2D55','#00C7BE','#FFCC00','#30B0C7',
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 60;

const cx = (...classes: (string | false | null | undefined)[]) =>
    classes.filter(Boolean).join(' ');

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EventStatus }) {
    const map: Record<EventStatus, string> = {
        confirmed: 'bg-emerald-50 text-emerald-600',
        pending:   'bg-amber-50 text-amber-600',
        cancelled: 'bg-red-50 text-red-500',
        postponed: 'bg-violet-50 text-violet-600',
        completed: 'bg-slate-50 text-slate-400',
        absent:    'bg-orange-50 text-orange-500',
    };
    return (
        <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${map[status]}`}>
            {EVENT_STATUS_LABELS[status]}
        </span>
    );
}

function PriorityDot({ priority }: { priority: EventPriority }) {
    if (priority === 'normal') return null;
    const map: Record<EventPriority, string> = {
        low: 'bg-slate-300', normal: 'bg-blue-400', high: 'bg-amber-400', urgent: 'bg-red-500',
    };
    return <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${map[priority]}`} />;
}

function AttendeeStatusDot({ status }: { status: AttendeeStatus }) {
    const map: Record<AttendeeStatus, string> = {
        accepted: 'bg-emerald-500', declined: 'bg-red-400',
        tentative: 'bg-amber-400', invited: 'bg-blue-400', no_response: 'bg-slate-200',
    };
    return <div className={`w-2 h-2 rounded-full ${map[status]}`} />;
}

// ── EventChip (vue mois) ──────────────────────────────────────────────────────
function EventChip({ event, onClick }: { event: AgendaEventData; onClick: (e: AgendaEventData) => void }) {
    const color = event.color ?? event.calendar_color ?? '#007AFF';
    return (
        <button
            onClick={ev => { ev.stopPropagation(); onClick(event); }}
            style={{ backgroundColor: color }}
            className="w-full text-left rounded-[4px] px-1.5 py-[2px] overflow-hidden hover:opacity-90 active:opacity-75 transition-opacity"
        >
            <span className="text-[10px] font-medium text-white truncate block leading-snug">
                {!event.all_day && (
                    <span className="opacity-75 mr-0.5">{formatTimeLabel(new Date(event.start_at))}</span>
                )}
                {event.title}
            </span>
        </button>
    );
}

// ── BirthdayChip ──────────────────────────────────────────────────────────────
function BirthdayChip({ birthday, compact }: { birthday: BirthdayData; compact?: boolean }) {
    return (
        <div className={cx(
            'w-full text-left rounded-[4px] px-1.5 overflow-hidden',
            compact ? 'py-[2px]' : 'py-1',
        )}
            style={{ backgroundColor: '#AF52DE15', borderLeft: '2px solid #AF52DE' }}>
            <span className="text-[10px] font-medium truncate block leading-snug" style={{ color: '#AF52DE' }}>
                🎂 {compact ? birthday.name.split(' ')[0] : birthday.name}
                {birthday.age > 0 && <span className="opacity-60 ml-0.5">{birthday.age}a</span>}
            </span>
        </div>
    );
}

// ── EventBlock (grille horaire) ───────────────────────────────────────────────
function EventBlock({
    event, top, height, left, width, onClick,
}: { event: AgendaEventData; top: number; height: number; left: string; width: string; onClick: (e: AgendaEventData) => void }) {
    const color = event.color ?? event.calendar_color ?? '#007AFF';
    const tall = height > 44;
    return (
        <button
            onClick={() => onClick(event)}
            style={{ top, height: Math.max(height, 22), left, width, backgroundColor: color + 'ee', borderLeft: `3px solid ${color}` }}
            className="absolute rounded-lg px-2 py-1 text-left overflow-hidden z-10 hover:opacity-95 hover:z-20 hover:shadow-lg shadow-sm transition-all"
        >
            <p className="text-white text-[11px] font-semibold truncate leading-tight">{event.title}</p>
            {tall && (
                <p className="text-white/70 text-[10px] truncate mt-[1px]">
                    {formatTimeLabel(new Date(event.start_at))} – {formatTimeLabel(new Date(event.end_at))}
                </p>
            )}
        </button>
    );
}

// ── layoutEvents ─────────────────────────────────────────────────────────────
function layoutEvents(events: AgendaEventData[]) {
    type Slot = { event: AgendaEventData; col: number; total: number };
    const slots: Slot[] = events.map(e => ({ event: e, col: 0, total: 1 }));
    const groups: Slot[][] = [];
    for (const slot of slots) {
        const s = new Date(slot.event.start_at).getTime();
        const e = new Date(slot.event.end_at).getTime();
        let placed = false;
        for (const g of groups) {
            if (g.some(x => {
                const xs = new Date(x.event.start_at).getTime();
                const xe = new Date(x.event.end_at).getTime();
                return s < xe && e > xs;
            })) { slot.col = g.length; g.push(slot); placed = true; break; }
        }
        if (!placed) groups.push([slot]);
    }
    for (const g of groups) g.forEach(s => (s.total = g.length));
    return slots;
}

// ── Vue MOIS (Apple style) ────────────────────────────────────────────────────
function MonthView({
    date, events, holidays, birthdays,
    onDayClick, onEventClick,
}: {
    date: Date; events: AgendaEventData[]; holidays: HolidayData[]; birthdays: BirthdayData[];
    onDayClick: (d: Date) => void; onEventClick: (e: AgendaEventData) => void;
}) {
    const grid = getMonthGrid(date.getFullYear(), date.getMonth());
    const holidayMap = new Map(holidays.map(h => [h.date, h]));
    const birthdayMap = new Map<string, BirthdayData[]>();
    birthdays.forEach(b => {
        const k = b.date;
        if (!birthdayMap.has(k)) birthdayMap.set(k, []);
        birthdayMap.get(k)!.push(b);
    });

    const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* En-têtes jours */}
            <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                {DAY_LABELS.map((d, i) => (
                    <div key={d} className={cx(
                        'py-2 text-center text-[11px] font-medium tracking-wide',
                        i === 0 || i === 6 ? 'text-rose-400' : 'text-zinc-400',
                    )}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Grille */}
            <div className="flex-1 grid grid-cols-7 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50"
                style={{ gridAutoRows: 'minmax(90px,1fr)' }}>
                {grid.map((day, idx) => {
                    const inMonth  = day.getMonth() === date.getMonth();
                    const isWknd   = day.getDay() === 0 || day.getDay() === 6;
                    const isTd     = isToday(day);
                    const dayStr   = toDateInputValue(day);
                    const holiday  = holidayMap.get(dayStr);
                    const bdays    = birthdayMap.get(dayStr) ?? [];
                    const dayEvts  = eventsOnDay(events, day);
                    const allItems = dayEvts.length + bdays.length;
                    const maxShow  = 3;
                    const overflow = allItems - maxShow;

                    return (
                        <div
                            key={idx}
                            onClick={() => onDayClick(day)}
                            className={cx(
                                'border-r border-b border-zinc-100 dark:border-zinc-800 p-1.5 cursor-pointer transition-colors',
                                'bg-white dark:bg-zinc-950',
                                !inMonth && 'bg-zinc-50/80 dark:bg-zinc-900/50',
                                isWknd && inMonth && 'bg-zinc-50/60 dark:bg-zinc-900/40',
                                !isTd && inMonth && 'hover:bg-blue-50/30 dark:hover:bg-blue-950/20',
                            )}
                        >
                            {/* Numéro du jour */}
                            <div className="flex items-start justify-between mb-1">
                                <span className={cx(
                                    'w-6 h-6 flex items-center justify-center rounded-full text-[12px] transition-colors',
                                    isTd ? 'bg-rose-500 text-white font-bold shadow-sm shadow-rose-300' :
                                    inMonth && !isWknd ? 'text-zinc-800 dark:text-zinc-200 hover:text-blue-600 font-medium' :
                                    inMonth && isWknd ? 'text-rose-400 font-medium' :
                                    'text-zinc-300 dark:text-zinc-700',
                                )}>
                                    {day.getDate()}
                                </span>
                                {/* Indicateurs holiday / birthday dots */}
                                <div className="flex gap-0.5 mt-1">
                                    {holiday && inMonth && (
                                        <div className={cx(
                                            'w-1.5 h-1.5 rounded-full',
                                            holiday.country_code === 'INTL' ? 'bg-sky-400' : 'bg-amber-400',
                                        )} title={holiday.name} />
                                    )}
                                    {bdays.length > 0 && inMonth && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400" title={bdays.map(b => b.name).join(', ')} />
                                    )}
                                </div>
                            </div>

                            {/* Nom du férié */}
                            {holiday && inMonth && (
                                <div className={cx(
                                    'text-[9px] font-medium truncate mb-0.5 leading-tight',
                                    holiday.country_code === 'INTL' ? 'text-sky-500' : 'text-amber-500',
                                )}>
                                    {holiday.name}
                                </div>
                            )}

                            {/* Événements + anniversaires */}
                            <div className="space-y-[2px]">
                                {/* Birthdays first */}
                                {bdays.slice(0, Math.min(bdays.length, maxShow)).map((b, i) => (
                                    <BirthdayChip key={`b-${i}`} birthday={b} compact />
                                ))}
                                {/* Events */}
                                {dayEvts.slice(0, Math.max(0, maxShow - bdays.length)).map(e => (
                                    <EventChip key={e.id} event={e} onClick={onEventClick} />
                                ))}
                                {overflow > 0 && (
                                    <div className="text-[9px] text-zinc-400 font-medium px-1">
                                        +{overflow} de plus
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Vue SEMAINE (Apple style) ──────────────────────────────────────────────────
function WeekView({
    date, events, holidays, birthdays,
    onSlotClick, onEventClick,
}: {
    date: Date; events: AgendaEventData[]; holidays: HolidayData[]; birthdays: BirthdayData[];
    onSlotClick: (d: Date) => void; onEventClick: (e: AgendaEventData) => void;
}) {
    const weekDays   = getWeekDays(date);
    const holidayMap = new Map(holidays.map(h => [h.date, h]));
    const birthdayMap = new Map<string, BirthdayData[]>();
    birthdays.forEach(b => {
        if (!birthdayMap.has(b.date)) birthdayMap.set(b.date, []);
        birthdayMap.get(b.date)!.push(b);
    });
    const now    = new Date();
    const nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_PX;
    const allDayEvt = (d: Date) => eventsOnDay(events, d).filter(e => e.all_day);
    const timedEvt  = (d: Date) => eventsOnDay(events, d).filter(e => !e.all_day);
    const hasAllDay = weekDays.some(d => allDayEvt(d).length > 0 || (birthdayMap.get(toDateInputValue(d))?.length ?? 0) > 0);

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="flex border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="w-14 shrink-0" />
                {weekDays.map((day, i) => {
                    const isWknd  = day.getDay() === 0 || day.getDay() === 6;
                    const isTd    = isToday(day);
                    const holiday = holidayMap.get(toDateInputValue(day));
                    const bdays   = birthdayMap.get(toDateInputValue(day)) ?? [];
                    return (
                        <div key={i} className={cx(
                            'flex-1 py-2 px-1 text-center border-l border-zinc-100 dark:border-zinc-800',
                            isTd && 'bg-blue-50/40 dark:bg-blue-950/10',
                        )}>
                            <div className={cx(
                                'text-[11px] font-medium uppercase tracking-wide',
                                isWknd ? 'text-rose-400' : 'text-zinc-400',
                            )}>
                                {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][day.getDay()]}
                            </div>
                            <div className={cx(
                                'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-[16px] font-bold mt-0.5',
                                isTd ? 'bg-rose-500 text-white shadow-sm shadow-rose-300' :
                                isWknd ? 'text-rose-400' : 'text-zinc-800 dark:text-zinc-100',
                            )}>
                                {day.getDate()}
                            </div>
                            {(holiday || bdays.length > 0) && (
                                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                    {holiday && (
                                        <span className={cx('text-[8px] font-medium truncate max-w-[60px]',
                                            holiday.country_code === 'INTL' ? 'text-sky-400' : 'text-amber-500')}>
                                            {holiday.name}
                                        </span>
                                    )}
                                    {bdays.length > 0 && (
                                        <span className="text-[8px]">🎂</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Toute la journée */}
            {hasAllDay && (
                <div className="flex border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-zinc-50/60 dark:bg-zinc-900/40">
                    <div className="w-14 shrink-0 flex items-center justify-end pr-2">
                        <span className="text-[9px] text-zinc-400 font-medium">Jour</span>
                    </div>
                    {weekDays.map((day, i) => {
                        const bdays = birthdayMap.get(toDateInputValue(day)) ?? [];
                        return (
                            <div key={i} className={cx(
                                'flex-1 border-l border-zinc-100 dark:border-zinc-800 p-1 min-h-[26px]',
                                isToday(day) && 'bg-blue-50/30 dark:bg-blue-950/10',
                            )}>
                                {allDayEvt(day).map(e => (
                                    <EventChip key={e.id} event={e} onClick={onEventClick} />
                                ))}
                                {bdays.map((b, i) => (
                                    <BirthdayChip key={`bd-${i}`} birthday={b} compact />
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Grille temporelle */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex relative" style={{ height: HOUR_PX * 24 }}>
                    {/* Axe heures */}
                    <div className="w-14 shrink-0 relative select-none">
                        {HOURS.map(h => (
                            <div key={h} className="absolute w-full" style={{ top: h * HOUR_PX }}>
                                <span className="block text-right pr-2 text-[10px] text-zinc-300 dark:text-zinc-600 -translate-y-[6px] font-medium">
                                    {h === 0 ? '' : `${h.toString().padStart(2,'0')}:00`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Colonnes */}
                    {weekDays.map((day, dayIdx) => {
                        const isWknd = day.getDay() === 0 || day.getDay() === 6;
                        const isTd   = isToday(day);
                        const slots  = layoutEvents(timedEvt(day));
                        return (
                            <div key={dayIdx} className={cx(
                                'flex-1 border-l border-zinc-100 dark:border-zinc-800 relative',
                                isWknd && 'bg-zinc-50/40 dark:bg-zinc-900/20',
                                isTd && 'bg-blue-50/20 dark:bg-blue-950/5',
                            )} style={{ height: HOUR_PX * 24 }}>
                                {/* Off-hours shading */}
                                <div className="absolute inset-x-0 top-0 bg-zinc-100/50 dark:bg-zinc-900/40 pointer-events-none"
                                    style={{ height: 8 * HOUR_PX }} />
                                <div className="absolute inset-x-0 bottom-0 bg-zinc-100/50 dark:bg-zinc-900/40 pointer-events-none"
                                    style={{ height: 6 * HOUR_PX }} />

                                {/* Lignes */}
                                {HOURS.map(h => (
                                    <div key={h} onClick={() => { const d=new Date(day); d.setHours(h,0,0,0); onSlotClick(d); }}
                                        className="absolute w-full border-t border-zinc-100 dark:border-zinc-800 hover:bg-blue-50/30 cursor-pointer transition-colors"
                                        style={{ top: h * HOUR_PX, height: HOUR_PX }} />
                                ))}
                                {HOURS.map(h => (
                                    <div key={`h${h}`}
                                        className="absolute w-full border-t border-zinc-100/60 dark:border-zinc-800/60 pointer-events-none"
                                        style={{ top: h * HOUR_PX + HOUR_PX / 2 }} />
                                ))}

                                {/* Événements */}
                                {slots.map(({ event, col, total }) => {
                                    const s = new Date(event.start_at);
                                    const e = new Date(event.end_at);
                                    const top    = (s.getHours()*60+s.getMinutes())/60*HOUR_PX;
                                    const height = (e.getTime()-s.getTime())/60000/60*HOUR_PX;
                                    const w = `${(1/total)*92}%`;
                                    const l = `${(col/total)*92+4}%`;
                                    return <EventBlock key={event.id} event={event} top={top} height={height} left={l} width={w} onClick={onEventClick} />;
                                })}

                                {/* Indicateur temps */}
                                {isTd && (
                                    <div className="absolute left-0 right-0 flex items-center pointer-events-none z-20" style={{ top: nowTop }}>
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-300/60 shrink-0 -ml-1.5" />
                                        <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-500 to-rose-300/0" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Vue JOUR ──────────────────────────────────────────────────────────────────
function DayView({
    date, events, holidays, birthdays,
    onSlotClick, onEventClick,
}: {
    date: Date; events: AgendaEventData[]; holidays: HolidayData[]; birthdays: BirthdayData[];
    onSlotClick: (d: Date) => void; onEventClick: (e: AgendaEventData) => void;
}) {
    const now    = new Date();
    const nowTop = (now.getHours()*60+now.getMinutes())/60*HOUR_PX;
    const holiday = new Map(holidays.map(h=>[h.date,h])).get(toDateInputValue(date));
    const bdays   = birthdays.filter(b => b.date === toDateInputValue(date));
    const dayEvts = eventsOnDay(events, date).filter(e => !e.all_day);
    const allDay  = eventsOnDay(events, date).filter(e => e.all_day);
    const slots   = layoutEvents(dayEvts);

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-zinc-950">
            {/* En-tête */}
            <div className={cx(
                'flex items-center gap-4 px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0',
                isToday(date) && 'bg-blue-50/30 dark:bg-blue-950/10',
            )}>
                <div className={cx(
                    'w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0',
                    isToday(date) ? 'bg-rose-500 text-white shadow shadow-rose-300/40' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100',
                )}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                        {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][date.getDay()]}
                    </span>
                    <span className="text-[22px] font-bold leading-none">{date.getDate()}</span>
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-[16px] text-zinc-800 dark:text-zinc-100">
                        {MONTHS_FR[date.getMonth()]} {date.getFullYear()}
                    </p>
                    {isToday(date) && <p className="text-[11px] text-rose-500 font-medium">Aujourd'hui</p>}
                    {holiday && (
                        <p className={cx('text-[11px] font-medium flex items-center gap-1',
                            holiday.country_code==='INTL' ? 'text-sky-500' : 'text-amber-500')}>
                            {holiday.country_code==='INTL' ? <Globe size={10}/> : <Building2 size={10}/>}
                            {holiday.name}
                        </p>
                    )}
                    {bdays.map((b, i) => (
                        <p key={i} className="text-[11px] text-violet-500 font-medium flex items-center gap-1">
                            <Cake size={10}/> Anniversaire de {b.name}{b.is_me ? ' (vous)' : ''} — {b.age} ans
                        </p>
                    ))}
                </div>
                {allDay.map(e => <EventChip key={e.id} event={e} onClick={onEventClick} />)}
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="flex relative" style={{ height: HOUR_PX * 24 }}>
                    <div className="w-14 shrink-0 relative select-none">
                        {HOURS.map(h => (
                            <div key={h} className="absolute w-full" style={{ top: h * HOUR_PX }}>
                                <span className="block text-right pr-2 text-[10px] text-zinc-300 dark:text-zinc-600 -translate-y-[6px] font-medium">
                                    {h===0 ? '' : `${h.toString().padStart(2,'0')}:00`}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 border-l border-zinc-100 dark:border-zinc-800 relative" style={{ height: HOUR_PX * 24 }}>
                        <div className="absolute inset-x-0 top-0 bg-zinc-100/50 dark:bg-zinc-900/40 pointer-events-none" style={{ height: 8*HOUR_PX }} />
                        <div className="absolute inset-x-0 bottom-0 bg-zinc-100/50 dark:bg-zinc-900/40 pointer-events-none" style={{ height: 6*HOUR_PX }} />
                        {HOURS.map(h => (
                            <div key={h} onClick={() => { const d=new Date(date); d.setHours(h,0,0,0); onSlotClick(d); }}
                                className="absolute w-full border-t border-zinc-100 dark:border-zinc-800 hover:bg-blue-50/30 cursor-pointer transition-colors"
                                style={{ top: h*HOUR_PX, height: HOUR_PX }} />
                        ))}
                        {HOURS.map(h => (
                            <div key={`h${h}`} className="absolute w-full border-t border-zinc-100/60 dark:border-zinc-800/60 pointer-events-none"
                                style={{ top: h*HOUR_PX+HOUR_PX/2 }} />
                        ))}
                        {slots.map(({ event, col, total }) => {
                            const s=new Date(event.start_at), e=new Date(event.end_at);
                            const top=(s.getHours()*60+s.getMinutes())/60*HOUR_PX;
                            const height=(e.getTime()-s.getTime())/60000/60*HOUR_PX;
                            return <EventBlock key={event.id} event={event} top={top} height={height}
                                left={`${(col/total)*92+4}%`} width={`${(1/total)*92}%`} onClick={onEventClick} />;
                        })}
                        {isToday(date) && (
                            <div className="absolute left-0 right-0 flex items-center pointer-events-none z-20" style={{ top: nowTop }}>
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-300/60 shrink-0 -ml-1" />
                                <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-500 to-rose-300/0" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Vue LISTE ─────────────────────────────────────────────────────────────────
function AgendaListView({ events, holidays, birthdays, onEventClick }: {
    events: AgendaEventData[]; holidays: HolidayData[]; birthdays: BirthdayData[];
    onEventClick: (e: AgendaEventData) => void;
}) {
    const holidayMap  = new Map(holidays.map(h => [h.date, h]));
    const birthdayMap = new Map<string, BirthdayData[]>();
    birthdays.forEach(b => {
        if (!birthdayMap.has(b.date)) birthdayMap.set(b.date, []);
        birthdayMap.get(b.date)!.push(b);
    });

    // Grouper par jour
    const grouped = events.reduce((acc, e) => {
        const k = toDateInputValue(new Date(e.start_at));
        if (!acc[k]) acc[k] = [];
        acc[k].push(e);
        return acc;
    }, {} as Record<string, AgendaEventData[]>);

    // Ajouter les anniversaires en tant que jours
    birthdays.forEach(b => {
        if (!grouped[b.date]) grouped[b.date] = [];
    });

    const sortedDates = Object.keys(grouped).sort();

    if (sortedDates.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-400 py-24">
                <CalendarDays size={44} className="opacity-20" />
                <p className="text-[14px] font-medium">Aucun événement dans cette période</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 bg-white dark:bg-zinc-950">
            {sortedDates.map(dateKey => {
                const day     = new Date(dateKey + 'T00:00:00');
                const holiday = holidayMap.get(dateKey);
                const bdays   = birthdayMap.get(dateKey) ?? [];
                const evts    = grouped[dateKey] ?? [];
                return (
                    <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className={cx(
                                'w-10 h-10 rounded-2xl flex flex-col items-center justify-center shadow-sm shrink-0',
                                isToday(day) ? 'bg-rose-500 text-white' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200',
                            )}>
                                <span className="text-[9px] font-semibold uppercase">{['D','L','M','M','J','V','S'][day.getDay()]}</span>
                                <span className="text-[16px] font-bold leading-none">{day.getDate()}</span>
                            </div>
                            <div>
                                <p className={cx('font-semibold text-[13px]', isToday(day) ? 'text-rose-500' : 'text-zinc-800 dark:text-zinc-100')}>
                                    {isToday(day) ? "Aujourd'hui" : `${['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][day.getDay()]} ${day.getDate()} ${MONTHS_FR[day.getMonth()]}`}
                                </p>
                                {holiday && (
                                    <p className={cx('text-[11px] font-medium flex items-center gap-1',
                                        holiday.country_code==='INTL'?'text-sky-500':'text-amber-500')}>
                                        {holiday.country_code==='INTL' ? <Globe size={10}/> : <Building2 size={10}/>}
                                        {holiday.name}
                                    </p>
                                )}
                                {bdays.map((b, i) => (
                                    <p key={i} className="text-[11px] text-violet-500 font-medium flex items-center gap-1">
                                        <Cake size={10}/> {b.name} {b.is_me?'(vous)':''} — {b.age} ans
                                    </p>
                                ))}
                            </div>
                        </div>

                        <div className="ml-13 space-y-1.5" style={{ marginLeft: '52px' }}>
                            {evts.map(event => {
                                const color = event.color ?? event.calendar_color ?? '#007AFF';
                                return (
                                    <button key={event.id} onClick={() => onEventClick(event)}
                                        className="w-full flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors group">
                                        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-semibold text-[13px] text-zinc-800 dark:text-zinc-100 truncate">{event.title}</p>
                                                <PriorityDot priority={event.priority} />
                                                <StatusBadge status={event.status} />
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                                                {!event.all_day && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10}/>
                                                        {formatTimeLabel(new Date(event.start_at))} – {formatTimeLabel(new Date(event.end_at))}
                                                    </span>
                                                )}
                                                {event.location && <span className="flex items-center gap-1"><MapPin size={10}/>{event.location}</span>}
                                                {event.attendees.length > 1 && <span className="flex items-center gap-1"><Users size={10}/>{event.attendees.length}</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Mini Calendrier ───────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onSelect, events, birthdays, holidays }: {
    selectedDate: Date; onSelect: (d: Date) => void;
    events: AgendaEventData[]; birthdays: BirthdayData[]; holidays: HolidayData[];
}) {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    const grid = getMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
    const holidayDates = new Set(holidays.map(h => h.date));
    const birthdayDates = new Set(birthdays.map(b => b.date));

    useEffect(() => { setViewDate(new Date(selectedDate)); }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

    return (
        <div className="p-3 select-none">
            <div className="flex items-center justify-between mb-3">
                <button onClick={() => setViewDate(d => addMonths(d, -1))}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400">
                    <ChevronLeft size={12} />
                </button>
                <button onClick={() => setViewDate(new Date())}
                    className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-500 transition-colors">
                    {MONTHS_FR[viewDate.getMonth()]} {viewDate.getFullYear()}
                </button>
                <button onClick={() => setViewDate(d => addMonths(d, 1))}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400">
                    <ChevronRight size={12} />
                </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
                {['D','L','M','M','J','V','S'].map((d, i) => (
                    <div key={i} className={cx('text-center text-[9px] font-semibold', (i===0||i===6)?'text-rose-400':'text-zinc-300 dark:text-zinc-600')}>
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
                {grid.map((day, i) => {
                    const inMonth  = day.getMonth() === viewDate.getMonth();
                    const isSel    = isSameDay(day, selectedDate);
                    const isTd     = isToday(day);
                    const hasEvts  = eventsOnDay(events, day).length > 0;
                    const isWknd   = day.getDay() === 0 || day.getDay() === 6;
                    const dayStr   = toDateInputValue(day);
                    const hasBday  = birthdayDates.has(dayStr);
                    const hasHol   = holidayDates.has(dayStr);
                    return (
                        <button key={i} onClick={() => onSelect(day)}
                            className={cx(
                                'relative w-7 h-7 flex items-center justify-center rounded-full text-[11px] transition-all',
                                isSel && 'bg-rose-500 text-white font-bold shadow-sm shadow-rose-300/50',
                                isTd && !isSel && 'ring-[1.5px] ring-rose-500 text-rose-500 font-semibold',
                                !inMonth && 'opacity-20',
                                !isSel && !isTd && inMonth && isWknd && 'text-rose-400',
                                !isSel && !isTd && inMonth && !isWknd && 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                            )}>
                            {day.getDate()}
                            {(hasEvts || hasBday || hasHol) && !isSel && (
                                <span className="absolute bottom-[2px] left-1/2 -translate-x-1/2 flex gap-[2px]">
                                    {hasEvts && <span className="w-[3px] h-[3px] rounded-full bg-blue-400" />}
                                    {hasBday && <span className="w-[3px] h-[3px] rounded-full bg-violet-400" />}
                                    {hasHol  && <span className="w-[3px] h-[3px] rounded-full bg-amber-400" />}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── EventDetailPanel ──────────────────────────────────────────────────────────
function EventDetailPanel({ event, onClose, onEdit }: {
    event: AgendaEventData; onClose: () => void; onEdit: () => void;
}) {
    const color = event.color ?? event.calendar_color ?? '#007AFF';
    const start = new Date(event.start_at);
    const end   = new Date(event.end_at);

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18 }}
            className="w-72 bg-white dark:bg-zinc-950 border-l border-zinc-100 dark:border-zinc-800 flex flex-col shrink-0 overflow-hidden"
        >
            <div className="h-0.5 shrink-0" style={{ background: `linear-gradient(90deg,${color},${color}60)` }} />

            <div className="flex items-start justify-between p-4 gap-2">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-zinc-900 dark:text-zinc-50 leading-snug">{event.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <StatusBadge status={event.status} />
                        <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400">
                            {EVENT_TYPE_LABELS[event.type]}
                        </span>
                        <PriorityDot priority={event.priority} />
                    </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                    <button onClick={onEdit} className="p-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <Edit3 size={13} className="text-zinc-400" />
                    </button>
                    <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                        <X size={13} className="text-zinc-400" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                    <CalendarDays size={13} className="shrink-0 mt-0.5" style={{ color }} />
                    <div>
                        <p className="text-[12.5px] font-semibold text-zinc-800 dark:text-zinc-100">
                            {event.all_day ? formatDateLabel(start) : `${start.getDate()} ${MONTHS_FR[start.getMonth()]}`}
                        </p>
                        {!event.all_day && (
                            <p className="text-[11px] text-zinc-400">
                                {formatTimeLabel(start)} – {formatTimeLabel(end)}
                                <span className="ml-1 opacity-70">
                                    ({event.duration_minutes < 60
                                        ? `${event.duration_minutes}min`
                                        : `${Math.floor(event.duration_minutes/60)}h${event.duration_minutes%60?event.duration_minutes%60+'min':''}`
                                    })
                                </span>
                            </p>
                        )}
                    </div>
                </div>

                {event.location && (
                    <div className="flex items-center gap-2 text-[12px] text-zinc-600 dark:text-zinc-300">
                        <MapPin size={12} className="text-zinc-400 shrink-0" />{event.location}
                    </div>
                )}
                {event.meeting_url && (
                    <a href={event.meeting_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-[12px] font-semibold hover:underline" style={{ color }}>
                        <Video size={12} className="shrink-0" />Rejoindre la réunion
                    </a>
                )}
                {event.description && (
                    <p className="text-[12px] text-zinc-500 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-2xl">
                        {event.description}
                    </p>
                )}
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                        Participants ({event.attendees.length})
                    </p>
                    {event.attendees.length === 0 ? (
                        <p className="text-[11px] text-zinc-400">Aucun participant invité.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {event.attendees.map(a => (
                                <div key={a.id} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                                        {a.avatar ? <img src={a.avatar} alt={a.name??''} className="w-full h-full object-cover" />
                                            : <span className="text-[10px] font-semibold text-zinc-500">{(a.name??'?')[0]}</span>}
                                    </div>
                                    <span className="text-[12px] text-zinc-700 dark:text-zinc-300 flex-1 truncate">{a.name}</span>
                                    {a.is_organizer && <span className="text-[9px] font-semibold text-zinc-400">Org.</span>}
                                    <AttendeeStatusDot status={a.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {event.tags && event.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                        {event.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${color}15`, color }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: event.calendar_color??'#007AFF' }} />
                    {event.calendar_name}
                </div>
            </div>
        </motion.div>
    );
}

// ── EventModal ────────────────────────────────────────────────────────────────
const DEFAULT_FORM: EventFormData = {
    title:'', description:'', start_at:'', end_at:'',
    all_day:false, location:'', meeting_url:'',
    type:'meeting', status:'confirmed', priority:'normal',
    color:'', tags:[], internal_notes:'',
    calendar_id:null, attendee_ids:[],
    reminders:[{ minutes_before:15, channel:'push' }],
};

type ModalTab = 'details' | 'attendees' | 'reminders' | 'notes';

const mIn = 'w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 transition focus:border-zinc-400 dark:focus:border-zinc-500 focus:bg-white dark:focus:bg-zinc-800';
const mSel = mIn + ' cursor-pointer';
const mTxt = mIn + ' resize-none';

function EventModal({
    open, event, calendars, teamMembers,
    defaultDate, defaultCalendarId,
    onClose, onSaved, onDeleted,
}: {
    open:boolean; event:AgendaEventData|null; calendars:AgendaCalendar[];
    teamMembers:TeamMember[]; defaultDate:Date; defaultCalendarId:number|null;
    onClose:()=>void; onSaved:(e:AgendaEventData)=>void; onDeleted:(id:number)=>void;
}) {
    const [form, setForm]         = useState<EventFormData>(DEFAULT_FORM);
    const [saving, setSaving]     = useState(false);
    const [deleting, setDel]      = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tab, setTab]           = useState<ModalTab>('details');
    const [participantSearch, setParticipantSearch] = useState('');
    const getInitials = useInitials();

    const filteredTeamMembers = useMemo(() => {
        const q = participantSearch.trim().toLowerCase();
        if (!q) return teamMembers;
        return teamMembers.filter(m =>
            `${m.name} ${m.email}`.toLowerCase().includes(q),
        );
    }, [teamMembers, participantSearch]);

    const selectedMembers = useMemo(
        () => teamMembers.filter(m => form.attendee_ids.includes(m.id)),
        [teamMembers, form.attendee_ids],
    );

    useEffect(() => {
        if (!open) return;
        setParticipantSearch('');
        if (event) {
            setForm({
                title:event.title, description:event.description??'',
                start_at:event.start_at, end_at:event.end_at,
                all_day:event.all_day, location:event.location??'',
                meeting_url:event.meeting_url??'', type:event.type,
                status:event.status, priority:event.priority,
                color:event.color??'', tags:event.tags??[],
                internal_notes:event.internal_notes??'',
                calendar_id:event.calendar_id,
                attendee_ids:event.attendees.map(a=>a.user_id),
                reminders:[{ minutes_before:15, channel:'push' }],
            });
        } else {
            const s = new Date(defaultDate);
            s.setMinutes(Math.ceil(s.getMinutes()/15)*15, 0, 0);
            const e = new Date(s); e.setHours(e.getHours()+1);
            const fmt = (d:Date) => { const p=(n:number)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
            setForm({ ...DEFAULT_FORM, start_at:fmt(s), end_at:fmt(e), calendar_id:defaultCalendarId });
        }
        setTab('details');
    }, [open]);

    const up = (p:Partial<EventFormData>) => setForm(f=>({...f,...p}));

    const save = async () => {
        if (!form.title.trim()) return toast.error('Titre obligatoire');
        if (!form.calendar_id) return toast.error('Sélectionnez un calendrier');
        setSaving(true);
        try {
            const url=event?`/agenda/events/${event.id}`:'/agenda/events';
            const method=event?'PUT':'POST';
            const res=await fetch(url,{method,headers:{'Content-Type':'application/json','X-CSRF-TOKEN':(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content??'','Accept':'application/json'},body:JSON.stringify(form)});
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err.message ?? err.errors?.attendee_ids?.[0] ?? 'Erreur lors de l\'enregistrement';
                toast.error(msg);
                return;
            }
            const data=await res.json();
            const saved=event?data:data.event;
            if(data.conflicts?.length) toast.warning(`Conflit avec ${data.conflicts.length} événement(s).`);
            else toast.success(event?'Événement modifié':'Événement créé 🎉');
            onSaved(saved); onClose();
        } catch { toast.error('Erreur réseau'); }
        finally { setSaving(false); }
    };

    const del = async () => {
        if (!event) return;
        setDel(true);
        try {
            const res=await fetch(`/agenda/events/${event.id}`,{method:'DELETE',headers:{'X-CSRF-TOKEN':(document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content??'','Accept':'application/json'}});
            if(res.ok){toast.success('Événement supprimé');onDeleted(event.id);onClose();}
        } finally { setDel(false); }
    };

    const addTag = () => { const t=tagInput.trim(); if(t&&!form.tags.includes(t)) up({tags:[...form.tags,t]}); setTagInput(''); };

    if (!open) return null;

    const accent = form.color || calendars.find(c=>c.id===form.calendar_id)?.color || '#007AFF';
    const calName = calendars.find(c=>c.id===form.calendar_id)?.name ?? '';

    const TABS: { key:ModalTab; label:string; count?:number }[] = [
        { key:'details', label:'Détails' },
        { key:'attendees', label:'Participants', count:form.attendee_ids.length||undefined },
        { key:'reminders', label:'Rappels',      count:form.reminders.length||undefined },
        { key:'notes',     label:'Notes' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="absolute inset-0 bg-black/25 backdrop-blur-[3px]" onClick={onClose} />
            <motion.div
                initial={{opacity:0, scale:0.97, y:14}}
                animate={{opacity:1, scale:1, y:0}}
                exit={{opacity:0, scale:0.97, y:8}}
                transition={{duration:0.2, ease:[0.16,1,0.3,1]}}
                className="relative w-full max-w-[480px] bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl shadow-black/20 flex flex-col max-h-[88vh] overflow-hidden"
            >
                {/* Accent */}
                <div className="h-[2.5px] shrink-0 rounded-t-3xl" style={{background:`linear-gradient(90deg,${accent},${accent}50 80%,transparent)`}} />

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
                    <div className="flex items-start gap-2.5">
                        {/* Color dot = color picker */}
                        <div className="relative mt-[6px] shrink-0">
                            <div className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-transparent hover:ring-zinc-200 transition-all cursor-pointer"
                                style={{backgroundColor:accent}} />
                            <input type="color" value={accent} onChange={e=>up({color:e.target.value})}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        </div>

                        <textarea value={form.title}
                            onChange={e=>{up({title:e.target.value});e.target.style.height='auto';e.target.style.height=e.target.scrollHeight+'px';}}
                            placeholder="Titre de l'événement…" autoFocus rows={1}
                            className="flex-1 resize-none bg-transparent text-[18px] font-semibold text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-200 dark:placeholder:text-zinc-700 outline-none leading-snug overflow-hidden"
                            style={{minHeight:'28px'}} />

                        <div className="flex gap-0.5 shrink-0">
                            {event && (
                                <button onClick={del} disabled={deleting}
                                    className="p-1.5 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                                    {deleting?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}
                                </button>
                            )}
                            <button onClick={onClose}
                                className="p-1.5 rounded-xl text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                                <X size={14}/>
                            </button>
                        </div>
                    </div>

                    {/* Meta */}
                    {(calName || form.type) && (
                        <div className="flex items-center gap-2 mt-2 ml-5">
                            {calName && (
                                <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                                    <span className="w-2 h-2 rounded-sm" style={{backgroundColor:accent}} />{calName}
                                </span>
                            )}
                            {form.type && <span className="text-[11px] text-zinc-300">·</span>}
                            {form.type && <span className="text-[11px] text-zinc-400 font-medium">{EVENT_TYPE_LABELS[form.type]}</span>}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-0.5 px-5 pt-2 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
                    {TABS.map(t => (
                        <button key={t.key} onClick={()=>setTab(t.key)}
                            className={cx('px-3 py-2 text-[11.5px] font-semibold rounded-t-lg border-b-2 -mb-px transition-all flex items-center gap-1',
                                tab===t.key
                                    ?'text-zinc-900 dark:text-white border-zinc-900 dark:border-zinc-100'
                                    :'text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300')}>
                            {t.label}
                            {t.count && <span className="px-1.5 py-px rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] font-bold">{t.count}</span>}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* ── Détails ── */}
                    {tab==='details' && (
                        <div className="px-5 py-4 space-y-4">

                            {/* Calendrier + Type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Calendrier *</label>
                                    <select value={form.calendar_id??''} onChange={e=>up({calendar_id:Number(e.target.value)||null})} className={mSel}>
                                        <option value="">Choisir…</option>
                                        {calendars.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Type</label>
                                    <select value={form.type} onChange={e=>up({type:e.target.value as EventType})} className={mSel}>
                                        {(Object.entries(EVENT_TYPE_LABELS) as [EventType,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Bloc date */}
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">Toute la journée</span>
                                    <button type="button" onClick={()=>up({all_day:!form.all_day})}
                                        className={cx('relative h-5 w-9 rounded-full transition-colors',form.all_day?'bg-zinc-900 dark:bg-zinc-200':'bg-zinc-200 dark:bg-zinc-700')}>
                                        <span className={cx('absolute top-0.5 size-4 rounded-full shadow transition-all bg-white dark:bg-zinc-900',form.all_day?'left-[18px]':'left-0.5')} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Début *</span>
                                        <input type={form.all_day?'date':'datetime-local'}
                                            value={form.all_day?form.start_at.slice(0,10):form.start_at}
                                            onChange={e=>up({start_at:e.target.value})} className={mIn} />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Fin *</span>
                                        <input type={form.all_day?'date':'datetime-local'}
                                            value={form.all_day?form.end_at.slice(0,10):form.end_at}
                                            onChange={e=>up({end_at:e.target.value})} className={mIn} />
                                    </div>
                                </div>
                            </div>

                            {/* Lieu + Visio */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Lieu</label>
                                    <div className="relative">
                                        <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                                        <input value={form.location} onChange={e=>up({location:e.target.value})} placeholder="Salle, adresse…" className={cx(mIn,'pl-8')}/>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Lien visio</label>
                                    <div className="relative">
                                        <Video size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                                        <input value={form.meeting_url} onChange={e=>up({meeting_url:e.target.value})} placeholder="https://meet…" className={cx(mIn,'pl-8')}/>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                                <textarea value={form.description} onChange={e=>up({description:e.target.value})} rows={3} placeholder="Détails…" className={mTxt}/>
                            </div>

                            {/* Statut + Priorité */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Statut</label>
                                    <select value={form.status} onChange={e=>up({status:e.target.value as EventStatus})} className={mSel}>
                                        {(Object.entries(EVENT_STATUS_LABELS) as [EventStatus,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Priorité</label>
                                    <select value={form.priority} onChange={e=>up({priority:e.target.value as EventPriority})} className={mSel}>
                                        {(Object.entries(EVENT_PRIORITY_LABELS) as [EventPriority,string][]).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Couleur */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Couleur</label>
                                <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40">
                                    <button type="button" onClick={()=>up({color:''})}
                                        className={cx('flex size-6 items-center justify-center rounded-full border-2 transition-all',
                                            !form.color?'border-zinc-800':'border-zinc-200 dark:border-zinc-700')}>
                                        <X size={9} className="text-zinc-400"/>
                                    </button>
                                    {PRESET_COLORS.map(c=>(
                                        <button key={c} type="button" onClick={()=>up({color:c})}
                                            className={cx('size-6 rounded-full transition-all hover:scale-110',form.color===c&&'ring-2 ring-offset-2 ring-zinc-400')}
                                            style={{backgroundColor:c}}/>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tags</label>
                                {form.tags.length>0 && (
                                    <div className="flex flex-wrap gap-1 mb-1.5">
                                        {form.tags.map(tag=>(
                                            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                                                style={{backgroundColor:`${accent}15`,color:accent}}>
                                                {tag}
                                                <button type="button" onClick={()=>up({tags:form.tags.filter(t=>t!==tag)})}><X size={9}/></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                                        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag();}}}
                                        placeholder="Ajouter un tag…" className={mIn}/>
                                    <button type="button" onClick={addTag}
                                        className="px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[12px] font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Participants ── */}
                    {tab==='attendees' && (
                        <div className="px-5 py-4 space-y-3">
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                                Personnes avec lesquelles vous avez un lien (Bravo, messagerie, calendrier partagé…).
                            </p>

                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                                    Participants
                                </span>
                                <span className="text-[11px] font-semibold text-zinc-500">
                                    {selectedMembers.length} sélectionné{selectedMembers.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            {selectedMembers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedMembers.map(m => (
                                        <button key={m.id} type="button"
                                            onClick={() => up({ attendee_ids: form.attendee_ids.filter(id => id !== m.id) })}
                                            className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-2 py-0.5 text-[11px] font-semibold transition"
                                            style={{ backgroundColor: `${accent}18`, color: accent }}>
                                            <span className="flex size-6 items-center justify-center rounded-full text-[9px] font-black text-white"
                                                style={{ backgroundColor: accent }}>
                                                {getInitials(m.name)}
                                            </span>
                                            {m.name}
                                            <X size={11} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                <div className="flex items-center gap-2 p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                        <input
                                            className={cx(mIn, 'pl-9 h-10')}
                                            placeholder="Rechercher dans votre réseau…"
                                            value={participantSearch}
                                            onChange={e => setParticipantSearch(e.target.value)}
                                        />
                                    </div>
                                    {teamMembers.length > 0 && (
                                        <button type="button"
                                            onClick={() => up({ attendee_ids: filteredTeamMembers.map(m => m.id) })}
                                            className="shrink-0 px-2.5 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                            Tout
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-52 overflow-y-auto p-2 space-y-1">
                                    {filteredTeamMembers.map(m => {
                                        const sel = form.attendee_ids.includes(m.id);
                                        return (
                                            <button key={m.id} type="button"
                                                onClick={() => up({
                                                    attendee_ids: sel
                                                        ? form.attendee_ids.filter(id => id !== m.id)
                                                        : [...form.attendee_ids, m.id],
                                                })}
                                                className={cx(
                                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition',
                                                    sel
                                                        ? 'bg-zinc-900 dark:bg-zinc-100'
                                                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-transparent',
                                                )}>
                                                <span className={cx(
                                                    'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-black',
                                                    sel ? 'bg-white/20 text-white dark:bg-zinc-900 dark:text-zinc-100' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600',
                                                )}>
                                                    {m.avatar
                                                        ? <img src={m.avatar} alt="" className="size-full rounded-full object-cover" />
                                                        : getInitials(m.name)}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className={cx('block text-[13px] font-semibold truncate', sel ? 'text-white dark:text-zinc-900' : 'text-zinc-800 dark:text-zinc-200')}>
                                                        {m.name}
                                                    </span>
                                                    <span className={cx('block text-[11px] truncate', sel ? 'text-zinc-300 dark:text-zinc-500' : 'text-zinc-400')}>
                                                        {m.email}
                                                    </span>
                                                </span>
                                                <span className={cx(
                                                    'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0',
                                                    sel ? 'border-white bg-white dark:border-zinc-900 dark:bg-zinc-900' : 'border-zinc-300 dark:border-zinc-600',
                                                )}>
                                                    {sel && <CheckCircle2 size={14} className="text-zinc-900 dark:text-white" />}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {teamMembers.length === 0 && (
                                        <p className="text-[12px] text-zinc-500 text-center py-8 px-4 leading-relaxed">
                                            Aucune personne dans votre réseau pour l&apos;instant.
                                            Envoyez un Bravo ou démarrez une conversation pour pouvoir inviter quelqu&apos;un.
                                        </p>
                                    )}
                                    {teamMembers.length > 0 && filteredTeamMembers.length === 0 && (
                                        <p className="text-[12px] text-zinc-500 text-center py-6">Aucun résultat pour cette recherche.</p>
                                    )}
                                </div>

                                {teamMembers.length > 0 && (
                                    <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
                                        <button type="button" className="text-[11px] font-semibold hover:underline" style={{ color: accent }}
                                            onClick={() => up({ attendee_ids: teamMembers.map(m => m.id) })}>
                                            Sélectionner tout ({teamMembers.length})
                                        </button>
                                        <button type="button" className="text-[11px] font-semibold text-zinc-500 hover:underline"
                                            onClick={() => up({ attendee_ids: [] })}>
                                            Effacer
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Rappels ── */}
                    {tab==='reminders' && (
                        <div className="px-5 py-4 space-y-2.5">
                            {form.reminders.map((r,i)=>(
                                <div key={i} className="flex items-center gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                                    <Bell size={13} className="shrink-0" style={{color:accent}}/>
                                    <select value={r.minutes_before}
                                        onChange={e=>{const rs=[...form.reminders];rs[i]={...rs[i],minutes_before:Number(e.target.value)};up({reminders:rs});}}
                                        className="flex-1 bg-transparent text-[13px] font-medium text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer">
                                        {[5,10,15,30,60,120,1440,10080].map(m=>(
                                            <option key={m} value={m}>{m<60?`${m} min avant`:m<1440?`${m/60}h avant`:m<10080?`${m/1440}j avant`:'1 semaine avant'}</option>
                                        ))}
                                    </select>
                                    <select value={r.channel}
                                        onChange={e=>{const rs=[...form.reminders];rs[i]={...rs[i],channel:e.target.value as 'email'|'push'};up({reminders:rs});}}
                                        className="bg-transparent text-[12px] text-zinc-400 outline-none cursor-pointer">
                                        <option value="push">Notification</option>
                                        <option value="email">Email</option>
                                    </select>
                                    <button type="button" onClick={()=>up({reminders:form.reminders.filter((_,j)=>j!==i)})}
                                        className="p-1 rounded-lg text-zinc-300 hover:text-red-400 transition-colors"><X size={12}/></button>
                                </div>
                            ))}
                            <button type="button"
                                onClick={()=>up({reminders:[...form.reminders,{minutes_before:15,channel:'push'}]})}
                                className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors" style={{color:accent}}>
                                <Plus size={13}/> Ajouter un rappel
                            </button>
                        </div>
                    )}

                    {/* ── Notes ── */}
                    {tab==='notes' && (
                        <div className="px-5 py-4">
                            <textarea value={form.internal_notes} onChange={e=>up({internal_notes:e.target.value})}
                                rows={10} placeholder="Notes privées…" className={mTxt}/>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/60 dark:bg-zinc-900/40 shrink-0">
                    <button type="button" onClick={onClose}
                        className="text-[13px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors">
                        Annuler
                    </button>
                    <button type="button" onClick={save} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-2xl text-[13px] font-semibold text-white transition-all active:scale-[.97] disabled:opacity-50"
                        style={{backgroundColor:accent, boxShadow:`0 4px 12px ${accent}40`}}>
                        {saving && <Loader2 size={13} className="animate-spin"/>}
                        {event ? 'Enregistrer' : 'Créer l\'événement'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────
function toggleDisplayFilter(
    current: Set<AgendaDisplayFilter>,
    key: AgendaDisplayFilter,
): Set<AgendaDisplayFilter> {
    if (key === 'all') {
        return new Set(['all']);
    }
    const next = new Set(current);
    next.delete('all');
    if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) {
            next.add('all');
        }
    } else {
        next.add(key);
    }
    return next;
}

function applyDisplayFilters(
    events: AgendaEventData[],
    birthdays: BirthdayData[],
    holidays: HolidayData[],
    filters: Set<AgendaDisplayFilter>,
) {
    const showAll = filters.has('all') || filters.size === 0;

    return {
        events: showAll ? events : events.filter((e) => filters.has(e.type)),
        birthdays: showAll || filters.has('birthday') ? birthdays : [],
        holidays: showAll || filters.has('public_holiday') ? holidays : [],
    };
}

export default function Agenda({
    calendars = [],
    holidays = [],
    birthdays = [],
    teamMembers = [],
    stats = { today: 0, week: 0, pending: 0 },
    network_count = 1,
}: AgendaProps) {
    const { auth } = usePage<{ auth: { user: { id:number; name:string; avatar?:string } } }>().props;

    const [view, setView]               = useState<AgendaView>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents]           = useState<AgendaEventData[]>([]);
    const [loading, setLoading]         = useState(false);
    const [modalOpen, setModalOpen]     = useState(false);
    const [editingEvent, setEditing]    = useState<AgendaEventData|null>(null);
    const [selectedEvent, setSelected]  = useState<AgendaEventData|null>(null);
    const [selectedDate, setSelDate]    = useState(new Date());
    const [hiddenCals, setHiddenCals]   = useState<Set<number>>(new Set());
    const [sidebarOpen, setSidebar]     = useState(true);
    const [displayFilters, setDisplayFilters] = useState<Set<AgendaDisplayFilter>>(new Set(['all']));

    const defaultCalendarId = calendars.find(c => c.is_default)?.id ?? calendars[0]?.id ?? null;
    const notifiedRef = useRef<Set<string>>(new Set());

    // ── Notifications navigateur ──────────────────────────────────────────
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') toast.info('Notifications activées pour vos événements');
            });
        }
    }, []);

    // Vérifier les anniversaires du jour
    useEffect(() => {
        const today = toDateInputValue(new Date());
        const todayBdays = birthdays.filter(b => b.date === today);
        todayBdays.forEach(b => {
            const key = `bday-${b.user_id}-${today}`;
            if (!notifiedRef.current.has(key)) {
                notifiedRef.current.add(key);
                toast(`🎂 ${b.is_me ? 'Bon anniversaire !' : `Anniversaire de ${b.name}`}`, {
                    description: b.is_me ? `Vous fêtez vos ${b.age} ans aujourd'hui !` : `${b.name} fête ses ${b.age} ans aujourd'hui.`,
                    duration: 8000,
                });
                if (Notification.permission === 'granted') {
                    new Notification(`🎂 ${b.is_me ? 'Bon anniversaire !' : `Anniversaire — ${b.name}`}`, {
                        body: b.is_me ? `Vous fêtez vos ${b.age} ans !` : `${b.name} fête ses ${b.age} ans aujourd'hui.`,
                        icon: b.avatar ?? '/favicon.ico',
                    });
                }
            }
        });
    }, [birthdays]);

    // Vérifier les rappels d'événements toutes les minutes
    useEffect(() => {
        const check = () => {
            if (Notification.permission !== 'granted') return;
            const now = new Date();
            events.forEach(ev => {
                if (ev.status === 'cancelled') return;
                const start = new Date(ev.start_at);
                const diffMin = (start.getTime() - now.getTime()) / 60000;
                if (diffMin > 0 && diffMin <= 15) {
                    const key = `evt-${ev.id}-15`;
                    if (!notifiedRef.current.has(key)) {
                        notifiedRef.current.add(key);
                        new Notification(`⏰ ${ev.title}`, {
                            body: `Dans ${Math.round(diffMin)} min${ev.location ? ` · ${ev.location}` : ''}`,
                            icon: '/favicon.ico',
                        });
                    }
                }
                if (diffMin > 0 && diffMin <= 60) {
                    const key = `evt-${ev.id}-60`;
                    if (!notifiedRef.current.has(key)) {
                        notifiedRef.current.add(key);
                        new Notification(`📅 ${ev.title}`, {
                            body: `Dans ${Math.round(diffMin)} min`,
                            icon: '/favicon.ico',
                        });
                    }
                }
            });
        };
        const interval = setInterval(check, 60_000);
        check();
        return () => clearInterval(interval);
    }, [events]);

    // ── Chargement événements ─────────────────────────────────────────────
    const getRange = useCallback(() => {
        const p=(n:number)=>String(n).padStart(2,'0');
        const fmt=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
        if (view==='month') {
            const g=getMonthGrid(currentDate.getFullYear(),currentDate.getMonth());
            return { start:fmt(g[0]), end:fmt(g[g.length-1]) };
        }
        if (view==='week') {
            const days=getWeekDays(currentDate);
            const s=new Date(days[0]); s.setHours(0,0,0,0);
            const e=new Date(days[6]); e.setHours(23,59,59,0);
            return { start:fmt(s), end:fmt(e) };
        }
        if (view==='day') {
            const s=new Date(currentDate); s.setHours(0,0,0,0);
            const e=new Date(currentDate); e.setHours(23,59,59,0);
            return { start:fmt(s), end:fmt(e) };
        }
        const s=new Date(currentDate); s.setHours(0,0,0,0);
        return { start:fmt(s), end:fmt(addDays(s,30)) };
    }, [view, currentDate]);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const { start, end } = getRange();
        try {
            const res = await fetch(`/agenda/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { headers:{'Accept':'application/json'} });
            if (res.ok) setEvents(await res.json());
        } catch { toast.error('Impossible de charger les événements.'); }
        finally { setLoading(false); }
    }, [getRange]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const navigate = (dir: -1|1) => setCurrentDate(d => {
        if (view==='month') return addMonths(d, dir);
        if (view==='week')  return addDays(d, dir*7);
        return addDays(d, dir);
    });

    const navTitle = (() => {
        if (view==='month') return `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        if (view==='week') {
            const days=getWeekDays(currentDate);
            const s=days[0], e=days[6];
            return s.getMonth()===e.getMonth()
                ? `${s.getDate()} – ${e.getDate()} ${MONTHS_FR[s.getMonth()]} ${s.getFullYear()}`
                : `${s.getDate()} ${MONTHS_FR[s.getMonth()].slice(0,3)} – ${e.getDate()} ${MONTHS_FR[e.getMonth()].slice(0,3)} ${e.getFullYear()}`;
        }
        return `${['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][currentDate.getDay()]} ${currentDate.getDate()} ${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    })();

    const visibleEvents = events.filter(e => !hiddenCals.has(e.calendar_id));
    const filtered = useMemo(
        () => applyDisplayFilters(visibleEvents, birthdays, holidays, displayFilters),
        [visibleEvents, birthdays, holidays, displayFilters],
    );
    const filteredEvents = filtered.events;
    const filteredBirthdays = filtered.birthdays;
    const filteredHolidays = filtered.holidays;

    const VIEWS: { key:AgendaView; label:string; icon:React.ElementType }[] = [
        { key:'day',    label:'Jour',    icon:CalendarDays },
        { key:'week',   label:'Semaine', icon:CalendarRange },
        { key:'month',  label:'Mois',    icon:Grid3x3 },
        { key:'agenda', label:'Liste',   icon:List },
    ];

    // Prochains anniversaires (30 jours)
    const upcomingBdays = filteredBirthdays.filter(b => {
        const d = new Date(b.date + 'T00:00:00');
        const now = new Date();
        const diff = (d.getTime() - now.setHours(0,0,0,0)) / 86400000;
        return diff >= 0 && diff <= 30;
    }).slice(0, 5);

    // Prochains fériés
    const upcomingHolidays = filteredHolidays.filter(h => new Date(h.date) >= new Date()).slice(0, 4);

    return (
        <>
        <div className="flex flex-1 min-h-0 bg-white dark:bg-zinc-950 overflow-hidden">

                {/* ── Calendrier (zone principale) ── */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0 bg-white dark:bg-zinc-950">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setCurrentDate(new Date()); setSelDate(new Date()); }}
                                className="px-3 py-1.5 text-[12px] font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-zinc-700 dark:text-zinc-300">
                                Aujourd'hui
                            </button>
                            <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                <button onClick={() => navigate(-1)} className="px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-r border-zinc-200 dark:border-zinc-700">
                                    <ChevronLeft size={14} className="text-zinc-500" />
                                </button>
                                <button onClick={() => navigate(1)} className="px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                    <ChevronRight size={14} className="text-zinc-500" />
                                </button>
                            </div>
                            <h2 className="font-semibold text-[14px] text-zinc-800 dark:text-zinc-100 hidden sm:block">
                                {navTitle}
                            </h2>
                            {loading && <Loader2 size={12} className="animate-spin text-zinc-300" />}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Sélecteur vue */}
                            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-0.5 gap-px">
                                {VIEWS.map(v => (
                                    <button key={v.key} onClick={() => setView(v.key)}
                                        className={cx(
                                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[11.5px] font-medium transition-all',
                                            view===v.key
                                                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300',
                                        )}>
                                        <v.icon size={11} />
                                        <span className="hidden md:inline">{v.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => { setEditing(null); setModalOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF] text-white rounded-xl font-semibold text-[12px] hover:bg-[#0070E0] shadow-sm shadow-blue-400/25 transition-all active:scale-[.97]">
                                <Plus size={13} />
                                <span className="hidden sm:inline">Nouveau</span>
                            </button>

                            <button onClick={() => setSidebar(o => !o)}
                                className="p-1.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-600 transition-colors"
                                title={sidebarOpen ? 'Masquer' : 'Afficher'}>
                                {sidebarOpen ? <PanelLeftClose size={15}/> : <PanelLeft size={15}/>}
                            </button>
                        </div>
                    </div>

                    {/* Vue calendrier */}
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div key={view}
                                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                                transition={{ duration:0.1 }}
                                className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                {view==='month' && (
                                    <MonthView date={currentDate} events={filteredEvents} holidays={filteredHolidays} birthdays={filteredBirthdays}
                                        onDayClick={d => { setSelDate(d); setCurrentDate(d); setView('day'); }}
                                        onEventClick={e => setSelected(e)} />
                                )}
                                {view==='week' && (
                                    <WeekView date={currentDate} events={filteredEvents} holidays={filteredHolidays} birthdays={filteredBirthdays}
                                        onSlotClick={d => { setSelDate(d); setEditing(null); setModalOpen(true); }}
                                        onEventClick={setSelected} />
                                )}
                                {view==='day' && (
                                    <DayView date={currentDate} events={filteredEvents} holidays={filteredHolidays} birthdays={filteredBirthdays}
                                        onSlotClick={d => { setSelDate(d); setEditing(null); setModalOpen(true); }}
                                        onEventClick={setSelected} />
                                )}
                                {view==='agenda' && (
                                    <AgendaListView events={filteredEvents} holidays={filteredHolidays} birthdays={filteredBirthdays} onEventClick={setSelected} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Panneau droit : détail ou sidebar ── */}
                <AnimatePresence>
                    {selectedEvent ? (
                        <EventDetailPanel key="detail" event={selectedEvent}
                            onClose={() => setSelected(null)}
                            onEdit={() => { setEditing(selectedEvent); setSelected(null); setModalOpen(true); }} />
                    ) : sidebarOpen ? (
                        <motion.aside key="sidebar"
                            initial={{ width:0, opacity:0 }} animate={{ width:256, opacity:1 }} exit={{ width:0, opacity:0 }}
                            transition={{ duration:0.2, ease:'easeInOut' }}
                            className="border-l border-zinc-100 dark:border-zinc-800 flex flex-col overflow-hidden shrink-0 bg-white dark:bg-zinc-950">
                            <div className="overflow-y-auto flex-1">
                                {/* Mini calendar */}
                                <div className="border-b border-zinc-100 dark:border-zinc-800">
                                    <MiniCalendar selectedDate={selectedDate}
                                        onSelect={d => { setSelDate(d); setCurrentDate(d); }}
                                        events={filteredEvents} birthdays={filteredBirthdays} holidays={filteredHolidays} />
                                </div>

                                {/* Résumé */}
                                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-2">Résumé</p>
                                    {[
                                        { label:"Aujourd'hui", value:stats.today,    color:'text-[#007AFF]' },
                                        { label:'Cette semaine', value:stats.week,   color:'text-[#34C759]' },
                                        { label:'En attente',    value:stats.pending, color:'text-[#FF9500]' },
                                    ].map(s => (
                                        <div key={s.label} className="flex items-center justify-between py-0.5">
                                            <span className="text-[12px] text-zinc-500">{s.label}</span>
                                            <span className={`text-[14px] font-bold ${s.color}`}>{s.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Filtres par type */}
                                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-2">
                                        Afficher
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {AGENDA_DISPLAY_FILTERS.map((f) => {
                                            const active = displayFilters.has(f.key);
                                            return (
                                                <button
                                                    key={f.key}
                                                    type="button"
                                                    onClick={() => setDisplayFilters((prev) => toggleDisplayFilter(prev, f.key))}
                                                    className={cx(
                                                        'px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors',
                                                        active
                                                            ? 'bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]'
                                                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300',
                                                    )}
                                                >
                                                    {f.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Mes calendriers */}
                                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600">Mes calendriers</p>
                                        <button onClick={() => toast.info('Création de calendrier – prochainement')}
                                            className="text-zinc-300 hover:text-[#007AFF] transition-colors">
                                            <Plus size={11} />
                                        </button>
                                    </div>
                                    {calendars.filter(c => c.is_mine).map(cal => {
                                        const hidden = hiddenCals.has(cal.id);
                                        return (
                                            <button key={cal.id}
                                                onClick={() => setHiddenCals(prev => { const n=new Set(prev); hidden?n.delete(cal.id):n.add(cal.id); return n; })}
                                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                                <div className="w-2.5 h-2.5 rounded-sm shrink-0 transition-all"
                                                    style={{ backgroundColor: hidden ? 'transparent' : cal.color, border: `1.5px solid ${cal.color}` }} />
                                                <span className={cx('text-[12px] font-medium truncate flex-1 text-left',
                                                    hidden ? 'text-zinc-300 dark:text-zinc-700 line-through' : 'text-zinc-700 dark:text-zinc-300')}>
                                                    {cal.name}
                                                </span>
                                                {cal.is_default && <span className="text-[8px] text-zinc-300">Défaut</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Prochains anniversaires (réseau) */}
                                {upcomingBdays.length > 0 && (
                                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                        <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-0.5">
                                            Anniversaires à venir
                                        </p>
                                        <p className="text-[10px] text-zinc-400 mb-2">
                                            Votre réseau ({network_count} personne{network_count > 1 ? 's' : ''})
                                        </p>
                                        <div className="space-y-2">
                                            {upcomingBdays.map((b, i) => {
                                                const d = new Date(b.date + 'T00:00:00');
                                                const isToday_ = isToday(d);
                                                return (
                                                    <div key={i} className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-violet-50 dark:bg-violet-950">
                                                            {b.avatar ? <img src={b.avatar} alt={b.name} className="w-full h-full object-cover"/>
                                                                : <span className="text-[12px] font-bold text-violet-500">{b.name[0]}</span>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                                                {b.name}{b.is_me ? ' (vous)' : ''}
                                                            </p>
                                                            <p className={cx('text-[10px]', isToday_ ? 'text-rose-500 font-semibold' : 'text-zinc-400')}>
                                                                {isToday_ ? "Aujourd'hui 🎂" : `${d.getDate()} ${MONTHS_FR[d.getMonth()].slice(0,3)}`} · {b.age} ans
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Prochains fériés */}
                                {upcomingHolidays.length > 0 && (
                                    <div className="px-4 pt-3 pb-4">
                                        <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 mb-2">
                                            Prochains fériés
                                        </p>
                                        <div className="space-y-2">
                                            {upcomingHolidays.map(h => {
                                                const d = new Date(h.date + 'T00:00:00');
                                                return (
                                                    <div key={h.id} className="flex items-start gap-2.5">
                                                        <div className={cx(
                                                            'w-7 h-7 rounded-xl flex flex-col items-center justify-center shrink-0 text-white',
                                                            h.country_code==='INTL' ? 'bg-sky-400' : 'bg-amber-400',
                                                        )}>
                                                            <span className="text-[7px] font-bold uppercase">{MONTHS_FR[d.getMonth()].slice(0,3)}</span>
                                                            <span className="text-[11px] font-bold leading-none">{d.getDate()}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11.5px] font-medium text-zinc-700 dark:text-zinc-300 truncate">{h.name}</p>
                                                            <p className="text-[10px] text-zinc-400">
                                                                {h.country_code==='INTL' ? '🌍 International' : '🇨🇲 Cameroun'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.aside>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {modalOpen && (
                    <EventModal open={modalOpen} event={editingEvent} calendars={calendars}
                        teamMembers={teamMembers} defaultDate={selectedDate} defaultCalendarId={defaultCalendarId}
                        onClose={() => { setModalOpen(false); setEditing(null); }}
                        onSaved={saved => setEvents(prev => {
                            const idx=prev.findIndex(e=>e.id===saved.id);
                            if(idx>=0){const n=[...prev];n[idx]=saved;return n;}
                            return [...prev,saved];
                        })}
                        onDeleted={id => { setEvents(prev=>prev.filter(e=>e.id!==id)); setSelected(null); }} />
                )}
            </AnimatePresence>
        </>
    );
}
