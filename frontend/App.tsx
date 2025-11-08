import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ToDoTask,
  WeeklySchedule,
  Mood,
  DailyLog,
  StudyLogEntry,
  CalendarEvent
} from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateWeeklySchedule, getStudyFeedback } from './services/geminiService';
import TaskList from './components/TaskList';
import ScheduleDisplay from './components/ScheduleDisplay';
import { BrainIcon } from './components/icons/BrainIcon';
import MoodTracker from './components/MoodTracker';
import StudyLogForm from './components/PastDataForm';
import { TrashIcon } from './components/icons/TrashIcon';

// --- helpers ---
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day; // go back to Sunday
  d.setHours(0, 0, 0, 0);
  return new Date(d.setDate(diff));
};

// --- StudyLogView Component ---
interface StudyLogViewProps {
  logs: StudyLogEntry[];
  onAddLog: (log: Omit<StudyLogEntry, 'id'>) => void;
  onDeleteLog: (id: string) => void;
  onGetFeedback: () => void;
  feedback: string | null;
  isFeedbackLoading: boolean;
  feedbackError: string | null;
}

const StudyLogView: React.FC<StudyLogViewProps> = ({
  logs,
  onAddLog,
  onDeleteLog,
  onGetFeedback,
  feedback,
  isFeedbackLoading,
  feedbackError
}) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 h-full flex flex-col space-y-4">
      <h2 className="text-xl font-semibold text-indigo-300">Study Log & Feedback</h2>

      <StudyLogForm onAdd={onAddLog} />

      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-2">
        <h3 className="text-lg font-semibold text-slate-300 mt-4">Logged Sessions</h3>
        {logs.length === 0 ? (
          <p className="text-center text-slate-500 italic py-4">No study sessions logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {[...logs].reverse().map((log) => (
              <li key={log.id} className="bg-slate-900/70 p-3 rounded-lg flex items-start group">
                <div className="flex-grow">
                  <p className="font-semibold text-slate-300">{log.task}</p>
                  <p className="text-sm text-slate-400">
                    {log.duration} mins - <span className="font-medium">{log.energyLevel} Energy</span>
                  </p>
                  <p className="text-sm text-slate-500 italic mt-1">"{log.outcome}"</p>
                </div>
                <button
                  onClick={() => onDeleteLog(log.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  aria-label={`Delete log: ${log.task}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-700 pt-4">
        <button
          onClick={onGetFeedback}
          disabled={isFeedbackLoading || logs.length === 0}
          className="w-full text-md font-bold bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
        >
          {isFeedbackLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <BrainIcon className="w-6 h-6" />
              Get AI Feedback
            </>
          )}
        </button>

        {logs.length === 0 && !isFeedbackLoading && (
          <p className="text-center text-sm text-slate-500 mt-1">Log a session to get feedback.</p>
        )}

        {feedbackError && (
          <div className="mt-4 bg-red-900/20 p-3 rounded-lg text-center">
            <p className="text-red-400 font-semibold">Error Generating Feedback</p>
            <p className="text-slate-400 mt-1 text-sm">{feedbackError}</p>
          </div>
        )}

        {feedback && !feedbackError && (
          <div className="mt-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h4 className="font-semibold text-teal-300 mb-2">Your AI Coach&apos;s Feedback</h4>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans">{feedback}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  // persistent user data
  const [tasks, setTasks] = useLocalStorage<ToDoTask[]>('tasks', []);
  const [weeklyGoal, setWeeklyGoal] = useLocalStorage<number>('weeklyGoal', 20);
  const [dailyLogs, setDailyLogs] = useLocalStorage<DailyLog[]>('dailyLogs', []);
  const [studyLogs, setStudyLogs] = useLocalStorage<StudyLogEntry[]>('studyLogs', []);
  const [calendarEvents, setCalendarEvents] = useLocalStorage<CalendarEvent[]>('calendarEvents', []);

  // UI + state
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'checkin' | 'tasks' | 'log'>('checkin');
  const [currentView, setCurrentView] = useState<'main' | 'details'>('main');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()));

  // calendar sync states
  const [isCalendarSynced, setIsCalendarSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // today + mood/energy
  const todayString = new Date().toISOString().split('T')[0];
  const [mood, setMood] = useState<Mood>('Neutral');
  const [energyLevel, setEnergyLevel] = useState<number>(50);

  useEffect(() => {
    const todayLog = dailyLogs.find((log) => log.date === todayString);
    if (todayLog) {
      setMood(todayLog.mood);
      setEnergyLevel(todayLog.energy);
    }
  }, [dailyLogs, todayString]);

  const filterEventsForWeek = (events: CalendarEvent[], weekStart: Date) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    return events.filter(ev => {
        const evDate = new Date(ev.start.dateTime || ev.start.date);
        return evDate >= start && evDate < end;
    });
};


  // ---------- Auth + Sync flow ----------
const handleGenerateSchedule = async (eventsOverride?: CalendarEvent[]): Promise<WeeklySchedule | null> => {
  setIsLoading(true);
  setError(null);
  setSchedule(null);

  try {
    const eventsToUse = eventsOverride || calendarEvents;

    const weekEvents = filterEventsForWeek(eventsToUse, currentWeekStart);

    const generatedSchedule = await generateWeeklySchedule(
      tasks,
      weeklyGoal,
      mood,
      energyLevel,
      weekEvents
    );

    setSchedule(generatedSchedule);
    return generatedSchedule;

  } catch (err) {
    if (err instanceof Error) setError(err.message);
    else setError("Unknown error generating schedule.");
    return null;

  } finally {
    setIsLoading(false);
  }
};

  const syncGoogleCalendar = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      // ask backend whether tokens already exist
      const status = await fetch('http://localhost:5000/auth/status').then((r) => r.json());

      if (!status.authenticated) {
        // first-time auth → redirect to Google OAuth
        window.location.href = 'http://localhost:5000/auth/google';
        return; // stop execution; browser navigates away
      }

      // already authenticated → fetch events
      const events = await fetch('http://localhost:5000/events').then((r) => r.json());
      setCalendarEvents(events);
      setIsCalendarSynced(true);

      // immediately regenerate a schedule with real events
      await handleGenerateSchedule(events);
    } catch {
      setError('Failed to sync calendar.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------- CRUD + other handlers ----------
  const addTask = (task: Omit<ToDoTask, 'id' | 'completed'>) => {
    setTasks((prev) => [...prev, { ...task, id: uuidv4(), completed: false }]);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const addStudyLog = (log: Omit<StudyLogEntry, 'id'>) => {
    setStudyLogs((prev) => [...prev, { ...log, id: uuidv4() }]);
  };

  const deleteStudyLog = (id: string) => {
    setStudyLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleDailyCheckin = (newMood: Mood, newEnergy: number) => {
    setMood(newMood);
    setEnergyLevel(newEnergy);
    setDailyLogs((prev) => {
      const otherLogs = prev.filter((log) => log.date !== todayString);
      return [...otherLogs, { date: todayString, mood: newMood, energy: newEnergy }];
    });
  };

  const handleGetFeedback = async () => {
    setIsFeedbackLoading(true);
    setFeedbackError(null);
    setFeedback(null);
    try {
      const generatedFeedback = await getStudyFeedback(studyLogs);
      setFeedback(generatedFeedback);
    } catch (err) {
      if (err instanceof Error) setFeedbackError(err.message);
      else setFeedbackError('An unknown error occurred.');
    } finally {
      setIsFeedbackLoading(false);
    }
  };

const handlePreviousWeek = () => {
  setCurrentWeekStart(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() - 7);
    return d;
  });
  handleGenerateSchedule();
}

const handleNextWeek = () => {
  setCurrentWeekStart(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + 7);
    return d;
  });
  handleGenerateSchedule();
}

const handleGoToToday = () => {
  setCurrentWeekStart(getStartOfWeek(new Date()));
  handleGenerateSchedule();
}


  const formatDateRange = (startDate: Date): string => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const startMonth = startDate.toLocaleString('default', { month: 'short' });
    const endMonth = endDate.toLocaleString('default', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${startDate.getFullYear()}`;
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
  };

  // ---------- render ----------
  return (
    <div className="bg-slate-900 text-slate-300 min-h-screen font-sans">
      <header className="py-5 px-8 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-[90rem] mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-3">
            <BrainIcon className="w-7 h-7 text-indigo-400" />
            <span>Gemini Weekly Planner</span>
          </h1>
          {currentView === 'main' && (
            <button
              onClick={() => setCurrentView('details')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-semibold transition-colors"
            >
              Expand View
            </button>
          )}
        </div>
      </header>

      {currentView === 'main' ? (
        <main className="p-4 md:p-6">
          <div className="max-w-[90rem] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Main Column */}
            <div className="lg:order-1 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-semibold text-indigo-300">Your AI-Generated Weekly Schedule</h2>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Week scroll group */}
                  <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 p-1 rounded-lg">
                    <button
                      onClick={handlePreviousWeek}
                      className="px-2 py-1 rounded-md hover:bg-slate-700 transition-colors"
                      aria-label="Previous week"
                    >
                      ‹
                    </button>
                    <button
                      onClick={handleGoToToday}
                      className="text-sm font-semibold hover:text-indigo-400 transition-colors px-2 whitespace-nowrap"
                    >
                      {formatDateRange(currentWeekStart)}
                    </button>
                    <button
                      onClick={handleNextWeek}
                      className="px-2 py-1 rounded-md hover:bg-slate-700 transition-colors"
                      aria-label="Next week"
                    >
                      ›
                    </button>
                  </div>

                  {/* Sync */}
                  <button
                    onClick={syncGoogleCalendar}
                    disabled={isSyncing}
                    className="w-full sm:w-auto text-sm font-semibold bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  >
                    {isSyncing ? 'Syncing...' : isCalendarSynced ? 'Calendar Synced ✓' : 'Sync Google Calendar'}
                  </button>

                  {/* Generate */}
                  <button
                    onClick={() => handleGenerateSchedule()}
                    disabled={isLoading || tasks.filter((t) => !t.completed).length === 0}
                    className="w-full sm:w-auto text-lg font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <BrainIcon className="w-6 h-6" />
                        Generate Week
                      </>
                    )}
                  </button>
                </div>
              </div>

              {tasks.filter((t) => !t.completed).length === 0 && !isLoading && (
                <p className="text-center sm:text-right text-sm text-slate-500 -mt-2">
                  Add some tasks to generate a schedule.
                </p>
              )}

              <ScheduleDisplay
                schedule={schedule}
                isLoading={isLoading}
                error={error}
                currentWeekStart={currentWeekStart}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:order-2 space-y-4 flex flex-col">
              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setActiveTab('checkin')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                    activeTab === 'checkin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Check-in
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                    activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setActiveTab('log')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                    activeTab === 'log' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Log
                </button>
              </div>

              <div className="flex-grow">
                {activeTab === 'checkin' && (
                  <MoodTracker mood={mood} energy={energyLevel} onCheckin={handleDailyCheckin} dailyLogs={dailyLogs} />
                )}
                {activeTab === 'tasks' && (
                  <TaskList
                    tasks={tasks}
                    onAddTask={addTask}
                    onDeleteTask={deleteTask}
                    onToggleTask={toggleTaskCompletion}
                    weeklyGoal={weeklyGoal}
                    onWeeklyGoalChange={setWeeklyGoal}
                  />
                )}
                {activeTab === 'log' && (
                  <StudyLogView
                    logs={studyLogs}
                    onAddLog={addStudyLog}
                    onDeleteLog={deleteStudyLog}
                    onGetFeedback={handleGetFeedback}
                    feedback={feedback}
                    isFeedbackLoading={isFeedbackLoading}
                    feedbackError={feedbackError}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        // Details view
        <main className="p-4 md:p-6">
          <div className="max-w-[90rem] mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-100">Details View</h2>
              <button
                onClick={() => setCurrentView('main')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span>&larr;</span> Back to Planner
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <MoodTracker mood={mood} energy={energyLevel} onCheckin={handleDailyCheckin} dailyLogs={dailyLogs} />
              <TaskList
                tasks={tasks}
                onAddTask={addTask}
                onDeleteTask={deleteTask}
                onToggleTask={toggleTaskCompletion}
                weeklyGoal={weeklyGoal}
                onWeeklyGoalChange={setWeeklyGoal}
              />
              <div className="lg:col-span-2">
                <StudyLogView
                  logs={studyLogs}
                  onAddLog={addStudyLog}
                  onDeleteLog={deleteStudyLog}
                  onGetFeedback={handleGetFeedback}
                  feedback={feedback}
                  isFeedbackLoading={isFeedbackLoading}
                  feedbackError={feedbackError}
                />
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
