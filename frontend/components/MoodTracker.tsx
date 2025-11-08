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

const MOOD_COLORS: Record<Mood, string> = {
    'Excited': 'bg-yellow-400',
    'Happy': 'bg-green-400',
    'Neutral': 'bg-sky-400',
    'Sad': 'bg-blue-500',
    'Stressed': 'bg-red-500',
};

const getEnergyColor = (energy: number): string => {
    if (energy <= 20) return 'bg-red-500';
    if (energy <= 40) return 'bg-orange-500';
    if (energy <= 60) return 'bg-yellow-500';
    if (energy <= 80) return 'bg-lime-500';
    return 'bg-emerald-500';
};


interface MoodTrackerProps {
    mood: Mood;
    energy: number;
    onCheckin: (mood: Mood, energy: number) => void;
    dailyLogs: DailyLog[];
}

const WeeklyMoodChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    const today = new Date();
    const weekData: ({ day: string, value: number, mood: Mood | null })[] = [];
    
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = dayLabels[date.getDay()];
        
        const log = logs.find(l => l.date === dateString);
        if (log) {
            weekData.push({ day: dayOfWeek, value: MOOD_VALUES[log.mood], mood: log.mood });
        } else {
            weekData.push({ day: dayOfWeek, value: 0, mood: null });
        }
    }
    
    const reversedMoods = [...MOODS].reverse();

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2 text-center">Weekly Mood</h3>
            <div className="flex gap-2">
                <div className="flex flex-col-reverse justify-between h-32 text-lg text-center py-1 w-8" aria-hidden="true">
                    {reversedMoods.map(m => (
                        <span key={m.name} title={m.name}>{m.emoji}</span>
                    ))}
                </div>
                <div className="flex-grow flex flex-col h-32 bg-slate-900/50 p-3 rounded-lg">
                    <div className="flex justify-between">
                        {weekData.map((data, index) => (
                            <span key={index} className="flex-1 text-xs text-slate-400 text-center">{data?.day}</span>
                        ))}
                    </div>
                    <div className="flex-grow flex justify-between items-end gap-2 border-t border-slate-700/50 mt-1 pt-1">
                        {weekData.map((data, index) => {
                            const barColor = data?.mood ? MOOD_COLORS[data.mood] : 'bg-slate-700';
                            return (
                                <div key={index} className="flex-1 h-full flex items-end">
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-300 ${barColor}`}
                                        style={{ height: `${(data?.value || 0) * 20}%` }}
                                        title={data?.mood ? `${data.mood}` : 'No data'}
                                    ></div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


const WeeklyEnergyChart: React.FC<{ logs: DailyLog[] }> = ({ logs }) => {
    const today = new Date();
    const weekData: ({ day: string; value: number })[] = [];
    
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayOfWeek = dayLabels[date.getDay()];
        
        const log = logs.find(l => l.date === dateString);
        if (log) {
            weekData.push({ day: dayOfWeek, value: log.energy });
        } else {
            weekData.push({ day: dayOfWeek, value: 0 });
        }
    }
    
    const energyLabels = ['100', '75', '50', '25', '0'];

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2 text-center">Weekly Energy</h3>
             <div className="flex gap-2">
                <div className="flex flex-col justify-between h-32 text-xs text-slate-400 text-right w-8 pr-1 py-0.5" aria-hidden="true">
                    {energyLabels.map(label => <span key={label}>{label}</span>)}
                </div>
                <div className="flex-grow flex flex-col h-32 bg-slate-900/50 p-3 rounded-lg">
                    <div className="flex justify-between">
                        {weekData.map((data, index) => (
                            <span key={index} className="flex-1 text-xs text-slate-400 text-center">{data?.day}</span>
                        ))}
                    </div>
                    <div className="flex-grow flex justify-between items-end gap-2 border-t border-slate-700/50 mt-1 pt-1">
                        {weekData.map((data, index) => {
                            const barColor = data.value > 0 ? getEnergyColor(data.value) : 'bg-slate-700';
                            return (
                                <div key={index} className="flex-1 h-full flex items-end">
                                    <div 
                                        className={`w-full rounded-t-sm transition-all duration-300 ${barColor}`}
                                        style={{ height: `${data?.value || 0}%` }}
                                        title={data?.value ? `Energy: ${data.value}%` : 'No data'}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};


const MoodTracker: React.FC<MoodTrackerProps> = ({ mood, energy, onCheckin, dailyLogs }) => {
    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
            <div className="grid grid-cols-1 gap-y-8">
                {/* Charts Column */}
                <div className="space-y-6">
                    <WeeklyMoodChart logs={dailyLogs} />
                    <WeeklyEnergyChart logs={dailyLogs} />
                </div>
                
                {/* Check-in Section */}
                <div className='space-y-6 bg-slate-900/50 p-4 rounded-lg'>
                    <h3 className="text-lg font-semibold text-slate-200 text-center">Today's Check-in</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2 text-center">How are you feeling?</label>
                        <div className="flex justify-around items-center bg-slate-800 p-1 rounded-lg">
                            {MOODS.map(m => (
                                <button key={m.name} onClick={() => onCheckin(m.name, energy)} className={`p-1.5 sm:p-2 rounded-md text-xl sm:text-2xl transition-all duration-200 ${mood === m.name ? 'bg-indigo-600 scale-110' : 'hover:bg-slate-700'}`} aria-label={m.name}>
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
        </div>
    );
};

export default MoodTracker;