import React, { useRef, useEffect } from "react";
import type { WeeklySchedule } from "../types";
import { BrainIcon } from "./icons/BrainIcon";

interface ScheduleDisplayProps {
  schedule: WeeklySchedule | null;
  isLoading: boolean;
  error: string | null;
  currentWeekStart: Date;
}

/** Visible hours in the day grid */
const START_HOUR = 7;   // 7 AM
const END_HOUR = 24;    // 12 AM (end-exclusive)

// 15-minute row granularity
const SLOTS_PER_HOUR = 4;

const colorPalette = [
  "bg-purple-900/70 border-l-4 border-purple-500 hover:bg-purple-900",
  "bg-indigo-900/70 border-l-4 border-indigo-500 hover:bg-indigo-900",
  "bg-sky-900/70 border-l-4 border-sky-500 hover:bg-sky-900",
  "bg-teal-900/70 border-l-4 border-teal-500 hover:bg-teal-900",
  "bg-rose-900/70 border-l-4 border-rose-500 hover:bg-rose-900",
  "bg-amber-900/70 border-l-4 border-amber-500 hover:bg-amber-900",
];

/** Parse “1:05 PM”, “09:00 AM”, “13:30”, “9”, “9:15pm” → minutes since midnight */
function parseTimeToMinutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();

  // 12h with AM/PM, hh:mm or h:mm, minutes optional
  const re12 = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i;
  const m12 = s.match(re12);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const mins = parseInt(m12[2] ?? "0", 10);
    const meridiem = m12[3];
    if (meridiem === "AM") {
      if (h === 12) h = 0; // 12:xx AM → 00:xx
    } else {
      if (h !== 12) h += 12; // 1..11 PM → 13..23
    }
    return h * 60 + mins;
  }

  // 24h fallback: hh:mm or h:mm or hh
  const re24 = /^(\d{1,2})(?::(\d{2}))?$/;
  const m24 = s.match(re24);
  if (m24) {
    const h = parseInt(m24[1], 10);
    const mins = parseInt(m24[2] ?? "0", 10);
    if (h >= 0 && h <= 23 && mins >= 0 && mins <= 59) {
      return h * 60 + mins;
    }
  }

  return null;
}

/** Convert minutes to grid row index (1-based for content rows). */
function minutesToRow(mins: number): number {
  const startMins = START_HOUR * 60;
  const diff = mins - startMins;
  // 15-min slots, 1-based index
  return Math.floor(diff / 15) + 1;
}

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  schedule,
  isLoading,
  error,
  currentWeekStart,
}) => {
  const taskColorMap = useRef(new Map<string, string>());

  useEffect(() => {
    taskColorMap.current.clear();
  }, [schedule]);

  const getTaskColor = (task: string): string => {
    const key = (task || "other")
      .toLowerCase()
      .replace(/^(work on|study for|finish|submit|prepare|review|read)\s/, "")
      .split(/[:(]/)[0]
      .trim();

    if (!taskColorMap.current.has(key)) {
      const next = taskColorMap.current.size % colorPalette.length;
      taskColorMap.current.set(key, colorPalette[next]);
    }
    return taskColorMap.current.get(key)!;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
          <BrainIcon className="w-12 h-12 text-indigo-400 animate-pulse" />
          <p className="mt-4 text-slate-400 font-semibold">
            Generating your personalized weekly plan...
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Our AI is analyzing your goals to create the perfect week.
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-400 font-semibold">Error Generating Schedule</p>
          <p className="text-slate-400 mt-2 text-sm">{error}</p>
        </div>
      );
    }

    if (!schedule) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
          <BrainIcon className="w-12 h-12 text-slate-600" />
          <p className="mt-4 text-slate-400 font-semibold">Your Week Awaits</p>
          <p className="text-sm text-slate-500 mt-1">
            Complete your check-in and add tasks, then click "Generate" to build your schedule.
          </p>
        </div>
      );
    }

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const scheduleKeys = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as (keyof WeeklySchedule)[];

    const today = new Date();
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      return d;
    });

    const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
    const totalContentRows = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

    /** Clamp a row to visible content area (1..totalContentRows) */
    const clampRow = (r: number) => Math.max(1, Math.min(totalContentRows, r));

    /** Friendly label like 7 AM, 12 PM, 1 PM, ... */
    const hourLabel = (h: number) => {
      if (h === 0) return "12 AM";
      if (h === 12) return "12 PM";
      if (h > 12) return `${h - 12} PM`;
      return `${h} AM`;
    };

    /** Normalize a single day into an array of items */
    const getDayItems = (dayKey: keyof WeeklySchedule) => {
      const raw = (schedule as any)[dayKey];
      if (!raw) return [] as any[];
      if (Array.isArray(raw)) return raw; // older shape
      if (raw.schedule && Array.isArray(raw.schedule)) return raw.schedule; // new shape
      return [] as any[];
    };

    /** Color classes for known non-study types */
    const staticColors: Record<string, string> = {
      break: "bg-emerald-900/70 border-l-4 border-emerald-500 hover:bg-emerald-900",
      lunch: "bg-amber-900/70 border-l-4 border-amber-500 hover:bg-amber-900",
      meal: "bg-amber-900/70 border-l-4 border-amber-500 hover:bg-amber-900",
      personal: "bg-slate-700/70 border-l-4 border-slate-500 hover:bg-slate-700",
      personal_time: "bg-slate-700/70 border-l-4 border-slate-500 hover:bg-slate-700",
      empathetic_message: "bg-sky-900/60 border-l-4 border-sky-500 hover:bg-sky-900",
      other: "bg-slate-700/70 border-l-4 border-slate-500 hover:bg-slate-700",
    };

    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: "60px repeat(7, 1fr)",
          gridTemplateRows: `auto repeat(${totalContentRows}, 1fr)`,
        }}
      >
        {/* HEADERS */}
        <div
          className="sticky top-0 z-20 bg-slate-800 border-b-2 border-r border-slate-700/50"
          style={{ gridColumn: 1, gridRow: 1 }}
        />
        {daysOfWeek.map((label, idx) => {
          const d = weekDates[idx];
          const isToday =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();

          return (
            <div
              key={label}
              className="text-center font-bold pb-2 border-b-2 border-slate-700 border-r border-slate-700/50 last:border-r-0 sticky top-0 z-10 bg-slate-800 p-2 flex flex-col justify-center"
              style={{ gridColumn: idx + 2, gridRow: 1 }}
            >
              <div className={isToday ? "text-indigo-300" : "text-slate-300"}>{label}</div>
              <div
                className={`text-sm font-normal rounded-full w-6 h-6 flex items-center justify-center mx-auto mt-1 ${
                  isToday ? "bg-indigo-500 text-white" : "text-slate-400"
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}

        {/* TIME LABELS (left rail) */}
        {hours.map((h) => (
          <div
            key={`time-${h}`}
            className="relative text-right"
            style={{
              gridColumn: 1,
              // +2 to offset header row; each hour is 4 rows tall; position label near the top of its hour block
              gridRow: (h - START_HOUR) * SLOTS_PER_HOUR + 2,
            }}
          >
            <span className="text-sm text-slate-500 pr-2 absolute -top-2 right-0">
              {hourLabel(h)}
            </span>
          </div>
        ))}

        {/* GRID LINES */}
        <div className="col-start-1 col-end-[-1] row-start-2 row-end-[-1] grid grid-cols-subgrid grid-rows-subgrid pointer-events-none -z-10">
          {/* horizontal 15-min lines */}
          {Array.from({ length: totalContentRows }).map((_, i) => (
            <div
              key={`h-${i}`}
              className={`col-span-full ${
                i % SLOTS_PER_HOUR === 0
                  ? "border-b border-slate-700"
                  : "border-b border-slate-700/40"
              }`}
              style={{ gridRow: i + 2 }}
            />
          ))}
          {/* vertical day lines (after the time column) */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="row-span-full border-r border-slate-700/50"
              style={{ gridColumn: i + 2 }}
            />
          ))}
        </div>

        {/* SCHEDULE ITEMS */}
        {scheduleKeys.map((dayKey, dayIdx) => {
          const items = getDayItems(dayKey);

          return items.map((item: any, idx: number) => {
            // Accept both shapes: start_time/end_time or time "HH:MM-HH:MM"
            const rawStart =
              item.start_time ??
              (typeof item.time === "string" ? item.time.split("-")[0]?.trim() : undefined);
            const rawEnd =
              item.end_time ??
              (typeof item.time === "string" ? item.time.split("-")[1]?.trim() : undefined);

            let startM = parseTimeToMinutes(rawStart);
            let endM = parseTimeToMinutes(rawEnd);

            // If end is missing or invalid, default to 30 minutes
            if (startM == null) return null;
            if (endM == null) endM = startM + 30;

            // Handle weird cases: end before start → treat as +30m
            if (endM <= startM) endM = startM + 30;

            // Clamp to visible window (7:00 → 24:00)
            const minVisible = START_HOUR * 60;
            const maxVisible = END_HOUR * 60;

            const clippedStart = Math.max(startM, minVisible);
            const clippedEnd = Math.min(endM, maxVisible);

            // If entirely outside visible window, skip
            if (clippedEnd <= minVisible || clippedStart >= maxVisible) return null;

            const rowStart = minutesToRow(clippedStart);
            const rowEnd = minutesToRow(clippedEnd);
            const span = Math.max(clampRow(rowEnd) - clampRow(rowStart), 1);

            const gridRowStart = clampRow(rowStart) + 1; // +1 to account for header row at 1
            const gridColumn = dayIdx + 2; // +1 for time column, +1 for header col

            const label =
              item.task || item.title || "Untitled";
            const showTime = `${rawStart ?? ""}${rawEnd ? ` - ${rawEnd}` : ""}`;

            const isWork = item.type === "study" || item.type === "deadline_work";
            const itemColorClass = isWork
              ? getTaskColor(label)
              : staticColors[item.type] || staticColors.other;

            return (
              <div
                key={`${dayKey}-${idx}`}
                className={`p-1.5 rounded overflow-hidden z-10 m-px flex flex-col justify-center transition-colors ${itemColorClass}`}
                style={{
                  gridRow: `${gridRowStart} / span ${span}`,
                  gridColumn,
                }}
                title={`${label} (${showTime || "N/A"})`}
              >
                <p className="font-semibold text-xs text-slate-100 leading-tight truncate">
                  {label}
                </p>
                {showTime && (
                  <p className="text-[11px] text-slate-300/80 truncate">
                    {showTime}
                  </p>
                )}
              </div>
            );
          });
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg border border-slate-700 h-full">
      <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
        {renderContent()}
      </div>
    </div>
  );
};

export default ScheduleDisplay;
