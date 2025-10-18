// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTodos } from '@/contexts/todocontext';
import { useSchedule } from '@/contexts/schedulecontext';
import { format, startOfDay, isThisWeek, differenceInCalendarDays } from 'date-fns';
import Layout from "@/components/Layout";
import { motion } from 'framer-motion';
import { BookOpen, User, GraduationCap, Calendar, Download, Key, Plus } from 'lucide-react';
import { useGradeStorage } from '@/hooks/useGradeStorage';
import GPARing from '@/components/GPARing';

interface UserProfile {
  name: string;
  majors: string[];
  completedCredits: number;
  currentSemesterCredits: number;
  totalCreditsRequired: number;
  canvasApiKey: string;
  canvasUrl: string;
}

export default function DashboardPage() {
  const { stats, todos } = useTodos();
  const { classes } = useSchedule();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    majors: [''],
    completedCredits: 0,
    currentSemesterCredits: 0,
    totalCreditsRequired: 120,
    canvasApiKey: '',
    canvasUrl: ''
  });

  // Check if user profile exists on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
      setShowSetup(false);
    } else {
      setShowSetup(true);
    }
  }, []);

  // Save profile to localStorage
  const saveProfile = (profile: UserProfile) => {
    localStorage.setItem('userProfile', JSON.stringify(profile));
    setUserProfile(profile);
    setShowSetup(false);
  };

  // Get today's classes
  const getTodaysClasses = () => {
    const today = new Date();
    const dayAbbr = format(today, 'EEE').slice(0, 3); // "Mon", "Tue", etc.
    
    return classes.filter(cls => 
      cls.days.includes(dayAbbr)
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Get upcoming tasks for the week
  const getUpcomingTasks = () => {
    const today = startOfDay(new Date());
    return todos
      .filter(todo => !todo.completed && todo.dueDate && isThisWeek(todo.dueDate))
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, 5); // Show only next 5 tasks
  };

  // Calculate degree progress
  const calculateDegreeProgress = () => {
    if (!userProfile) return { completed: 0, inProgress: 0, total: 120 };
    
    const completed = userProfile.completedCredits;
    const inProgress = userProfile.currentSemesterCredits;
    const total = userProfile.totalCreditsRequired;
    
    return {
      completed: (completed / total) * 100,
      inProgress: (inProgress / total) * 100,
      total: 100
    };
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle major changes
  const handleMajorChange = (index: number, value: string) => {
    const newMajors = [...formData.majors];
    newMajors[index] = value;
    setFormData(prev => ({ ...prev, majors: newMajors }));
  };

  const addMajor = () => {
    setFormData(prev => ({ ...prev, majors: [...prev.majors, ''] }));
  };

  const removeMajor = (index: number) => {
    if (formData.majors.length > 1) {
      const newMajors = formData.majors.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, majors: newMajors }));
    }
  };

  // Helper functions for semester calculations
  const getCurrentSemester = () => {
    const today = new Date();
    const month = today.getMonth() + 1; // January = 1
    
    if (month >= 1 && month <= 5) return 'Spring';
    if (month >= 8 && month <= 12) return 'Fall';
    return 'Summer'; // Handle summer term if needed
  };

  const getSemesterStart = () => {
    const today = new Date();
    const year = today.getFullYear();
    const semester = getCurrentSemester();
    
    if (semester === 'Spring') {
      return new Date(year, 0, 12); // January 12th
    } else if (semester === 'Fall') {
      return new Date(year, 7, 25); // August 25th
    }
    return new Date(); // Fallback for summer
  };

  const getSemesterEnd = () => {
    const today = new Date();
    const year = today.getFullYear();
    const semester = getCurrentSemester();
    
    if (semester === 'Spring') {
      return new Date(year, 4, 2); // May 2nd
    } else if (semester === 'Fall') {
      return new Date(year, 11, 13); // December 13th
    }
    return new Date(); // Fallback for summer
  };

  const getSemesterProgress = () => {
    const start = getSemesterStart();
    const end = getSemesterEnd();
    const today = new Date();
    
    // Ensure we're within the semester dates
    if (today < start) return 0;
    if (today > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    
    return (elapsedDuration / totalDuration) * 100;
  };

  const getWeeksRemaining = () => {
    const end = getSemesterEnd();
    const today = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    
    const weeksRemaining = Math.ceil((end.getTime() - today.getTime()) / msPerWeek);
    return Math.max(0, weeksRemaining);
  };

  // Setup Wizard Steps
  const renderSetupStep = () => {
    switch (setupStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-blue-400">Welcome to Sidekick! 👋</h3>
            <p className="text-gray-300">Let&apos;s get you set up with your academic profile.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What do you want to be called?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Major(s)</label>
                {formData.majors.map((major, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => handleMajorChange(index, e.target.value)}
                      className="flex-1 p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Major ${index + 1}`}
                    />
                    {formData.majors.length > 1 && (
                      <button
                        onClick={() => removeMajor(index)}
                        className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addMajor}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  <Plus size={16} className="mr-2" />
                  Add Another Major
                </button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-blue-400">Degree Progress 🎓</h3>
            <p className="text-gray-300">Tell us about your credit progress.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Credits Completed</label>
                <input
                  type="number"
                  value={formData.completedCredits}
                  onChange={(e) => handleInputChange('completedCredits', parseInt(e.target.value) || 0)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 45"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Semester Credits</label>
                <input
                  type="number"
                  value={formData.currentSemesterCredits}
                  onChange={(e) => handleInputChange('currentSemesterCredits', parseInt(e.target.value) || 0)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 15"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Credits Required</label>
                <input
                  type="number"
                  value={formData.totalCreditsRequired}
                  onChange={(e) => handleInputChange('totalCreditsRequired', parseInt(e.target.value) || 120)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Typically 120"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-blue-400">Import Your Data 📊</h3>
            <p className="text-gray-300">Connect your accounts to automatically sync data.</p>
            
            <div className="space-y-6">
              <div className="bg-neutral-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-lg mb-2 flex items-center">
                  <Download className="mr-2" />
                  Import from Peoplesoft
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  Upload your .ics file to import your class schedule
                </p>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                  Import Schedule
                </button>
              </div>
              
              <div className="bg-neutral-700/50 p-4 rounded-lg">
                <h4 className="font-semibold text-lg mb-2 flex items-center">
                  <Key className="mr-2" />
                  Canvas API Integration
                </h4>
                <p className="text-gray-400 text-sm mb-3">
                  Connect to Canvas to automatically import assignments
                </p>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={formData.canvasUrl}
                    onChange={(e) => handleInputChange('canvasUrl', e.target.value)}
                    className="w-full p-2 bg-neutral-600 border border-neutral-500 rounded text-white text-sm"
                    placeholder="https://yourschool.instructure.com"
                  />
                  <input
                    type="password"
                    value={formData.canvasApiKey}
                    onChange={(e) => handleInputChange('canvasApiKey', e.target.value)}
                    className="w-full p-2 bg-neutral-600 border border-neutral-500 rounded text-white text-sm"
                    placeholder="Canvas API Key"
                  />
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm">
                    Connect Canvas
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Safe defaults for stats
  const bestDay = stats.bestDay || { date: new Date(), count: 0 };
  const bestWeek = stats.bestWeek || { weekStart: new Date(), count: 0 };
  const bestMonth = stats.bestMonth || { monthStart: new Date(), count: 0 };
  const mostProductiveWeekday = stats.mostProductiveWeekday || { weekday: 'None', average: 0 };
  const completedByWeekday = stats.completedByWeekday || {};
  const completedByCategory = stats.completedByCategory || {
    academics: 0,
    health: 0,
    financial: 0,
    social: 0,
    other: 0
  };

  if (showSetup) {
    return (
      <Layout>
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-neutral-800 rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-2">Sidekick Setup</h1>
              <p className="text-gray-400">Let&apos;s personalize your academic dashboard</p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between mb-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === setupStep ? 'bg-blue-600' : step < setupStep ? 'bg-green-600' : 'bg-neutral-600'
                    }`}>
                      {step}
                    </div>
                    <span className="text-sm mt-1 text-gray-400">
                      {step === 1 ? 'Profile' : step === 2 ? 'Progress' : 'Import'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {renderSetupStep()}

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setSetupStep(Math.max(1, setupStep - 1))}
                disabled={setupStep === 1}
                className="px-6 py-2 border border-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              
              {setupStep < 3 ? (
                <button
                  onClick={() => setSetupStep(setupStep + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => saveProfile({
                    name: formData.name,
                    majors: formData.majors.filter(m => m.trim() !== ''),
                    completedCredits: formData.completedCredits,
                    currentSemesterCredits: formData.currentSemesterCredits,
                    totalCreditsRequired: formData.totalCreditsRequired,
                    canvasApiKey: formData.canvasApiKey,
                    canvasUrl: formData.canvasUrl
                  })}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  Complete Setup
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const degreeProgress = calculateDegreeProgress();
  const todaysClasses = getTodaysClasses();
  const upcomingTasks = getUpcomingTasks();

  return (
    <Layout>
      <div className="min-h-screen bg-neutral-950 text-white">
        {/* Updated Header with Improved Degree Progress */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 p-8 border-b border-neutral-700">
          <div className="max-w-8xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* Left: GPA Ring */}
              <div className="mt-20 transform scale-130">
                <GPARing />
              </div>
              {/* Right: Welcome and Degree Progress */}
              <div className="flex-1 min-w-0">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold mb-2 flex items-center">
                    <User className="mr-4 w-8 h-8" />
                    Welcome back, {userProfile?.name}!
                  </h1>
                  <p className="text-gray-300 text-lg flex items-center">
                    <GraduationCap size={20} className="mr-3" />
                    {userProfile?.majors.filter(m => m.trim() !== '').join(' • ') || 'Undeclared'}
                  </p>
                </div>
                {/* Enhanced Degree Progress Bar */}
                <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Degree Progress</span>
                    <span className="text-lg font-bold">
                      {userProfile?.completedCredits || 0} / {userProfile?.totalCreditsRequired || 120} credits
                      ({Math.round(degreeProgress.completed)}%)
                    </span>
                  </div>
                  
                  {/* Main Progress Bar */}
                  <div className="relative w-full bg-neutral-700 rounded-full h-8 overflow-hidden">
                    {/* Completed Progress - Animated */}
                    <motion.div 
                      className="absolute top-0 left-0 h-8 bg-gradient-to-r from-fuchsia-600 to-sky-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${degreeProgress.completed}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    
                    {/* In Progress - Animated */}
                    <motion.div 
                      className="absolute top-0 left-0 h-8 bg-gradient-to-r from-fuchsia-400 to-sky-400 opacity-40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${degreeProgress.completed + degreeProgress.inProgress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    />
                    
                    {/* Progress Indicator */}
                    <motion.div
                      className="absolute top-0 h-8 w-1 bg-white/20 rounded-full"
                      initial={{ left: 0 }}
                      animate={{ left: `${degreeProgress.completed + degreeProgress.inProgress}%` }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                  
                  {/* Progress Labels */}
                  <div className="flex justify-between text-sm text-gray-400 mt-3">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                      <span>Completed: {Math.round(degreeProgress.completed)}%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></div>
                      <span>In Progress: {Math.round(degreeProgress.inProgress)}%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-neutral-700 rounded-full mr-2"></div>
                      <span>Remaining: {Math.round(100 - degreeProgress.completed - degreeProgress.inProgress)}%</span>
                    </div>
                  </div>
                  
                  {/* Semester Progress */}
                  {userProfile?.currentSemesterCredits && userProfile.currentSemesterCredits > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">Current Semester Progress</span>
                        <span className="text-sm">{userProfile.currentSemesterCredits} credits in progress</span>
                      </div>
                      
                      {/* Semester Timeline */}
                      <div className="w-full bg-neutral-700 rounded-full h-2 mb-2 relative">
                        <motion.div 
                          className="bg-emerald-400 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${getSemesterProgress()}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 1 }}
                        />
                      </div>
                      
                      {/* Semester Info */}
                      <div className="flex justify-between text-xs text-gray-400">
                        <div>
                          <div className="font-medium">{getCurrentSemester()} Term</div>
                          <div>{format(getSemesterStart(), 'MMM d')} - {format(getSemesterEnd(), 'MMM d, yyyy')}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{getSemesterProgress().toFixed(1)}% Complete</div>
                          <div>{getWeeksRemaining()} weeks remaining</div>
                        </div>
                      </div>
                      
                      {/* Today's Indicator */}
                      <div className="relative -mt-1">
                        <div 
                          className="absolute -top-8 h-5 w-0.5 bg-red-400 rounded-full"
                          style={{ left: `${getSemesterProgress()}%` }}
                        >
                          <div className="absolute -bottom-5 -left-2 text-xs text-red-400 font-semibold">
                            Today
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6">
          {/* Today's Schedule and Upcoming Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Today's Classes */}
            <div className="bg-neutral-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Calendar className="mr-2" />
                Today&apos;s Classes
              </h2>
              {todaysClasses.length > 0 ? (
                <div className="space-y-3">
                  {todaysClasses.map((cls, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
                      <div>
                        <h3 className="font-semibold">{cls.name}</h3>
                        <p className="text-sm text-gray-400">
                          {cls.startTime} - {cls.endTime} • {cls.location}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${cls.color.replace('bg-', 'bg-').split(' ')[0]}`}></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No classes today</p>
                </div>
              )}
            </div>

            {/* Upcoming Tasks */}
            <div className="bg-neutral-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Upcoming Tasks This Week</h2>
              {upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {upcomingTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-700/50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold truncate">{task.text}</h3>
                        {task.dueDate && (
                          <p className="text-sm text-gray-400">
                            Due {format(task.dueDate, "EEE, MMM d")}
                            {differenceInCalendarDays(task.dueDate, new Date()) === 0 && (
                              <span className="text-red-400 ml-2">• Today</span>
                            )}
                          </p>
                        )}
                      </div>
                      <span className="text-lg">{task.category === 'academics' ? '📚' : 
                                               task.category === 'health' ? '🏃' : 
                                               task.category === 'financial' ? '💵' : 
                                               task.category === 'social' ? '👋' : '📝'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No upcoming tasks this week</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Productivity Analytics</h2>
            
            {/* Current Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-neutral-700 p-4 rounded-lg text-center">
                <h3 className="text-xl font-bold text-blue-400">{stats.totalCompleted || 0}</h3>
                <p className="text-neutral-400 text-sm">Total Completed</p>
              </div>
              
              <div className="bg-neutral-700 p-4 rounded-lg text-center">
                <h3 className="text-xl font-bold text-emerald-400">{stats.completedToday || 0}</h3>
                <p className="text-neutral-400 text-sm">Today</p>
              </div>
              
              <div className="bg-neutral-700 p-4 rounded-lg text-center">
                <h3 className="text-xl font-bold text-emerald-400">{stats.completedThisWeek || 0}</h3>
                <p className="text-neutral-400 text-sm">This Week</p>
              </div>
              
              <div className="bg-neutral-700 p-4 rounded-lg text-center">
                <h3 className="text-xl font-bold text-yellow-400">{stats.completedThisMonth || 0}</h3>
                <p className="text-neutral-400 text-sm">This Month</p>
              </div>
              
              <div className="bg-neutral-700 p-4 rounded-lg text-center">
                <h3 className="text-xl font-bold text-yellow-400">{stats.completedThisYear || 0}</h3>
                <p className="text-neutral-400 text-sm">This Year</p>
              </div>

              <div className="bg-neutral-700 p-4 rounded-lg text-center">
                <h3 className="text-xl font-bold text-orange-400">{stats.currentStreak || 0}</h3>
                <p className="text-neutral-400 text-sm">Day Streak</p>
              </div>
            </div>

            {/* Productivity Records & Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Productivity Records */}
              <div className="bg-neutral-700/50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-6 text-blue-400">Productivity Records</h3>
                
                <div className="space-y-6">
                  {/* Best Day */}
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-300 mb-2">Best Day</h4>
                    {bestDay.count > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-emerald-400">
                          {format(bestDay.date, 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-neutral-400 mt-1">
                          ({bestDay.count} tasks completed)
                        </div>
                      </>
                    ) : (
                      <div className="text-neutral-400 italic">No completed tasks yet</div>
                    )}
                  </div>
                  
                  {/* Best Week */}
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-300 mb-2">Best Week</h4>
                    {bestWeek.count > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-emerald-400">
                          Week of {format(bestWeek.weekStart, 'MMM d, yyyy')}
                        </div>
                        <div className="text-sm text-neutral-400 mt-1">
                          ({bestWeek.count} tasks completed)
                        </div>
                      </>
                    ) : (
                      <div className="text-neutral-400 italic">No completed tasks yet</div>
                    )}
                  </div>
                  
                  {/* Best Month */}
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-300 mb-2">Best Month</h4>
                    {bestMonth.count > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-yellow-400">
                          {format(bestMonth.monthStart, 'MMMM yyyy')}
                        </div>
                        <div className="text-sm text-neutral-400 mt-1">
                          ({bestMonth.count} tasks completed)
                        </div>
                      </>
                    ) : (
                      <div className="text-neutral-400 italic">No completed tasks yet</div>
                    )}
                  </div>
                  
                  {/* Longest Streak */}
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-300 mb-2">Longest Streak</h4>
                    <div className="text-2xl font-bold text-orange-400">
                      {stats.longestStreak || 0} days {stats.longestStreak > 0 ? '🔥' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Productivity Patterns */}
              <div className="bg-neutral-700/50 p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-6 text-blue-400">Productivity Patterns</h3>
                
                <div className="space-y-6">
                  {/* Most Productive Day */}
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-300 mb-2">Most Productive Day</h4>
                    {mostProductiveWeekday.average > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-emerald-400">
                          {mostProductiveWeekday.weekday}
                        </div>
                        <div className="text-sm text-neutral-400 mt-1">
                          (Average: {mostProductiveWeekday.average} tasks/day)
                        </div>
                      </>
                    ) : (
                      <div className="text-neutral-400 italic">No data yet</div>
                    )}
                  </div>
                  
                  {/* Weekly Averages */}
                  <div>
                    <h4 className="text-lg font-semibold text-neutral-300 mb-3">Weekly Averages</h4>
                    <div className="space-y-2 text-sm">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                        const weekdayData = completedByWeekday[index] || { total: 0, average: 0 };
                        return (
                          <div key={day} className="flex justify-between items-center py-2 border-b border-neutral-600 last:border-b-0">
                            <span className="text-neutral-300">{day}:</span>
                            <div className="text-right">
                              <span className="text-emerald-400 font-medium">{weekdayData.average.toFixed(1)}</span>
                              <span className="text-neutral-500 text-xs ml-2">avg</span>
                              <span className="text-neutral-500 text-xs ml-2">({weekdayData.total} total)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-neutral-700/50 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-bold mb-6 text-blue-400">Completed by Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{completedByCategory.academics || 0}</div>
                  <p className="text-neutral-400 text-sm mt-1">📚 Academics</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{completedByCategory.health || 0}</div>
                  <p className="text-neutral-400 text-sm mt-1">🏃 Health</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{completedByCategory.financial || 0}</div>
                  <p className="text-neutral-400 text-sm mt-1">💵 Financial</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{completedByCategory.social || 0}</div>
                  <p className="text-neutral-400 text-sm mt-1">👋 Social</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{completedByCategory.other || 0}</div>
                  <p className="text-neutral-400 text-sm mt-1">📝 Other</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
