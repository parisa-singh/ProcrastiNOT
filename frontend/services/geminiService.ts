import type {
  ToDoTask,
  WeeklySchedule,
  Mood,
  StudyLogEntry,
  CalendarEvent,
} from "../types";

function formatTasks(tasks: ToDoTask[]): string {
  if (tasks.length === 0) return "No tasks to schedule.";
  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  const formatTaskLine = (t: ToDoTask) => {
    let taskString = `- ${t.name} (Est: ${t.expectedDuration}m, Importance: ${t.importance})`;
    if (t.type === "deadline" && t.dueDate) {
      taskString += ` [DEADLINE: ${new Date(t.dueDate).toLocaleString()}]`;
    }
    return taskString;
  };

  let formatted =
    "Pending Tasks:\n" +
    (pending.length > 0
      ? pending.map(formatTaskLine).join("\n")
      : "None");
  formatted +=
    "\n\nCompleted Tasks:\n" +
    (completed.length > 0
      ? completed.map((t) => `- ${t.name}`).join("\n")
      : "None");

  return formatted;
}

function formatCalendarEvents(events: CalendarEvent[]): string {
  if (events.length === 0)
    return "No upcoming calendar events to consider.";
  return (
    "The user has the following events already in their calendar. You MUST schedule around them:\n" +
    events
      .map(
        (event) =>
          `- ${event.title} (from ${new Date(
            event.startTime
          ).toLocaleString()} to ${new Date(event.endTime).toLocaleString()})`
      )
      .join("\n")
  );
}

export async function generateWeeklySchedule(
  tasks: ToDoTask[],
  weeklyGoal: number,
  mood: Mood,
  energyLevel: number, 
  calendarEvents: CalendarEvent[],
  weekStartDate: string
): Promise<WeeklySchedule> {
  const prompt = `
You are an expert academic coach and weekly planner for a college student. Your task is to create a personalized, effective, and empathetic 7-day study schedule, starting from Sunday.

The schedule you generate MUST be aligned with the week that begins on this exact date (ISO format): ${weekStartDate}

**Current User State:**
- Today's Mood: ${mood}
- Today's Energy Level: ${energyLevel}/100

**User's Goals & Tasks:**
- Weekly Study Goal: ${weeklyGoal} hours
- Full Task List (with completion status and deadlines):
${formatTasks(tasks)}

**Existing Commitments from User's Calendar:**
${formatCalendarEvents(calendarEvents)}

**Instructions:**
1. **Analyze and Empathize:** Acknowledge the user's current mood and energy. If energy is low, start today's schedule gently. If they're stressed, build in more breaks. If excited, leverage that momentum on important tasks.
2. **Prioritize & Schedule Around Commitments:** Plan the entire week starting from Sunday. Crucially, you must block out time for the user's existing commitments from their calendar and schedule all study sessions and breaks around them. Pay close attention to items marked as DEADLINE and schedule them to be completed well before they are due. When you schedule a study block for a DEADLINE task, you MUST use the type 'deadline_work' for that schedule item. Then, schedule the highest importance tasks. Distribute tasks logically across the 7 days.
3. **Balance:** Distribute the weekly study goal across the week. Avoid overloading any single day. Factor in that weekends might be for lighter work or catching up.
4. **Structure:** Create a daily plan with focused study blocks (45–60 mins) and regular short breaks (10–15 mins). Include a longer lunch break.
5. **Be Realistic:** The schedule must be achievable. Don't schedule back-to-back heavy cognitive tasks. Alternate between different subjects or types of work. Do not schedule tasks that overlap with existing calendar commitments.
6. **Output:** Return a complete 7-day schedule as a JSON object with keys for "sunday" through "saturday". Ensure every day has a schedule, even if it's just "Rest Day" or light work.
`;

  try {
    const response = await fetch("http://localhost:5000/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: "gemini-2.5-pro",
      }),
    });

    if (!response.ok) throw new Error("Gemini request failed");

    const data = await response.json();
let jsonString = data.output || "";

jsonString = jsonString
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .replace(/^[^{[]*/, "") 
  .replace(/[^}\]]*$/, "") 
  .trim();

console.log("🧠 Cleaned Gemini output:", jsonString);

const parsedResponse = JSON.parse(jsonString);


    if (parsedResponse && typeof parsedResponse.monday !== "undefined") {
      return parsedResponse as WeeklySchedule;
    } else {
      throw new Error("Invalid weekly schedule format in response.");
    }
  } catch (error) {
    console.error("Error generating weekly schedule:", error);
    throw new Error(
      "Failed to generate weekly schedule. Please check your inputs."
    );
  }
}

function formatStudyLogs(logs: StudyLogEntry[]): string {
  if (logs.length === 0) return "No study sessions logged yet.";
  return logs
    .map(
      (log) =>
        `- Task: ${log.task}\n  - Duration: ${log.duration} minutes\n  - Energy Level During Session: ${log.energyLevel}\n  - Outcome: ${log.outcome}`
    )
    .join("\n\n");
}

export async function getStudyFeedback(
  logs: StudyLogEntry[]
): Promise<string> {
  const prompt = `
You are an expert academic coach providing feedback to a college student based on their self-reported study logs. Your tone should be encouraging, insightful, and actionable.

**Student's Study Log History:**
${formatStudyLogs(logs)}

**Instructions:**
1. Analyze the data for patterns in study habits.
2. Provide a positive and encouraging observation first.
3. Offer 2–3 concise, actionable tips based on patterns (energy vs task type, duration, outcomes, etc.).
4. Keep the response short and friendly.
`;

  try {
    const response = await fetch("http://localhost:5000/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: "gemini-2.5-flash",
      }),
    });

    if (!response.ok) throw new Error("Gemini request failed");

    const data = await response.json();
    return data.output;
  } catch (error) {
    console.error("Error generating study feedback:", error);
    throw new Error("Failed to generate study feedback.");
  }
}
