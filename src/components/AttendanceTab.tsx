import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Check, X, Calendar as CalendarIcon, Save, Download, Trash2, AlertCircle } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { getKurdishWeekday } from '../utils';
import ConfirmModal from './ConfirmModal';

export default function AttendanceTab() {
  const { data, activeTeacherId, saveAttendance, deleteAttendanceRecord, clearAllAttendance } = useStore();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const subjects = data.subjects.filter(s => s.teacherId === activeTeacherId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects.length > 0 ? subjects[0].id : '');
  
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [showToast, setShowToast] = useState(false);
  
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Only show students enrolled in the selected subject, or all if none selected
  const allTeacherStudents = data.students.filter(s => s.teacherId === activeTeacherId);
  const enrolledStudentIds = subjects.find(s => s.id === selectedSubjectId)?.enrolledStudentIds || [];
  const students = selectedSubjectId 
    ? allTeacherStudents.filter(s => enrolledStudentIds.includes(s.id))
    : allTeacherStudents;

  useEffect(() => {
    // If subjects change and selected is empty, pick first
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    if (!selectedSubjectId) return;
    
    const attendanceId = `${date}_${activeTeacherId}_${selectedSubjectId}`;
    const existing = data.attendance.find(a => a.id === attendanceId);
    
    if (existing) {
      setRecords(existing.records);
    } else {
      setRecords(students.map(s => ({ studentId: s.id, present: true })));
    }
  }, [date, activeTeacherId, selectedSubjectId, data.attendance, students.length]);

  const toggleStatus = (studentId: string) => {
    setRecords(prev => {
      const exists = prev.find(r => r.studentId === studentId);
      if (exists) {
        return prev.map(r => r.studentId === studentId ? { ...r, present: !r.present } : r);
      }
      return [...prev, { studentId, present: false }];
    });
  };

  const markAll = (present: boolean) => {
    setRecords(students.map(s => ({ studentId: s.id, present })));
  };

  const exportAttendanceToCSV = () => {
    let csvContent = '\uFEFF';

    const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);
    const teacherName = activeTeacher ? activeTeacher.name : '';

    csvContent += `"مامۆستا: ${teacherName}"\n\n`;

    const headers = ['ڕێکەوت', 'ڕۆژ', 'وانە', 'ناوی فێرخواز', 'باری ئامادەبوون'].reverse();
    csvContent += headers.join(',') + '\n';

    const teacherAttendance = data.attendance
      .filter(a => a.teacherId === activeTeacherId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 100);

    teacherAttendance.forEach(attendanceRecord => {
      const subject = data.subjects.find(s => s.id === attendanceRecord.subjectId);
      const subjectName = subject ? subject.name : 'گشتی';
      const weekday = getKurdishWeekday(attendanceRecord.date);

      attendanceRecord.records.forEach(r => {
        const student = data.students.find(s => s.id === r.studentId);
        if (student) {
          const statusText = r.present ? 'ئامادەیە' : 'ئامادە نییە';
          const row = [
            attendanceRecord.date,
            `"${weekday}"`,
            `"${subjectName}"`,
            `"${student.fullName}"`,
            `"${statusText}"`
          ].reverse();
          csvContent += row.join(',') + '\n';
        }
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    if (!selectedSubjectId) {
      alert("تکایە وانەیەک هەڵبژێرە");
      return;
    }
    const attendanceId = `${date}_${activeTeacherId}_${selectedSubjectId}`;
    const attendanceRecord = {
      id: attendanceId,
      date,
      teacherId: activeTeacherId!,
      subjectId: selectedSubjectId,
      records
    };
    saveAttendance(attendanceRecord);
    
    // Also save to attendanceRecords for specific local requirement
    const localData = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    const existingIndex = localData.findIndex((a: any) => a.id === attendanceId);
    if (existingIndex >= 0) {
      localData[existingIndex] = attendanceRecord;
    } else {
      localData.push(attendanceRecord);
    }
    localStorage.setItem('attendanceRecords', JSON.stringify(localData));

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getStatus = (studentId: string) => {
    return records.find(r => r.studentId === studentId)?.present ?? true;
  };

  const presentCount = records.filter(r => r.present).length;
  const absentCount = students.length - presentCount;

  const historyRecords = data.attendance
    .filter(a => a.teacherId === activeTeacherId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const confirmClearAll = () => {
    clearAllAttendance();
    setShowClearConfirm(false);
  };

  const confirmDeleteRecord = () => {
    if (recordToDelete) {
      deleteAttendanceRecord(recordToDelete);
      setRecordToDelete(null);
    }
  };

  const exportSingleAttendance = (record: any, subjectName: string) => {
    let csvContent = '\uFEFF';
    
    const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);
    const teacherName = activeTeacher ? activeTeacher.name : '';
    csvContent += `"مامۆستا: ${teacherName}"\n\n`;
    
    const headers = ['وانە', 'ڕێکەوت', 'ڕۆژ', 'ناوی فێرخواز', 'باری ئامادەبوون'].reverse();
    csvContent += headers.join(',') + '\n';

    const weekday = getKurdishWeekday(record.date);

    record.records.forEach((r: any) => {
      const student = data.students.find(s => s.id === r.studentId);
      if (student) {
        const statusText = r.present ? 'ئامادەیە' : 'ئامادە نییە';
        const row = [
          `"${subjectName}"`,
          `"${record.date}"`,
          `"${weekday}"`,
          `"${student.fullName}"`,
          `"${statusText}"`
        ].reverse();
        csvContent += row.join(',') + '\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_${subjectName}_${record.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col">
      <ConfirmModal
        isOpen={showClearConfirm}
        message="ئایا دڵنیایت لە سڕینەوەی هەموو تۆمارەکانی ئامادەبوون؟ ئەم کردارە پاشگەزبوونەوەی تێدا نییە."
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
      <ConfirmModal
        isOpen={!!recordToDelete}
        message="ئایا دڵنیایت لە سڕینەوەی ئەم تۆمارە؟"
        onConfirm={confirmDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />
      <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">تۆمارکردنی ئامادەبوون</h2>
            <div className="flex flex-wrap items-center gap-4 text-slate-600 text-sm">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span>ڕێکەوت:</span>
                <input
                  type="date"
                  className="font-bold text-indigo-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span>وانە:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="font-bold text-indigo-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer pr-6 appearance-none outline-none"
                >
                  {subjects.length === 0 && <option value="">هیچ وانەیەک نییە</option>}
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={exportAttendanceToCSV}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">داگرتنی ئامادەبوون (Excel / CSV)</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => markAll(true)}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                هەموویان ئامادەن
              </button>
              <button
                onClick={() => markAll(false)}
                className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                هەموویان ئامادەنەبوو
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-y-auto relative">
        {showToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <Check className="w-5 h-5" />
            <span className="font-medium">ئامادەبوونی ئەمرۆ بەسەرکەوتوویی پاشەکەوت کرا</span>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">کۆی فێرخوازان</p>
            <p className="text-2xl font-bold">{students.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-emerald-600 mb-1">ئامادەبووەکان</p>
            <p className="text-2xl font-bold text-emerald-600">{presentCount}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-rose-600 mb-1">نەهاتووەکان</p>
            <p className="text-2xl font-bold text-rose-600">{absentCount}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-indigo-600 mb-1">ڕێژەی ئامادەبوون</p>
            <p className="text-2xl font-bold text-indigo-600">
              {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}٪
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr className="text-slate-500 text-sm font-medium">
                  <th className="p-4">#</th>
                  <th className="p-4">ناوی فێرخواز</th>
                  <th className="p-4">پەیوەندی</th>
                  <th className="p-4">بارودۆخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length > 0 ? (
                  students.map((student, idx) => {
                    const isPresent = getStatus(student.id);
                    return (
                      <tr 
                        key={student.id} 
                        className={`transition-colors ${isPresent ? 'hover:bg-slate-50' : 'bg-rose-50/30 hover:bg-rose-50/50'}`}
                      >
                        <td className="p-4 text-slate-400 font-mono text-sm">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="p-4 font-semibold text-slate-800">{student.fullName}</td>
                        <td className="p-4 text-xs font-mono text-slate-600" dir="ltr">{student.phone || '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name={`status-${student.id}`} 
                                checked={isPresent} 
                                onChange={() => {
                                  if (!isPresent) toggleStatus(student.id);
                                }}
                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                              />
                              <span className="text-sm">ئامادەیە</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name={`status-${student.id}`} 
                                checked={!isPresent} 
                                onChange={() => {
                                  if (isPresent) toggleStatus(student.id);
                                }}
                                className="w-4 h-4 text-rose-600 border-slate-300 focus:ring-rose-500"
                              />
                              <span className={`text-sm ${!isPresent ? 'text-rose-600 font-bold' : ''}`}>نەهاتووە</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      هیچ فێرخوازێک نییە، تکایە فێرخواز زیاد بکە.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <span>💾 پاشەکەوتکردنی لیستی ئامادەبوون</span>
            </button>
          </div>
        </div>

        {/* Attendance History Section */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              مێژووی ئامادەبوون
            </h3>
            {historyRecords.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-rose-600 bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors flex items-center gap-2 border border-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                سڕینەوەی هەموو ئامادەبوونییەکان
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {historyRecords.length > 0 ? historyRecords.map(record => {
              const present = record.records.filter(r => r.present).length;
              const absent = record.records.length - present;
              const subjectName = data.subjects.find(s => s.id === record.subjectId)?.name || 'گشتی';
              
              return (
                <div key={record.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm font-mono text-indigo-600 flex items-center gap-2">
                        {subjectName} - {record.date} <span className="text-slate-500 font-sans text-xs">({getKurdishWeekday(record.date)})</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{present} ئامادە</span>
                      <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{absent} نەهاتوو</span>
                      <button
                        onClick={() => exportSingleAttendance(record, subjectName)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="داگرتن (CSV)"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRecordToDelete(record.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="سڕینەوە"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {record.records.map(r => {
                        const student = data.students.find(s => s.id === r.studentId);
                        if (!student) return null;
                        
                        return (
                          <div key={r.studentId} className="flex justify-between items-center p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                            <span className="text-sm font-medium text-slate-700 truncate ml-2" title={student.fullName}>
                              {student.fullName}
                            </span>
                            {r.present ? (
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md shrink-0">
                                ئامادەیە
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-md shrink-0">
                                ئامادە نییە
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center p-8 bg-white border border-slate-200 rounded-xl text-slate-500">
                هیچ مێژوویەکی ئامادەبوون تۆمار نەکراوە.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
