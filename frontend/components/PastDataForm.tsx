import React, { useState } from 'react';
import type { StudyLogEntry, EnergyLevel } from '../types';
import { PlusIcon } from './icons/PlusIcon';

interface StudyLogFormProps {
  onAdd: (data: Omit<StudyLogEntry, 'id'>) => void;
}

const StudyLogForm: React.FC<StudyLogFormProps> = ({ onAdd }) => {
  const [task, setTask] = useState('');
  const [duration, setDuration] = useState('');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('Medium');
  const [outcome, setOutcome] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const durationNum = parseInt(duration, 10);
    if (!task || !duration || isNaN(durationNum) || !outcome) return;

    onAdd({ task, duration: durationNum, energyLevel, outcome });
    setTask('');
    setDuration('');
    setEnergyLevel('Medium');
    setOutcome('');
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200 text-slate-200 font-semibold"
      >
        <PlusIcon className="w-5 h-5" />
        Log a Study Session
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-slate-800/50 rounded-lg space-y-4 border border-slate-700">
      <h3 className="text-lg font-semibold text-slate-200">Log a New Study Session</h3>
      
      <div>
        <label htmlFor="task" className="block text-sm font-medium text-slate-400 mb-1">Task / Subject</label>
        <input
          id="task"
          type="text"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g., Physics Problem Set"
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
            <label htmlFor="duration" className="block text-sm font-medium text-slate-400 mb-1">Duration (minutes)</label>
            <input
            id="duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 45"
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
        </div>
        <div>
            <label htmlFor="energyLevel" className="block text-sm font-medium text-slate-400 mb-1">Energy Level</label>
            <select
            id="energyLevel"
            value={energyLevel}
            onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
            </select>
        </div>
      </div>

      <div>
        <label htmlFor="outcome" className="block text-sm font-medium text-slate-400 mb-1">Outcome / Result</label>
        <input
          id="outcome"
          type="text"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g., Finished all problems, felt focused"
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-semibold transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
          disabled={!task || !duration || !outcome}
        >
          Log Session
        </button>
      </div>
    </form>
  );
};

export default StudyLogForm;
