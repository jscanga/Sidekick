// Create a new context for schedule data
// contexts/ScheduleContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

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
}

interface ScheduleContextType {
  classes: ClassItem[];
  setClasses: React.Dispatch<React.SetStateAction<ClassItem[]>>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedClasses = localStorage.getItem('scheduleClasses');
    if (savedClasses) {
      try {
        const parsedClasses = JSON.parse(savedClasses);
        setClasses(parsedClasses);
      } catch (error) {
        console.error('Error parsing saved classes:', error);
      }
    }
  }, []);

  // Save to localStorage whenever classes change
  useEffect(() => {
    localStorage.setItem('scheduleClasses', JSON.stringify(classes));
  }, [classes]);

  return (
    <ScheduleContext.Provider value={{ classes, setClasses }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
