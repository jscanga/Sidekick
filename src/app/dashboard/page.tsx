// app/stats/page.tsx
'use client';

import { useTodos } from '@/contexts/todocontext';
import { format } from 'date-fns';
import Layout from "@/components/Layout";
import type { AppProps } from "next/app";

export default function StatsPage() {
  const { stats } = useTodos();

  // Safe defaults for when there's no data
  const bestDay = stats.bestDay || { date: new Date(), count: 0 };
  const bestWeek = stats.bestWeek || { weekStart: new Date(), count: 0 };
  const bestMonth = stats.bestMonth || { monthStart: new Date(), count: 0 };
  const bestYear = stats.bestYear || { year: new Date().getFullYear(), count: 0 };
  const mostProductiveWeekday = stats.mostProductiveWeekday || { weekday: 'None', average: 0 };
  const completedByWeekday = stats.completedByWeekday || {};
  const completedByCategory = stats.completedByCategory || {
    academics: 0,
    health: 0,
    financial: 0,
    social: 0,
    other: 0
  };

  return (
    <Layout>
    <div className="min-h-screen bg-neutral-950 text-white flex">
      
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Productivity Analytics</h1>
          
          {/* Current Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-blue-400">{stats.totalCompleted || 0}</h2>
              <p className="text-neutral-400">Total Completed</p>
            </div>
            
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-emerald-400">{stats.completedToday || 0}</h2>
              <p className="text-neutral-400">Today</p>
            </div>
            
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-emerald-400">{stats.completedThisWeek || 0}</h2>
              <p className="text-neutral-400">This Week</p>
            </div>
            
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-yellow-400">{stats.completedThisMonth || 0}</h2>
              <p className="text-neutral-400">This Month</p>
            </div>
            
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-yellow-400">{stats.completedThisYear || 0}</h2>
              <p className="text-neutral-400">This Year</p>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-orange-400">{stats.currentStreak || 0} 🔥</h2>
              <p className="text-neutral-400">Current Streak (days)</p>
            </div>
          </div>

          {/* Productivity Records */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-6 text-blue-400">Productivity Records</h2>
              
              <div className="space-y-6">
                {/* Best Day */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Best Day</h3>
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
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Best Week</h3>
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
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Best Month</h3>
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
                
                {/* Best Year */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Best Year</h3>
                  {bestYear.count > 0 ? (
                    <>
                      <div className="text-2xl font-bold text-yellow-400">
                        {bestYear.year}
                      </div>
                      <div className="text-sm text-neutral-400 mt-1">
                        ({bestYear.count} tasks completed)
                      </div>
                    </>
                  ) : (
                    <div className="text-neutral-400 italic">No completed tasks yet</div>
                  )}
                </div>

                {/* Longest Streak */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Longest Streak</h3>
                  <div className="text-2xl font-bold text-orange-400">
                    {stats.longestStreak || 0} days {stats.longestStreak > 0 ? '🔥' : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-6 text-blue-400">Productivity Patterns</h2>
              
              <div className="space-y-6">
                {/* Most Productive Day */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-300 mb-2">Most Productive Day</h3>
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
                  <h3 className="text-lg font-semibold text-neutral-300 mb-3">Weekly Averages</h3>
                  <div className="space-y-2 text-sm">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => {
                      const weekdayData = completedByWeekday[index] || { total: 0, average: 0 };
                      return (
                        <div key={day} className="flex justify-between items-center py-1 border-b border-neutral-700 last:border-b-0">
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
          <div className="bg-neutral-800 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Completed by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{completedByCategory.academics || 0}</div>
                <p className="text-neutral-400 mt-1">📚 Academics</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">{completedByCategory.health || 0}</div>
                <p className="text-neutral-400 mt-1">🏃 Health</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">{completedByCategory.financial || 0}</div>
                <p className="text-neutral-400 mt-1">💵 Financial</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">{completedByCategory.social || 0}</div>
                <p className="text-neutral-400 mt-1">👋 Social</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{completedByCategory.other || 0}</div>
                <p className="text-neutral-400 mt-1">📝 Other</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <a 
              href="/todos" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              ← Back to Todo List
            </a>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
}