'use client';

import { useState, useEffect } from 'react';

// Add the GradeInfo interface definition
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

interface StoredGrade {
  courseId: string;
  courseName: string;
  courseCode: string;
  gradeInfo: GradeInfo;
  lastUpdated: Date;
  semester: string;
}

// Add interface for course data
interface CourseData {
  course_id: string | number;
  course_name: string;
  course_code: string;
}

// Add interface for parsed grade from localStorage
interface ParsedGrade {
  courseId: string;
  courseName: string;
  courseCode: string;
  gradeInfo: {
    currentGrade?: string | null;
    currentScore?: number | null;
    finalGrade?: string | null;
    finalScore?: number | null;
    calculatedGrade?: string | null;
    calculatedScore?: number | null;
    totalPoints?: number;
    earnedPoints?: number;
    assignmentCount?: number;
    gradedAssignmentCount?: number;
    completionPercentage?: number;
    gradingScale?: string;
    lastSynced?: string;
    gradeStatus?: 'calculated' | 'official' | 'pending' | 'not_available';
    gradeSource?: 'calculated' | 'official';
  };
  lastUpdated: string;
  semester: string;
}

export const useGradeStorage = () => {
  const [grades, setGrades] = useState<StoredGrade[]>([]);

  // Load grades from localStorage on mount
  useEffect(() => {
    const storedGrades = localStorage.getItem('canvasGrades');
    if (storedGrades) {
      try {
        const parsedGrades: ParsedGrade[] = JSON.parse(storedGrades);
        // Convert date strings back to Date objects
        const gradesWithDates = parsedGrades.map((grade: ParsedGrade) => ({
          ...grade,
          lastUpdated: new Date(grade.lastUpdated),
          gradeInfo: {
            ...grade.gradeInfo,
            lastSynced: grade.gradeInfo.lastSynced ? new Date(grade.gradeInfo.lastSynced) : undefined
          }
        }));
        setGrades(gradesWithDates);
      } catch (error) {
        console.error('Error loading stored grades:', error);
      }
    }
  }, []);

  // Save grades to localStorage
  const saveGrades = (newGrades: StoredGrade[]) => {
    setGrades(newGrades);
    localStorage.setItem('canvasGrades', JSON.stringify(newGrades));
  };

  // Add or update a grade
  const updateGrade = (courseData: CourseData, gradeInfo: GradeInfo) => {
    const semester = getCurrentSemester();
    const newGrade: StoredGrade = {
      courseId: courseData.course_id.toString(),
      courseName: courseData.course_name,
      courseCode: courseData.course_code,
      gradeInfo: gradeInfo,
      lastUpdated: new Date(),
      semester: semester
    };

    setGrades(prev => {
      const filtered = prev.filter(g => g.courseId !== newGrade.courseId);
      const updated = [...filtered, newGrade];
      localStorage.setItem('canvasGrades', JSON.stringify(updated));
      return updated;
    });

    return newGrade;
  };

  // Get grade by course code
  const getGradeByCourseCode = (courseCode: string) => {
    return grades.find(grade => 
      grade.courseCode.includes(courseCode) || 
      courseCode.includes(grade.courseCode)
    );
  };

  // Get all grades for current semester
  const getCurrentSemesterGrades = () => {
    const currentSemester = getCurrentSemester();
    return grades.filter(grade => grade.semester === currentSemester);
  };

  // Get GPA calculation
  const calculateGPA = () => {
    const currentGrades = getCurrentSemesterGrades();
    let totalCredits = 0;
    let totalPoints = 0;

    currentGrades.forEach(grade => {
      const creditHours = estimateCreditHours(grade.courseName);
      const gradePoints = convertGradeToPoints(grade.gradeInfo.calculatedGrade || grade.gradeInfo.currentGrade);
      
      if (gradePoints !== null) {
        totalPoints += gradePoints * creditHours;
        totalCredits += creditHours;
      }
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
  };

  return {
    grades,
    updateGrade,
    getGradeByCourseCode,
    getCurrentSemesterGrades,
    calculateGPA,
    saveGrades
  };
};

// Helper functions
const getCurrentSemester = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (month >= 1 && month <= 5) return `Spring ${year}`;
  if (month >= 8 && month <= 12) return `Fall ${year}`;
  return `Summer ${year}`;
};

const estimateCreditHours = (courseName: string): number => {
  // Simple estimation - you might want to make this more sophisticated
  if (courseName.toLowerCase().includes('lab')) return 1;
  if (courseName.match(/\d{4}/)) {
    // Typically, 4-digit course numbers are 3-4 credits
    return courseName.toLowerCase().includes('honors') ? 4 : 3;
  }
  return 3; // Default
};

const convertGradeToPoints = (grade: string | null | undefined): number | null => {
  if (!grade) return null;
  
  const gradeMap: { [key: string]: number } = {
    'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'D-': 0.7,
    'F': 0.0
  };

  return gradeMap[grade.toUpperCase()] || null;
};
