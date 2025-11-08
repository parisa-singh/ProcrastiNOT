
import React, { useRef, useEffect } from 'react';
import type { ScheduleItem, WeeklySchedule } from '../types';
import { BrainIcon } from './icons/BrainIcon';

interface ScheduleDisplayProps {
  schedule: WeeklySchedule | null;
  isLoading: boolean;
  error: string | null;
  currentWeekStart: Date;
}

const START_HOUR = 7; // 7 AM
const END_HOUR = 24; // 12 AM

const colorPalette = [
    'bg-purple-900/70 border-l-4 border-purple-500 hover:bg-purple-900',
    'bg-indigo-900/70 border-l-4 border-indigo-500 hover:bg-indigo-900',
    'bg-sky-900/70 border-l-4 border-sky-500 hover:bg-sky-900',
    'bg-teal-900/70 border-l-4 border-teal-500 hover:bg-teal-900',
    'bg-rose-900/70 border-l-4 border-rose-500 hover:bg-rose-900',
    'bg-amber-900/70 border-l-4 border-amber-500 hover:bg-amber-900',
];

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, isLoading, error, currentWeekStart }) => {
  const taskColorMap = useRef(new Map<string, string>());

  useEffect(() => {
    // When a new schedule is generated, clear the old color mappings
    // to ensure colors are freshly assigned for the new set of tasks.
    taskColorMap.current.clear();
  }, [schedule]);
  
  const getTaskColor = (task: string): string => {
    // Normalize the task name to group related activities under one color.
    // E.g., "Work on Hackathon" and "Submit Hackathon" both key to "hackathon".
    const key = task.toLowerCase()
      .replace(/^(work on|study for|finish|submit|prepare|review|read)\s/,'')
      .split(/[:(]/)[0]
      .trim();

    if (!taskColorMap.current.has(key)) {
        const nextColorIndex = taskColorMap.current.size % colorPalette.length;
        taskColorMap.current.set(key, colorPalette[nextColorIndex]);
    }
    return taskColorMap.current.get(key)!;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
          <BrainIcon className="w-12 h-12 text-indigo-400 animate-pulse" />
          <p className="mt-4 text-slate-400 font-semibold">Generating your personalized weekly plan...</p>
          <p className="text-sm text-slate-500 mt-1">Our AI is analyzing your goals to create the perfect week.</p>
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
            <p className="text-sm text-slate-500 mt-1">Complete your check-in and add tasks, then click "Generate" to build your schedule.</p>
        </div>
      );
    }
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const scheduleKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as (keyof WeeklySchedule)[];
    
    const today = new Date();
    
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        return date.getDate();
    });

    const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
    const totalContentRows = (END_HOUR - START_HOUR) * 4; // 15-min intervals

    // Converts "HH:MM" to a 1-based grid row index.
    const timeToRow = (timeStr: string): number => {
        try {
            const parts = timeStr.split(':').map(Number);
            const hours = parts[0];
            const minutes = parts.length > 1 ? parts[1] : 0;

            if (isNaN(hours) || isNaN(minutes)) {
                throw new Error(`Invalid time format: "${timeStr}"`);
            }
            
            const totalMinutes = (hours * 60) + minutes;
            const startMinutes = START_HOUR * 60;
            
            return Math.floor((totalMinutes - startMinutes) / 15) + 1;
        } catch (e) {
            console.error("Failed to parse time:", timeStr, e);
            return 1; // Default to top of grid on error
        }
    };

    return (
        <div 
            className="grid"
            style={{
                gridTemplateColumns: '60px repeat(7, 1fr)',
                gridTemplateRows: `auto repeat(${totalContentRows}, 1fr)`
            }}
        >
            {/* ----- HEADERS (ROW 1) ----- */}
            <div className="sticky top-0 z-20 bg-slate-800 border-b-2 border-r border-slate-700/50" style={{ gridColumn: 1, gridRow: 1 }}></div>
            {daysOfWeek.map((day, index) => {
                const columnDate = new Date(currentWeekStart);
                columnDate.setDate(currentWeekStart.getDate() + index);

                const isToday = today.getFullYear() === columnDate.getFullYear() &&
                                today.getMonth() === columnDate.getMonth() &&
                                today.getDate() === columnDate.getDate();

                return (
                    <div key={day} 
                        className="text-center font-bold pb-2 border-b-2 border-slate-700 border-r border-slate-700/50 last:border-r-0 sticky top-0 z-10 bg-slate-800 p-2 flex flex-col justify-center"
                        style={{ gridColumn: index + 2, gridRow: 1 }}
                    >
                        <div className={isToday ? 'text-indigo-300' : 'text-slate-300'}>{day}</div>
                        <div className={`text-sm font-normal rounded-full w-6 h-6 flex items-center justify-center mx-auto mt-1 ${isToday ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>
                            {weekDates[index]}
                        </div>
                    </div>
                );
            })}
            
            {/* ----- TIME GUTTER LABELS (COLUMN 1) ----- */}
            {timeSlots.map((hour) => (
                <div
                    key={`time-label-${hour}`}
                    className="relative text-right"
                    style={{
                        gridColumn: 1,
                        gridRow: (hour - START_HOUR) * 4 + 1,
                    }}
                >
                    <span className="text-sm text-slate-500 pr-2 absolute -top-2 right-0">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </span>
                </div>
            ))}
            
            {/* ----- BACKGROUND GRID LINES ----- */}
            <div 
                className="col-start-1 col-end-[-1] row-start-2 row-end-[-1] grid grid-cols-subgrid grid-rows-subgrid pointer-events-none -z-10"
            >
                {/* Horizontal Lines */}
                {Array.from({ length: totalContentRows }).map((_, i) => (
                    <div 
                        key={`h-line-${i}`} 
                        className="col-span-full border-b border-slate-700/50" 
                        style={{ gridRow: i + 1 }}
                    />
                ))}
                {/* Vertical Lines */}
                {Array.from({ length: 7 }).map((_, i) => (
                    <div 
                        key={`v-line-${i}`} 
                        className="row-span-full border-r border-slate-700/50"
                        style={{ gridColumn: i + 1 }}
                    />
                ))}
            </div>

            {/* ----- SCHEDULE ITEMS (Placed on top of main grid) ----- */}
            {scheduleKeys.map((dayKey, dayIndex) => (
                (schedule[dayKey] || []).map((item, itemIndex) => {
                    const [startTime, endTime] = item.time.replace(/\s/g, '').split('-');
                    
                    const isValidTime = (timeStr: string) => /^\d{1,2}(:\d{2})?$/.test(timeStr);

                    if (!startTime || !isValidTime(startTime)) {
                        console.warn(`Skipping event with invalid start time: ${item.time}`);
                        return null;
                    }
                    
                    const rowStart = timeToRow(startTime);
                    let rowEnd;

                    if (endTime && isValidTime(endTime)) {
                        rowEnd = timeToRow(endTime);
                    } else {
                        rowEnd = rowStart + 4; 
                    }
                    
                    const durationInRows = rowEnd - rowStart;
                    
                    if (durationInRows <= 0) {
                        console.warn(`Skipping event with zero or negative duration: ${item.time}`);
                        return null;
                    }

                    const gridRowStart = rowStart + 1;
                    const gridColumn = dayIndex + 2;

                    const staticColors = {
                        break: 'bg-emerald-900/70 border-l-4 border-emerald-500 hover:bg-emerald-900',
                        other: 'bg-slate-700/70 border-l-4 border-slate-500 hover:bg-slate-700',
                    };

                    const itemColorClass = (item.type === 'study' || item.type === 'deadline_work')
                        ? getTaskColor(item.task)
                        : staticColors[item.type] || staticColors.other;


                    return (
                        <div
                            key={`${dayKey}-${itemIndex}`}
                            className={`p-1.5 rounded overflow-hidden z-10 m-px flex flex-col justify-center transition-colors ${itemColorClass}`}
                            style={{
                                gridRow: `${gridRowStart} / span ${durationInRows}`,
                                gridColumn: gridColumn,
                            }}
                            title={`${item.task} (${item.time})`}
                        >
                            <p className="font-semibold text-xs text-slate-100 leading-tight truncate">{item.task}</p>
                            <p className="text-xs text-slate-400 truncate">{item.time}</p>
                        </div>
                    );
                })
            ))}
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