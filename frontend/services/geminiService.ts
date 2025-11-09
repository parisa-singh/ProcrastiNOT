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
  weekStartDate: string,
  weeklyTrend: {date:string, mood:Mood|null, energy:number|null}[]
): Promise<WeeklySchedule> {

const trendLines = (weeklyTrend ?? [])
  .map((d: {date:string; mood: Mood|null; energy: number|null}) =>
    `${d.date}: mood=${d.mood ?? "none"}, energy=${d.energy ?? "none"}`
  )
  .join("\n");

const compactTasks = tasks.slice(0,5).map(t => ({
  n: t.name,
  d: t.expectedDuration,
  i: t.importance
}))


const prompt = `
You are an expert academic coach and weekly planner for a college student. Create a personalized, realistic, and empathetic **7-day schedule** starting **Sunday** for the week that begins on: ${weekStartDate} (ISO). Use the constraints below exactly.

########################
# CURRENT USER CONTEXT #
########################
Today's Mood: ${mood}
Today's Energy Level: ${energyLevel}/100

Weekly Mood/Energy Trend (last 7 days; per-day):
${trendLines || "no historical entries"}

Weekly Study Goal (hours): ${weeklyGoal}

Top 5 priority tasks this week:
${compactTasks.map(t => `- ${t.n} (${t.d}m, ${t.i})`).join("\n")}

Number of blocked calendar events this week: ${calendarEvents.length}


########################
# SCHEDULING RULES
########################
• Use mood/energy trend to pace load: push harder tasks earlier in week if energy higher Tue/Wed, lighten Thu/Fri if trend dips.
• DEADLINE tasks must be worked on earlier in week (never leave them to last day).
• Respect existing calendar events — never overlap with them.
• Daily time range allowed: 07:00–24:00 only.
• Time must be 24-hour HH:MM + 15-minute increments only.
• Blocks should be realistic lengths:
   - study/deadline_work: 45–60 min typical (30–90 only if needed)
   - break: 10–20 min
   - lunch/meal: 45–75 min
• If a day is light, add 1 small restorative or review block.
• allowed "type": study | deadline_work | break | meal | personal | personal_time | class | event

########################
# OUTPUT FORMAT (STRICT)
########################
Return ONLY valid JSON, no text around it.
Keys: "sunday" through "saturday".
Each day object MUST be:
{
  "date": "YYYY-MM-DD",
  "schedule": [
    { "start_time": "HH:MM", "end_time": "HH:MM", "task": "<string>", "type": "<type>" }
  ]
}
Times must never overlap within a day.
Do not include any commentary or markdown.
The JSON must parse cleanly.

Now generate the final JSON for the week starting ${weekStartDate}.
`;


  try {
    const response = await fetch("http://localhost:5000/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        model: "models/gemini-2.5-flash",
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
        model: "models/gemini-2.5-flash",
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
