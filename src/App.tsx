import React, { useState } from 'react';
import { StoreProvider, useStore } from './store';
import TeacherSelector from './components/TeacherSelector';
import StudentsTab from './components/StudentsTab';
import ClassesMarksTab from './components/ClassesMarksTab';
import AttendanceTab from './components/AttendanceTab';
import ReportsTab from './components/ReportsTab';
import InstallPWA from './components/InstallPWA';
import InstallWindows from './components/InstallWindows';
import { Users, BookOpen, CalendarCheck, FileText, Settings } from 'lucide-react';
import { convertToArabicNumerals } from './utils';

function AppContent() {
  const { data, activeTeacherId, exportData, importData, importStudentCSV } = useStore();
  const [activeTab, setActiveTabState] = useState<'students' | 'classes' | 'attendance' | 'reports' | 'settings'>(() => {
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && ['students', 'classes', 'attendance', 'reports', 'settings'].includes(savedTab)) {
      return savedTab as 'students' | 'classes' | 'attendance' | 'reports' | 'settings';
    }
    return 'students';
  });

  const setActiveTab = (tab: 'students' | 'classes' | 'attendance' | 'reports' | 'settings') => {
    setActiveTabState(tab);
    localStorage.setItem('activeTab', tab);
  };

  const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let successCount = 0;
    let fallbackToLegacy = false;
    let legacyContent = '';

    const processFile = (file: File): Promise<void> => {
      return new Promise((resolve) => {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            const content = event.target.result;
            // Handle CSV explicitly or detection logic
            if (isCsv || content.includes('مامۆستا:') || content.includes('ناوی تەواو')) {
              const result = importStudentCSV(content);
              if (result.success) {
                successCount++;
              }
            } else {
              // Usually the overall backup file is a JSON (or looks like it), but legacy logic handles it
              fallbackToLegacy = true;
              legacyContent = content;
            }
          }
          resolve();
        };
        reader.readAsText(file, "UTF-8");
      });
    };

    await Promise.all(files.map(processFile));

    if (fallbackToLegacy && files.length === 1) {
      const success = importData(legacyContent);
      if (success) {
        alert('زانیارییەکان بە سەرکەوتویی هاوردە کران');
        setActiveTab('students');
      } else {
        alert('فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە');
      }
    } else if (successCount > 0) {
      alert(`${convertToArabicNumerals(successCount)} فایلی فێرخواز بەسەرکەوتوویی هاوردە کران!`);
      setActiveTab('students');
    } else {
       alert('فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە');
    }

    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans" dir="rtl">
      <header className="h-16 bg-indigo-700 flex items-center justify-between px-4 md:px-6 shadow-md shrink-0">
        <div className="flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-tight">بەڕێوەبەری فێرخوازان</h1>
            <p className="text-[10px] md:text-xs text-indigo-100 hidden sm:block">سیستەمی نمرە و ئامادەبوون</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InstallWindows />
          <InstallPWA />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav (Desktop) */}
        <nav className="hidden md:flex w-64 bg-white border-l border-slate-200 p-4 flex-col gap-2 shrink-0 shadow-sm overflow-y-auto">
          <div className="p-3 bg-indigo-50 rounded-xl mb-4">
            <p className="text-xs text-slate-500 mb-1">مامۆستای چالاک</p>
            {activeTeacher ? (
              <p className="font-bold text-slate-800">{activeTeacher.name}</p>
            ) : (
              <p className="font-medium text-slate-500 italic">دیارینەکراوە</p>
            )}
            <div className="mt-2">
              <TeacherSelector />
            </div>
          </div>

          <TabButton
            active={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
            icon={<Users className="w-5 h-5" />}
            label="فێرخوازان"
          />
          <TabButton
            active={activeTab === 'classes'}
            onClick={() => setActiveTab('classes')}
            icon={<BookOpen className="w-5 h-5" />}
            label="وانە و نمرە"
          />
          <TabButton
            active={activeTab === 'attendance'}
            onClick={() => setActiveTab('attendance')}
            icon={<CalendarCheck className="w-5 h-5" />}
            label="ئامادەبوون"
          />
          <TabButton
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            icon={<FileText className="w-5 h-5" />}
            label="ڕاپۆرتەکان"
          />

          <div className="mt-auto border-t border-slate-100 pt-4">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 p-3 w-full transition-all text-sm rounded-lg ${
                activeTab === 'settings' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              ڕێکخستنەکان
            </button>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 flex flex-col overflow-y-auto overflow-x-hidden relative">
          {!activeTeacherId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-indigo-300" />
              </div>
              <h2 className="text-xl text-slate-700 font-bold mb-2">تکایە مامۆستایەک هەڵبژێرە</h2>
              <p className="text-slate-500 mb-6 max-w-sm">بۆ دەستپێکردنی تۆمارکردنی فێرخوازان و نمرەکان، سەرەتا مامۆستایەک لە لیستی تەنیشتەوە هەڵبژێرە یان زیاد بکە.</p>
              <div className="block md:hidden">
                <TeacherSelector />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {activeTab === 'students' && <StudentsTab />}
              {activeTab === 'classes' && <ClassesMarksTab />}
              {activeTab === 'attendance' && <AttendanceTab />}
              {activeTab === 'reports' && <ReportsTab />}
              {activeTab === 'settings' && (
                <div id="settings-tab" className="p-6">
                  <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between print-hide">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">ڕێکخستنەکان / پاراستنی زانیاری</h2>
                      <p className="text-sm text-slate-500 mt-1">لێرە دەتوانیت زانیارییەکانت پاشەکەوت بکەیت یان هێنراو بکەیت.</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={exportData}
                        className="px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 shadow-sm transition-colors"
                      >
                        پاشەکەوتکردنی گشتی داتاکان (Excel / CSV)
                      </button>
                      <label className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm cursor-pointer transition-colors">
                        هاوردەکردنی زانیاری
                        <input type="file" id="import-file-input" accept=".csv, text/csv, text/plain, application/csv, application/vnd.ms-excel, text/x-csv, application/x-csv, *" multiple className="hidden" onChange={handleImport} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden border-t border-slate-200 bg-white p-2 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <div className="flex justify-around">
          <MobileTabButton
            active={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
            icon={<Users className="w-5 h-5" />}
            label="فێرخوازان"
          />
          <MobileTabButton
            active={activeTab === 'classes'}
            onClick={() => setActiveTab('classes')}
            icon={<BookOpen className="w-5 h-5" />}
            label="نمرە"
          />
          <MobileTabButton
            active={activeTab === 'attendance'}
            onClick={() => setActiveTab('attendance')}
            icon={<CalendarCheck className="w-5 h-5" />}
            label="ئامادەبوون"
          />
          <MobileTabButton
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            icon={<FileText className="w-5 h-5" />}
            label="ڕاپۆرت"
          />
          <button 
             onClick={() => setActiveTab('settings')}
             className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-500'}`}
          >
             <Settings className="w-5 h-5" />
             <span className="text-[10px] font-medium">ڕێکخستن</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
        active
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
      }`}
    >
      <span className="w-5 text-center flex justify-center">{icon}</span> {label}
    </button>
  );
}

function MobileTabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
        active
          ? 'text-indigo-600'
          : 'text-slate-500 hover:text-slate-900'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

