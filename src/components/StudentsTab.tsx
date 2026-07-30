import React, { useState } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { Search, UserPlus, Pencil, Trash2, X, GraduationCap, Phone, Clock, FileText, CheckCircle2, User, ChevronDown, ChevronUp, Download, Users } from 'lucide-react';
import { getKurdishWeekday, convertToArabicNumerals, getCreationTimestamp } from '../utils';
import ConfirmModal from './ConfirmModal';

export default function StudentsTab() {
  const { data, activeTeacherId, addStudent, updateStudent, deleteStudent } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);

  const students = data.students.filter(s => s.teacherId === activeTeacherId);
  
  const getDisplayName = (s: Student) => {
    const teacherDisplay = s.teacherName || data.teachers.find(t => t.id === s.teacherId)?.name;
    return teacherDisplay ? `${s.fullName} (مامۆستا ${teacherDisplay})` : s.fullName;
  };

  const filteredStudents = students.filter(s => 
    getDisplayName(s).includes(searchTerm) || 
    s.phone.includes(searchTerm)
  );

  const openAddModal = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setStudentToDelete(id);
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteStudent(studentToDelete);
      setStudentToDelete(null);
    }
  };

  const exportAllStudentsCSV = () => {
    let csvContent = '\uFEFF';
    const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);
    const teacherName = activeTeacher ? activeTeacher.name : '';
    csvContent += `"مامۆستا: ${teacherName}"\n\n`;

    students.forEach((student, index) => {
      // Basic profile
      csvContent += 'زانیارییەکانی فێرخواز\n';
      const profileHeaders = ['ناوی تەواو', 'مێژووی لەدایکبوون', 'ژمارەی پەیوەندی', 'پیشە', 'تێبینی', 'کاتی زیادکردن'].reverse();
      csvContent += profileHeaders.join(',') + '\n';
      const profileRow = [
        `"${student.fullName}"`,
        `"${student.birthdate ? convertToArabicNumerals(student.birthdate) : ''}"`,
        `"${student.phone ? convertToArabicNumerals(student.phone) : ''}"`,
        `"${student.job || ''}"`,
        `"${student.notes ? student.notes.replace(/\n/g, ' ') : ''}"`,
        `"${student.createdAt ? convertToArabicNumerals(student.createdAt) : ''}"`
      ].reverse();
      csvContent += profileRow.join(',') + '\n\n';

      // Marks and Attendance logic
      const studentSubjects = data.subjects.filter(sub => sub.enrolledStudentIds.includes(student.id) && sub.teacherId === activeTeacherId);
      
      const classMarks = studentSubjects.map(sub => {
        const mark = data.marks.find(m => m.studentId === student.id && m.subjectId === sub.id);
        const score = mark && mark.score !== '' ? mark.score : '-';

        const subjectAttendance = data.attendance.filter(a => a.subjectId === sub.id);
        let presentCount = 0;
        let validRecords = 0;
        const detailedLogs: { date: string; weekday: string; present: boolean }[] = [];

        subjectAttendance.forEach(day => {
          const record = day.records.find(r => r.studentId === student.id);
          if (record) {
            validRecords++;
            if (record.present) presentCount++;
            
            detailedLogs.push({
              date: day.date,
              weekday: getKurdishWeekday(day.date),
              present: record.present
            });
          }
        });
        
        let attFormatted = '-';
        if (validRecords > 0) {
          const absentCount = validRecords - presentCount;
          const percentage = Math.round((presentCount / validRecords) * 100);
          attFormatted = convertToArabicNumerals(`هاتوو: ${presentCount} | نەهاتوو: ${absentCount} (${percentage}%)`);
        }

        return { id: sub.id, name: sub.name, score: score !== '-' ? convertToArabicNumerals(score) : '-', attendance: attFormatted, detailedLogs };
      });

      csvContent += 'وانەکان و نمرەکان\n';
      const classHeaders = ['ناوی وانە', 'نمرە', 'ئامادەبوون'].reverse();
      csvContent += classHeaders.join(',') + '\n';
      classMarks.forEach(cm => {
        const row = [`"${cm.name}"`, `"${cm.score}"`, `"${cm.attendance}"`].reverse();
        csvContent += row.join(',') + '\n';
      });
      csvContent += '\n';

      csvContent += 'تۆماری ئامادەبوون (ڕۆژانە)\n';
      const attendanceHeaders = ['ناوی وانە', 'ڕێکەوت', 'ڕۆژ', 'باری ئامادەبوون'].reverse();
      csvContent += attendanceHeaders.join(',') + '\n';
      
      classMarks.forEach(cm => {
        cm.detailedLogs.forEach(log => {
          const statusText = log.present ? 'هاتوو' : 'نەهاتوو';
          const row = [`"${cm.name}"`, `"${convertToArabicNumerals(log.date)}"`, `"${log.weekday}"`, `"${statusText}"`].reverse();
          csvContent += row.join(',') + '\n';
        });
      });

      if (index < students.length - 1) {
        csvContent += '\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeTeacherName = teacherName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'unknown';
    link.setAttribute('download', `All_Students_${safeTeacherName}_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportMarksReport = (studentsToExport: Student[]) => {
    let csvContent = '\uFEFF';
    
    studentsToExport.forEach((student, index) => {
      const studentSubjects = data.subjects.filter(
        sub => sub.enrolledStudentIds && sub.enrolledStudentIds.includes(student.id)
      );
      
      let totalScore = 0;
      let validMarksCount = 0;
      
      const nameRow = [`"${student.fullName}"`, `""`].reverse();
      csvContent += nameRow.join(',') + '\n';
      const headerRow = [`"وانە"`, `"نمرە"`].reverse();
      csvContent += headerRow.join(',') + '\n';
      
      studentSubjects.forEach(sub => {
        const markObj = data.marks.find(m => m.studentId === student.id && m.subjectId === sub.id);
        const score = markObj && markObj.score !== '' ? markObj.score : '';
        
        const row = [`"${sub.name}"`, `"${score !== '' ? convertToArabicNumerals(score) : ''}"`].reverse();
        csvContent += row.join(',') + '\n';
        
        if (typeof score === 'number' || (typeof score === 'string' && score !== '')) {
          const numScore = Number(score);
          if (!isNaN(numScore)) {
            totalScore += numScore;
            validMarksCount++;
          }
        }
      });
      
      const average = validMarksCount > 0 ? (totalScore / validMarksCount).toFixed(2) : '0';
      
      const sumRow = [`"کۆنمرە:"`, `"${convertToArabicNumerals(totalScore)}"`].reverse();
      csvContent += sumRow.join(',') + '\n';
      const avgRow = [`"تێکڕا:"`, `"${convertToArabicNumerals(average)}"`].reverse();
      csvContent += avgRow.join(',') + '\n';
      
      if (index < studentsToExport.length - 1) {
        csvContent += '\n\n';
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = studentsToExport.length === 1
      ? `ڕاپۆرتی_نمرەی_${studentsToExport[0].fullName.replace(/\s+/g, '_')}_${dateStr}.csv`
      : `ڕاپۆرتی_نمرەی_فێرخوازان_${dateStr}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col">
      <ConfirmModal
        isOpen={!!studentToDelete}
        message="دڵنیایت لە سڕینەوەی ئەم فێرخوازە؟"
        onConfirm={confirmDelete}
        onCancel={() => setStudentToDelete(null)}
      />
      <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">لیستی فێرخوازان</h2>
          <div className="px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-sm font-semibold flex items-center gap-2 shadow-xs">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>کۆی ژمارەی فێرخوازان:</span>
            <span className="font-mono text-base font-bold">{convertToArabicNumerals(students.length)}</span>
          </div>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <button
            onClick={exportAllStudentsCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            title="داگرتنی سەرجەم فێرخوازان (Excel / CSV)"
          >
            <Download className="w-5 h-5 text-slate-500" />
            <span className="hidden lg:inline text-sm">داگرتنی سەرجەم فێرخوازان</span>
          </button>
          <button
            onClick={() => exportMarksReport(students)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
            title="داگرتنی ڕاپۆرتی نمرەی فێرخوازان (Excel / CSV)"
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <span className="hidden lg:inline text-sm">داگرتنی ڕاپۆرتی نمرەکان</span>
          </button>
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
            onClick={openAddModal}
            className="flex flex-shrink-0 items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">زیادکردن</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto bg-white">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr className="text-slate-500 text-sm font-medium">
              <th className="p-4">ناوی فێرخواز</th>
              <th className="p-4">مێژووی لەدایکبوون</th>
              <th className="p-4">مۆبایل</th>
              <th className="p-4">پیشە</th>
              <th className="p-4 text-center">کردارەکان</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr 
                  key={student.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setViewingStudent(student)}
                >
                  <td className="p-4 font-semibold text-slate-800">
                    <div>{getDisplayName(student)}</div>
                  </td>
                  <td className="p-4 text-sm">{student.birthdate ? convertToArabicNumerals(student.birthdate) : '-'}</td>
                  <td className="p-4 text-sm font-mono text-slate-600" dir="ltr">{student.phone ? convertToArabicNumerals(student.phone) : '-'}</td>
                  <td className="p-4 text-sm text-slate-500">{student.job || '-'}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditModal(student)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(student.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  هیچ فێرخوازێک نەدۆزرایەوە.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <StudentModal
          activeTeacherId={activeTeacherId!}
          student={editingStudent}
          onClose={() => setIsModalOpen(false)}
          onSave={(s) => {
            if (editingStudent) {
              updateStudent({ ...s, id: editingStudent.id } as Student);
            } else {
              addStudent(s);
            }
            setIsModalOpen(false);
          }}
        />
      )}

      {viewingStudent && (
        <StudentDetailsModal 
          student={viewingStudent} 
          onClose={() => setViewingStudent(null)} 
          onExportMarksReport={exportMarksReport}
        />
      )}
    </div>
  );
}

function StudentModal({
  activeTeacherId,
  student,
  onClose,
  onSave
}: {
  activeTeacherId: string;
  student: Student | null;
  onClose: () => void;
  onSave: (s: Omit<Student, 'id'>) => void;
}) {
  const [formData, setFormData] = useState({
    fullName: student?.fullName || '',
    birthdate: student?.birthdate || '',
    phone: student?.phone || '',
    job: student?.job || '',
    notes: student?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      alert('تکایە ناوی تەواو پڕبکەرەوە.');
      return;
    }
    
    onSave({
      teacherId: activeTeacherId,
      fullName: formData.fullName,
      birthdate: convertToArabicNumerals(formData.birthdate),
      phone: convertToArabicNumerals(formData.phone),
      job: formData.job,
      notes: formData.notes,
      createdAt: student?.createdAt || getCreationTimestamp()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">{student ? 'دەستکاری فێرخواز' : 'زیادکردنی فێرخواز'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ناوی تەواو <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">مێژووی لەدایکبوون</label>
            <input
              type="text"
              inputMode="text"
              placeholder="نموونە: ٢٠٠٠/٠١/٠١"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={formData.birthdate}
              onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ژمارەی پەیوەندی</label>
            <input
              type="text"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">پیشە / کار</label>
            <input
              type="text"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={formData.job}
              onChange={(e) => setFormData({ ...formData, job: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">تێبینی</label>
            <textarea
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          <div className="pt-6 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-slate-600 font-medium bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              پاشگەزبوونەوە
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-white font-medium bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
            >
              پاشەکەوتکردن
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentDetailsModal({ student, onClose, onExportMarksReport }: { student: Student; onClose: () => void; onExportMarksReport: (students: Student[]) => void }) {
  const { data } = useStore();
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  
  const subjects = data.subjects.filter(s => s.teacherId === student.teacherId);
  const marks = data.marks.filter(m => m.studentId === student.id);
  
  const activeSubjects = subjects.filter(s => 
    (s.enrolledStudentIds || []).includes(student.id) || 
    marks.some(m => m.subjectId === s.id && m.score !== '')
  );
  
  let totalScore = 0;
  let scoreCount = 0;
  
  const classMarks = activeSubjects.map(sub => {
    const mark = marks.find(m => m.subjectId === sub.id);
    const score = mark?.score ?? '-';
    if (typeof score === 'number' || (typeof score === 'string' && score !== '' && score !== '-')) {
      const numScore = Number(score);
      if (!isNaN(numScore)) {
        totalScore += numScore;
        scoreCount++;
      }
    }

    const subjectAttendance = data.attendance.filter(a => a.subjectId === sub.id);
    let presentCount = 0;
    let validRecords = 0;
    
    const detailedLogs: { date: string; weekday: string; present: boolean }[] = [];

    subjectAttendance.forEach(day => {
      const record = day.records.find(r => r.studentId === student.id);
      if (record) {
        validRecords++;
        if (record.present) presentCount++;
        
        detailedLogs.push({
          date: day.date,
          weekday: getKurdishWeekday(day.date),
          present: record.present
        });
      }
    });
    
    detailedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let attFormatted = '-';
    if (validRecords > 0) {
      const absentCount = validRecords - presentCount;
      const percentage = Math.round((presentCount / validRecords) * 100);
      attFormatted = convertToArabicNumerals(`هاتوو: ${presentCount} | نەهاتوو: ${absentCount} (${percentage}%)`);
    }

    return { id: sub.id, name: sub.name, score: score !== '-' ? convertToArabicNumerals(score) : '-', attendance: attFormatted, detailedLogs };
  });

  const average = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : '-';
  
  let grade = '-';
  if (average !== '-') {
    const avg = parseFloat(average);
    if (avg >= 90) grade = 'نایاب';
    else if (avg >= 80) grade = 'زۆر باش';
    else if (avg >= 70) grade = 'باش';
    else if (avg >= 60) grade = 'مامناوەند';
    else if (avg >= 50) grade = 'دەرچوو';
    else grade = 'خراپ';
  }

  const gradeColors: Record<string, string> = {
    'نایاب': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'زۆر باش': 'bg-blue-100 text-blue-800 border-blue-200',
    'باش': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'مامناوەند': 'bg-orange-100 text-orange-800 border-orange-200',
    'دەرچوو': 'bg-teal-100 text-teal-800 border-teal-200',
    'خراپ': 'bg-rose-100 text-rose-800 border-rose-200',
    '-': 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const exportStudentData = () => {
    let csvContent = '\uFEFF';
    
    const teacher = data.teachers.find(t => t.id === student.teacherId);
    const teacherName = student.teacherName || (teacher ? teacher.name : '');
    csvContent += `"مامۆستا: ${teacherName}"\n\n`;
    
    csvContent += 'زانیارییەکانی فێرخواز\n';
    const profileHeaders = ['ناوی تەواو', 'مێژووی لەدایکبوون', 'ژمارەی پەیوەندی', 'پیشە', 'تێبینی', 'کاتی زیادکردن'].reverse();
    csvContent += profileHeaders.join(',') + '\n';
    const profileRow = [
      `"${student.fullName}"`,
      `"${student.birthdate ? convertToArabicNumerals(student.birthdate) : ''}"`,
      `"${student.phone ? convertToArabicNumerals(student.phone) : ''}"`,
      `"${student.job || ''}"`,
      `"${student.notes ? student.notes.replace(/\n/g, ' ') : ''}"`,
      `"${student.createdAt ? convertToArabicNumerals(student.createdAt) : ''}"`
    ].reverse();
    csvContent += profileRow.join(',') + '\n\n';
    
    csvContent += 'وانەکان و نمرەکان\n';
    const classHeaders = ['ناوی وانە', 'نمرە', 'ئامادەبوون'].reverse();
    csvContent += classHeaders.join(',') + '\n';
    classMarks.forEach(cm => {
      const row = [`"${cm.name}"`, `"${cm.score}"`, `"${cm.attendance}"`].reverse();
      csvContent += row.join(',') + '\n';
    });
    csvContent += '\n';

    csvContent += 'تۆماری ئامادەبوون (ڕۆژانە)\n';
    const attendanceHeaders = ['ناوی وانە', 'ڕێکەوت', 'ڕۆژ', 'باری ئامادەبوون'].reverse();
    csvContent += attendanceHeaders.join(',') + '\n';
    
    classMarks.forEach(cm => {
      cm.detailedLogs.forEach(log => {
        const statusText = log.present ? 'هاتوو' : 'نەهاتوو';
        const row = [`"${cm.name}"`, `"${convertToArabicNumerals(log.date)}"`, `"${log.weekday}"`, `"${statusText}"`].reverse();
        csvContent += row.join(',') + '\n';
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Student_${student.fullName}_Report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{student.fullName}</h3>
            </div>
            {(student.teacherName || data.teachers.find(t => t.id === student.teacherId)) && (
              <div className="mr-4 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
                مامۆستا: {student.teacherName || data.teachers.find(t => t.id === student.teacherId)?.name}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-white hover:bg-slate-100 p-2 rounded-full border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {student.createdAt && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-indigo-700">ڕێکەوت و کاتی زیادکردن</p>
                  <p className="text-sm font-medium text-indigo-900 mt-1" style={{ direction: 'rtl', unicodeBidi: 'isolate' }}>{student.createdAt ? convertToArabicNumerals(student.createdAt) : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Details */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> زانیاری کەسی
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">مێژووی لەدایکبوون</p>
                  <p className="text-sm font-bold text-slate-800">{student.birthdate ? convertToArabicNumerals(student.birthdate) : '-'}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">ژمارەی پەیوەندی</p>
                  <p className="text-sm font-bold text-slate-800" dir="ltr">{student.phone ? convertToArabicNumerals(student.phone) : '-'}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3 sm:col-span-2">
                <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">پیشە</p>
                  <p className="text-sm font-bold text-slate-800">{student.job || '-'}</p>
                </div>
              </div>
              {student.notes && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 sm:col-span-2">
                  <FileText className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-600 font-medium mb-1">تێبینی</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{student.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Academic Records */}
          <div>
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> وانەکان و نمرەکان
            </h4>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 bg-white">
              <div className="divide-y divide-slate-100">
                {classMarks.length > 0 ? classMarks.map((cm, idx) => {
                  const isExpanded = expandedSubjects[cm.id];
                  
                  return (
                    <div key={idx} className="flex flex-col">
                      <div 
                        className={`flex justify-between items-center p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`}
                        onClick={() => setExpandedSubjects(prev => ({ ...prev, [cm.id]: !prev[cm.id] }))}
                      >
                        <div className="font-medium text-slate-700 flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          {cm.name}
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6">
                          <div className="text-[10px] sm:text-xs font-medium text-slate-600 bg-white px-2 py-1 rounded-full border border-slate-200 shadow-sm">{cm.attendance}</div>
                          <div className="font-mono font-bold text-indigo-600 w-6 sm:w-8 text-left">{cm.score}</div>
                        </div>
                      </div>
                      
                      {isExpanded && cm.detailedLogs.length > 0 && (
                        <div className="bg-slate-50 p-4 border-t border-slate-100 flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <h5 className="text-xs font-bold text-emerald-600 mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5" /> لیستی ڕۆژانی هاتوو
                            </h5>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                              {cm.detailedLogs.filter(l => l.present).length > 0 ? (
                                cm.detailedLogs.filter(l => l.present).map((log, lidx) => (
                                  <div key={`p-${lidx}`} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-emerald-100 text-sm shadow-sm">
                                    <div className="text-slate-600 font-medium">
                                      {convertToArabicNumerals(log.date)} <span className="text-slate-400 font-normal">({log.weekday})</span>
                                    </div>
                                    <span className="text-emerald-600 font-bold text-[10px] sm:text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-100">هاتوو</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 italic p-2">هیچ تۆمارێک نییە</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h5 className="text-xs font-bold text-rose-600 mb-3 flex items-center gap-2">
                              <X className="w-3.5 h-3.5" /> لیستی ڕۆژانی نەهاتوو
                            </h5>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                              {cm.detailedLogs.filter(l => !l.present).length > 0 ? (
                                cm.detailedLogs.filter(l => !l.present).map((log, lidx) => (
                                  <div key={`a-${lidx}`} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-rose-100 text-sm shadow-sm">
                                    <div className="text-slate-600 font-medium">
                                      {convertToArabicNumerals(log.date)} <span className="text-slate-400 font-normal">({log.weekday})</span>
                                    </div>
                                    <span className="text-rose-600 font-bold text-[10px] sm:text-xs bg-rose-50 px-2 py-1 rounded border border-rose-100">نەهاتوو</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-slate-400 italic p-2">هیچ تۆمارێک نییە</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="p-4 text-center text-slate-500 text-sm">هیچ وانەیەک تۆمار نەکراوە.</div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-slate-600 font-medium">تێکڕای نمرە:</div>
              <div className="flex items-center gap-4">
                <div className="text-xl font-bold font-mono text-slate-800">{average !== '-' ? convertToArabicNumerals(average) : '-'}</div>
                <div className={`px-3 py-1 rounded-lg text-sm font-bold border ${gradeColors[grade] || gradeColors['-']}`}>
                  {grade}
                </div>
              </div>
            </div>
          </div>
          
          {/* Export Buttons */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-end gap-3 mt-4">
            <button
              onClick={() => onExportMarksReport([student])}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors font-medium text-sm border border-emerald-100 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              داگرتنی ڕاپۆرتی نمرە
            </button>
            <button
              onClick={exportStudentData}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors font-medium text-sm border border-indigo-100 shadow-sm"
            >
              <Download className="w-4 h-4" />
              داگرتنی زانیارییەکانی فێرخواز
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
