// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Layout from "@/components/Layout";
import { User, GraduationCap, Trash2, Save, AlertTriangle, Key, Download, Bomb, Shield, Database, CheckCircle } from 'lucide-react';

interface UserProfile {
  name: string;
  majors: string[];
  completedCredits: number;
  currentSemesterCredits: number;
  totalCreditsRequired: number;
  canvasApiKey: string;
  canvasUrl: string;
}

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    majors: [''],
    completedCredits: 0,
    currentSemesterCredits: 0,
    totalCreditsRequired: 120,
    canvasApiKey: '',
    canvasUrl: ''
  });
  const [isSaved, setIsSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [wipeStep, setWipeStep] = useState(0); // 0 = not started, 1 = confirming, 2 = wiping, 3 = done

  // Load user profile on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserProfile(profile);
      setFormData(profile);
    }
  }, []);

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
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

  // Save profile
  const saveProfile = () => {
    const profileToSave = {
      ...formData,
      majors: formData.majors.filter(m => m.trim() !== '')
    };
    
    localStorage.setItem('userProfile', JSON.stringify(profileToSave));
    setUserProfile(profileToSave);
    setIsSaved(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Export data
  const exportData = () => {
    const data = {
      userProfile: userProfile,
      todos: localStorage.getItem('todos'),
      schedule: localStorage.getItem('classes'),
      stats: localStorage.getItem('todoStats'),
      canvasGrades: localStorage.getItem('canvasGrades'),
      // Add any other data you want to export
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sidekick-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.userProfile) {
          localStorage.setItem('userProfile', JSON.stringify(data.userProfile));
          setUserProfile(data.userProfile);
          setFormData(data.userProfile);
        }
        if (data.todos) localStorage.setItem('todos', data.todos);
        if (data.schedule) localStorage.setItem('classes', data.schedule);
        if (data.stats) localStorage.setItem('todoStats', data.stats);
        if (data.canvasGrades) localStorage.setItem('canvasGrades', data.canvasGrades);

        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // NUCLEAR OPTION: Wipe ALL site data
  const wipeAllData = () => {
    setWipeStep(2); // Show wiping state
    
    // Add a small delay so user can see the wiping state
    setTimeout(() => {
      try {
        // Clear all localStorage keys
        localStorage.clear();
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear IndexedDB databases
        clearIndexedDB();
        
        // Clear cookies (for this domain)
        clearCookies();
        
        // Clear cache storage
        clearCaches();
        
        setWipeStep(3); // Show completion state
        
        // Redirect after a brief delay
        setTimeout(() => {
          window.location.href = '/dashboard';
          window.location.reload(); // Force reload to ensure clean state
        }, 2000);
        
      } catch (error) {
        console.error('Error wiping data:', error);
        alert('Error wiping data. Please try again.');
        setWipeStep(0);
      }
    }, 1000);
  };

  // Helper function to clear IndexedDB
  const clearIndexedDB = () => {
    if ('indexedDB' in window) {
      // This is a best-effort attempt to clear IndexedDB
      indexedDB.databases().then((databases) => {
        databases.forEach((db) => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(console.error);
    }
  };

  // Helper function to clear cookies for this domain
  const clearCookies = () => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
  };

  // Helper function to clear cache storage
  const clearCaches = async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (error) {
        console.error('Error clearing caches:', error);
      }
    }
  };

  // Start the wipe process
  const startWipeProcess = () => {
    setWipeStep(1); // Show confirmation
  };

  // Cancel wipe process
  const cancelWipe = () => {
    setWipeStep(0);
    setShowDeleteConfirm(false);
  };

  if (!userProfile && wipeStep === 0) {
    return (
      <Layout>
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <User className="mr-3" />
              Settings
            </h1>
            <p className="text-gray-400">Manage your profile and application data</p>
          </div>

          {/* Success Message */}
          {isSaved && (
            <div className="bg-green-600/20 border border-green-600 text-green-400 p-4 rounded-lg mb-6">
              Profile saved successfully!
            </div>
          )}

          {/* Wipe Process Status */}
          {wipeStep === 2 && (
            <div className="bg-yellow-600/20 border border-yellow-600 text-yellow-400 p-4 rounded-lg mb-6 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400 mx-auto mb-2"></div>
              <p>Wiping all data... Please wait.</p>
            </div>
          )}

          {wipeStep === 3 && (
            <div className="bg-green-600/20 border border-green-600 text-green-400 p-4 rounded-lg mb-6 text-center">
              <CheckCircle className="mx-auto mb-2" size={24} />
              <p>All data has been wiped! Redirecting...</p>
            </div>
          )}

          {/* Profile Settings */}
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <User className="mr-2" />
              Profile Information
            </h2>
            
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your name"
                />
              </div>

              {/* Majors */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                  <GraduationCap size={16} className="mr-2" />
                  Major(s)
                </label>
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                >
                  + Add Another Major
                </button>
              </div>

              {/* Credit Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Credits Completed
                  </label>
                  <input
                    type="number"
                    value={formData.completedCredits}
                    onChange={(e) => handleInputChange('completedCredits', parseInt(e.target.value) || 0)}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Semester Credits
                  </label>
                  <input
                    type="number"
                    value={formData.currentSemesterCredits}
                    onChange={(e) => handleInputChange('currentSemesterCredits', parseInt(e.target.value) || 0)}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Credits Required
                  </label>
                  <input
                    type="number"
                    value={formData.totalCreditsRequired}
                    onChange={(e) => handleInputChange('totalCreditsRequired', parseInt(e.target.value) || 120)}
                    className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Integration */}
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Key className="mr-2" />
              Canvas Integration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Canvas URL
                </label>
                <input
                  type="url"
                  value={formData.canvasUrl}
                  onChange={(e) => handleInputChange('canvasUrl', e.target.value)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://yourschool.instructure.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Canvas API Key
                </label>
                <input
                  type="password"
                  value={formData.canvasApiKey}
                  onChange={(e) => handleInputChange('canvasApiKey', e.target.value)}
                  className="w-full p-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your API key"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Your API key is stored locally and never sent to our servers.
                </p>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-neutral-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Database className="mr-2" />
              Data Management
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={exportData}
                className="p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center"
              >
                <Download className="mr-2" />
                Export All Data
              </button>
              
              <label className="p-4 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center justify-center cursor-pointer">
                <Save className="mr-2" />
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Nuclear Option - Ground Zero Wipe */}
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-red-400">
              <Bomb className="mr-2" />
              Nuclear Option - Ground Zero Wipe
            </h2>
            
            <div className="bg-black/30 p-4 rounded-lg mb-4">
              <div className="flex items-start space-x-3">
                <Shield className="text-red-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-red-300 font-semibold mb-2">⚠️ EXTREME CAUTION REQUIRED</h3>
                  <ul className="text-red-200 text-sm space-y-1">
                    <li>• Permanently deletes ALL application data</li>
                    <li>• Clears localStorage, sessionStorage, cookies, and caches</li>
                    <li>• Removes IndexedDB databases</li>
                    <li>• Resets the application to factory state</li>
                    <li>• This action is IRREVERSIBLE</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {wipeStep === 0 && (
              <button
                onClick={startWipeProcess}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center w-full"
              >
                <Bomb className="mr-2" />
                Initiate Ground Zero Wipe
              </button>
            )}
            
            {wipeStep === 1 && (
              <div className="space-y-4">
                <div className="bg-yellow-900/20 border border-yellow-600 p-4 rounded-lg">
                  <h4 className="text-yellow-400 font-bold mb-2 text-center">FINAL CONFIRMATION REQUIRED</h4>
                  <p className="text-yellow-200 text-sm text-center">
                    Type <code className="bg-black px-2 py-1 rounded">CONFIRM WIPE</code> to proceed
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type CONFIRM WIPE here"
                    className="flex-1 p-3 bg-neutral-700 border border-red-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    id="wipeConfirmation"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('wipeConfirmation') as HTMLInputElement;
                      if (input?.value === 'CONFIRM WIPE') {
                        wipeAllData();
                      } else {
                        alert('Please type "CONFIRM WIPE" exactly as shown to proceed.');
                      }
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                  >
                    Execute Wipe
                  </button>
                  <button
                    onClick={cancelWipe}
                    className="px-6 py-3 bg-neutral-600 text-white rounded-lg hover:bg-neutral-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={saveProfile}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center"
            >
              <Save className="mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
