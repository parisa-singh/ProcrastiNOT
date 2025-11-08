
import React from 'react';
import type { ScheduleItem, WeeklySchedule } from '../types';
import { BrainIcon } from './icons/BrainIcon';

interface ScheduleDisplayProps {
  schedule: WeeklySchedule | null;
  isLoading: boolean;
  error: string | null;
}

const START_HOUR = 7; // 7 AM
const END_HOUR = 24; // 12 AM

const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({ schedule, isLoading, error }) => {
  
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
    
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const scheduleKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof WeeklySchedule)[];
    
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 for Sunday, 1 for Monday
    const dayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // 0 for Mon, 6 for Sun
    const firstDayOfWeek = new Date(new Date().setDate(today.getDate() - dayOffset));

    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(firstDayOfWeek);
        date.setDate(firstDayOfWeek.getDate() + i);
        return date.getDate();
    });

    const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
    const totalContentRows = (END_HOUR - START_HOUR) * 4; // 15-min intervals

    // Converts "HH:MM" to a 1-based grid row index.
    const timeToRow = (timeStr: string): number => {
        try {
            const parts = timeStr.split(':').map(Number);
            const hours = parts[0];
            // Default minutes to 0 if not provided (e.g., for "9" instead of "9:00")
            const minutes = parts.length > 1 ? parts[1] : 0;

            if (isNaN(hours) || isNaN(minutes)) {
                throw new Error(`Invalid time format: "${timeStr}"`);
            }
            
            const totalMinutes = (hours * 60) + minutes;
            const startMinutes = START_HOUR * 60;
            
            // Calculate the number of 15-minute intervals from the start of the day's view
            return Math.floor((totalMinutes - startMinutes) / 15) + 1;
        } catch (e) {
            console.error("Failed to parse time:", timeStr, e);
            return 1; // Default to top of grid on error
        }
    };

    return (
        <div className="grid" 
            style={{
                gridTemplateColumns: '60px repeat(7, 1fr)',
                gridTemplateRows: `auto repeat(${totalContentRows}, 1fr)`
            }}
        >
            {/* Top-left empty cell */}
            <div className="sticky top-0 z-30 bg-slate-800 border-b-2 border-slate-700"></div>

            {/* Day Headers */}
            {daysOfWeek.map((day, index) => (
                <div key={day} className="text-center font-bold text-indigo-300 pb-2 border-b-2 border-slate-700 sticky top-0 z-20 bg-slate-800 p-2 flex flex-col justify-center">
                    <div>{day}</div>
                    <div className="text-sm text-slate-400 font-normal">{weekDates[index]}</div>
                </div>
            ))}
            
            {/* Time Gutter & Horizontal Lines Overlay */}
            <div className="col-start-1 col-end-[-1] row-start-2 row-end-[-1] grid" style={{gridTemplateColumns: '60px 1fr'}}>
                {/* Horizontal lines for the entire area, sitting at the back */}
                <div className="grid h-full col-start-1 row-start-1 col-span-2" style={{gridTemplateRows: `repeat(${totalContentRows}, 1fr)`}}>
                    {Array.from({length: totalContentRows}).map((_, i) => (
                        <div key={i} className="border-b border-slate-700/50"></div>
                    ))}
                </div>
                
                {/* Time Gutter labels, in the first column, on top of horizontal lines */}
                <div className="grid h-full col-start-1 row-start-1" style={{gridTemplateRows: `repeat(${totalContentRows}, 1fr)`}}>
                     {timeSlots.map((hour, index) => (
                        <div
                            key={hour}
                            className="text-right pr-2 text-sm text-slate-500 relative -top-[10px] border-r border-slate-700/50"
                            style={{ gridRowStart: index * 4 + 1 }}
                        >
                            {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                        </div>
                    ))}
                </div>
            </div>

            {/* Vertical Grid Lines */}
             <div className="col-start-2 col-end-[-1] row-start-1 row-end-[-1] grid grid-cols-7">
                {Array.from({length: 7}).map((_, i) => (
                    <div key={i} className="border-r border-slate-700/50"></div>
                ))}
            </div>


            {/* Schedule Items */}
            {scheduleKeys.map((dayKey, dayIndex) => (
                (schedule[dayKey] || []).map((item, itemIndex) => {
                    const [startTime, endTime] = item.time.replace(/\s/g, '').split('-');
                    if (!startTime || !endTime) return null;
                    
                    const rowStart = timeToRow(startTime);
                    const rowEnd = timeToRow(endTime);
                    const durationInRows = rowEnd - rowStart;
                    
                    if (durationInRows <= 0) return null; // Don't render invalid or zero-duration tasks

                    const gridRowStart = rowStart + 1; // +1 for header row
                    const gridColumn = dayIndex + 2; // +1 for time gutter column

                    const colors = {
                        study: 'bg-indigo-900/70 border-l-4 border-indigo-500 hover:bg-indigo-900',
                        break: 'bg-emerald-900/70 border-l-4 border-emerald-500 hover:bg-emerald-900',
                        other: 'bg-slate-700/70 border-l-4 border-slate-500 hover:bg-slate-700',
                    };

                    return (
                        <div
                            key={`${dayKey}-${itemIndex}`}
                            className={`p-1.5 rounded overflow-hidden z-10 m-px flex flex-col justify-center transition-colors ${colors[item.type] || colors.other}`}
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
