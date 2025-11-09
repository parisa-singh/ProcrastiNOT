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

  const [theme, setTheme] = useState<{
    primary: string;
    surface: string;
    text: string;
  }>({
    primary: 'bg-indigo-600',
    surface: 'bg-slate-800',
    text: 'text-slate-200'
  });

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
  const [checkinDate, setCheckinDate] = useState<string>(todayString);
  
  const prevDay = () => {
    const d = new Date(checkinDate);
    d.setDate(d.getDate() - 1);
    setCheckinDate(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    const d = new Date(checkinDate);
    d.setDate(d.getDate() + 1);

    const tomorrowString = d.toISOString().split('T')[0];

    if (tomorrowString > todayString) return; // ← block future days

    setCheckinDate(tomorrowString);
  };


  const [mood, setMood] = useState<Mood>('Neutral');
  const [energyLevel, setEnergyLevel] = useState<number>(50);

  useEffect(() => {
    const log = dailyLogs.find(l => l.date === checkinDate);
    if (log) {
      setMood(log.mood);
      setEnergyLevel(log.energy);
    } else {
      // no entry for that day yet — pick your defaults
      setMood('Neutral');
      setEnergyLevel(50);
    }
  }, [checkinDate, dailyLogs]);

  useEffect(() => {
  handleGenerateSchedule();
  }, [currentWeekStart, calendarEvents]);


  const filterEventsForWeek = (events: CalendarEvent[], weekStart: Date) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);

    return events.filter(ev => {
      const evDate = new Date(ev.startTime);
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

    function generateMoodEnergyTrend(dailyLogs: DailyLog[], weekStart: Date) {
      const logsForWeek = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dateString = d.toISOString().split("T")[0];
        const entry = dailyLogs.find(l => l.date === dateString);
        logsForWeek.push({
        date: dateString,
        mood: entry?.mood ?? null,
        energy: entry?.energy ?? null,
    });
  }
  return logsForWeek;
}

    const weeklyTrend = generateMoodEnergyTrend(dailyLogs, currentWeekStart);

    const generatedSchedule = await generateWeeklySchedule(
      tasks,
      weeklyGoal,
      mood,
      energyLevel,
      weekEvents,
      currentWeekStart.toISOString(),
      weeklyTrend,
    )


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
    const status = await fetch('http://localhost:5000/auth/status').then((r) => r.json());

    if (!status.authenticated) {
      window.location.href = 'http://localhost:5000/auth/google';
      return;
    }

    const rawEvents: any[] = await fetch("http://localhost:5000/events").then(r => r.json());

    const mappedEvents = rawEvents.map((e: any) => ({
        title: e.summary ?? "Untitled Event",
        startTime: e.start?.dateTime ?? e.start?.date ?? "",
        endTime: e.end?.dateTime ?? e.end?.date ?? "",
    }));

    // set state — do NOT generate schedule directly here
    setCalendarEvents(mappedEvents);
    setIsCalendarSynced(true);

    } catch {
      setError('Failed to sync calendar.');
    } finally {
      setIsSyncing(false);
    }
  };


  // ---------- CRUD + other handlers ----------
  // handles checking-in for ANY selected day, not just today

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

// handles checking-in for ANY selected day, not just today
  const handleDailyCheckinForDate = (date: string, newMood: Mood, newEnergy: number) => {
    setDailyLogs(prev => {
    const otherLogs = prev.filter(log => log.date !== date);
    return [...otherLogs, { date, mood: newMood, energy: newEnergy }];
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
              <div className="flex items-center justify-between mb-3">
                <button
                onClick={() => {
                const d = new Date(checkinDate);
                d.setDate(d.getDate() - 1);
                setCheckinDate(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
            >
                ‹
            </button>

            <span className="font-semibold text-indigo-300 text-sm">
                {new Date(checkinDate).toLocaleDateString()}
            </span>

            <button
                onClick={() => {
                const d = new Date(checkinDate);
                d.setDate(d.getDate() + 1);
                setCheckinDate(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
            >
                ›
            </button>
            </div>
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
                    <MoodTracker
                      mood={mood}
                      energy={energyLevel}
                      onCheckin={(m, e) => handleDailyCheckinForDate(checkinDate, m, e)}
                      dailyLogs={dailyLogs}
                      disabled={checkinDate > todayString}
                    />
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
              <div className="flex gap-2">
                <button
                    onClick={() => setTheme({ primary:'bg-indigo-600', surface:'bg-slate-800', text:'text-slate-200' })}
                    className="w-6 h-6 rounded-full bg-indigo-600 border border-white"
                />
                <button
                    onClick={() => setTheme({ primary:'bg-pink-500', surface:'bg-zinc-900', text:'text-pink-50' })}
                    className="w-6 h-6 rounded-full bg-pink-500 border border-white"
                />
                <button
                    onClick={() => setTheme({ primary:'bg-emerald-600', surface:'bg-gray-900', text:'text-emerald-50' })}
                    className="w-6 h-6 rounded-full bg-emerald-600 border border-white"
                />
                </div>

              <button
                onClick={() => setCurrentView('main')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span>&larr;</span> Back to Planner
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <MoodTracker mood={mood} energy={energyLevel} onCheckin={(m,e) => handleDailyCheckinForDate(checkinDate, m, e)} dailyLogs={dailyLogs} />
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
