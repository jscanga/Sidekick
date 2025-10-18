// components/Classes.tsx
"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, MapPin, Link, Calendar, Clock, Trash2, X, ExternalLink, Users, Calendar as CalendarIcon, AlertCircle, Download as DownloadIcon, Notebook } from 'lucide-react';
import { useSchedule } from "@/contexts/schedulecontext";
import { useTodos } from "@/contexts/todocontext";
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import { colorOptions } from '@/lib/colors';
import { useGradeStorage } from '@/hooks/useGradeStorage';

// Define proper TypeScript interfaces
interface GradeInfo {
  // Official grades (often null until finalized)
  currentGrade?: string | null;
  currentScore?: number | null;
  finalGrade?: string | null;
  finalScore?: number | null;
  
  // Calculated grades (always available)
  calculatedGrade?: string | null;
  calculatedScore?: number | null;
  totalPoints?: number;
  earnedPoints?: number;
  assignmentCount?: number;
  gradedAssignmentCount?: number;
  completionPercentage?: number;
  
  gradingScale?: string;
  lastSynced?: Date;
  gradeStatus?: 'calculated' | 'official' | 'pending' | 'not_available';
  gradeSource?: 'calculated' | 'official';
}

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
  color: string;
  // Add grade properties
  gradeInfo?: GradeInfo;
  canvasCourseId?: string; // To match with Canvas course ID
}

interface ClassGroup {
  baseName: string;
  variations: ClassItem[];
  mainClass: ClassItem;
  courseCode: string;
  gradeInfo?: GradeInfo;
}

interface Todo {
  id: string;
  text: string;
  description?: string;
  dueDate?: Date | null;
  category: string;
  completed: boolean;
}

interface CanvasGrade {
  course_id: string;
  course_name: string;
  calculatedGrade: string | null;
  calculatedScore: number | null;
  totalPoints: number;
  earnedPoints: number;
  assignmentCount: number;
  gradedAssignmentCount: number;
  completionPercentage: number;
  gradingScheme: string;
}

interface ParsedEvent {
  name?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  rrule?: string;
}

const Classes = () => {
  const { classes, setClasses } = useSchedule();
  const { todos } = useTodos();
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editingVariationIndex, setEditingVariationIndex] = useState(0);
  const [formError, setFormError] = useState('');
  const [showICSImportModal, setShowICSImportModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateGrade, calculateGPA } = useGradeStorage();

  // Enhanced class form state with new fields
  const [newClass, setNewClass] = useState({
    name: '',
    instructor: '',
    days: [] as string[],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    canvasLink: '',
    notesLink: '',
    midtermDate: '',
    finalDate: '',
    classType: 'lecture',
    color: 'from-blue-600 to-cyan-500 border-blue-500'
  });

  // Class type options
  const classTypeOptions = [
    { value: 'lecture', label: 'Lecture' },
    { value: 'recitation', label: 'Recitation' },
    { value: 'lab', label: 'Lab' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'workshop', label: 'Workshop' }
  ];

  // Replace your syncCanvasGrades function with this improved version
  const syncCanvasGrades = async () => {
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
      alert('Please set up your Canvas credentials in Settings first.');
      return;
    }

    const profile = JSON.parse(userProfile);
    if (!profile.canvasUrl || !profile.canvasApiKey) {
      alert('Please set up your Canvas credentials in Settings first.');
      return;
    }

    try {
      const response = await fetch('/api/canvas/calculated-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasUrl: profile.canvasUrl,
          canvasApiKey: profile.canvasApiKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch calculated grades');
      }

      const data = await response.json();
      console.log('Grade calculation response:', data); // Debug log
      
      if (data.success) {
        let matchedCount = 0;
        
        setClasses(prevClasses => {
          return prevClasses.map(cls => {
            // Try multiple matching strategies
            const courseGrade = data.grades.find((grade: CanvasGrade) => {
              const classCourseCode = extractCourseCode(cls.name);
              const gradeCourseCode = extractCourseCode(grade.course_name);
              
              // Strategy 1: Exact course code match
              if (classCourseCode && gradeCourseCode && 
                  classCourseCode.toLowerCase() === gradeCourseCode.toLowerCase()) {
                console.log(`Matched by course code: ${classCourseCode} = ${gradeCourseCode}`);
                return true;
              }
              
              // Strategy 2: Course name contains class name or vice versa
              if (cls.name.toLowerCase().includes(grade.course_name.toLowerCase()) ||
                  grade.course_name.toLowerCase().includes(cls.name.toLowerCase())) {
                console.log(`Matched by name: ${cls.name} <-> ${grade.course_name}`);
                return true;
              }
              
              // Strategy 3: Partial name matching
              const classNameWords = cls.name.toLowerCase().split(/\s+/);
              const courseNameWords = grade.course_name.toLowerCase().split(/\s+/);
              const matchingWords = classNameWords.filter(word => 
                courseNameWords.some(courseWord => courseWord.includes(word) || word.includes(courseWord))
              );
              
              if (matchingWords.length >= 2) { // At least 2 matching words
                console.log(`Matched by partial name: ${cls.name} <-> ${grade.course_name}`);
                return true;
              }
              
              return false;
            });
            
            if (courseGrade && courseGrade.calculatedScore !== null) {
              matchedCount++;

              updateGrade(courseGrade, {
                calculatedGrade : courseGrade.calculatedGrade,
                calculatedScore : courseGrade.calculatedScore,
              });
              console.log(`Matched course: ${cls.name} with grade data:`, courseGrade);
              return {
                ...cls,
                gradeInfo: {
                  calculatedGrade: courseGrade.calculatedGrade,
                  calculatedScore: courseGrade.calculatedScore,
                  totalPoints: courseGrade.totalPoints,
                  earnedPoints: courseGrade.earnedPoints,
                  assignmentCount: courseGrade.assignmentCount,
                  gradedAssignmentCount: courseGrade.gradedAssignmentCount,
                  completionPercentage: courseGrade.completionPercentage,
                  gradingScale: courseGrade.gradingScheme,
                  lastSynced: new Date(),
                  gradeStatus: 'calculated',
                  gradeSource: 'calculated'
                },
                canvasCourseId: courseGrade.course_id
              };
            } else if (courseGrade) {
              console.log(`Course matched but no grade data: ${cls.name}`, courseGrade);
            }
            
            return cls;
          });
        });
        const gpa = calculateGPA();
        if (gpa) {
          alert(`Successfully calculated grades for ${matchedCount} courses!\nCurrent Semester GPA: ${gpa}`);
        } else {
          alert(`Successfully calculated grades for ${matchedCount} courses!`);
        }
        console.log(`Successfully matched ${matchedCount} out of ${data.grades.length} courses`);
        
        if (matchedCount === 0) {
          alert(`Found ${data.grades.length} courses in Canvas but couldn't match them to your classes. Check console for details.`);
        } else {
          alert(`Successfully calculated grades for ${matchedCount} courses!`);
        }
      }
    } catch (error) {
      console.error('Error calculating grades:', error);
      alert('Failed to calculate grades from Canvas. Please check your credentials and try again.');
    }
  };

  // Improved course code extraction
  const extractCourseCode = (text: string): string => {
    if (!text) return '';
    
    // Match patterns like "CS 0445", "MATH 0220", "BIO 1234"
    const courseCodePattern = /[A-Z]{2,}\s*\d{3,}[A-Z]?/g;
    const matches = text.match(courseCodePattern);
    
    if (matches && matches.length > 0) {
      // Normalize the format (remove extra spaces)
      return matches[0].replace(/\s+/g, ' ').trim();
    }
    
    return '';
  };

  // Generate Google Maps URL from location
  const generateMapsUrl = (location: string): string => {
    if (!location) return '';
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
  };

  const GradeDisplay = ({ gradeInfo }: { gradeInfo: GradeInfo }) => {
    if (!gradeInfo) return null;

    const hasOfficialGrade = gradeInfo.currentScore !== null && gradeInfo.currentScore !== undefined;
    const hasCalculatedGrade = gradeInfo.calculatedScore !== null && gradeInfo.calculatedScore !== undefined;
    
    if (!hasOfficialGrade && !hasCalculatedGrade) {
      return (
        <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs">
          <div className="text-gray-400">No grade data available yet</div>
          <div className="text-gray-500 text-xs mt-1">
            {gradeInfo.assignmentCount ? `${gradeInfo.gradedAssignmentCount}/${gradeInfo.assignmentCount} assignments graded` : 'Sync to calculate grade'}
          </div>
        </div>
      );
    }

    // Helper function to determine if we should show letter grade or percentage
    const renderGrade = (grade: string | null | undefined, score: number | null | undefined) => {
      if (grade) {
        return (
          <div>
            <div className="font-bold text-lg text-emerald-400">{grade}</div>
            {score && (
              <div className="text-xs opacity-80 mt-1">
                {score.toFixed(2)}%
              </div>
            )}
          </div>
        );
      } else if (score) {
        return (
          <div className="font-bold text-lg text-emerald-400">
            {score.toFixed(2)}%
          </div>
        );
      }
      return null;
    };

    return (
      <div className="mt-0 p-2 bg-black/20 rounded">
        {/* Official Grade (if available) */}
        {hasOfficialGrade && (
          <div className="mb-2 pb-2 border-b border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-green-400 text-sm">Official Grade:</span>
              <div className="text-right">
                {renderGrade(gradeInfo.currentGrade, gradeInfo.currentScore)}
              </div>
            </div>
          </div>
        )}
        
        {/* Calculated Grade */}
        {hasCalculatedGrade && (
          <div>
            <div className="flex justify-between items-center">
              <span className={hasOfficialGrade ? "text-yellow-400 text-sm" : "text-green-400 text-sm"}>
                {hasOfficialGrade ? "Calculated Estimate:" : "Current Grade:"}
              </span>
              <div className="text-right">
                {renderGrade(gradeInfo.calculatedGrade, gradeInfo.calculatedScore)}
              </div>
            </div>
            
            {/* Progress bar */}
            {gradeInfo.assignmentCount && gradeInfo.assignmentCount > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Assignments Graded</span>
                  <span>{gradeInfo.gradedAssignmentCount}/{gradeInfo.assignmentCount} ({gradeInfo.completionPercentage?.toFixed(0)}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${gradeInfo.completionPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Points breakdown */}
            {gradeInfo.totalPoints && gradeInfo.totalPoints > 0 && (
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Points:</span>
                <span>{gradeInfo.earnedPoints?.toFixed(1)}/{gradeInfo.totalPoints.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Last synced */}
        {gradeInfo.lastSynced && (
          <div className="text-xs text-gray-500 mt-2">
            Updated: {format(new Date(gradeInfo.lastSynced), "MMM d, h:mm a")}
          </div>
        )}
      </div>
    );
  };

  // Get assignments for a specific class - Fixed TypeScript issue
  const getAssignmentsForClass = (className: string): Todo[] => {
    const courseCode = extractCourseCode(className);
    if (!courseCode) return [];

    const classAssignments = (todos as Todo[])
      .filter(todo => 
        todo.category === 'academics' && 
        !todo.completed &&
        todo.description?.toLowerCase().includes(courseCode.toLowerCase())
      )
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

    return classAssignments.slice(0, 3);
  };

  // Format due date for display - Fixed TypeScript issue with dueDate
  const formatDueDate = (dueDate: Date | null | undefined) => {
    if (!dueDate) return { label: "No due date", color: "text-gray-400", urgency: "none" };
    
    const today = startOfDay(new Date());
    const diffDays = differenceInCalendarDays(dueDate, today);

    if (diffDays === 0) return { label: "Due Today", color: "text-red-400", urgency: "high" };
    if (diffDays === 1) return { label: "Due Tomorrow", color: "text-yellow-400", urgency: "medium" };
    if (diffDays > 1 && diffDays <= 7) return { label: `Due in ${diffDays} days`, color: "text-orange-400", urgency: "medium" };
    if (diffDays > 7) return { label: `Due ${format(dueDate, "MMM d")}`, color: "text-green-400", urgency: "low" };
    return { label: `Overdue`, color: "text-red-500", urgency: "high" };
  };

  // Format exam date for display
  const formatExamDate = (dateString: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      const today = startOfDay(new Date());
      const diffDays = differenceInCalendarDays(date, today);
      
      if (diffDays === 0) return { label: "Today", color: "text-red-400", urgency: "high" };
      if (diffDays === 1) return { label: "Tomorrow", color: "text-yellow-400", urgency: "high" };
      if (diffDays > 1 && diffDays <= 7) return { label: `In ${diffDays} days`, color: "text-orange-400", urgency: "medium" };
      if (diffDays > 7) return { label: format(date, "MMM d"), color: "text-green-400", urgency: "low" };
      return { label: "Passed", color: "text-gray-400", urgency: "none" };
    } catch {
      return null;
    }
  };
  
  // Deduplicate classes - group by base name - Fixed TypeScript issue
  const deduplicatedClasses: ClassGroup[] = (classes as ClassItem[]).reduce((acc: ClassGroup[], classItem: ClassItem) => {
    const baseName = classItem.name
      .replace(/(recitation|rec|lab|lecture|lec)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const existingGroup = acc.find(group => group.baseName === baseName);
    
    if (existingGroup) {
      existingGroup.variations.push(classItem);
    } else {
      acc.push({
        baseName,
        variations: [classItem],
        mainClass: classItem,
        courseCode: extractCourseCode(classItem.name)
      });
    }
    
    return acc;
  }, []);

  // Handle adding a new class
  const handleAddClass = () => {
    setFormError('');
    
    if (!newClass.name.trim()) {
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
    
    const newClassItem: ClassItem = {
      id: Date.now(),
      ...newClass,
      mapLocation: generateMapsUrl(newClass.location)
    };
    
    setClasses([...classes, newClassItem]);
    setShowAddClassModal(false);
    
    // Reset form
    setNewClass({
      name: '',
      instructor: '',
      days: [],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      canvasLink: '',
      notesLink: '',
      midtermDate: '',
      finalDate: '',
      classType: 'lecture',
      color: 'from-blue-600 to-cyan-500 border-blue-500'
    });
  };

  // Handle updating a class variation
  const handleUpdateClass = () => {
    setFormError('');
    
    if (!editingClass?.name.trim()) {
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
    
    // Update map location when location changes
    const updatedClass = {
      ...editingClass,
      mapLocation: generateMapsUrl(editingClass.location)
    };
    
    setClasses(classes.map(cls => 
      cls.id === updatedClass.id ? updatedClass : cls
    ));
    
    setSelectedClass(prev => {
      if (!prev) return null;
      const updatedVariations = [...prev.variations];
      updatedVariations[editingVariationIndex] = updatedClass;
      return { ...prev, variations: updatedVariations };
    });
    
    setEditingClass(null);
    setEditingVariationIndex(0);
  };

  // Handle deleting a class variation
  const handleDeleteClass = (classId: number) => {
    setClasses(classes.filter(cls => cls.id !== classId));
    setSelectedClass(null);
    setEditingClass(null);
  };

  // Handle deleting an entire class group
  const handleDeleteClassGroup = (classGroup: ClassGroup) => {
    const variationIds = classGroup.variations.map(v => v.id);
    setClasses(classes.filter(cls => !variationIds.includes(cls.id)));
    setSelectedClass(null);
  };

  // Start editing a specific variation
  const startEditingVariation = (variation: ClassItem, index: number) => {
    setEditingClass({...variation});
    setEditingVariationIndex(index);
    setSelectedClass(null);
  };

  // Toggle day selection
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
    if (!time) return 'TBA';
    const [hours, minutes] = time.split(':');
    const hourInt = parseInt(hours);
    return `${hourInt % 12 === 0 ? 12 : hourInt % 12}:${minutes} ${hourInt >= 12 ? 'PM' : 'AM'}`;
  };

  // Get class type label
  const getClassTypeLabel = (type: string) => {
    return classTypeOptions.find(opt => opt.value === type)?.label || type;
  };

  // ICS Import Functions
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
      // Create a proper change event-like object
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.files = files;
      
      const syntheticEvent = {
        target: fileInput
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      
      handleICSImport(syntheticEvent);
    }
  };

  const parseICSData = (icsData: string) => {
    try {
      console.log("=== Parsing ICS Data ===");
      const events: ParsedEvent[] = [];
      const lines = icsData.split(/\r?\n/);
      let currentEvent: ParsedEvent | null = null;
      let inEvent = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
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

  const processEvent = (eventData: ParsedEvent) => {
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
      mapLocation: generateMapsUrl(eventData.location || 'TBA')
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
          const updatedClasses = [...prevClasses, ...newClasses];
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

  // Render class variations
  const renderClassVariations = (variations: ClassItem[]) => {
    if (variations.length === 1) {
      return (
        <div className="text-sm text-gray-400">
          {getClassTypeLabel(variations[0].classType)} • {variations[0].days.join(', ')} • {formatTime(variations[0].startTime)}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {variations.map((variation, index) => (
          <div key={index} className="text-xs text-gray-400 flex items-center">
            <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
            {getClassTypeLabel(variation.classType)}: {variation.days.join(', ')} • {formatTime(variation.startTime)}
          </div>
        ))}
      </div>
    );
  };

  // Render upcoming assignments for a class
  const renderUpcomingAssignments = (className: string) => {
    const assignments = getAssignmentsForClass(className);
    
    if (assignments.length === 0) {
      return (
        <div className="text-xs text-gray-500 italic mt-2">
          No upcoming assignments
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-1">
        {assignments.map((assignment, index) => {
          const dueInfo = formatDueDate(assignment.dueDate);
          
          return (
            <div key={index} className="flex items-center justify-between text-xs p-1 rounded bg-neutral-700/30">
              <span className="truncate flex-1 mr-2" title={assignment.text}>
                {assignment.text}
              </span>
              {dueInfo && (
                <span className={`${dueInfo.color} font-medium whitespace-nowrap`}>
                  {dueInfo.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Safe accessor for class properties
  const getSafeInstructor = (classItem: ClassItem | undefined) => {
    return classItem?.instructor || 'Instructor not set';
  };

  return (
    <div className="p-6 bg-neutral-900 min-h-screen rounded-lg shadow-lg text-white">
      <div className="max-w-8xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Classes</h1>
            <p className="text-gray-400 mt-1">Manage your course schedule and assignments</p>
          </div>
          <div className="flex space-x-2">
            <button 
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition"
              onClick={() => setShowICSImportModal(true)}
            >
              <DownloadIcon size={18} className="mr-2" />
              Import from Peoplesoft
            </button>
            <button 
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition font-medium"
              onClick={() => setShowAddClassModal(true)}
            >
              <Plus size={20} className="mr-2" />
              Add Class
            </button>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deduplicatedClasses.map((group) => {
            const assignments = getAssignmentsForClass(group.baseName);
            const hasUrgentAssignments = assignments.some(assignment => {
              const dueInfo = formatDueDate(assignment.dueDate);
              return dueInfo?.urgency === 'high';
            });

            const midtermInfo = formatExamDate(group.mainClass.midtermDate);
            const finalInfo = formatExamDate(group.mainClass.finalDate);
            const hasUpcomingExams = midtermInfo?.urgency === 'high' || finalInfo?.urgency === 'high';

            return (
              <motion.div
                key={group.baseName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-r ${group.mainClass?.color || 'from-blue-600 to-cyan-500'} border border-blue-500 rounded-lg p-5 hover:shadow-lg transition-all relative flex flex-col h-full ${
                  (hasUrgentAssignments || hasUpcomingExams) ? 'ring-2 ring-red-500/50' : ''
                }`}
              >
                {(hasUrgentAssignments || hasUpcomingExams) && (
                  <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                    <AlertCircle size={16} className="text-white" />
                  </div>
                )}
                
                {/* Content that can grow/shrink */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg truncate">{group.baseName}</h3>
                    <div className="flex items-center space-x-2">
                      {group.variations.length > 1 && (
                        <span className="text-xs bg-neutral-700 px-2 py-1 rounded-full">
                          {group.variations.length} variations
                        </span>
                      )}
                      <div className={`w-3 h-3 rounded-full ${colorOptions.find(c => c.value === (group.mainClass?.color || 'from-blue-600 to-cyan-500 border-blue-500'))?.preview || 'bg-gray-500'}`} />
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3">{getSafeInstructor(group.mainClass)}</p>
                  
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    {renderClassVariations(group.variations)}
                    
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2" />
                      <span className="truncate">{group.mainClass?.location || 'No location set'}</span>
                    </div>
                    
                    {/* Exam Dates */}
                    {(group.mainClass.midtermDate || group.mainClass.finalDate) && (
                      <div className="pt-2">
                        {group.mainClass.midtermDate && (
                          <div className="flex items-center text-xs">
                            <Calendar size={12} className="mr-2" />
                            <span>Midterm: {format(new Date(group.mainClass.midtermDate), "MMM d")}</span>
                          </div>
                        )}
                        {group.mainClass.finalDate && (
                          <div className="flex items-center text-xs mt-1">
                            <Calendar size={12} className="mr-2" />
                            <span>Final: {format(new Date(group.mainClass.finalDate), "MMM d")}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 pt-1">
                      {group.mainClass?.canvasLink && (
                        <Link size={14} className="text-blue-400" />
                      )}
                      {group.mainClass?.notesLink && (
                        <Notebook size={14} className="text-green-400" />
                      )}
                    </div>
                  </div>

                  {/* Upcoming Assignments Section */}
                  <div className="mb-4">
                    <div className="flex items-center text-xs text-gray-400 mb-1">
                      <CalendarIcon size={12} className="mr-1" />
                      <span>Upcoming Assignments</span>
                    </div>
                    {renderUpcomingAssignments(group.baseName)}
                  </div>
                </div>

                {group.mainClass?.gradeInfo && <GradeDisplay gradeInfo={group.mainClass.gradeInfo} />}
                
                {/* Buttons fixed at the bottom */}
                <div className="flex space-x-2 mt-auto pt-4">
                  <button 
                    onClick={() => setSelectedClass(group)}
                    className="flex-1 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => startEditingVariation(group.variations[0], 0)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {deduplicatedClasses.length === 0 && (
          <div className="text-center py-16">
            <BookOpen size={80} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-2xl font-semibold text-gray-400 mb-2">No classes yet</h3>
            <p className="text-gray-500 mb-6">Add your first class to get started!</p>
            <button 
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition font-medium"
              onClick={() => setShowAddClassModal(true)}
            >
              <Plus size={20} className="inline mr-2" />
              Add Your First Class
            </button>
          </div>
        )}
      </div>

      {/* Class Details Modal */}
      {selectedClass && !editingClass && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-4xl border border-neutral-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">{selectedClass.baseName}</h2>
                <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Class Info & Variations */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4 border-b border-neutral-700 pb-2">Class Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Instructor</label>
                        <p className="text-white">{getSafeInstructor(selectedClass.mainClass)}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Class Variations</label>
                        <div className="space-y-3">
                          {selectedClass.variations.map((variation: ClassItem, index: number) => (
                            <div key={index} className="bg-neutral-700/30 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <span className="font-medium text-indigo-400 text-lg">
                                    {getClassTypeLabel(variation.classType)}
                                  </span>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${colorOptions.find(c => c.value === variation.color)?.preview}`} />
                              </div>
                              <div className="text-sm space-y-2">
                                <div className="flex items-center">
                                  <Calendar size={14} className="mr-2" />
                                  {variation.days?.join(', ') || 'Days not set'}
                                </div>
                                <div className="flex items-center">
                                  <Clock size={14} className="mr-2" />
                                  {formatTime(variation.startTime)} - {formatTime(variation.endTime)}
                                </div>
                                <div className="flex items-center">
                                  <MapPin size={14} className="mr-2" />
                                  {variation.location || 'No location'}
                                </div>
                                <div className="flex items-center">
                                  <Users size={14} className="mr-2" />
                                  {getSafeInstructor(variation)}
                                </div>
                              </div>
                              <button 
                                onClick={() => startEditingVariation(variation, index)}
                                className="w-full mt-3 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium"
                              >
                                Edit Variation
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Resources, Exams & Assignments */}
                <div className="space-y-6">
                  {/* Upcoming Assignments */}
                  <div>
                    <h3 className="text-lg font-medium mb-4 border-b border-neutral-700 pb-2 flex items-center">
                      <CalendarIcon size={18} className="mr-2" />
                      Upcoming Assignments
                    </h3>
                    <div className="space-y-2">
                      {getAssignmentsForClass(selectedClass.baseName).length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                          No upcoming assignments found
                        </div>
                      ) : (
                        getAssignmentsForClass(selectedClass.baseName).map((assignment, index) => {
                          const dueInfo = formatDueDate(assignment.dueDate);
                          
                          return (
                            <div key={index} className="bg-neutral-700/30 rounded-lg p-3 hover:bg-neutral-600/30 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-white truncate">{assignment.text}</h4>
                                {dueInfo && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${dueInfo.color} bg-neutral-800/50`}>
                                    {dueInfo.label}
                                  </span>
                                )}
                              </div>
                              {assignment.description && (
                                <p className="text-sm text-gray-400 truncate">{assignment.description}</p>
                              )}
                              {assignment.dueDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Due: {format(assignment.dueDate, "EEE, MMM d &apos;at&apos; h:mm a")}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Exam Dates */}
                  <div>
                    <h3 className="text-lg font-medium mb-4 border-b border-neutral-700 pb-2">Exam Dates</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-3 text-blue-400" />
                          <div>
                            <span className="font-medium">Midterm Exam </span>
                            {selectedClass.mainClass.midtermDate ? (
                              <div>
                                <span className="text-sm text-gray-300">
                                  {format(new Date(selectedClass.mainClass.midtermDate), "EEEE, MMMM d, yyyy")}
                                </span>
                                {formatExamDate(selectedClass.mainClass.midtermDate) && (
                                  <span className={`ml-2 text-xs font-medium ${formatExamDate(selectedClass.mainClass.midtermDate)?.color}`}>
                                    {formatExamDate(selectedClass.mainClass.midtermDate)?.label}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Not scheduled</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-3 text-red-400" />
                          <div>
                            <span className="font-medium">Final Exam </span>
                            {selectedClass.mainClass.finalDate ? (
                              <div>
                                <span className="text-sm text-gray-300">
                                  {format(new Date(selectedClass.mainClass.finalDate), "EEEE, MMMM d, yyyy")}
                                </span>
                                {formatExamDate(selectedClass.mainClass.finalDate) && (
                                  <span className={`ml-2 text-xs font-medium ${formatExamDate(selectedClass.mainClass.finalDate)?.color}`}>
                                    {formatExamDate(selectedClass.mainClass.finalDate)?.label}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">Not scheduled</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resources */}
                  <div>
                    <h3 className="text-lg font-medium mb-4 border-b border-neutral-700 pb-2">Resources</h3>
                    <div className="space-y-3">
                      {selectedClass.mainClass?.canvasLink && (
                        <a 
                          href={selectedClass.mainClass.canvasLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-600/30 transition-colors"
                        >
                          <div className="flex items-center">
                            <Link size={16} className="mr-3 text-blue-400" />
                            <span>Canvas Course</span>
                          </div>
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                      )}
                      
                      {selectedClass.mainClass?.notesLink && (
                        <a 
                          href={selectedClass.mainClass.notesLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-600/30 transition-colors"
                        >
                          <div className="flex items-center">
                            <Notebook size={16} className="mr-3 text-green-400" />
                            <span>Class Notes</span>
                          </div>
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                      )}
                      
                      {selectedClass.mainClass?.location && (
                        <a 
                          href={generateMapsUrl(selectedClass.mainClass.location)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 bg-neutral-700/30 rounded-lg hover:bg-neutral-600/30 transition-colors"
                        >
                          <div className="flex items-center">
                            <MapPin size={16} className="mr-3 text-orange-400" />
                            <span>Google Maps</span>
                          </div>
                          <ExternalLink size={14} className="text-gray-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8 pt-6 border-t border-neutral-700">
                <button 
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
                  onClick={() => handleDeleteClassGroup(selectedClass)}
                >
                  <Trash2 size={16} className="inline mr-2" />
                  Delete All Variations
                </button>
                <button 
                  onClick={syncCanvasGrades}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Sync Grades from Canvas
                </button>
                <div className="flex space-x-3">
                  <button 
                    className="px-6 py-2 border border-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors font-medium"
                    onClick={() => setShowAddClassModal(true)}
                  >
                    <Plus size={16} className="inline mr-2" />
                    Add Variation
                  </button>
                </div>
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
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-2xl border border-neutral-700 max-h-[90vh] overflow-y-auto"
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
                  <label className="block text-sm font-medium text-gray-300 mb-1">Class Type</label>
                  <select 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={newClass.classType}
                    onChange={(e) => setNewClass({...newClass, classType: e.target.value})}
                  >
                    {classTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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

                {/* Resources Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Canvas Link</label>
                    <input 
                      type="url" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={newClass.canvasLink}
                      onChange={(e) => setNewClass({...newClass, canvasLink: e.target.value})}
                      placeholder="https://canvas.instructure.com/..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Notes Link</label>
                    <input 
                      type="url" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={newClass.notesLink}
                      onChange={(e) => setNewClass({...newClass, notesLink: e.target.value})}
                      placeholder="https://docs.google.com/document/..."
                    />
                  </div>
                </div>

                {/* Exam Dates Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Midterm Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={newClass.midtermDate}
                      onChange={(e) => setNewClass({...newClass, midtermDate: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Final Exam Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={newClass.finalDate}
                      onChange={(e) => setNewClass({...newClass, finalDate: e.target.value})}
                    />
                  </div>
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
                  disabled={!newClass.name.trim() || newClass.days.length === 0}
                >
                  Add Class
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Class Modal - Updated with gradients */}
      {editingClass && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-800 rounded-lg shadow-lg w-full max-w-2xl border border-neutral-700 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Edit Class Variation</h2>
                  <p className="text-sm text-gray-400">
                    Editing {getClassTypeLabel(editingClass.classType)} variation
                  </p>
                </div>
                <button onClick={() => {
                  setEditingClass(null);
                  setEditingVariationIndex(0);
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
                    value={editingClass.name || ''}
                    onChange={(e) => setEditingClass({...editingClass, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Instructor</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editingClass.instructor || ''}
                    onChange={(e) => setEditingClass({...editingClass, instructor: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Class Type</label>
                  <select 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editingClass.classType || 'lecture'}
                    onChange={(e) => setEditingClass({...editingClass, classType: e.target.value})}
                  >
                    {classTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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
                          (editingClass.days || []).includes(day) 
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
                      value={editingClass.startTime || '09:00'}
                      onChange={(e) => setEditingClass({...editingClass, startTime: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Time *</label>
                    <input 
                      type="time" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={editingClass.endTime || '10:00'}
                      onChange={(e) => setEditingClass({...editingClass, endTime: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={editingClass.location || ''}
                    onChange={(e) => setEditingClass({...editingClass, location: e.target.value})}
                  />
                </div>

                {/* Resources Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Canvas Link</label>
                    <input 
                      type="url" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={editingClass.canvasLink || ''}
                      onChange={(e) => setEditingClass({...editingClass, canvasLink: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Notes Link</label>
                    <input 
                      type="url" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={editingClass.notesLink || ''}
                      onChange={(e) => setEditingClass({...editingClass, notesLink: e.target.value})}
                    />
                  </div>
                </div>

                {/* Exam Dates Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Midterm Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={editingClass.midtermDate || ''}
                      onChange={(e) => setEditingClass({...editingClass, midtermDate: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Final Exam Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={editingClass.finalDate || ''}
                      onChange={(e) => setEditingClass({...editingClass, finalDate: e.target.value})}
                    />
                  </div>
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
                      >
                        <div className={`w-full h-6 rounded ${color.preview}`}></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-6">
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
                  onClick={() => handleDeleteClass(editingClass.id)}
                >
                  <Trash2 size={16} className="inline mr-2" />
                  Delete This Variation
                </button>
                <div className="flex space-x-3">
                  <button 
                    className="px-4 py-2 border border-neutral-600 rounded-lg text-gray-300 hover:bg-neutral-700 transition-colors font-medium"
                    onClick={() => {
                      setEditingClass(null);
                      setEditingVariationIndex(0);
                      setFormError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium"
                    onClick={handleUpdateClass}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Keep your existing Import from Peoplesoft Modal */}
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
                    <li>Click &quot;Download (.ics)&quot; in the top right</li>
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
                  <DownloadIcon size={48} className="text-gray-400 mb-3" />
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
    </div>
  );
};

export default Classes;
