import { v4 as uuidv4 } from 'uuid';

export type EnergyLevel = 'Low' | 'Medium' | 'High';
export type Importance = 'Low' | 'Medium' | 'High';
export type Mood = 'Excited' | 'Happy' | 'Neutral' | 'Sad' | 'Stressed';

export interface StudyLogEntry {
  id: string;
  task: string;
  duration: number; // in minutes
  energyLevel: EnergyLevel;
  outcome: string;
}

export interface ToDoTask {
  id: string;
  name: string;
  expectedDuration: number; // in minutes
  importance: Importance;
  completed: boolean;
  type: 'task' | 'deadline';
  dueDate?: string;
}

export interface ScheduleItem {
  time: string; // e.g., "09:00 - 10:00"
  task: string;
  type: 'study' | 'break' | 'other';
  details?: string;
}

export interface WeeklySchedule {
    monday: ScheduleItem[];
    tuesday: ScheduleItem[];
    wednesday: ScheduleItem[];
    thursday: ScheduleItem[];
    friday: ScheduleItem[];
    saturday: ScheduleItem[];
    sunday: ScheduleItem[];
}

export interface DailyLog {
  date: string; // "YYYY-MM-DD"
  mood: Mood;
  energy: number; // 0-100
}

export interface CalendarEvent {
  title: string;
  startTime: string; // ISO 8601 format string
  endTime: string; // ISO 8601 format string
}
