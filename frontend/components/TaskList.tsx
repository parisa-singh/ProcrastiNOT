
import React, { useState } from 'react';
import type { ToDoTask, Importance } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface TaskListProps {
  tasks: ToDoTask[];
  onAddTask: (task: Omit<ToDoTask, 'id' | 'completed'>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  weeklyGoal: number;
  onWeeklyGoalChange: (hours: number) => void;
}

const ImportanceBadge: React.FC<{ importance: Importance }> = ({ importance }) => {
    const colors = {
        High: 'bg-red-500/20 text-red-300 border-red-500/30',
        Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        Low: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[importance]}`}>
            {importance}
        </span>
    )
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onAddTask, onDeleteTask, onToggleTask, weeklyGoal, onWeeklyGoalChange }) => {
  const [name, setName] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [importance, setImportance] = useState<Importance>('Medium');
  const [taskType, setTaskType] = useState<'task' | 'deadline'>('task');
  const [dueDate, setDueDate] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const durationNum = parseInt(expectedDuration, 10);
    if (!name.trim() || isNaN(durationNum) || durationNum <= 0) return;
    if (taskType === 'deadline' && !dueDate) return;
    
    onAddTask({ 
        name, 
        expectedDuration: durationNum, 
        importance,
        type: taskType,
        dueDate: taskType === 'deadline' ? dueDate : undefined,
    });

    setName('');
    setExpectedDuration('');
    setImportance('Medium');
    setTaskType('task');
    setDueDate('');
  };

  const importanceOrder: Record<Importance, number> = { 'High': 1, 'Medium': 2, 'Low': 3 };
  const sortedTasks = [...tasks].sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4 text-indigo-300">Deadlines & Goals</h2>
      
      <div className="mb-4">
        <label htmlFor="weekly-goal" className="block text-sm font-medium text-slate-400 mb-1">Time Studying Goal (hours)</label>
        <input
          id="weekly-goal"
          type="number"
          value={weeklyGoal}
          onChange={(e) => onWeeklyGoalChange(parseInt(e.target.value, 10) || 0)}
          className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </div>

      <form onSubmit={handleAddTask} className="space-y-3 mb-4 p-4 bg-slate-900/50 rounded-lg">
        <div className="flex items-center justify-around bg-slate-800 p-1 rounded-md mb-2">
            <button type="button" onClick={() => setTaskType('task')} className={`px-4 py-1 text-sm rounded-md w-1/2 transition-colors ${taskType === 'task' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}>Task</button>
            <button type="button" onClick={() => setTaskType('deadline')} className={`px-4 py-1 text-sm rounded-md w-1/2 transition-colors ${taskType === 'deadline' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'}`}>Deadline</button>
        </div>
        {taskType === 'deadline' && (
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            required
          />
        )}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Task name (e.g., Write English essay)"
          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
        <div className="grid grid-cols-2 gap-3">
             <input
                type="number"
                value={expectedDuration}
                onChange={(e) => setExpectedDuration(e.target.value)}
                placeholder="Duration (mins)"
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
            <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as Importance)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                <option value="High">High Importance</option>
                <option value="Medium">Medium Importance</option>
                <option value="Low">Low Importance</option>
            </select>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 rounded-md p-2 text-white font-semibold transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed"
          disabled={!name.trim() || !expectedDuration || (taskType === 'deadline' && !dueDate)}
          aria-label="Add new task"
        >
          <PlusIcon className="w-5 h-5" />
          Add Item
        </button>
      </form>
      
      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
        {tasks.length === 0 ? (
          <p className="text-center text-slate-500 italic py-4">Add your tasks & deadlines for the week!</p>
        ) : (
          <ul className="space-y-2">
            {sortedTasks.map(task => (
              <li key={task.id} className="bg-slate-900/70 p-3 rounded-lg flex items-start group">
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    className="h-5 w-5 rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500 mr-4 mt-1 flex-shrink-0"
                    aria-labelledby={`task-label-${task.id}`}
                />
                <div className="flex-grow">
                    <span id={`task-label-${task.id}`} className={`text-slate-300 block transition-colors ${task.completed ? 'line-through text-slate-500' : ''}`}>{task.name}</span>
                    {task.type === 'deadline' && task.dueDate && (
                        <span className="text-xs text-amber-400 font-medium block">
                            Due: {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        <ImportanceBadge importance={task.importance} />
                        <span className="text-xs text-slate-400">{task.expectedDuration} mins</span>
                    </div>
                </div>
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  aria-label={`Delete task: ${task.name}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TaskList;