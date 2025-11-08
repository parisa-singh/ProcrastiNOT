import { GoogleGenAI, Type } from "@google/genai";
import type { ToDoTask, WeeklySchedule, Mood, StudyLogEntry, CalendarEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const scheduleItemSchema = {
    type: Type.OBJECT,
    properties: {
      time: {
        type: Type.STRING,
        description: "Time slot for the task, e.g., '09:00 - 09:45'",
      },
      task: {
        type: Type.STRING,
        description: "The name of the task or break.",
      },
      type: {
        type: Type.STRING,
        description: "The type of activity: 'study' for a regular task, 'deadline_work' for a study session specifically for a task with a deadline, 'break' for rest, or 'other' for an existing calendar event.",
      },
    },
    required: ["time", "task", "type"],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    sunday: { type: Type.ARRAY, items: scheduleItemSchema },
    monday: { type: Type.ARRAY, items: scheduleItemSchema },
    tuesday: { type: Type.ARRAY, items: scheduleItemSchema },
    wednesday: { type: Type.ARRAY, items: scheduleItemSchema },
    thursday: { type: Type.ARRAY, items: scheduleItemSchema },
    friday: { type: Type.ARRAY, items: scheduleItemSchema },
    saturday: { type: Type.ARRAY, items: scheduleItemSchema },
  },
  required: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
};

function formatTasks(tasks: ToDoTask[]): string {
  if (tasks.length === 0) return "No tasks to schedule.";
  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);
  
  const formatTaskLine = (t: ToDoTask) => {
    let taskString = `- ${t.name} (Est: ${t.expectedDuration}m, Importance: ${t.importance})`;
    if (t.type === 'deadline' && t.dueDate) {
      taskString += ` [DEADLINE: ${new Date(t.dueDate).toLocaleString()}]`;
    }
    return taskString;
  };
  
  let formatted = "Pending Tasks:\n" + (pending.length > 0 ? pending.map(formatTaskLine).join("\n") : "None");
  formatted += "\n\nCompleted Tasks:\n" + (completed.length > 0 ? completed.map(t => `- ${t.name}`).join("\n") : "None");
  
  return formatted;
}

function formatCalendarEvents(events: CalendarEvent[]): string {
    if (events.length === 0) return "No upcoming calendar events to consider.";
    return "The user has the following events already in their calendar. You MUST schedule around them:\n" + events.map(event => 
        `- ${event.title} (from ${new Date(event.startTime).toLocaleString()} to ${new Date(event.endTime).toLocaleString()})`
    ).join("\n");
}


export async function generateWeeklySchedule(
  tasks: ToDoTask[],
  weeklyGoal: number,
  mood: Mood,
  energyLevel: number, // 0-100
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
    1.  **Analyze and Empathize:** Acknowledge the user's current mood and energy. If energy is low, start today's schedule gently. If they're stressed, build in more breaks. If excited, leverage that momentum on important tasks.
    2.  **Prioritize & Schedule Around Commitments:** Plan the entire week starting from Sunday. Crucially, you must block out time for the user's existing commitments from their calendar and schedule all study sessions and breaks around them. Pay close attention to items marked as DEADLINE and schedule them to be completed well before they are due. When you schedule a study block for a DEADLINE task, you MUST use the type 'deadline_work' for that schedule item. Then, schedule the highest importance tasks. Distribute tasks logically across the 7 days.
    3.  **Balance:** Distribute the weekly study goal across the week. Avoid overloading any single day. Factor in that weekends might be for lighter work or catching up.
    4.  **Structure:** Create a daily plan with focused study blocks (45-60 mins) and regular short breaks (10-15 mins). Include a longer lunch break.
    5.  **Be Realistic:** The schedule must be achievable. Don't schedule back-to-back heavy cognitive tasks. Alternate between different subjects or types of work. Do not schedule tasks that overlap with existing calendar commitments.
    6.  **Output:** Return a complete 7-day schedule as a JSON object that strictly adheres to the provided schema, with keys for "sunday" through "saturday". Ensure every day has a schedule, even if it's just "Rest Day" or light work.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.6,
      },
    });
    
    const jsonString = response.text;
    const parsedResponse = JSON.parse(jsonString);

    if (parsedResponse && typeof parsedResponse.monday !== 'undefined') {
        return parsedResponse as WeeklySchedule;
    } else {
        throw new Error("Invalid weekly schedule format in response.");
    }

  } catch (error) {
    console.error("Error generating weekly schedule:", error);
    throw new Error("Failed to generate weekly schedule. Please check your inputs and API key.");
  }
}

function formatStudyLogs(logs: StudyLogEntry[]): string {
    if (logs.length === 0) return "No study sessions logged yet.";
    return logs.map(log => 
        `- Task: ${log.task}\n  - Duration: ${log.duration} minutes\n  - Energy Level During Session: ${log.energyLevel}\n  - Outcome: ${log.outcome}`
    ).join("\n\n");
}

export async function getStudyFeedback(logs: StudyLogEntry[]): Promise<string> {
    const prompt = `
        You are an expert academic coach providing feedback to a college student based on their self-reported study logs. Your tone should be encouraging, insightful, and actionable.

        **Student's Study Log History:**
        ${formatStudyLogs(logs)}

        **Instructions:**
        1.  **Analyze the Data:** Look for patterns in the student's study habits. Consider things like:
            - Which tasks are completed when energy is high/low?
            - Is there a correlation between duration and outcome?
            - What does the outcome text reveal about their focus or challenges?
        2.  **Provide Insightful Feedback:** Start with a positive and encouraging observation.
        3.  **Offer 2-3 Actionable Tips:** Based on your analysis, provide very specific and concise tips. For example, "I notice you tackle your Physics problems when your energy is high, which is great! Maybe try scheduling a creative task like brainstorming for your essay during a lower-energy period." or "Your focus seems to dip in sessions longer than 60 minutes. Consider trying the Pomodoro Technique with 45-minute focus blocks."
        4.  **Keep it Concise:** The entire response should be a short paragraph or a few bullet points. Do not be overly verbose.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating study feedback:", error);
        throw new Error("Failed to generate study feedback. The AI service may be temporarily unavailable.");
    }
}