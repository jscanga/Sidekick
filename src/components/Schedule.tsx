// components/Schedule.tsx
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, BookOpen, Plus, Download, ChevronDown, ChevronUp, CheckCircle, Circle, X, Edit, Trash2, Upload } from 'lucide-react';
import { useTodos } from "@/contexts/todocontext";
import { format, differenceInCalendarDays, startOfDay, isSameDay, addDays } from 'date-fns';
import { useRef } from 'react';
import { useSchedule } from "@/contexts/schedulecontext";
import { colorOptions } from '@/lib/colors';
type ColorValue = string;
// Define proper TypeScript interfaces
interface ClassItem {
  id: number;
  name: string;
  instructor: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  canvasLink: string;
  notesLink: string;
  midtermDate: string;
  finalDate: string;
  mapLocation?: string;
  classType: string;
  color: ColorValue;
}

interface Todo {
  id: string;
  text: string;
  description?: string;
  dueDate?: Date | null;
  category: string;
  completed: boolean;
}

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);
  const { classes, setClasses } = useSchedule();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [canvasURL, setCanvasURL] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [formError, setFormError] = useState('');
  const { todos, toggleTodo } = useTodos();
  const [isDragging, setIsDragging] = useState(false);
  const [showICSImportModal, setShowICSImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPulseAnimation = (colorClass: string) => {
    if (colorClass.includes('blue')) return 'animate-pulse-blue';
    if (colorClass.includes('green')) return 'animate-pulse-green';
    if (colorClass.includes('purple')) return 'animate-pulse-purple';
    if (colorClass.includes('teal')) return 'animate-pulse-teal';
    if (colorClass.includes('orange')) return 'animate-pulse-orange';
    if (colorClass.includes('yellow')) return 'animate-pulse-yellow';
    if (colorClass.includes('red')) return 'animate-pulse-red';
    if (colorClass.includes('lightgreen') || colorClass.includes('cyan')) return 'animate-pulse-lightgreen';
    return '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.ics')) {
      const event = { target: { files } } as React.ChangeEvent<HTMLInputElement>;
      handleICSImport(event);
    }
  };

  const parseICSData = (icsData: string) => {
    try {
      console.log("=== Parsing ICS Data ===");
      const events: any[] = [];
      const lines = icsData.split(/\r?\n/);
      let currentEvent: any = null;
      let inEvent = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        
        if (line.startsWith(' ') && currentEvent) {
          continue;
        }
        
        if (line === 'BEGIN:VEVENT') {
          currentEvent = {};
          inEvent = true;
          continue;
        } 
        
        if (line === 'END:VEVENT') {
          if (currentEvent) {
            const processedEvent = processEvent(currentEvent);
            if (processedEvent) events.push(processedEvent);
          }
          currentEvent = null;
          inEvent = false;
          continue;
        }
        
        if (inEvent && currentEvent) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const propertyName = line.substring(0, colonIndex).split(';')[0];
            const propertyValue = line.substring(colonIndex + 1).trim();
            
            switch (propertyName) {
              case 'SUMMARY':
                currentEvent.name = propertyValue;
                break;
              case 'DTSTART':
                currentEvent.start = propertyValue;
                break;
              case 'DTEND':
                currentEvent.end = propertyValue;
                break;
              case 'LOCATION':
                currentEvent.location = propertyValue;
                break;
              case 'DESCRIPTION':
                currentEvent.description = propertyValue;
                break;
              case 'RRULE':
                currentEvent.rrule = propertyValue;
                break;
              default:
                break;
            }
          }
        }
      }
      
      console.log('Parsed events:', events);
      return events;
    } catch (error) {
      console.error('Error in parseICSData:', error);
      return [];
    }
  };

  const processEvent = (eventData: any) => {
    if (!eventData.start || !eventData.end) {
      console.log('Skipping event - missing start or end time:', eventData);
      return null;
    }
    
    if (eventData.start.length === 8 && !eventData.start.includes('T')) {
      console.log('Skipping all-day event:', eventData);
      return null;
    }
    
    const classItem: ClassItem = {
      id: Date.now() + Math.random(),
      name: eventData.name || 'Imported Class',
      instructor: extractInstructor(eventData.description) || 'Instructor',
      days: getDaysFromRRule(eventData.rrule) || getDaysFromDate(eventData.start) || ['Mon', 'Wed', 'Fri'],
      startTime: formatICSTime(eventData.start),
      endTime: formatICSTime(eventData.end),
      location: eventData.location || 'TBA',
      canvasLink: '',
      notesLink: '',
      midtermDate: '',
      finalDate: '',
      classType: 'lecture',
      color: colorOptions[Math.floor(Math.random() * colorOptions.length)].value,
    };
    
    console.log('Created class item:', classItem);
    return classItem;
  };

  const extractInstructor = (description: string) => {
    if (!description) return 'Instructor';
    
    const patterns = [
      /Instructor:?\s*([^\n]+)/i,
      /Professor:?\s*([^\n]+)/i,
      /Faculty:?\s*([^\n]+)/i,
      /Teach(er|ing):?\s*([^\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) return match[1] || match[2] || 'Instructor';
    }
    
    return 'Instructor';
  };

  const getDaysFromDate = (icsDate: string) => {
    if (!icsDate) return null;
    
    const dateStr = icsDate.includes('T') ? icsDate.split('T')[0] : icsDate.substring(0, 8);
    
    if (dateStr.length >= 8) {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      const dayMap: { [key: number]: string[] } = {
        1: ['Mon'],
        2: ['Tue'],
        3: ['Wed'],
        4: ['Thu'],
        5: ['Fri'],
        0: [],
        6: []
      };
      
      return dayMap[dayOfWeek] || null;
    }
    
    return null;
  };

  const formatICSTime = (icsTime: string) => {
    if (icsTime && icsTime.length >= 9) {
      const timePart = icsTime.includes('T') ? icsTime.split('T')[1] : icsTime;
      const hours = timePart.substring(0, 2);
      const minutes = timePart.substring(2, 4);
      return `${hours}:${minutes}`;
    }
    return '09:00';
  };

  const getDaysFromRRule = (rrule: string) => {
    if (!rrule) return null;
    
    const dayMap: { [key: string]: string } = {
      'MO': 'Mon',
      'TU': 'Tue', 
      'WE': 'Wed',
      'TH': 'Thu',
      'FR': 'Fri'
    };
    
    const days: string[] = [];
    if (rrule.includes('BYDAY=')) {
      const daysMatch = rrule.match(/BYDAY=([^;]+)/);
      if (daysMatch) {
        daysMatch[1].split(',').forEach(day => {
          if (dayMap[day]) days.push(dayMap[day]);
        });
      }
    }
    
    return days.length > 0 ? days : null;
  };

  const handleICSImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const icsData = e.target?.result as string;
        console.log('Raw ICS data (first 200 chars):', icsData.substring(0, 200));
        
        const newClasses = parseICSData(icsData);
        console.log('Parsed classes:', newClasses);
        
        if (newClasses.length === 0) {
          alert('No valid classes found in the ICS file. Check console for details.');
          setShowICSImportModal(false);
          return;
        }
        
        setClasses(prevClasses => {
          const updatedClasses = [...prevClasses, ...newClasses.filter(Boolean) as ClassItem[]];
          console.log('Updated classes:', updatedClasses);
          return updatedClasses;
        });
        
        alert(`Successfully imported ${newClasses.length} classes!`);
        setShowICSImportModal(false);
        
      } catch (error) {
        console.error('Error parsing ICS file:', error);
        alert('Failed to parse ICS file. Please make sure it\'s a valid .ics file from Peoplesoft.');
      }
    };
    
    reader.readAsText(file);
  };

  // Class form state
const [newClass, setNewClass] = useState<{
  name: string;
  instructor: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  color: ColorValue;
}>({
  name: '',
  instructor: '',
  days: [],
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  color: colorOptions[0].value as ColorValue
});

  // Get days of the week
  const getDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + (selectedDate.getDay() === 0 ? -6 : 1));
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  // Get time slots (including earlier hours for 7-10 AM classes)
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 7; hour <= 22; hour++) {
      slots.push(`${hour}:00`);
    }
    return slots;
  };

  // Check if a class occurs on a specific day
  const isClassOnDay = (classItem: ClassItem, day: Date) => {
    const dayAbbr = day.toLocaleDateString('en-US', { weekday: 'short' });
    return classItem.days.includes(dayAbbr);
  };

  // Convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check for scheduling conflicts
  const hasSchedulingConflict = (classItem: ClassItem, excludeId: number | null = null) => {
    return classes.some(existingClass => {
      if (excludeId && existingClass.id === excludeId) return false;
      
      const sharedDays = classItem.days.filter(day => 
        existingClass.days.includes(day)
      );
      
      if (sharedDays.length === 0) return false;
      
      const newStart = timeToMinutes(classItem.startTime);
      const newEnd = timeToMinutes(classItem.endTime);
      const existingStart = timeToMinutes(existingClass.startTime);
      const existingEnd = timeToMinutes(existingClass.endTime);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  // Find conflicting class
  const findConflictingClass = (classItem: ClassItem, excludeId: number | null = null) => {
    return classes.find(existingClass => {
      if (excludeId && existingClass.id === excludeId) return false;
      
      const sharedDays = classItem.days.filter(day => 
        existingClass.days.includes(day)
      );
      
      if (sharedDays.length === 0) return false;
      
      const newStart = timeToMinutes(classItem.startTime);
      const newEnd = timeToMinutes(classItem.endTime);
      const existingStart = timeToMinutes(existingClass.startTime);
      const existingEnd = timeToMinutes(existingClass.endTime);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  // Get tasks due on a specific day
  const getTasksForDay = (day: Date) => {
    return todos.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return isSameDay(taskDate, day);
    });
  };

  // Handle Canvas import
  const handleCanvasImport = () => {
    alert(`This would connect to: ${canvasURL}`);
    const newClassItem: ClassItem = {
      id: Date.now(),
      name: 'Imported from Canvas',
      instructor: 'Canvas Instructor',
      days: ['Tue', 'Thu'],
      startTime: '13:00',
      endTime: '14:15',
      location: 'Online',
      canvasLink: '',
      notesLink: '',
      midtermDate: '',
      finalDate: '',
      classType: 'lecture',
      color: colorOptions[4].value // Yellow gradient
    };
    
    setClasses([...classes, newClassItem]);
    setShowImportModal(false);
    setCanvasURL('');
  };

  // Handle adding a new class
const handleAddClass = () => {
  setFormError('');
  
  if (!newClass.name) {
    setFormError('Class name is required');
    return;
  }
  
  if (newClass.days.length === 0) {
    setFormError('Please select at least one day');
    return;
  }
  
  if (newClass.startTime >= newClass.endTime) {
    setFormError('End time must be after start time');
    return;
  }
  
  if (hasSchedulingConflict(newClass as ClassItem)) {
    const conflictingClass = findConflictingClass(newClass as ClassItem);
    setFormError(`This class would conflict with ${conflictingClass?.name} on ${conflictingClass?.days.join(', ')}`);
    return;
  }
  
  // Create the complete ClassItem with all required properties
  const newClassItem: ClassItem = {
    id: Date.now(),
    name: newClass.name,
    instructor: newClass.instructor,
    days: newClass.days,
    startTime: newClass.startTime,
    endTime: newClass.endTime,
    location: newClass.location,
    color: newClass.color,
    // Add the missing properties with default values
    canvasLink: '',
    notesLink: '',
    midtermDate: '',
    finalDate: '',
    classType: 'lecture'
  };
  
  setClasses([...classes, newClassItem]);
  setShowAddClassModal(false);
setNewClass({
  name: '',
  instructor: '',
  days: [],
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  color: colorOptions[0].value as ColorValue
});
};

  // Handle updating a class
  const handleUpdateClass = () => {
    setFormError('');
    
    if (!editingClass?.name) {
      setFormError('Class name is required');
      return;
    }
    
    if (editingClass.days.length === 0) {
      setFormError('Please select at least one day');
      return;
    }
    
    if (editingClass.startTime >= editingClass.endTime) {
      setFormError('End time must be after start time');
      return;
    }
    
    if (hasSchedulingConflict(editingClass, editingClass.id)) {
      const conflictingClass = findConflictingClass(editingClass, editingClass.id);
      setFormError(`This class would conflict with ${conflictingClass?.name} on ${conflictingClass?.days.join(', ')}`);
      return;
    }
    
    setClasses(classes.map(cls => 
      cls.id === editingClass.id ? editingClass : cls
    ));
    setSelectedClass(editingClass);
    setEditingClass(null);
  };

  // Handle deleting a class
  const handleDeleteClass = (classId: number) => {
    setClasses(classes.filter(cls => cls.id !== classId));
    setSelectedClass(null);
  };

  // Toggle day selection for new class
  const toggleDaySelection = (day: string, isEditing = false) => {
    if (isEditing) {
      setEditingClass(prev => {
        if (!prev) return null;
        const days = prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day];
        
        return { ...prev, days };
      });
    } else {
      setNewClass(prev => {
        const days = prev.days.includes(day)
          ? prev.days.filter(d => d !== day)
          : [...prev.days, day];
        
        return { ...prev, days };
      });
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hourInt = parseInt(hours);
    return `${hourInt % 12 === 0 ? 12 : hourInt % 12}:${minutes} ${hourInt >= 12 ? 'PM' : 'AM'}`;
  };

  // Get day abbreviation
  const getDayAbbr = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Format due label (similar to your TodoList)
  const formatDueLabel = (date: Date) => {
    const today = startOfDay(new Date());
    const diffDays = differenceInCalendarDays(date, today);

    if (diffDays === 0) return { label: "Due Today", color: "text-red-400" };
    if (diffDays === 1) return { label: "Due Tomorrow", color: "text-yellow-400" };
    if (diffDays > 1) return { label: `Due ${format(date, "MMM d")}`, color: "text-green-400" };
    return { label: `Due ${format(date, "MMM d")}`, color: "text-red-400" };
  };

  // Handle class click to show details
  const handleClassClick = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setEditingClass(null);
  };

  // Start editing a class
  const startEditing = () => {
    if (selectedClass) {
      setEditingClass({...selectedClass});
    }
  };

  // Date navigation
  const navigateToDate = (date: Date) => {
    setSelectedDate(date);
  };

  // Get week days for navigation
  const weekDays = getDays();

  // Calculate the height and position for class blocks
  const calculateClassBlock = (classItem: ClassItem, day: Date) => {
    if (!isClassOnDay(classItem, day)) return null;
    
    const startMinutes = timeToMinutes(classItem.startTime);
    const endMinutes = timeToMinutes(classItem.endTime);
    const duration = endMinutes - startMinutes;
    
    const top = ((startMinutes - 420) / 60) * 64;
    const height = (duration / 60) * 64;
    
    return { top, height };
  };

  return (
    <div className="p-6 bg-neutral-900 min-h-screen rounded-lg shadow-lg text-white">
      <div className="max-w-8xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Class Schedule</h1>
          <div className="flex space-x-2">
            <button 
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
              onClick={() => setShowICSImportModal(true)}
            >
              <Download size={18} className="mr-2" />
              Import from Peoplesoft
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
              onClick={() => setShowAddClassModal(true)}
            >
              <Plus size={18} className="mr-2" />
              Add Class
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="bg-neutral-800 rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 bg-neutral-700 text-white rounded hover:bg-neutral-600 transition-colors"
                onClick={() => navigateToDate(addDays(selectedDate, -7))}
              >
                Previous Week
              </button>
              <button 
                className="px-3 py-1 bg-neutral-700 text-white rounded hover:bg-neutral-600 transition-colors"
                onClick={() => navigateToDate(new Date())}
              >
                Today
              </button>
              <button 
                className="px-3 py-1 bg-neutral-700 text-white rounded hover:bg-neutral-600 transition-colors"
                onClick={() => navigateToDate(addDays(selectedDate, 7))}
              >
                Next Week
              </button>
            </div>
            <div className="flex items-center text-gray-300">
              <Calendar size={18} className="mr-2" />
              <span className="font-medium">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="bg-neutral-800 rounded-lg shadow">
            <button 
              className="w-full p-4 flex justify-between items-center text-left hover:bg-neutral-700/50 transition-colors rounded-lg"
              onClick={() => setShowTaskDropdown(!showTaskDropdown)}
            >
              <div className="flex items-center">
                <BookOpen size={20} className="mr-2 text-emerald-400" />
                <h2 className="text-xl font-semibold">Tasks due on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
              </div>
              {showTaskDropdown ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
            
            <AnimatePresence>
              {showTaskDropdown && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-neutral-700">
                    {getTasksForDay(selectedDate).length > 0 ? (
                      <ul className="space-y-2">
                        {getTasksForDay(selectedDate).map(task => {
                          const dueInfo = task.dueDate ? formatDueLabel(new Date(task.dueDate)) : { label: '', color: '' };
                          
                          return (
                            <motion.li 
                              key={task.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex items-center p-3 hover:bg-neutral-700/50 rounded-lg transition-colors"
                            >
                              <button
                                onClick={() => toggleTodo(task.id)}
                                className={`h-5 w-5 flex items-center justify-center rounded border-2 mr-3 shrink-0 transition-all duration-300 ${
                                  task.completed
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : "border-neutral-500 text-transparent hover:border-emerald-400"
                                }`}
                              >
                                {task.completed && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                  >
                                    ✓
                                  </motion.span>
                                )}
                              </button>
                              
                              <div className="flex-1">
                                <span className={`${task.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                                  {task.text}
                                </span>
                              </div>
                              
                              {task.dueDate && (
                                <div className={`text-sm ${dueInfo.color} ml-4 whitespace-nowrap`}>
                                  {dueInfo.label}
                                </div>
                              )}
                            </motion.li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-center py-4">No tasks due on this day</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Schedule */}
        <div className="mt-4 bg-neutral-800 rounded-lg shadow overflow-hidden">
          {/* Week Header - Now includes day navigation */}
          <div className="grid grid-cols-8 border-b border-neutral-700">
            <div className="p-3 border-r border-neutral-700 font-medium">Time</div>
            {weekDays.map((day, index) => (
              <button
                key={index}
                onClick={() => navigateToDate(day)}
                className={`p-3 text-center ${index < 6 ? 'border-r border-neutral-700' : ''} ${
                  isSameDay(day, selectedDate) 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                } transition-colors`}
              >
                <div className="text-sm">{getDayAbbr(day)}</div>
                <div className="text-lg font-medium">{day.getDate()}</div>
              </button>
            ))}
          </div>

          {/* Schedule Grid with Continuous Class Blocks */}
          <div className="relative" style={{ height: 'calc(16 * 64px)' }}>
            {/* Time Labels */}
            {getTimeSlots().map((time, timeIndex) => (
              <div 
                key={timeIndex} 
                className="absolute left-0 right-0 border-b border-neutral-700 flex items-start"
                style={{ top: `${timeIndex * 64}px`, height: '64px' }}
              >
                <div className="w-48 p-5 border-r border-neutral-700 text-lg text-gray-400 flex items-center justify-left h-full pr-3">
                  {formatTime(time)}
                </div>
              </div>
            ))}
            
            {/* Class Blocks - Continuous spans */}
            {weekDays.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className={`absolute top-0 bottom-0 ${dayIndex < 6 ? 'border-r border-neutral-700' : ''} ${
                  isSameDay(day, selectedDate) ? 'bg-neutral-700/30' : ''
                }`}
                style={{ 
                  left: `${(dayIndex + 1) * 12.5}%`, 
                  width: '12.5%' 
                }}
              >
                {classes.map((classItem, index) => {
                  const block = calculateClassBlock(classItem, day);
                  if (!block) return null;
                  
                  return (
                    <button
                      key={classItem.id}
                      onClick={() => handleClassClick(classItem)}
                      className={`bg-gradient-to-r ${classItem.color} ${getPulseAnimation(classItem.color)} border rounded absolute left-1 right-1 text-left hover:opacity-90 transition-opacity overflow-hidden`}
                      style={{
                        top: `${block.top}px`,
                        height: `${block.height}px`,
                        minHeight: '32px',
                        animationDelay: `${(index % 5) * 0.3}s`
                      }}
                    >
                      <div className="p-1">
                        <div className="font-medium truncate text-xs">{classItem.name}</div>
                        <div className="text-xs truncate text-gray-300">
                          {formatTime(classItem.startTime)}-{formatTime(classItem.endTime)}
                        </div>
                        <div className="text-xs truncate text-gray-300">{classItem.location}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Import from Canvas Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Import from Canvas</h2>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-400 mb-4">Enter your Canvas URL to import your class schedule automatically.</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Canvas URL</label>
                <input 
                  type="text" 
                  placeholder="https://yourschool.instructure.com"
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={canvasURL}
                  onChange={(e) => setCanvasURL(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                  onClick={handleCanvasImport}
                >
                  Import
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ICS Import Modal */}
      {showICSImportModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Import from ICS File</h2>
                <button onClick={() => setShowICSImportModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="mb-4">
                <p className="text-gray-400 mb-2">
                  Upload your .ics file from Peoplesoft to automatically import your class schedule.
                </p>
                <div className="bg-neutral-700/50 p-3 rounded-lg">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong>How to get your schedule:</strong>
                  </p>
                  <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
                    <li>
                      <a 
                        href="https://pitcsprd.csps.pitt.edu/psp/pitcsprd/EMPLOYEE/SA/s/WEBLIB_HCX_EN.H_SCHEDULE.FieldFormula.IScript_Main?" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-emerald-500/50 hover:decoration-emerald-400 transition-all duration-200"
                      >
                        Click here to access Peoplesoft
                      </a>
                    </li>
                    <li>Navigate to your class schedule</li>
                    <li>Click "Download (.ics)" in the top right</li>
                  </ol>
                </div>
              </div>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleICSImport}
                  accept=".ics"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center">
                  <Download size={48} className="text-gray-400 mb-3" />
                  <p className="text-gray-300 mb-2">Drag & drop your .ics file here</p>
                  <p className="text-gray-400 text-sm mb-4">or</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                  >
                    Browse Files
                  </button>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-400 text-center">
                <p>Supported: .ics files from Peoplesoft, Canvas, or other calendar systems</p>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors"
                  onClick={() => setShowICSImportModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add New Class</h2>
                <button onClick={() => {
                  setShowAddClassModal(false);
                  setFormError('');
                }} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                  {formError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Class Name *</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClass.name}
                    onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                    placeholder="e.g., Introduction to Computer Science"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Instructor</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClass.instructor}
                    onChange={(e) => setNewClass({...newClass, instructor: e.target.value})}
                    placeholder="e.g., Dr. Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Days *</label>
                  <div className="flex space-x-2 flex-wrap gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDaySelection(day)}
                        className={`px-3 py-2 rounded transition-colors ${
                          newClass.days.includes(day) 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-neutral-700 text-gray-300 hover:bg-neutral-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Time *</label>
                    <input 
                      type="time" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={newClass.startTime}
                      onChange={(e) => setNewClass({...newClass, startTime: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Time *</label>
                    <input 
                      type="time" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={newClass.endTime}
                      onChange={(e) => setNewClass({...newClass, endTime: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClass.location}
                    onChange={(e) => setNewClass({...newClass, location: e.target.value})}
                    placeholder="e.g., Science Bldg, Room 203"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                  <div className="grid grid-cols-5 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewClass({...newClass, color: color.value})}
                        className={`p-2 rounded border-2 transition-all ${
                          newClass.color === color.value 
                            ? 'border-white ring-2 ring-indigo-400' 
                            : 'border-neutral-700 hover:border-neutral-500'
                        }`}
                        title={color.name}
                      >
                        <div className={`w-full h-6 rounded ${color.preview}`}></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors"
                  onClick={() => {
                    setShowAddClassModal(false);
                    setFormError('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleAddClass}
                  disabled={!newClass.name || newClass.days.length === 0}
                >
                  Add Class
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Class Details/Edit Modal */}
      {(selectedClass || editingClass) && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-md border border-neutral-700"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {editingClass ? 'Edit Class' : 'Class Details'}
                </h2>
                <button onClick={() => {
                  setSelectedClass(null);
                  setEditingClass(null);
                  setFormError('');
                }} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              {formError && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                  {formError}
                </div>
              )}
              
              <div className="space-y-4">
                {editingClass ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Class Name *</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={editingClass.name}
                        onChange={(e) => setEditingClass({...editingClass, name: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Instructor</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={editingClass.instructor}
                        onChange={(e) => setEditingClass({...editingClass, instructor: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Days *</label>
                      <div className="flex space-x-2 flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDaySelection(day, true)}
                            className={`px-3 py-2 rounded transition-colors ${
                              editingClass.days.includes(day) 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-neutral-700 text-gray-300 hover:bg-neutral-600'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Start Time *</label>
                        <input 
                          type="time" 
                          className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={editingClass.startTime}
                          onChange={(e) => setEditingClass({...editingClass, startTime: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">End Time *</label>
                        <input 
                          type="time" 
                          className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          value={editingClass.endTime}
                          onChange={(e) => setEditingClass({...editingClass, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                      <input 
                        type="text" 
                        className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={editingClass.location}
                        onChange={(e) => setEditingClass({...editingClass, location: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                      <div className="grid grid-cols-5 gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setEditingClass({...editingClass, color: color.value})}
                            className={`p-2 rounded border-2 transition-all ${
                              editingClass.color === color.value 
                                ? 'border-white ring-2 ring-indigo-400' 
                                : 'border-neutral-700 hover:border-neutral-500'
                            }`}
                            title={color.name}
                          >
                            <div className={`w-full h-6 rounded ${color.preview}`}></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  selectedClass && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium">{selectedClass.name}</h3>
                        <p className="text-gray-400">{selectedClass.instructor}</p>
                      </div>
                      
                      <div className="flex items-center text-gray-300">
                        <Clock size={16} className="mr-2" />
                        <span>
                          {formatTime(selectedClass.startTime)} - {formatTime(selectedClass.endTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-300">
                        <Calendar size={16} className="mr-2" />
                        <span>{selectedClass.days.join(', ')}</span>
                      </div>
                      
                      <div className="text-gray-300">
                        {selectedClass.location}
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-gray-300 mr-2">Color:</span>
                        <div className={`w-6 h-6 rounded ${colorOptions.find(c => c.value === selectedClass.color)?.preview || 'bg-gray-500'}`}></div>
                      </div>
                    </>
                  )
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                {!editingClass ? (
                  selectedClass && (
                    <>
                      <button 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                        onClick={() => handleDeleteClass(selectedClass.id)}
                      >
                        <Trash2 size={16} className="inline mr-2" />
                        Delete
                      </button>
                      <button 
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        onClick={startEditing}
                      >
                        <Edit size={16} className="inline mr-2" />
                        Edit
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <button 
                      className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors"
                      onClick={() => {
                        setEditingClass(null);
                        setFormError('');
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                      onClick={handleUpdateClass}
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
