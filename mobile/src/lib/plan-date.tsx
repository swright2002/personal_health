/**
 * The selected plan day, shared across the Plan and Recipes screens so that
 * "add to plan" lands on the day you're viewing. The week is the demo week
 * around the seeded day (Thu 2026-06-18); a rolling/real-date week comes later.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

export const PLAN_WEEK = [
  '2026-06-15', // Mon
  '2026-06-16', // Tue
  '2026-06-17', // Wed
  '2026-06-18', // Thu (seeded)
  '2026-06-19', // Fri
  '2026-06-20', // Sat
  '2026-06-21', // Sun
];
const DEFAULT_DATE = '2026-06-18';
const RUN_WEEKDAYS = new Set([2, 4, 6]); // Tue / Thu / Sat

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
export const isRunDay = (date: string) => RUN_WEEKDAYS.has(weekdayOf(date));
export const weekdayShort = (date: string) => WEEKDAYS[weekdayOf(date)];
export const dayNumber = (date: string) => Number(date.split('-')[2]);
export function formatDay(date: string): string {
  const [, m] = date.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(date)]}, ${MONTHS[m - 1]} ${dayNumber(date)}`;
}

const PlanDateContext = createContext<{ date: string; setDate: (d: string) => void } | undefined>(undefined);

export function PlanDateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState(DEFAULT_DATE);
  return <PlanDateContext.Provider value={{ date, setDate }}>{children}</PlanDateContext.Provider>;
}

export function usePlanDate() {
  const ctx = useContext(PlanDateContext);
  if (!ctx) throw new Error('usePlanDate must be used within a PlanDateProvider');
  return ctx;
}
