import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { Download, Search, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function ReportsTab() {
  const { data, activeTeacherId, deleteStudentMarks, clearAllMarks } = useStore();
  const reportRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  
  const [studentToDeleteMarks, setStudentToDeleteMarks] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const allSubjects = data.subjects.filter(s => s.teacherId === activeTeacherId);
  const displaySubjects = selectedSubjectId === 'all' 
    ? allSubjects 
    : allSubjects.filter(s => s.id === selectedSubjectId);

  const enrolledStudentIds = selectedSubjectId !== 'all' 
    ? allSubjects.find(s => s.id === selectedSubjectId)?.enrolledStudentIds || []
    : null;

  const allStudents = data.students.filter(s => s.teacherId === activeTeacherId);
  const students = allStudents.filter(s => {
    const matchesSearch = s.fullName.includes(searchTerm) || s.phone.includes(searchTerm);
    const matchesSubject = enrolledStudentIds === null || enrolledStudentIds.includes(s.id);
    return matchesSearch && matchesSubject;
  });
  
  const attendanceRecords = data.attendance.filter(a => a.teacherId === activeTeacherId);
  
  const exportReportToCSV = () => {
    let csvContent = '\uFEFF';
    
    const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);
    const teacherName = activeTeacher ? activeTeacher.name : '';
    csvContent += `"مامۆستا: ${teacherName}"\n\n`;
    
    const headers = [
      'ناوی تەواو',
      'مێژووی لەدایکبوون',
      'ژمارەی مۆبایل',
      'پیشە',
      ...(selectedSubjectId === 'all' ? ['وانەکان و نمرەکان'] : displaySubjects.map(s => s.name)),
      'تێکڕا (نمرە)',
      'ئامادەبوون بۆ وانەی'
    ].reverse();
    csvContent += headers.join(',') + '\n';

    const studentsToExport = students.slice().reverse().slice(0, 100);

    studentsToExport.forEach(student => {
      const studentData = getStudentMarks(student.id);
      const attendanceData = getStudentAttendance(student.id, selectedSubjectId);
      
      let classScores = '';
      if (selectedSubjectId === 'all') {
        classScores = displaySubjects
          .filter(sub => (sub.enrolledStudentIds || []).includes(student.id) || studentData.marks[sub.name] !== '-')
          .map(sub => `${sub.name}: ${studentData.marks[sub.name] !== '-' ? studentData.marks[sub.name] : 'تۆمارنەکراوە'}`)
          .join(' | ');
      }
      
      const row = [
        `"${student.fullName}"`,
        `"${student.birthdate || ''}"`,
        `"${student.phone}"`,
        `"${student.job}"`,
        ...(selectedSubjectId === 'all' ? [`"${classScores}"`] : displaySubjects.map(sub => studentData.marks[sub.name])),
        studentData.average,
        `"${attendanceData.formatted}"`
      ].reverse();
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Student_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStudentMarks = (studentId: string) => {
    let totalScore = 0;
    let count = 0;
    
    const marksBySubject: Record<string, string | number> = {};
    
    displaySubjects.forEach(subject => {
      const mark = data.marks.find(m => m.studentId === studentId && m.subjectId === subject.id);
      if (mark && mark.score !== '') {
        marksBySubject[subject.name] = mark.score;
        totalScore += Number(mark.score);
        count++;
      } else {
        marksBySubject[subject.name] = '-';
      }
    });

    return {
      marks: marksBySubject,
      average: count > 0 ? (totalScore / count).toFixed(2) : '-'
    };
  };

  const getStudentAttendance = (studentId: string, specificSubjectId?: string) => {
    let filteredAttendance = attendanceRecords;
    if (specificSubjectId && specificSubjectId !== 'all') {
      filteredAttendance = attendanceRecords.filter(a => a.subjectId === specificSubjectId);
      
      let presentCount = 0;
      let validRecords = 0;
      
      filteredAttendance.forEach(day => {
        const record = day.records.find(r => r.studentId === studentId);
        if (record) {
          validRecords++;
          if (record.present) presentCount++;
        }
      });

      if (validRecords === 0) return { present: 0, absent: 0, total: 0, percentage: '-', formatted: '-' };

      const absentCount = validRecords - presentCount;
      const percentage = Math.round((presentCount / validRecords) * 100);
      return {
        present: presentCount,
        absent: absentCount,
        total: validRecords,
        percentage: `${percentage}%`,
        formatted: `هاتوو: ${presentCount} | نەهاتوو: ${absentCount} (${percentage}%)`
      };
    } else {
      const subjectAttendances: Record<string, string> = {};
      let totalPresent = 0;
      let totalValid = 0;

      displaySubjects.forEach(subject => {
        const subjAttendance = attendanceRecords.filter(a => a.subjectId === subject.id);
        let pCount = 0;
        let vRecords = 0;
        
        subjAttendance.forEach(day => {
          const record = day.records.find(r => r.studentId === studentId);
          if (record) {
            vRecords++;
            if (record.present) pCount++;
          }
        });

        if (vRecords > 0) {
          const aCount = vRecords - pCount;
          const perc = Math.round((pCount / vRecords) * 100);
          subjectAttendances[subject.name] = `هاتوو: ${pCount} | نەهاتوو: ${aCount} (${perc}%)`;
          totalPresent += pCount;
          totalValid += vRecords;
        } else {
          subjectAttendances[subject.name] = '-';
        }
      });
      
      const overallPercentage = totalValid > 0 ? `${Math.round((totalPresent / totalValid) * 100)}%` : '-';
      const overallAbsent = totalValid - totalPresent;

      const formattedAll = displaySubjects
        .filter(sub => subjectAttendances[sub.name] !== '-')
        .map(sub => `${sub.name}: ${subjectAttendances[sub.name]}`)
        .join(' || ');

      return {
        present: totalPresent,
        absent: overallAbsent,
        total: totalValid,
        percentage: overallPercentage,
        formatted: formattedAll || '-'
      };
    }
  };

  const confirmClearAll = () => {
    clearAllMarks();
    setShowClearConfirm(false);
  };

  const confirmDeleteStudentMarks = () => {
    if (studentToDeleteMarks) {
      deleteStudentMarks(studentToDeleteMarks, selectedSubjectId);
      setStudentToDeleteMarks(null);
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={showClearConfirm}
        message="ئایا دڵنیایت لە سڕینەوەی هەموو ڕاپۆرتەکان و نمرەکان؟ ئەم کردارە پاشگەزبوونەوەی تێدا نییە."
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
      <ConfirmModal
        isOpen={!!studentToDeleteMarks}
        message="ئایا دڵنیایت لە سڕینەوەی نمرەکانی ئەم فێرخوازە؟"
        onConfirm={confirmDeleteStudentMarks}
        onCancel={() => setStudentToDeleteMarks(null)}
      />
      <div className="h-full flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-200 bg-white print-hide">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">ڕاپۆرتەکان</h2>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <div className="relative flex-grow sm:flex-grow-0">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium appearance-none"
                >
                  <option value="all">هەموو وانەکان</option>
                  {allSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute right-3 top-2.5 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="گەڕان..."
                  className="w-full sm:w-64 pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex flex-shrink-0 items-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2 rounded-lg hover:bg-rose-100 transition-colors shadow-sm font-medium"
              >
                <Trash2 className="w-5 h-5" />
                <span className="hidden sm:inline text-sm">سڕینەوەی هەموو ڕاپۆرتەکان</span>
              </button>
              <button
                onClick={exportReportToCSV}
                className="flex flex-shrink-0 items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline text-sm font-medium">داگرتنی ڕاپۆرت (Excel / Google Sheets)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
            {/* The report area to be converted to PDF */}
            <div id="print-report-container" ref={reportRef} className="p-6 min-w-[800px]" style={{ backgroundColor: '#ffffff', color: '#0f172a' }} dir="rtl">
              <div className="text-center mb-8 pb-6" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <h1 className="text-2xl font-bold mb-2">ڕاپۆرتی کۆتایی فێرخوازان {selectedSubjectId !== 'all' ? `- ${displaySubjects[0]?.name}` : ''}</h1>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  بەروار: {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>

              {students.length > 0 ? (
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#334155', borderBottom: '2px solid #cbd5e1' }}>
                      <th className="p-3 font-bold" style={{ border: '1px solid #e2e8f0' }}>ناوی تەواو</th>
                      {selectedSubjectId === 'all' ? (
                        <th className="p-3 font-bold" style={{ border: '1px solid #e2e8f0' }}>وانەکان و نمرەکان</th>
                      ) : (
                        displaySubjects.map(sub => (
                          <th key={sub.id} className="p-3 font-bold" style={{ border: '1px solid #e2e8f0' }}>{sub.name}</th>
                        ))
                      )}
                      <th className="p-3 font-bold" style={{ border: '1px solid #e2e8f0', color: '#3730a3', backgroundColor: '#eef2ff' }}>تێکڕا (نمرە)</th>
                      <th className="p-3 font-bold" style={{ border: '1px solid #e2e8f0', color: '#065f46', backgroundColor: '#ecfdf5' }}>ئامادەبوون بۆ وانەی</th>
                      <th className="p-3 font-bold text-center" style={{ border: '1px solid #e2e8f0', color: '#be123c', backgroundColor: '#fff1f2' }}>سڕینەوە</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => {
                      const studentData = getStudentMarks(student.id);
                      const attendanceData = getStudentAttendance(student.id, selectedSubjectId);
                      return (
                        <tr key={student.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td className="p-3 font-bold" style={{ border: '1px solid #e2e8f0', color: '#1e293b' }}>{student.fullName}</td>
                          
                          {selectedSubjectId === 'all' ? (
                            <td className="p-3 text-right font-medium" style={{ border: '1px solid #e2e8f0', color: '#334155' }}>
                              <div className="flex flex-wrap gap-2 justify-start">
                                {displaySubjects
                                  .filter(sub => (sub.enrolledStudentIds || []).includes(student.id) || studentData.marks[sub.name] !== '-')
                                  .map(sub => (
                                    <span key={sub.id} className="bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200 whitespace-nowrap">
                                      {sub.name}: {studentData.marks[sub.name] !== '-' ? studentData.marks[sub.name] : 'تۆمارنەکراوە'}
                                    </span>
                                ))}
                              </div>
                            </td>
                          ) : (
                            displaySubjects.map(sub => (
                              <td key={sub.id} className="p-3 text-center font-medium" style={{ border: '1px solid #e2e8f0', color: '#334155' }} dir="ltr">
                                {studentData.marks[sub.name]}
                              </td>
                            ))
                          )}
                          
                          <td className="p-3 font-bold text-center" style={{ border: '1px solid #e2e8f0', color: '#312e81', backgroundColor: '#eef2ff' }} dir="ltr">
                             {studentData.average}
                          </td>
                          
                          <td className="p-3 font-medium text-right text-xs leading-relaxed" style={{ border: '1px solid #e2e8f0', color: '#064e3b', backgroundColor: '#ecfdf5' }}>
                            {selectedSubjectId === 'all' ? (
                              <div className="flex flex-col gap-1">
                                {attendanceData.formatted === '-' ? '-' : attendanceData.formatted.split(' || ').map((item, i) => (
                                  <div key={i} className="bg-emerald-100/50 px-2 py-1 rounded border border-emerald-200/50">
                                    {item}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center font-bold">
                                {attendanceData.formatted}
                              </div>
                            )}
                          </td>
                          
                          <td className="p-3 text-center" style={{ border: '1px solid #e2e8f0', backgroundColor: '#fff1f2' }}>
                            <button
                              onClick={() => setStudentToDeleteMarks(student.id)}
                              className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                              title="سڕینەوەی نمرە"
                            >
                              <Trash2 className="w-5 h-5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-center py-10" style={{ color: '#64748b' }}>زانیاری نییە بۆ دروستکردنی ڕاپۆرت.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
