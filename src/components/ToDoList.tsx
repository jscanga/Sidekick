// src/components/ToDoList.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HTMLAttributes } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { RepeatFrequency, Todo, Category } from '@/contexts/todocontext';
import EditTodoModal from "./EditTodoModal";
import { SyntheticListenerMap } from "@dnd-kit/core";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { 
  format, 
  differenceInCalendarDays, 
  startOfDay, 
  startOfWeek,
  startOfMonth, 
  isSameDay, 
  isSameWeek, 
  isSameMonth 
} from "date-fns";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useTodos } from "@/contexts/todocontext";

const categoryEmoji: Record<Category, string> = {
  academics: "📚",
  health: "🏃",
  financial: "💵",
  social: "👋",
  other: "📝",
};

const repeatEmoji: Record<RepeatFrequency, string> = {
  none: '',
  weekly: ' 🔄',
  monthly: ' 🔄',
  yearly: ' 🔄',
};

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'all';

function formatDueLabel(date: Date) {
  const today = startOfDay(new Date());
  const diffDays = differenceInCalendarDays(date, today);

  if (diffDays === 0) return { label: "Due Today", color: "text-red-500" };
  if (diffDays === 1) return { label: "Due Tomorrow", color: "text-yellow-400" };
  if (diffDays > 1) return { label: `Due ${format(date, "MMMM do")}`, color: "text-green-400" };
  return { label: `Due ${format(date, "MMMM do")}`, color: "text-red-500" };
}
interface DragHandleProps {
  listeners?: SyntheticListenerMap; // keep as is
  attributes?: HTMLAttributes<HTMLButtonElement>; // replace Record<string, any>
}
// Drag Handle Component
export function DragHandle({ listeners, attributes }: DragHandleProps) {
  return (
    <button
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing mr-2 p-1 rounded hover:bg-gray-600/30 transition-colors"
      aria-label="Drag to reorder"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="currentColor"
        className="text-gray-400"
      >
        <circle cx="2" cy="2" r="1" />
        <circle cx="2" cy="6" r="1" />
        <circle cx="2" cy="10" r="1" />
        <circle cx="6" cy="2" r="1" />
        <circle cx="6" cy="6" r="1" />
        <circle cx="6" cy="10" r="1" />
        <circle cx="10" cy="2" r="1" />
        <circle cx="10" cy="6" r="1" />
        <circle cx="10" cy="10" r="1" />
      </svg>
    </button>
  );
}

interface SortableItemProps {
  todo: Todo;
  toggle: (id: string) => void;
  onComplete: (id: string) => void;
}

export function SortableItem({ todo, toggle, onComplete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const baseStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : "none",
    zIndex: isDragging ? 50 : undefined,
  };

  const daysLeft = todo.dueDate ? differenceInCalendarDays(todo.dueDate, startOfDay(new Date())) : null;

  let bgClass = "bg-gray-800 hover:bg-gray-700";
  let pulseClass = "";
  let dueTextClass = "text-white";

  if (daysLeft !== null) {
    if (daysLeft < 0) {
      bgClass = "bg-red-700/20 hover:bg-red-700/30";
      pulseClass = "animate-pulse-red";
      dueTextClass = "text-red-400";
    } else if (daysLeft === 0) {
      bgClass = "bg-yellow-800/20 hover:bg-yellow-800/30";
      pulseClass = "animate-pulse-yellow";
      dueTextClass = "text-yellow-400";
    } else if (daysLeft === 1) {
      bgClass = "bg-green-400/20 hover:bg-green-400/30";
      pulseClass = "animate-pulse-lightgreen";
      dueTextClass = "text-green-300";
    } else if (daysLeft > 1) {
      bgClass = "bg-green-700/20 hover:bg-green-700/30";
      dueTextClass = "text-green-500";
    }
  }

  const textClass = todo.completed ? "line-through text-gray-400" : "text-white";

  const handleComplete = () => {
    if (!todo.completed && !isCompleting) {
      setIsCompleting(true);
      
      // Mark as completed - this will handle the repeat logic in the context
      toggle(todo.id);
      
      // Notify parent after animation completes
      setTimeout(() => {
        onComplete(todo.id);
        setIsCompleting(false);
      }, 1000);
    }
  };

  return (
    <>
      <motion.li
        ref={setNodeRef}
        style={baseStyle}
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ 
          opacity: isCompleting ? 0 : 1, 
          y: 0,
          scale: isCompleting ? 0.95 : 1
        }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ 
          duration: 0.3,
          ease: "easeInOut"
        }}
        className={`flex items-center px-4 py-3 rounded transition-colors ${bgClass} ${pulseClass} ${
          isDragging ? "opacity-50 shadow-lg" : ""
        } ${isCompleting ? "bg-green-500/20" : ""}`}
      >
        {/* Left side: Drag handle + Checkbox + Category */}
        <div className="flex items-center shrink-0">
          <DragHandle listeners={listeners} attributes={attributes} />
          
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleComplete}
            aria-label="Mark complete"
            aria-pressed={todo.completed}
            className={`h-6 w-6 flex items-center justify-center rounded border-2 mr-3 shrink-0 transition-all duration-300 ${
              todo.completed || isCompleting 
                ? "bg-green-500 border-green-500 text-white scale-110" 
                : "border-gray-500 text-transparent hover:border-green-400"
            }`}
          >
            {todo.completed || isCompleting ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                ✓
              </motion.span>
            ) : ""}
          </button>

          <span className="text-xl mr-3">{categoryEmoji[todo.category]}</span>
        </div>

        {/* Middle: Task name + description */}
        <div className="flex-1 flex items-center min-w-0">
          {/* Task Name */}
          <span className={`${textClass} truncate`}>{todo.text}</span>
          
          {/* Description - directly to the right of task name */}
          {todo.description && (
            <span className="text-gray-400 italic text-sm ml-5 truncate">
              {todo.description}
            </span>
          )}
        </div>

        {/* Right side: Edit button + Repeat indicator + Due date */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {/* Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="text-gray-400 hover:text-gray-200 transition-colors shrink-0"
            aria-label="Edit task"
          >
            ✏️
          </button>

          {/* Repeat Indicator */}
          {todo.repeat !== 'none' && (
            <span className="text-lg shrink-0" title={`Repeats ${todo.repeat}`}>🔄</span>
          )}

          {todo.dueDate && (
            <div className="flex flex-col items-end text-right ml-4 shrink-0">
              {/* First line: Only the due text (no time) */}
              <span className={`text-sm ${dueTextClass} whitespace-nowrap`}>
                {daysLeft !== null && daysLeft < 0
                  ? `Overdue ${format(todo.dueDate, "MMM d")}`
                  : daysLeft === 0
                  ? "Due Today"
                  : daysLeft === 1
                  ? "Due Tomorrow"
                  : `Due ${format(todo.dueDate, "MMM d")}`}
              </span>
              
              {/* Second line: Time + "Today" or days count */}
              {daysLeft !== null && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {daysLeft === 0
                    ? todo.dueTime ? `${formatTime(todo.dueTime)} Today` : "Today"
                    : daysLeft > 0
                    ? `${daysLeft} days`
                    : `${Math.abs(daysLeft)} days ago`}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.li>

      {/* Edit Modal */}
      <EditTodoModal
        todo={todo}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
      />
    </>
  );
}

export const formatTime = (timeString: string): string => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function ToDoList() {
  const { todos, toggleTodo, deleteTodo, addTodo: contextAddTodo, reorderTodos, setTodos } = useTodos();
  const [newTodo, setNewTodo] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [category, setCategory] = useState<Category>("other");
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [repeat, setRepeat] = useState<RepeatFrequency>('none');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const addTodo = () => {
    if (newTodo.trim() === "" || (dueDate && dueDate < startOfDay(new Date()))) return;

    const newTask = {
      text: newTodo.trim(),
      completed: false,
      dueDate,
      category,
      repeat,
      pulseDelay: Math.random() * 1.5,
      pulseDuration: 1.8 + Math.random() * 0.7,
    };

    contextAddTodo(newTask);
    
    setTodos(prev => {
      const updated = [...prev].sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return 0;
      });
      return updated;
    });

    setNewTodo("");
    setDueDate(null);
    setRepeat('none');
  };

  const handleComplete = (id: string) => {
    setCompletingIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    
    // Remove from completing set after animation
    setTimeout(() => {
      setCompletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 1000);
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addTodo();
    if (e.key === "Escape") {
      setNewTodo("");
      setDueDate(null);
    }
  };

  const filterTodosByViewMode = (todos: Todo[]) => {
    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    switch (viewMode) {
      case 'daily':
        return todos.filter(todo => 
          todo.dueDate && isSameDay(todo.dueDate, today)
        );
      case 'weekly':
        return todos.filter(todo => 
          todo.dueDate && isSameWeek(todo.dueDate, weekStart)
        );
      case 'monthly':
        return todos.filter(todo => 
          todo.dueDate && isSameMonth(todo.dueDate, monthStart)
        );
      case 'all':
      default:
        return todos;
    }
  };

  // Get active todos (filter out completed and currently completing items)
  const activeTodos = filterTodosByViewMode(
    todos.filter((todo) => !todo.completed && !completingIds.has(todo.id))
  ).sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate.getTime() - b.dueDate.getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return 0;
  });

  const completedTodos = todos.filter((todo) => todo.completed);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    reorderTodos(active.id as string, over.id as string);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full p-6 bg-neutral-900 text-white rounded-lg shadow-lg">
      {/* Header section */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">To-Do List</h1>
        
        {/* View Mode Selector Dropdown */}
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="px-4 py-2 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-colors"
        >
          <option value="all">All Tasks</option>
          <option value="daily">📅 Daily</option>
          <option value="weekly">📅 Weekly</option>
          <option value="monthly">📅 Monthly</option>
        </select>
      </div>

      {/* DndContext for active todos */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={activeTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[150px]">
            <AnimatePresence mode="popLayout">
              {activeTodos.length === 0 ? (
                <motion.li
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-gray-400 italic text-center mt-8"
                >
                  🎉 You&apos;re all caught up!
                </motion.li>
              ) : (
                activeTodos.map((todo) => (
                  <SortableItem 
                    key={todo.id} 
                    todo={todo} 
                    toggle={toggleTodo}
                    onComplete={handleComplete}
                  />
                ))
              )}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>

      {/* COMPLETED TASKS SECTION */}
      {completedTodos.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowCompleted((prev) => !prev)}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-500 rounded-lg text-white transition-colors"
          >
            {showCompleted ? "Hide" : "Show"} Completed Tasks ({completedTodos.length})
          </button>

          {showCompleted && (
            <ul className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {completedTodos.map((todo) => (
                  <motion.li
                    key={todo.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-between items-center px-4 py-2 rounded bg-neutral-800 text-gray-400 line-through hover:bg-gray-600 transition-colors"
                  >
                    <span 
                      onClick={() => {
                        toggleTodo(todo.id);
                        setShowCompleted(prev => {
                          setTimeout(() => setShowCompleted(prev), 10);
                          return !prev;
                        });
                      }} 
                      className="cursor-pointer flex-1"
                    >
                      {todo.text}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label="Edit task"
                      >
                        ✏️
                      </button>
                      
                      {todo.dueDate && (
                        <div className="flex flex-col items-end text-right">
                          <span className="text-sm text-gray-500">{formatDueLabel(todo.dueDate).label}</span>
                          <span className="text-xs text-gray-500">
                            {differenceInCalendarDays(todo.dueDate, startOfDay(new Date())) === 0
                              ? "Today"
                              : `${Math.abs(differenceInCalendarDays(todo.dueDate, startOfDay(new Date())))} days`}
                          </span>
                        </div>
                      )}
                      <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-400">
                        🗑️
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}

      {/* ADD TASK SECTION */}
      <div className="flex gap-2 mt-4 items-center flex-wrap">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={handleEnter}
          placeholder="Add a new task"
          className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 min-w-[200px]"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="px-4 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        >
          <option value="academics">📚 Academics</option>
          <option value="health">🏃 Health</option>
          <option value="financial">💵 Financial</option>
          <option value="social">👋 Social</option>
          <option value="other">📝 Other</option>
        </select>

        <DatePicker
          selected={dueDate}
          onChange={(date) => setDueDate(date)}
          minDate={new Date()}
          isClearable
          placeholderText="Set due date"
          className="px-3 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          calendarClassName="bg-gray-900 text-white rounded-lg"
        />

        {/* Repeat Selector */}
        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as RepeatFrequency)}
          className="px-3 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        >
          <option value="none">No repeat</option>
          <option value="weekly">Weekly 🔄</option>
          <option value="monthly">Monthly 🔄</option>
          <option value="yearly">Yearly 🔄</option>
        </select>

        <button
          onClick={addTodo}
          className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-300 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
