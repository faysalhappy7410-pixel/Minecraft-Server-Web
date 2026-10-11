import React, { useMemo, useState } from 'react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import {
  Award,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp, markCollectionCustomized } from '../context/AppContext';
import { CommunityEventItem } from '../types/cms';
import {
  BUILD_ARENA_ASSET,
  BUILD_CITADEL_ASSET,
  BUILD_GARDENS_ASSET,
} from '../data/seedData';
import { ResilientImage } from './ResilientImage';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESET_TIMES = [
  '16:00 UTC',
  '17:00 UTC',
  '18:00 UTC',
  '19:00 UTC',
  '20:00 UTC',
  '21:00 UTC',
];

const PRESET_IMAGES = [
  { label: 'Obsidian Arena', url: BUILD_ARENA_ASSET },
  { label: 'Sky Citadel Hub', url: BUILD_CITADEL_ASSET },
  { label: 'Elysium Gardens', url: BUILD_GARDENS_ASSET },
];

/**
 * Parses either an ISO YYYY-MM-DD string or a human-readable date string
 * (like "October 24, 2026") into a local Date object and normalized YYYY-MM-DD key.
 */
export function parseEventDateToKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // Direct YYYY-MM-DD match
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Parse human-readable date strings such as "October 24, 2026"
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Formats a YYYY-MM-DD key or raw date string into a clean human-readable display string
 * e.g., "October 24, 2026"
 */
export function formatEventDateDisplay(dateStr: string): string {
  const key = parseEventDateToKey(dateStr);
  if (!key) return dateStr;
  const [y, m, d] = key.split('-').map(Number);
  const monthName = MONTH_NAMES[(m || 1) - 1] || '';
  return `${monthName} ${d}, ${y}`;
}

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface EventFormState {
  id: string;
  title: string;
  dateKey: string;
  eventTime: string;
  description: string;
  prize: string;
  discordLink: string;
  imageUrl: string;
  isPast: boolean;
  winnerSummary: string;
  published: boolean;
  createdAt: string;
}

export const CommunityEventsCalendar: React.FC = () => {
  const { events, isAdmin, siteSettings } = useApp();

  const todayKey = useMemo(() => getTodayDateKey(), []);

  // Determine initial month to display: if there is an upcoming event with a valid date, start on that month; otherwise current month
  const initialYearMonth = useMemo(() => {
    const upcomingWithDates = events
      .filter((e) => !e.isPast)
      .map((e) => parseEventDateToKey(e.eventDate))
      .filter((k): k is string => Boolean(k))
      .sort();

    const targetKey = upcomingWithDates[0] || todayKey;
    const [y, m] = targetKey.split('-').map(Number);
    return {
      year: y || new Date().getFullYear(),
      month: (m || new Date().getMonth() + 1) - 1, // 0-indexed
    };
  }, [events, todayKey]);

  const [currentYear, setCurrentYear] = useState<number>(initialYearMonth.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialYearMonth.month);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Modal state for Admin creating/editing an event
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [formState, setFormState] = useState<EventFormState>({
    id: '',
    title: '',
    dateKey: todayKey,
    eventTime: '18:00 UTC',
    description: '',
    prize: 'Champion Chat Title + Event Trophy',
    discordLink: siteSettings.discordUrl || 'https://discord.gg/proplayers',
    imageUrl: BUILD_ARENA_ASSET,
    isPast: false,
    winnerSummary: '',
    published: true,
    createdAt: '',
  });

  // Map events by normalized YYYY-MM-DD key
  const eventsByDateKey = useMemo(() => {
    const map: Record<string, CommunityEventItem[]> = {};
    events.forEach((evt) => {
      const key = parseEventDateToKey(evt.eventDate);
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(evt);
      }
    });
    return map;
  }, [events]);

  // Build calendar grid cells for currentYear & currentMonth
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dayEvents: CommunityEventItem[];
    }> = [];

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const key = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayKey,
        dayEvents: eventsByDateKey[key] || [],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: key === todayKey,
        dayEvents: eventsByDateKey[key] || [],
      });
    }

    // Trailing days to complete 6 rows (42 cells) or 5 rows (35 cells)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(currentYear, currentMonth + 1, dayNum);
      const key = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateKey: key,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: key === todayKey,
        dayEvents: eventsByDateKey[key] || [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, eventsByDateKey, todayKey]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const [y, m] = todayKey.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m - 1);
    setSelectedDateKey(todayKey);
  };

  // Filtered events for the schedule feed
  const displayedEvents = useMemo(() => {
    let list = [...events];

    if (selectedDateKey) {
      list = list.filter((e) => parseEventDateToKey(e.eventDate) === selectedDateKey);
    } else if (viewFilter === 'upcoming') {
      list = list.filter((e) => !e.isPast);
    } else if (viewFilter === 'past') {
      list = list.filter((e) => e.isPast);
    }

    // Sort upcoming first by date, then past by date desc
    return list.sort((a, b) => {
      if (a.isPast !== b.isPast) return a.isPast ? 1 : -1;
      const keyA = parseEventDateToKey(a.eventDate) || a.eventDate;
      const keyB = parseEventDateToKey(b.eventDate) || b.eventDate;
      return a.isPast ? keyB.localeCompare(keyA) : keyA.localeCompare(keyB);
    });
  }, [events, selectedDateKey, viewFilter]);

  const upcomingCount = useMemo(() => events.filter((e) => !e.isPast).length, [events]);
  const pastCount = useMemo(() => events.filter((e) => e.isPast).length, [events]);

  // Open Admin Modal for creating a new event
  const openCreateModal = (prefillDateKey?: string) => {
    const targetDate = prefillDateKey || selectedDateKey || todayKey;
    setFormState({
      id: `evt_${Date.now()}`,
      title: '',
      dateKey: targetDate,
      eventTime: '18:00 UTC',
      description: '',
      prize: 'Champion Chat Title + Event Trophy',
      discordLink: siteSettings.discordUrl || 'https://discord.gg/proplayers',
      imageUrl: BUILD_ARENA_ASSET,
      isPast: false,
      winnerSummary: '',
      published: true,
      createdAt: new Date().toISOString(),
    });
    setIsEditorOpen(true);
  };

  // Open Admin Modal for editing an existing event
  const openEditModal = (evt: CommunityEventItem) => {
    const parsedKey = parseEventDateToKey(evt.eventDate) || todayKey;
    setFormState({
      id: evt.id,
      title: evt.title,
      dateKey: parsedKey,
      eventTime: evt.eventTime || '18:00 UTC',
      description: evt.description,
      prize: evt.prize || 'Community Event Prize',
      discordLink: evt.discordLink || '',
      imageUrl: evt.imageUrl || BUILD_ARENA_ASSET,
      isPast: Boolean(evt.isPast),
      winnerSummary: evt.winnerSummary || '',
      published: evt.published !== false,
      createdAt: evt.createdAt || new Date().toISOString(),
    });
    setIsEditorOpen(true);
  };

  // Save Event to Firestore
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const cleanTitle = formState.title.trim();
    const cleanDesc = formState.description.trim();
    const cleanTime = formState.eventTime.trim() || '18:00 UTC';
    const cleanPrize = formState.prize.trim() || 'Community Event Prize & Badge';

    if (!cleanTitle || !cleanDesc || !formState.dateKey) {
      setFeedbackBanner({
        type: 'error',
        message: 'Please provide an event title, date, time, and description.',
      });
      return;
    }

    setIsSaving(true);
    setFeedbackBanner(null);

    const nowIso = new Date().toISOString();
    const formattedDate = formatEventDateDisplay(formState.dateKey);

    const payload = {
      title: cleanTitle.slice(0, 120),
      eventDate: formattedDate.slice(0, 40),
      eventTime: cleanTime.slice(0, 40),
      description: cleanDesc.slice(0, 1000),
      prize: cleanPrize.slice(0, 160),
      discordLink: formState.discordLink.trim().slice(0, 300),
      isPast: Boolean(formState.isPast),
      winnerSummary: formState.winnerSummary.trim().slice(0, 400),
      imageUrl: formState.imageUrl.trim().slice(0, 500),
      published: Boolean(formState.published),
      createdAt: formState.createdAt || nowIso,
      updatedAt: nowIso,
    };

    try {
      await markCollectionCustomized('events');
      await setDoc(doc(db, 'events', formState.id), payload);

      // Jump calendar to the saved event's month and select its date
      const [y, m] = formState.dateKey.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
      setSelectedDateKey(formState.dateKey);
      setIsEditorOpen(false);
      setFeedbackBanner({
        type: 'success',
        message: `Event "${cleanTitle}" synced to Firestore calendar (${formattedDate} at ${cleanTime}).`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `events/${formState.id}`);
      setFeedbackBanner({
        type: 'error',
        message: 'Failed to save event to Firestore. Please verify your admin permissions.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Event from Firestore
  const handleDeleteEvent = async (evt: CommunityEventItem) => {
    if (!isAdmin) return;
    setDeletingId(evt.id);
    setFeedbackBanner(null);

    try {
      await markCollectionCustomized('events');
      await deleteDoc(doc(db, 'events', evt.id));
      setFeedbackBanner({
        type: 'success',
        message: `Removed "${evt.title}" from the Community Events calendar.`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${evt.id}`);
      setFeedbackBanner({
        type: 'error',
        message: 'Could not delete event from Firestore.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedDateKey(null);
              setViewFilter('all');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              !selectedDateKey && viewFilter === 'all'
                ? 'bg-emerald-400 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDateKey(null);
              setViewFilter('upcoming');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              !selectedDateKey && viewFilter === 'upcoming'
                ? 'bg-emerald-400 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDateKey(null);
              setViewFilter('past');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              !selectedDateKey && viewFilter === 'past'
                ? 'bg-emerald-400 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Past Recaps ({pastCount})
          </button>

          {selectedDateKey && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-300">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Date: {formatEventDateDisplay(selectedDateKey)}</span>
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-200 cursor-pointer"
                aria-label="Clear selected date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
          >
            Today
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => openCreateModal(selectedDateKey || undefined)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition-colors shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post Server Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Banner */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/35 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Calendar Grid + Event Schedule Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interactive Monthly Calendar */}
        <div className="xl:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800/90 overflow-hidden shadow-xl">
          {/* Calendar Header */}
          <div className="p-5 border-b border-slate-800/90 bg-slate-950/60 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                Interactive Event Schedule
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white mt-0.5">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-800/80 bg-slate-950/40 text-center">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-[11px] font-mono uppercase tracking-wider text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/70 bg-slate-950/20">
            {calendarCells.map((cell) => {
              const isSelected = selectedDateKey === cell.dateKey;
              const hasEvents = cell.dayEvents.length > 0;
              const hasUpcoming = cell.dayEvents.some((e) => !e.isPast);

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() =>
                    setSelectedDateKey((prev) => (prev === cell.dateKey ? null : cell.dateKey))
                  }
                  className={`min-h-[84px] sm:min-h-[96px] p-2 text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-950/70 text-slate-600 hover:bg-slate-900/50'
                      : 'bg-slate-900/40 text-slate-200 hover:bg-slate-800/50'
                  } ${
                    isSelected
                      ? 'ring-2 ring-inset ring-emerald-400 bg-emerald-500/10'
                      : hasUpcoming
                        ? 'bg-emerald-500/5'
                        : ''
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-emerald-400 text-slate-950'
                          : isSelected
                            ? 'bg-emerald-500/25 text-emerald-300'
                            : cell.isCurrentMonth
                              ? 'text-slate-200'
                              : 'text-slate-600'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasEvents && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          hasUpcoming
                            ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cell.dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges inside Calendar Cell */}
                  <div className="space-y-1 mt-1.5 w-full overflow-hidden">
                    {cell.dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border ${
                          evt.isPast
                            ? 'bg-slate-900/90 text-slate-400 border-slate-700/80'
                            : 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35'
                        }`}
                        title={`${evt.title} (${evt.eventTime})`}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {cell.dayEvents.length > 2 && (
                      <div className="text-[10px] font-mono text-emerald-400 pl-1">
                        +{cell.dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Calendar Footer Legend */}
          <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Upcoming Event</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Completed Event</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              Click any date to filter or schedule
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Selected Date / Filtered Event Details & Admin Quick Actions */}
        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                  {selectedDateKey ? 'Selected Date Schedule' : 'Live Firestore Event Feed'}
                </div>
                <h4 className="font-display text-lg font-bold text-white mt-0.5">
                  {selectedDateKey
                    ? formatEventDateDisplay(selectedDateKey)
                    : viewFilter === 'upcoming'
                      ? 'Upcoming Server Events'
                      : viewFilter === 'past'
                        ? 'Past Event Recaps'
                        : 'All Scheduled Events'}
                </h4>
              </div>

              {selectedDateKey && (
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>

            {displayedEvents.length === 0 ? (
              <div className="rounded-xl bg-slate-950/80 border border-slate-800/90 p-6 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-display text-base font-bold text-white">
                    {selectedDateKey
                      ? `No events scheduled on ${formatEventDateDisplay(selectedDateKey)}`
                      : 'No events match this filter'}
                  </h5>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    {selectedDateKey
                      ? 'Select another highlighted date on the calendar or view all upcoming tournaments.'
                      : 'Check back soon or join our Discord server for flash event announcements.'}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  {selectedDateKey && (
                    <button
                      type="button"
                      onClick={() => setSelectedDateKey(null)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      View All Upcoming Events
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openCreateModal(selectedDateKey || undefined)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Post Event{selectedDateKey ? ` for ${formatEventDateDisplay(selectedDateKey)}` : ''}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                {displayedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      evt.isPast
                        ? 'bg-slate-950/75 border-slate-800/90'
                        : 'bg-slate-950/95 border-emerald-500/35 shadow-lg'
                    }`}
                  >
                    {evt.imageUrl && (
                      <div className="aspect-[16/7] relative overflow-hidden bg-slate-950">
                        <ResilientImage
                          src={evt.imageUrl}
                          alt={evt.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                              evt.isPast
                                ? 'bg-slate-800/90 text-slate-300 border border-slate-700'
                                : 'bg-emerald-400 text-slate-950'
                            }`}
                          >
                            {evt.isPast ? 'Completed' : 'Upcoming Event'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="inline-flex items-center gap-1.5 text-emerald-300">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>{formatEventDateDisplay(evt.eventDate)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>{evt.eventTime}</span>
                        </span>
                      </div>

                      <h5 className="font-display text-lg font-bold text-white leading-snug">
                        {evt.title}
                      </h5>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {evt.description}
                      </p>

                      {evt.prize && (
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center gap-2 text-xs text-amber-300 font-semibold">
                          <Trophy className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Prize: {evt.prize}</span>
                        </div>
                      )}

                      {evt.isPast && evt.winnerSummary && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2 text-xs font-mono text-emerald-300">
                          <Award className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                          <span>{evt.winnerSummary}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        {evt.discordLink ? (
                          <a
                            href={evt.discordLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                          >
                            <span>Join Event Channel</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-500">
                            In-Game Server Event
                          </span>
                        )}

                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(evt)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(evt)}
                              disabled={deletingId === evt.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>{deletingId === evt.id ? '...' : 'Delete'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Create / Edit Event Modal (Synced directly with Firestore) */}
      {isEditorOpen && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-editor-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            className="max-w-xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    id="event-editor-modal-title"
                    className="font-display text-lg font-bold text-white"
                  >
                    {events.some((e) => e.id === formState.id)
                      ? 'Edit Community Event'
                      : 'Post Upcoming Server Event'}
                  </h3>
                  <p className="text-[11px] font-mono text-emerald-400">
                    Synced in real time via Firebase Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g., Netherite Arena 2v2 Championship"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.dateKey}
                    onChange={(e) => setFormState((s) => ({ ...s, dateKey: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                  {formState.dateKey && (
                    <div className="text-[11px] font-mono text-emerald-400 mt-1">
                      Displays as: {formatEventDateDisplay(formState.dateKey)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Event Time *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={formState.eventTime}
                    onChange={(e) => setFormState((s) => ({ ...s, eventTime: e.target.value }))}
                    placeholder="e.g., 18:00 UTC"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {PRESET_TIMES.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormState((s) => ({ ...s, eventTime: preset }))}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Event Description *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={formState.description}
                  onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Describe the event rules, warp command (e.g., /warp arena), and how Java & Bedrock players can participate..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Prize / Rewards
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={formState.prize}
                    onChange={(e) => setFormState((s) => ({ ...s, prize: e.target.value }))}
                    placeholder="e.g., Champion Title + Trophy Head"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Discord Event Link
                  </label>
                  <input
                    type="url"
                    maxLength={300}
                    value={formState.discordLink}
                    onChange={(e) => setFormState((s) => ({ ...s, discordLink: e.target.value }))}
                    placeholder="https://discord.gg/proplayers"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Event Banner Image URL
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={formState.imageUrl}
                  onChange={(e) => setFormState((s) => ({ ...s, imageUrl: e.target.value }))}
                  placeholder="/assets/build_arena.png or https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Presets:
                  </span>
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setFormState((s) => ({ ...s, imageUrl: img.url }))}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-emerald-300 cursor-pointer"
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.isPast}
                    onChange={(e) => setFormState((s) => ({ ...s, isPast: e.target.checked }))}
                    className="rounded border-slate-700 text-emerald-400 focus:ring-emerald-400"
                  />
                  <span>Mark as Completed / Past Event</span>
                </label>

                {formState.isPast && (
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      Winner Summary / Recap
                    </label>
                    <input
                      type="text"
                      maxLength={400}
                      value={formState.winnerSummary}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, winnerSummary: e.target.value }))
                      }
                      placeholder="1st Place: PlayerOne · 2nd Place: PlayerTwo"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>{isSaving ? 'Syncing to Firestore...' : 'Save Event to Calendar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
