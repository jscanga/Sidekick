/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { RepeatFrequency, Todo, Category } from '@/contexts/todocontext';
import EditTodoModal from "./EditTodoModal";
import { RefreshCw, Key, Download, X } from 'lucide-react';
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

type ViewMode = 'daily' | 'weekly' | 'monthly' | 'all';

function formatDueLabel(date: Date) {
  const today = startOfDay(new Date());
  const diffDays = differenceInCalendarDays(date, today);

  if (diffDays === 0) return { label: "Due Today", color: "text-red-500" };
  if (diffDays === 1) return { label: "Due Tomorrow", color: "text-yellow-400" };
  if (diffDays > 1) return { label: `Due ${format(date, "MMMM do")}`, color: "text-green-400" };
  return { label: `Due ${format(date, "MMMM do")}`, color: "text-red-500" };
}

type DragHandleProps = {
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
};

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
      toggle(todo.id);
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
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`flex items-center px-4 py-3 rounded transition-colors ${bgClass} ${pulseClass} ${
          isDragging ? "opacity-50 shadow-lg" : ""
        } ${isCompleting ? "bg-green-500/20" : ""}`}
      >
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

        <div className="flex-1 flex items-center min-w-0">
          <span className={`${textClass} truncate`}>{todo.text}</span>
          {todo.description && (
            <span className="text-gray-400 italic text-sm ml-5 truncate">
              {todo.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
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

          {todo.repeat !== 'none' && (
            <span className="text-lg shrink-0" title={`Repeats ${todo.repeat}`}>🔄</span>
          )}

          {todo.dueDate && (
            <div className="flex flex-col items-end text-right ml-4 shrink-0">
              <span className={`text-sm ${dueTextClass} whitespace-nowrap`}>
                {daysLeft !== null && daysLeft < 0
                  ? `Overdue ${format(todo.dueDate, "MMM d")}`
                  : daysLeft === 0
                  ? "Due Today"
                  : daysLeft === 1
                  ? "Due Tomorrow"
                  : `Due ${format(todo.dueDate, "MMM d")}`}
              </span>
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
  const [showCanvasImport, setShowCanvasImport] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasApiKey, setCanvasApiKey] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const parseICSToDate = (icsDate: string): Date | null => {
    if (!icsDate) return null;
    try {
      const dateStr = icsDate.includes('T') ? icsDate.split('T')[0] : icsDate.substring(0, 8);
      const timeStr = icsDate.includes('T') ? icsDate.split('T')[1].replace('Z', '') : '';
      if (dateStr.length >= 8) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        let hours = 0, minutes = 0;
        if (timeStr.length >= 4) {
          hours = parseInt(timeStr.substring(0, 2));
          minutes = parseInt(timeStr.substring(2, 4));
        }
        return new Date(year, month, day, hours, minutes);
      }
    } catch (error) {
      console.error('Error parsing ICS date:', error);
    }
    return null;
  };

const parseICSData = (icsData: string) => {
  try {
    const events = [];
    const lines = icsData.split(/\r?\n/);
    let currentEvent: any = null;
    let inEvent = false;
    let currentProperty = '';
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Handle multi-line values (lines starting with space)
      if (line.startsWith(' ') && currentProperty && currentEvent) {
        // Remove the leading space and continue the previous property
        currentEvent[currentProperty] += line.substring(1);
        continue;
      }
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
        inEvent = true;
        currentProperty = '';
      } 
      else if (line === 'END:VEVENT') {
        if (currentEvent) {
          const processedEvent = processCanvasEvent(currentEvent);
          if (processedEvent) {
            console.log('Processed event:', processedEvent);
            events.push(processedEvent);
          }
        }
        currentEvent = null;
        inEvent = false;
        currentProperty = '';
      }
      else if (inEvent && currentEvent) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const propertyName = line.substring(0, colonIndex);
          let propertyValue = line.substring(colonIndex + 1);
          
          // Handle properties with parameters (like DTSTART;VALUE=DATE)
          const basePropertyName = propertyName.split(';')[0];
          
          switch (basePropertyName) {
            case 'SUMMARY':
              currentEvent.name = propertyValue;
              currentProperty = 'name';
              break;
            case 'DTSTART':
              currentEvent.start = propertyValue;
              currentProperty = 'start';
              break;
            case 'DTEND':
              currentEvent.end = propertyValue;
              currentProperty = 'end';
              break;
            case 'DESCRIPTION':
              currentEvent.description = propertyValue;
              currentProperty = 'description';
              break;
            case 'UID':
              currentEvent.uid = propertyValue;
              currentProperty = 'uid';
              break;
            default:
              currentProperty = '';
          }
        }
      }
    }
    
    console.log('Total events found:', events.length);
    return events;
  } catch (error) {
    console.error('Error parsing ICS file:', error);
    return [];
  }
};
const debugCanvasResponse = async () => {
  if (!canvasUrl || !canvasApiKey) {
    alert('Please enter both Canvas URL and API key first.');
    return;
  }

  try {
    const response = await fetch('/api/canvas-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasUrl, canvasApiKey }),
    });

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Canvas API JSON response:', data);
      alert(`API returned: ${data.error || 'No assignments found'}`);
    } else {
      const text = await response.text();
      console.log('Canvas API ICS response (first 500 chars):', text.substring(0, 500));
      alert('Check console for ICS data details');
    }
  } catch (error) {
    console.error('Debug error:', error);
    alert('Debug failed. Check console for details.');
  }
};
const debugCanvasAPI = async () => {
  if (!canvasUrl || !canvasApiKey) {
    alert('Please enter both Canvas URL and API key first.');
    return;
  }

  try {
    const apiUrl = `${canvasUrl.replace(/\/$/, '')}/api/v1/users/self/todo`;
    console.log('Testing Canvas API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${canvasApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Canvas API response:', data);
      alert(`API connected successfully! Found ${data.length} items.`);
    } else {
      const errorText = await response.text();
      console.error('Canvas API error:', response.status, errorText);
      alert(`API error: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Debug error:', error);
    alert('Debug failed. Check console for details.');
  }
};
const processCanvasEvent = (eventData: any): Todo | null => {
  // Check if we have the basic required fields
  if (!eventData.start || !eventData.name) {
    console.log('Skipping event - missing start or name:', eventData);
    return null;
  }
  
  // Try to parse the date - be more flexible with date formats
  const dueDate = parseICSToDate(eventData.start);
  if (!dueDate) {
    console.log('Skipping event - invalid date format:', eventData.start);
    return null;
  }

  // Include assignments from the past month and all future assignments
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  if (dueDate < oneMonthAgo) {
    console.log('Skipping event - too far in the past:', dueDate);
    return null;
  }

  // Clean up the assignment name - remove HTML tags if present
  let assignmentName = eventData.name;
  assignmentName = assignmentName.replace(/<[^>]*>/g, ''); // Remove HTML tags
  assignmentName = assignmentName.replace(/^\s+|\s+$/g, ''); // Trim whitespace
  
  // Clean up description - remove HTML and truncate if too long
  let description = eventData.description || '';
  description = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
  description = description.substring(0, 200); // Truncate to 200 chars
  
  const todo: Todo = {
    id: eventData.uid || `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: assignmentName,
    description: description,
    dueDate: dueDate,
    dueTime: null,
    category: 'academics' as Category,
    completed: false,
    repeat: 'none' as RepeatFrequency,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('Created todo:', todo);
  return todo;
};

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.ics')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const icsData = e.target?.result as string;
        const canvasEvents = parseICSData(icsData);
        let importedCount = 0;
        canvasEvents.forEach(event => {
          const isDuplicate = todos.some(todo => 
            todo.text === event.text && 
            todo.dueDate && event.dueDate &&
            todo.dueDate.getTime() === event.dueDate.getTime()
          );
          if (!isDuplicate) {
            contextAddTodo(event);
            importedCount++;
          }
        });
        alert(`Imported ${importedCount} assignments from ${file.name}!`);
        setShowFileUpload(false);
      } catch (error) {
        console.error('Error parsing ICS file:', error);
        alert('Failed to parse the ICS file.');
      }
    };
    reader.readAsText(file);
  };

  const handleCanvasImport = async () => {
    if (!canvasUrl) return;
    setIsImporting(true);
    try {
      if (canvasUrl.includes('canvas')) {
        alert('Canvas ICS feeds require authentication. Please download the .ics file and upload it instead.');
        setShowCanvasImport(false);
        return;
      }

      const response = await fetch(canvasUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const icsData = await response.text();
      const canvasEvents = parseICSData(icsData);
      let importedCount = 0;
      canvasEvents.forEach(event => {
        const isDuplicate = todos.some(todo => 
          todo.text === event.text && 
          todo.dueDate && event.dueDate &&
          todo.dueDate.getTime() === event.dueDate.getTime()
        );
        if (!isDuplicate) {
          contextAddTodo(event);
          importedCount++;
        }
      });
      alert(`Imported ${importedCount} assignments from Canvas!`);
      setShowCanvasImport(false);
      setCanvasUrl('');
    } catch (error) {
      console.error('Error importing from Canvas:', error);
      alert('Failed to import from Canvas. Try downloading the .ics file first.');
    }
    setIsImporting(false);
  };

const handleManualSync = async () => {
  if (!canvasUrl || !canvasApiKey) {
    setShowSyncSettings(true);
    return;
  }

  setIsSyncing(true);
  try {
    const response = await fetch('/api/canvas-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvasUrl, canvasApiKey }),
    });

    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      if (response.ok) {
        alert(errorData.error || 'No assignments found in your Canvas account.');
      } else {
        throw new Error(errorData.error || `Sync failed: ${response.status}`);
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const icsData = await response.text();
    console.log('ICS Data received:', icsData);
    
    const canvasEvents = parseICSData(icsData);
    console.log('Parsed events:', canvasEvents);
    
    if (canvasEvents.length === 0) {
      alert('No new assignments found in the sync data.');
      return;
    }
    
    let importedCount = 0;
    let updatedCount = 0;

    console.log('Current todos:', todos); // Debug current todos
    
    canvasEvents.forEach(event => {
      console.log('Processing event:', event);
      
      // More specific duplicate detection for Canvas imports
const existingTodoIndex = todos.findIndex(todo => {
  // PRIMARY: Check if it's a Canvas import with the exact same ID
  if (todo.id === event.id) {
    console.log('Duplicate found by exact ID match:', todo.id);
    return true;
  }
  
  // SECONDARY: Only consider text+date matches if they're VERY specific
  const isExactlySameText = todo.text.trim() === event.text.trim();
  const isExactlySameDate = todo.dueDate && event.dueDate && 
    todo.dueDate.getTime() === event.dueDate.getTime(); // Exact time match, not within 24 hours
  
  if (isExactlySameText && isExactlySameDate) {
    console.log('Duplicate found by exact text+date match:', todo.text);
    return true;
  }
  
  // TERTIARY: Check if this was previously a Canvas import that was manually deleted
  // Look for the Canvas ID pattern in the description or metadata
  const wasCanvasImport = todo.description?.includes('@canvas') || 
                          todo.id?.includes('canvas-');
  
  if (wasCanvasImport && isExactlySameText) {
    console.log('Possible previously deleted Canvas assignment:', todo.text);
    return true; // Treat as update rather than new addition
  }
  
  return false;
});

      if (existingTodoIndex !== -1) {
        console.log('Skipping duplicate todo:', event.text);
        // Update the existing todo with new data
        const updatedTodos = [...todos];
        updatedTodos[existingTodoIndex] = {
          ...updatedTodos[existingTodoIndex],
          dueDate: event.dueDate,
          description: event.description || updatedTodos[existingTodoIndex].description,
        };
        setTodos(updatedTodos);
        updatedCount++;
        console.log('Updated todo:', event.text);
      } else {
        contextAddTodo(event);
        importedCount++;
        console.log('Imported new todo:', event.text);
      }
    });

    setLastSync(new Date());
    if (importedCount > 0 || updatedCount > 0) {
      alert(`Sync successful! ${importedCount} new assignments, ${updatedCount} updated.`);
    } else {
      alert('All assignments from Canvas were already in your todo list.');
    }
  } catch (error: any) {
    console.error('Sync error:', error);
    alert(error.message || 'Sync failed. Please check your API key and URL.');
  }
  setIsSyncing(false);
};

  const testCanvasConnection = async () => {
    if (!canvasUrl || !canvasApiKey) {
      alert('Please enter both Canvas URL and API key first.');
      return;
    }
    try {
      const response = await fetch('/api/canvas-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasUrl, canvasApiKey }),
      });
      if (response.ok) {
        alert('✅ Connection successful! Your Canvas credentials are working.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`❌ Connection failed: ${errorData.error || response.status}`);
      }
    } catch (error) {
      alert('❌ Connection failed. Please check your network connection.');
    }
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('canvasUrl');
    const savedApiKey = localStorage.getItem('canvasApiKey');
    const savedLastSync = localStorage.getItem('lastSync');
    if (savedUrl) setCanvasUrl(savedUrl);
    if (savedApiKey) setCanvasApiKey(savedApiKey);
    if (savedLastSync) setLastSync(new Date(savedLastSync));
  }, []);

  useEffect(() => {
    if (canvasUrl) localStorage.setItem('canvasUrl', canvasUrl);
    if (canvasApiKey) localStorage.setItem('canvasApiKey', canvasApiKey);
    if (lastSync) localStorage.setItem('lastSync', lastSync.toISOString());
  }, [canvasUrl, canvasApiKey, lastSync]);

  const addTodo = () => {
    if (newTodo.trim() === "" || (dueDate && dueDate < startOfDay(new Date()))) return;
    const newTask = {
      text: newTodo.trim(),
      completed: false,
      dueDate,
      category,
      repeat,
      createdAt: new Date(),
    };
    contextAddTodo(newTask);
    setNewTodo("");
    setDueDate(null);
    setRepeat('none');
  };

  const handleComplete = (id: string) => {
    setCompletingIds(prev => new Set(prev).add(id));
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
  
  switch (viewMode) {
    case 'daily':
      // Today (includes all of today)
      const endOfToday = new Date(today);
      endOfToday.setDate(endOfToday.getDate() + 1);
      return todos.filter(todo => 
        todo.dueDate && todo.dueDate >= today && todo.dueDate < endOfToday
      );
      
    case 'weekly':
      // Today + next 6 days (7 days total including today)
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      return todos.filter(todo => 
        todo.dueDate && todo.dueDate >= today && todo.dueDate < endOfWeek
      );
      
    case 'monthly':
      // Today + next 29 days (30 days total including today)
      const endOfMonth = new Date(today);
      endOfMonth.setDate(endOfMonth.getDate() + 30);
      return todos.filter(todo => 
        todo.dueDate && todo.dueDate >= today && todo.dueDate < endOfMonth
      );
      
    case 'all':
    default:
      return todos;
  }
};

  const activeTodos = filterTodosByViewMode(
    todos.filter((todo) => !todo.completed && !completingIds.has(todo.id))
  ).sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
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
    <div className="min-h-[90vh] max-h-[90vh] flex flex-col gap-4 w-full p-6 bg-neutral-900 text-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">To-Do List</h1>
        <div className="flex gap-2">
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
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={lastSync ? `Last sync: ${format(lastSync, 'PPpp')}` : 'Never synced'}
          >
            <RefreshCw size={16} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Canvas'}
          </button>
          <button
            onClick={() => setShowSyncSettings(true)}
            className="flex items-center px-3 py-2 bg-indigo-700 text-white rounded-lg hover:bg-blue-600 transition-colors"
            title="Canvas Sync Settings"
          >
            <Key size={16} />
          </button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={activeTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-[150px]">
            <AnimatePresence mode="popLayout">
              {activeTodos.length === 0 ? (
                <motion.li key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-400 italic text-center mt-8">
                  🎉 You&apos;re all caught up!
                </motion.li>
              ) : (
                activeTodos.map((todo) => (
                  <SortableItem key={todo.id} todo={todo} toggle={toggleTodo} onComplete={handleComplete} />
                ))
              )}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>

      {completedTodos.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowCompleted((prev) => !prev)} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-500 rounded-lg text-white transition-colors">
            {showCompleted ? "Hide" : "Show"} Completed Tasks ({completedTodos.length})
          </button>
          {showCompleted && (
            <ul className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {completedTodos.map((todo) => (
                  <motion.li key={todo.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="flex justify-between items-center px-4 py-2 rounded bg-neutral-800 text-gray-400 line-through hover:bg-gray-600 transition-colors">
                    <span onClick={() => { toggleTodo(todo.id); setTimeout(() => setShowCompleted(prev => prev), 10); }} className="cursor-pointer flex-1">{todo.text}</span>
                    <div className="flex items-center gap-2">
                      {todo.dueDate && (
                        <div className="flex flex-col items-end text-right">
                          <span className="text-sm text-gray-500">{formatDueLabel(todo.dueDate).label}</span>
                          <span className="text-xs text-gray-500">
                            {differenceInCalendarDays(todo.dueDate, startOfDay(new Date())) === 0 ? "Today" : `${Math.abs(differenceInCalendarDays(todo.dueDate, startOfDay(new Date())))} days`}
                          </span>
                        </div>
                      )}
                      <button onClick={() => deleteTodo(todo.id)} className="text-red-500 hover:text-red-400">🗑️</button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4 items-center flex-wrap">
        <input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} onKeyDown={handleEnter} placeholder="Add a new task" className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 min-w-[200px]" />
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="px-4 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600">
          <option value="academics">📚 Academics</option><option value="health">🏃 Health</option><option value="financial">💵 Financial</option><option value="social">👋 Social</option><option value="other">📝 Other</option>
        </select>
        <DatePicker selected={dueDate} onChange={(date) => setDueDate(date)} minDate={new Date()} isClearable placeholderText="Set due date" className="px-3 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600" calendarClassName="bg-gray-900 text-white rounded-lg" />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value as RepeatFrequency)} className="px-3 py-3 rounded-lg bg-neutral-800 text-white border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600">
          <option value="none">No repeat</option><option value="weekly">Weekly 🔄</option><option value="monthly">Monthly 🔄</option><option value="yearly">Yearly 🔄</option>
        </select>
        <button onClick={addTodo} className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-300 transition-colors">Add</button>
      </div>

      {showCanvasImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Import from Canvas</h2><button onClick={() => setShowCanvasImport(false)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
              <p className="text-gray-400 mb-4">Enter your Canvas ICS feed URL to import assignments automatically.</p>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-1">Canvas ICS URL</label><input type="url" placeholder="https://canvas.pitt.edu/feeds/calendars/user_xxx.ics" value={canvasUrl} onChange={(e) => setCanvasUrl(e.target.value)} className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
              <div className="bg-neutral-700/50 p-3 rounded-lg mb-4"><p className="text-sm text-gray-300 mb-1"><strong>How to find your Canvas ICS URL:</strong></p><ol className="text-sm text-gray-400 list-decimal list-inside space-y-1"><li>Go to Canvas → Calendar</li><li>Click on the calendar settings (gear icon)</li><li>Find the "Calendar Feed" option</li><li>Copy the ICS URL</li><li>Paste it above</li></ol></div>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowCanvasImport(false)} className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors">Cancel</button>
                <button onClick={handleCanvasImport} disabled={!canvasUrl || isImporting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isImporting ? "Importing..." : "Import Assignments"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Upload ICS File</h2><button onClick={() => setShowFileUpload(false)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
              <p className="text-gray-400 mb-4">Upload a Canvas ICS file to import assignments.</p>
              <input type="file" accept=".ics" onChange={handleFileUpload} className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white" />
              <div className="flex justify-end mt-4"><button onClick={() => setShowFileUpload(false)} className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors">Cancel</button></div>
            </div>
          </div>
        </div>
      )}

      {showSyncSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Canvas Sync Settings</h2><button onClick={() => setShowSyncSettings(false)} className="text-gray-400 hover:text-white"><X size={20} /></button></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-1">Canvas Instance URL</label><input type="url" placeholder="https://yourschool.instructure.com" value={canvasUrl} onChange={(e) => setCanvasUrl(e.target.value)} className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /><p className="text-xs text-gray-400 mt-1">Your Canvas instance URL (e.g., https://yourschool.instructure.com)</p></div>
              <div className="mb-4"><label className="block text-sm font-medium text-gray-300 mb-1">Canvas API Key</label><input type="password" placeholder="Your Canvas API key" value={canvasApiKey} onChange={(e) => setCanvasApiKey(e.target.value)} className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /><p className="text-xs text-gray-400 mt-1">Find this in Canvas: Account → Settings → Approved Integrations → New Access Token</p></div>
              <div className="bg-blue-900/20 p-3 rounded-lg mb-4"><p className="text-sm text-blue-300"><strong>Note:</strong> Make sure your API key has permissions to read your assignments and todo items.</p></div>
              <div className="bg-yellow-900/20 p-3 rounded-lg mb-4">
  <div className="text-sm text-yellow-300">
    <p className="font-semibold mb-2">Troubleshooting: If sync fails, try:</p>
    <ul className="list-disc list-inside mt-1 space-y-1">
      <li>Checking your Canvas URL format</li>
      <li>Regenerating your API key</li>
      <li>Ensuring your account has access to courses with assignments</li>
    </ul>
  </div>
</div>

              {lastSync && <p className="text-sm text-gray-400 mb-4">Last sync: {format(lastSync, 'PPpp')}</p>}
              <div className="flex justify-end space-x-3">
                <button onClick={testCanvasConnection} disabled={!canvasUrl || !canvasApiKey} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Test Connection</button>
                <button onClick={() => setShowSyncSettings(false)} className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors">Cancel</button>
                <button onClick={() => { handleManualSync(); setShowSyncSettings(false); }} disabled={!canvasUrl || !canvasApiKey} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save & Sync</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}