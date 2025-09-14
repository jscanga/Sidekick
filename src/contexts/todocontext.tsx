// contexts/todocontext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { 
  startOfDay, startOfWeek, startOfMonth, startOfYear, 
  isSameDay, isSameWeek, isSameMonth, isSameYear,
  format, subDays, getDay, getWeek, getMonth, getYear 
} from 'date-fns';

export type Category = "academics" | "health" | "financial" | "social" | "other";
export type RepeatFrequency = 'none' | 'weekly' | 'monthly' | 'yearly';

export interface Todo {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  dueDate: Date | null;
  dueTime?: string;
  category: Category;
  repeat: RepeatFrequency;
  pulseDelay?: number;
  pulseDuration?: number;
  completedAt?: Date;
  createdAt: Date;
  originalDueDate?: Date;
}

export interface TodoStats {
  totalCompleted: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
  completedThisYear: number;
  completedByCategory: Record<Category, number>;
  completedByWeekday: Record<number, { total: number; average: number }>;
  
  bestDay: { date: Date; count: number };
  bestWeek: { weekStart: Date; count: number };
  bestMonth: { monthStart: Date; count: number };
  bestYear: { year: number; count: number };
  mostProductiveWeekday: { weekday: string; average: number };
  currentStreak: number;
  longestStreak: number;
}

interface TodoContextType {
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
  addTodo: (todo: Omit<Todo, 'id'>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  reorderTodos: (activeId: string, overId: string) => void;
  stats: TodoStats;
  getStats: () => TodoStats;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

const newId = () => crypto.randomUUID();

// Define interface for the stored todo data
interface StoredTodo {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  dueDate: string | null;
  dueTime?: string;
  category: Category;
  repeat: RepeatFrequency;
  pulseDelay?: number;
  pulseDuration?: number;
  completedAt?: string;
  createdAt: string;
  originalDueDate?: string;
}

const getStoredTodos = (): Todo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('todoList');
    if (!stored) return [];
    const parsed: StoredTodo[] = JSON.parse(stored);
    return parsed.map((todo: StoredTodo) => ({
      ...todo,
      dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
      completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
      createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
      description: todo.description || undefined,
      dueTime: todo.dueTime || undefined,
      originalDueDate: todo.originalDueDate ? new Date(todo.originalDueDate) : undefined,
    }));
  } catch {
    return [];
  }
};

const saveTodosToStorage = (todos: Todo[]) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('todoList', JSON.stringify(todos)); } catch {}
};

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // Define the initial stats with proper typing
  const initialStats: TodoStats = {
    totalCompleted: 0,
    completedToday: 0,
    completedThisWeek: 0,
    completedThisMonth: 0,
    completedThisYear: 0,
    currentStreak: 0,
    longestStreak: 0,
    bestDay: { date: new Date(), count: 0 },
    bestWeek: { weekStart: startOfWeek(new Date()), count: 0 },
    bestMonth: { monthStart: startOfMonth(new Date()), count: 0 },
    bestYear: { year: getYear(new Date()), count: 0 },
    mostProductiveWeekday: { weekday: 'Sunday', average: 0 },
    completedByWeekday: {},
    completedByCategory: {
      academics: 0,
      health: 0,
      financial: 0,
      social: 0,
      other: 0
    }
  };

  const [stats, setStats] = useState<TodoStats>(initialStats);

  useEffect(() => {
    const storedTodos = getStoredTodos();
    setTodos(storedTodos);
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      const newStats = calculateStats(todos);
      setStats(newStats);
      saveTodosToStorage(todos);
    }
  }, [todos, hasHydrated]);

  const addTodo = (todo: Omit<Todo, 'id' | 'createdAt' | 'originalDueDate'>) => {
    const newTodo: Todo = {
      ...todo,
      id: newId(),
      createdAt: new Date(),
      originalDueDate: todo.dueDate ?? undefined, // only use dueDate here
    };
    setTodos(prev => [...prev, newTodo]);
  };

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo => {
        if (todo.id === id) {
          const newCompletedState = !todo.completed;

          if (newCompletedState && todo.repeat !== 'none') {
            // Create a new recurring task
            const newDueDate = calculateNextDueDate(todo.dueDate, todo.repeat);
            const newTask: Todo = {
              ...todo,
              id: newId(),
              completed: false,
              dueDate: newDueDate,
              completedAt: undefined,
              createdAt: new Date(),
              originalDueDate: todo.originalDueDate ?? todo.dueDate ?? undefined,
            };

            // Return both the completed task and the new recurring task
            return [
              { ...todo, completed: newCompletedState, completedAt: newCompletedState ? new Date() : undefined },
              newTask
            ];
          }

          return {
            ...todo,
            completed: newCompletedState,
            completedAt: newCompletedState ? new Date() : undefined
          };
        }
        return todo;
      }).flat()
    );
  };

  const calculateNextDueDate = (dueDate: Date | null, repeat: RepeatFrequency): Date | null => {
    if (!dueDate) return null;
    
    const nextDate = new Date(dueDate);
    
    switch (repeat) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'none':
      default:
        return dueDate;
    }
    
    return nextDate;
  };

  const deleteTodo = (id: string) => setTodos(prev => prev.filter(todo => todo.id !== id));
  const updateTodo = (id: string, updates: Partial<Todo>) => setTodos(prev => prev.map(todo => todo.id === id ? { ...todo, ...updates } : todo));

  const reorderTodos = (activeId: string, overId: string) => setTodos(prev => {
    const activeIndex = prev.findIndex(todo => todo.id === activeId);
    const overIndex = prev.findIndex(todo => todo.id === overId);
    if (activeIndex === -1 || overIndex === -1) return prev;
    return arrayMove(prev, activeIndex, overIndex);
  });

  const getStats = () => calculateStats(todos);

  return (
    <TodoContext.Provider value={{ todos, setTodos, addTodo, toggleTodo, deleteTodo, updateTodo, reorderTodos, stats, getStats }}>
      {children}
    </TodoContext.Provider>
  );
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) throw new Error('useTodos must be used within a TodoProvider');
  return context;
}

// ------------------ CALCULATE STATS ------------------

const calculateStats = (todos: Todo[]): TodoStats => {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // week starts Monday
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const completedTodos = todos.filter(t => t.completed && t.completedAt);

  // --- Daily, Weekly, Monthly, Yearly counts ---
  const dailyCounts: Record<string, number> = {};
  const weeklyCounts: Record<string, number> = {};
  const monthlyCounts: Record<string, number> = {};
  const yearlyCounts: Record<number, number> = {};

  // --- Weekday totals ---
  const weekdayTotals: Record<number, { total: number; days: Set<string> }> = {};
  for (let i = 0; i < 7; i++) weekdayTotals[i] = { total: 0, days: new Set() };

  completedTodos.forEach(todo => {
    if (!todo.completedAt) return;
    const date = startOfDay(todo.completedAt);
    const dayKey = format(date, 'yyyy-MM-dd');
    const weekKey = `${getYear(date)}-W${getWeek(date, { weekStartsOn: 1 })}`;
    const monthKey = `${getYear(date)}-${getMonth(date) + 1}`;
    const yearKey = getYear(date);
    const weekday = getDay(date);

    dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
    weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
    monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    yearlyCounts[yearKey] = (yearlyCounts[yearKey] || 0) + 1;

    weekdayTotals[weekday].total += 1;
    weekdayTotals[weekday].days.add(dayKey);
  });

  // --- Completed by weekday ---
  const completedByWeekday: Record<number, { total: number; average: number }> = {};
  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let mostProductiveWeekday = { weekday: 'Sunday', average: 0 };

  for (let i = 0; i < 7; i++) {
    const data = weekdayTotals[i];
    const avg = data.days.size ? data.total / data.days.size : 0;
    completedByWeekday[i] = { total: data.total, average: Math.round(avg * 10)/10 };
    if (avg > mostProductiveWeekday.average) mostProductiveWeekday = { weekday: weekdayNames[i], average: Math.round(avg*10)/10 };
  }

  // --- Best day/week/month/year ---
  const bestDay = Object.entries(dailyCounts).reduce((best, [dateStr, count]) => count > best.count ? { date: new Date(dateStr), count } : best, { date: today, count: 0 });
  const bestWeek = Object.entries(weeklyCounts).reduce((best, [key, count]) => {
    if (count <= best.count) return best;
    const [year, week] = key.split('-W');
    const weekStartDate = startOfWeek(new Date(parseInt(year), 0, 1 + (parseInt(week)-1)*7), { weekStartsOn: 1 });
    return { weekStart: weekStartDate, count };
  }, { weekStart, count: 0 });
  const bestMonth = Object.entries(monthlyCounts).reduce((best, [key, count]) => {
    if (count <= best.count) return best;
    const [year, month] = key.split('-');
    return { monthStart: new Date(parseInt(year), parseInt(month)-1, 1), count };
  }, { monthStart, count: 0 });
  const bestYear = Object.entries(yearlyCounts).reduce((best, [yearStr, count]) => {
    const year = parseInt(yearStr);
    return count > best.count ? { year, count } : best;
  }, { year: getYear(now), count: 0 });

  // --- Streaks ---
  const sortedDates = Object.keys(dailyCounts).map(d => new Date(d)).sort((a,b)=>b.getTime()-a.getTime());
  let currentStreak = 0, longestStreak = 0, tempStreak = 0, prev: Date | null = null;

  for (const d of sortedDates) {
    if (prev) {
      const diff = Math.round((prev.getTime()-d.getTime())/(1000*60*60*24));
      if (diff === 1) tempStreak++;
      else tempStreak = 1;
    } else tempStreak = 1;
    prev = d;
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  // Check if streak includes today or yesterday
  const yesterday = subDays(today, 1);
  const hasToday = dailyCounts[format(today,'yyyy-MM-dd')] > 0;
  const hasYesterday = dailyCounts[format(yesterday,'yyyy-MM-dd')] > 0;
  if (!hasToday && !hasYesterday) currentStreak = 0;
  else currentStreak = tempStreak;

  // --- Stats object ---
  return {
    totalCompleted: completedTodos.length,
    completedToday: completedTodos.filter(t => t.completedAt && isSameDay(t.completedAt, today)).length,
    completedThisWeek: completedTodos.filter(t => t.completedAt && isSameWeek(t.completedAt, weekStart, { weekStartsOn: 1 })).length,
    completedThisMonth: completedTodos.filter(t => t.completedAt && isSameMonth(t.completedAt, monthStart)).length,
    completedThisYear: completedTodos.filter(t => t.completedAt && isSameYear(t.completedAt, yearStart)).length,
    completedByCategory: {
      academics: completedTodos.filter(t => t.category === 'academics').length,
      health: completedTodos.filter(t => t.category === 'health').length,
      financial: completedTodos.filter(t => t.category === 'financial').length,
      social: completedTodos.filter(t => t.category === 'social').length,
      other: completedTodos.filter(t => t.category === 'other').length,
    },
    completedByWeekday,
    bestDay,
    bestWeek,
    bestMonth,
    bestYear,
    mostProductiveWeekday,
    currentStreak,
    longestStreak
  };
};
