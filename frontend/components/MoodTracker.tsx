import React from 'react';
import type { Mood, DailyLog } from '../types';

const MOODS: { name: Mood, emoji: string }[] = [
    { name: 'Excited', emoji: '🤩' },
    { name: 'Happy', emoji: '😊' },
    { name: 'Neutral', emoji: '😐' },
    { name: 'Sad', emoji: '😢' },
    { name: 'Stressed', emoji: '🤯' },
];

const MOOD_VALUES: Record<Mood, number> = {
    'Stressed': 1,
    'Sad': 2,
    'Neutral': 3,
    'Happy': 4,
    'Excited': 5,
};

interface MoodTrackerProps {
    mood: Mood;
    energy: number;
    onCheckin: (mood: Mood, energy: number) => void;
    dailyLogs: DailyLog[];
}

const WeeklyMoodChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    const today = new Date();
    const weekData: ({ day: string, value: number } | null)[] = [];
    
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = dayLabels[date.getDay()];
        
        const log = logs.find(l => l.date === dateString);
        if (log) {
            weekData.push({ day: dayOfWeek, value: MOOD_VALUES[log.mood] });
        } else {
            weekData.push({ day: dayOfWeek, value: 0 });
        }
    }

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2 text-center">Mood</h3>
            <div className="flex justify-between items-end h-32 bg-slate-900/50 p-3 rounded-lg gap-2">
                {weekData.map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div 
                            className="w-full bg-indigo-500 rounded-t-sm transition-all duration-300"
                            style={{ height: `${(data?.value || 0) * 20}%` }}
                            title={data?.value ? `Mood value: ${data.value}` : 'No data'}
                        ></div>
                        <span className="text-xs text-slate-400 mt-1">{data?.day}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const MoodTracker: React.FC<MoodTrackerProps> = ({ mood, energy, onCheckin, dailyLogs }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 space-y-6">
            <WeeklyMoodChart logs={dailyLogs} />
            
            <div className='space-y-4'>
                <h3 className="text-lg font-semibold text-slate-200 text-center">Today's Check-in</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2 text-center">How are you feeling?</label>
                    <div className="flex justify-between items-center bg-slate-900/70 p-2 rounded-lg">
                        {MOODS.map(m => (
                            <button key={m.name} onClick={() => onCheckin(m.name, energy)} className={`p-2 rounded-md text-2xl transition-all duration-200 ${mood === m.name ? 'bg-indigo-600 scale-110' : 'hover:bg-slate-700'}`} aria-label={m.name}>
                                {m.emoji}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label htmlFor="energy" className="block text-sm font-medium text-slate-400 mb-2 text-center">Energy Level: <span className='font-bold text-indigo-300'>{energy}%</span></label>
                     <input
                        id="energy"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={energy}
                        onChange={(e) => onCheckin(mood, parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
        </div>
    );
};

export default MoodTracker;