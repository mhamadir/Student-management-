import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppData, Attendance, Mark, Student, Subject, Teacher } from './types';
import { convertToArabicNumerals, convertToWesternNumerals } from './utils';

const STORAGE_KEY = 'kurdish_student_app_data';

const defaultData: AppData = {
  teachers: [],
  students: [],
  subjects: [],
  marks: [],
  attendance: [],
};

type StoreContextType = {
  data: AppData;
  activeTeacherId: string | null;
  setActiveTeacherId: (id: string | null) => void;
  // Mutations
  addTeacher: (name: string) => void;
  deleteTeacher: (id: string) => void;
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (subject: Subject) => void;
  deleteSubject: (id: string) => void;
  setMark: (studentId: string, subjectId: string, score: number | '') => void;
  saveAttendance: (attendance: Attendance) => void;
  deleteAttendanceRecord: (id: string) => void;
  clearAllAttendance: () => void;
  deleteStudentMarks: (studentId: string, subjectId?: string) => void;
  clearAllMarks: () => void;
  // Export / Import
  exportData: () => void;
  importData: (jsonData: string) => boolean;
  importStudentCSV: (csvData: string) => { success: boolean; message: string };
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(s => s.replace(/^"(.*)"$/, '$1').trim());
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({ ...defaultData, ...parsed });
      } catch (e) {
        console.error('Failed to parse local storage', e);
      }
    }
    const savedTeacher = localStorage.getItem(STORAGE_KEY + '_teacher');
    if (savedTeacher) {
      setActiveTeacherId(savedTeacher);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (activeTeacherId) {
        localStorage.setItem(STORAGE_KEY + '_teacher', activeTeacherId);
      } else {
        localStorage.removeItem(STORAGE_KEY + '_teacher');
      }
    }
  }, [activeTeacherId, isLoaded]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const addTeacher = (name: string) => {
    const newTeacher = { id: generateId(), name };
    setData((prev) => ({ ...prev, teachers: [...prev.teachers, newTeacher] }));
    if (!activeTeacherId) setActiveTeacherId(newTeacher.id);
  };

  const deleteTeacher = (id: string) => {
    setData((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((t) => t.id !== id),
      students: prev.students.filter((s) => s.teacherId !== id),
      subjects: prev.subjects.filter((s) => s.teacherId !== id),
      attendance: prev.attendance.filter((a) => a.teacherId !== id),
    }));
    if (activeTeacherId === id) setActiveTeacherId(null);
  };

  const addStudent = (student: Omit<Student, 'id'>) => {
    setData((prev) => ({ ...prev, students: [...prev.students, { ...student, id: generateId() }] }));
  };

  const updateStudent = (student: Student) => {
    setData((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === student.id ? student : s)),
    }));
  };

  const deleteStudent = (id: string) => {
    setData((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
      marks: prev.marks.filter((m) => m.studentId !== id),
      subjects: prev.subjects.map((s) => ({
        ...s,
        enrolledStudentIds: s.enrolledStudentIds.filter((sid) => sid !== id),
      })),
    }));
  };

  const addSubject = (subject: Omit<Subject, 'id'>) => {
    setData((prev) => ({ ...prev, subjects: [...prev.subjects, { ...subject, id: generateId() }] }));
  };

  const updateSubject = (subject: Subject) => {
    setData((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s) => (s.id === subject.id ? subject : s)),
    }));
  };

  const deleteSubject = (id: string) => {
    setData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      marks: prev.marks.filter((m) => m.subjectId !== id),
    }));
  };

  const setMark = (studentId: string, subjectId: string, score: number | '') => {
    setData((prev) => {
      const existing = prev.marks.find((m) => m.studentId === studentId && m.subjectId === subjectId);
      if (existing) {
        return {
          ...prev,
          marks: prev.marks.map((m) =>
            m.id === existing.id ? { ...m, score } : m
          ),
        };
      }
      return {
        ...prev,
        marks: [...prev.marks, { id: generateId(), studentId, subjectId, score }],
      };
    });
  };

  const saveAttendance = (attendance: Attendance) => {
    setData((prev) => {
      const existing = prev.attendance.find((a) => a.id === attendance.id);
      if (existing) {
        return {
          ...prev,
          attendance: prev.attendance.map((a) =>
            a.id === existing.id ? attendance : a
          ),
        };
      }
      return {
        ...prev,
        attendance: [...prev.attendance, attendance],
      };
    });
  };

  const deleteAttendanceRecord = (id: string) => {
    setData((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.id !== id),
    }));
  };

  const clearAllAttendance = () => {
    setData((prev) => ({
      ...prev,
      attendance: prev.attendance.filter((a) => a.teacherId !== activeTeacherId),
    }));
  };

  const deleteStudentMarks = (studentId: string, subjectId?: string) => {
    setData((prev) => ({
      ...prev,
      marks: prev.marks.filter((m) => {
        if (subjectId && subjectId !== 'all') {
          return !(m.studentId === studentId && m.subjectId === subjectId);
        }
        return m.studentId !== studentId;
      }),
    }));
  };

  const clearAllMarks = () => {
    setData((prev) => {
      const teacherSubjectIds = prev.subjects.filter(s => s.teacherId === activeTeacherId).map(s => s.id);
      return {
        ...prev,
        marks: prev.marks.filter((m) => !teacherSubjectIds.includes(m.subjectId)),
      };
    });
  };

  const exportData = () => {
    let csvContent = '\uFEFF';
    
    const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);
    const teacherName = activeTeacher ? activeTeacher.name : '';
    csvContent += `"مامۆستا: ${teacherName}"\n\n`;
    
    const headers = [
      'ناوی تەواو',
      'مێژووی لەدایکبوون',
      'ژمارەی مۆبایل',
      'پیشە',
      'وانەکان',
      'نمرەکانی تاقیکردنەوە',
      'تێکڕا (نمرە)',
      'ئاست',
      'ڕێژەی ئامادەبوون'
    ].reverse();
    csvContent += headers.join(',') + '\n';

    const teacherStudents = data.students.filter(s => s.teacherId === activeTeacherId);

    teacherStudents.forEach(student => {
      const studentSubjects = data.subjects.filter(sub => sub.teacherId === student.teacherId);
      const classNames = studentSubjects.map(s => s.name).join(' | ');
      
      let totalScore = 0;
      let scoreCount = 0;
      const scoresText = studentSubjects.map(sub => {
        const mark = data.marks.find(m => m.studentId === student.id && m.subjectId === sub.id);
        const score = mark?.score ?? '-';
        if (typeof score === 'number') {
          totalScore += score;
          scoreCount++;
        }
        return `${sub.name}: ${score}`;
      }).join(' | ');

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

      const studentAttendance = data.attendance.filter(a => a.teacherId === student.teacherId);
      let presentCount = 0;
      let totalAttendance = studentAttendance.length;
      
      studentAttendance.forEach(a => {
        const record = a.records.find(r => r.studentId === student.id);
        if (record?.present) {
          presentCount++;
        }
      });
      
      const attendancePercentage = totalAttendance > 0 
        ? convertToArabicNumerals(Math.round((presentCount / totalAttendance) * 100) + '%')
        : '-';

      const row = [
        `"${student.fullName}"`,
        `"${student.birthdate ? convertToArabicNumerals(student.birthdate) : ''}"`,
        `"${student.phone ? convertToArabicNumerals(student.phone) : ''}"`,
        `"${student.job}"`,
        `"${classNames}"`,
        `"${convertToArabicNumerals(scoresText)}"`,
        `"${average !== '-' ? convertToArabicNumerals(average) : '-'}"`,
        `"${grade}"`,
        `"${attendancePercentage}"`
      ].reverse();
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Database_Export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.teachers && parsed.students) {
        setData(parsed);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };


  const importStudentCSV = (csvData: string) => {
    try {
      const cleanCsv = csvData.replace(/^\uFEFF/, '').replace(/\r/g, '');
      const lines = cleanCsv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (lines.length === 0) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      let teacherName = '';
      const teacherLine = lines.find(l => l.includes('مامۆستا:'));
      if (teacherLine) {
        let textAfter = teacherLine;
        if (textAfter.includes('مامۆستا:')) {
          textAfter = textAfter.substring(textAfter.indexOf('مامۆستا:') + 'مامۆستا:'.length);
        }
        teacherName = textAfter.replace(/^["'\s]+|["'\s]+$/g, '').trim();
      }

      const isStudentCSV = lines.some(l => l.includes('ناوی تەواو') || l.includes('ژمارەی فێرخواز') || l.includes('مێژووی لەدایکبوون') || l.includes('ناوی فێرخواز') || l.includes('زانیارییەکانی فێرخواز'));
      if (!isStudentCSV) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      const profileHeaderIndices: number[] = [];
      for (let i = 0; i < lines.length; i++) {
        if ((lines[i].includes('ناوی تەواو') || lines[i].includes('ناوی فێرخواز')) || lines[i].includes('ژمارەی پەیوەندی')) {
          if (lines[i].includes('ناوی تەواو') && lines[i].includes('مێژووی لەدایکبوون')) {
            profileHeaderIndices.push(i);
          } else if (lines[i].includes('ژمارەی پەیوەندی') && lines[i].includes('ناوی تەواو')) {
            profileHeaderIndices.push(i);
          } else if (lines[i].includes('ناوی تەواو') && lines[i].split(',').length > 1 && !lines[i].includes('"')) {
            profileHeaderIndices.push(i);
          }
        }
      }

      if (profileHeaderIndices.length === 0) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      const parsedStudents = [];

      for (let pIdx = 0; pIdx < profileHeaderIndices.length; pIdx++) {
        const profileHeaderIdx = profileHeaderIndices[pIdx];
        const nextProfileHeaderIdx = profileHeaderIndices[pIdx + 1] || lines.length;
        
        if (!lines[profileHeaderIdx + 1]) continue;

        const headerCols = parseCSVLine(lines[profileHeaderIdx]);
        const profileRowStr = lines[profileHeaderIdx + 1];
        const rowCols = parseCSVLine(profileRowStr);

        if (rowCols.length < 1) continue;

        const findIdx = (keywords: string[]) => headerCols.findIndex(col => keywords.some(kw => col.includes(kw)));
        
        let fullNameIdx = findIdx(['ناوی تەواو', 'ناوی فێرخواز']);
        let rollNumberIdx = findIdx(['ژمارەی فێرخواز', 'ژمارە']);
        let birthdateIdx = findIdx(['مێژووی لەدایکبوون', 'لەدایکبوون']);
        let phoneIdx = findIdx(['پەیوەندی', 'مۆبایل']);
        let jobIdx = findIdx(['پیشە']);
        let notesIdx = findIdx(['تێبینی']);
        let createdAtIdx = findIdx(['کاتی زیادکردن']);

        if (fullNameIdx === -1 && rowCols.length >= 5) {
          if (rowCols.length >= 7) {
            createdAtIdx = 0; notesIdx = 1; jobIdx = 2; phoneIdx = 3; birthdateIdx = 4; rollNumberIdx = 5; fullNameIdx = 6;
          } else if (rowCols.length === 6) {
            notesIdx = 0; jobIdx = 1; phoneIdx = 2; birthdateIdx = 3; rollNumberIdx = 4; fullNameIdx = 5;
          } else {
            notesIdx = 0; jobIdx = 1; phoneIdx = 2; birthdateIdx = 3; fullNameIdx = 4;
          }
        }

        const fullName = fullNameIdx !== -1 ? rowCols[fullNameIdx] || '' : rowCols[rowCols.length - 1] || '';
        const rollNumber = convertToWesternNumerals(rollNumberIdx !== -1 ? rowCols[rollNumberIdx] || '' : '');
        const birthdate = convertToWesternNumerals(birthdateIdx !== -1 ? rowCols[birthdateIdx] || '' : '');
        const phone = convertToWesternNumerals(phoneIdx !== -1 ? rowCols[phoneIdx] || '' : '');
        const job = jobIdx !== -1 ? rowCols[jobIdx] || '' : '';
        const notes = notesIdx !== -1 ? rowCols[notesIdx] || '' : '';
        const createdAt = convertToWesternNumerals(createdAtIdx !== -1 ? rowCols[createdAtIdx] || '' : '');

        if (!fullName) continue;

        // Classes & Marks
        let classMarksHeaderIdx = -1;
        for (let i = profileHeaderIdx; i < nextProfileHeaderIdx; i++) {
          if (lines[i].includes('وانەکان و نمرەکان')) { classMarksHeaderIdx = i; break; }
        }

        const marksData: { name: string; score: number | '' }[] = [];
        let endMarksIdx = nextProfileHeaderIdx;

        // Find attendance header to limit marks search
        let attendanceHeaderIdx = -1;
        for (let i = profileHeaderIdx; i < nextProfileHeaderIdx; i++) {
          if (lines[i].includes('تۆماری ئامادەبوون (ڕۆژانە)')) { attendanceHeaderIdx = i; break; }
        }

        if (attendanceHeaderIdx !== -1) {
          endMarksIdx = attendanceHeaderIdx;
        }

        if (classMarksHeaderIdx !== -1 && lines[classMarksHeaderIdx + 1]) {
          const classHeaderCols = parseCSVLine(lines[classMarksHeaderIdx + 1]);
          let nameColIdx = classHeaderCols.findIndex(c => c.includes('وانە'));
          let scoreColIdx = classHeaderCols.findIndex(c => c.includes('نمرە'));
          
          if (nameColIdx === -1) nameColIdx = 2;
          if (scoreColIdx === -1) scoreColIdx = 1;

          let i = classMarksHeaderIdx + 2;
          while (i < endMarksIdx) {
            const rowVals = parseCSVLine(lines[i]);
            if (rowVals.length >= 2) {
              const name = rowVals[nameColIdx] || rowVals[rowVals.length - 1] || '';
              let scoreStr = rowVals[scoreColIdx] || '';
              scoreStr = convertToWesternNumerals(scoreStr);
              if (name && !name.includes('تێکڕا:') && !name.includes('کۆنمرە:')) {
                let score: number | '' = '';
                if (scoreStr !== '' && scoreStr !== '-') {
                  score = Number(scoreStr);
                  if (isNaN(score)) score = '';
                }
                marksData.push({ name, score });
              }
            }
            i++;
          }
        }

        // Attendance
        const attendanceData: { name: string; date: string; present: boolean }[] = [];
        if (attendanceHeaderIdx !== -1 && lines[attendanceHeaderIdx + 1]) {
          const attHeaderCols = parseCSVLine(lines[attendanceHeaderIdx + 1]);
          let nameColIdx = attHeaderCols.findIndex(c => c.includes('وانە'));
          let dateColIdx = attHeaderCols.findIndex(c => c.includes('ڕێکەوت'));
          let statusColIdx = attHeaderCols.findIndex(c => c.includes('ئامادەبوون') || c.includes('باری'));

          if (nameColIdx === -1) nameColIdx = 3;
          if (dateColIdx === -1) dateColIdx = 2;
          if (statusColIdx === -1) statusColIdx = 0;

          let i = attendanceHeaderIdx + 2;
          while (i < nextProfileHeaderIdx) {
            const rowVals = parseCSVLine(lines[i]);
            if (rowVals.length >= 3) {
              const name = rowVals[nameColIdx] || '';
              let date = rowVals[dateColIdx] || '';
              date = convertToWesternNumerals(date);
              const statusStr = rowVals[statusColIdx] || '';
              const present = statusStr.includes('هاتوو') && !statusStr.includes('نەهاتوو');
              if (date) {
                attendanceData.push({ name, date, present });
              }
            }
            i++;
          }
        }

        parsedStudents.push({ fullName, rollNumber, birthdate, phone, job, notes, createdAt, marksData, attendanceData });
      }

      if (parsedStudents.length === 0) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      let resolvedTeacherId = activeTeacherId;

      setData(prev => {
        const newState = { ...prev };
        let targetTeacherId = activeTeacherId;
        if (!targetTeacherId) {
          if (newState.teachers.length > 0) {
            targetTeacherId = newState.teachers[0].id;
          } else {
            targetTeacherId = 't_' + Date.now().toString(36);
            newState.teachers.push({ id: targetTeacherId, name: 'مامۆستای سەرەکی' });
          }
        }
        resolvedTeacherId = targetTeacherId;

        parsedStudents.forEach(ps => {
          let student = newState.students.find(s => (ps.phone && s.phone && s.phone === ps.phone && s.fullName === ps.fullName) || (s.fullName === ps.fullName));
          if (student) {
            if (ps.fullName) student.fullName = ps.fullName;
            if (ps.rollNumber) student.rollNumber = ps.rollNumber;
            if (ps.birthdate) student.birthdate = ps.birthdate;
            if (ps.phone) student.phone = ps.phone;
            if (ps.job) student.job = ps.job;
            if (ps.notes) student.notes = ps.notes;
            if (ps.createdAt) student.createdAt = ps.createdAt;
            if (teacherName) student.teacherName = teacherName;
            student.teacherId = targetTeacherId;
          } else {
            student = {
              id: 's_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
              teacherId: targetTeacherId,
              teacherName: teacherName || undefined,
              fullName: ps.fullName,
              rollNumber: ps.rollNumber || '',
              birthdate: ps.birthdate,
              phone: ps.phone,
              job: ps.job,
              notes: ps.notes,
              createdAt: ps.createdAt || new Date().toISOString().split('T')[0]
            };
            newState.students.push(student);
          }

          ps.marksData.forEach(md => {
            let subject = newState.subjects.find(s => s.name === md.name && s.teacherId === targetTeacherId);
            if (!subject) {
              subject = {
                id: 'sub_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
                teacherId: targetTeacherId,
                name: md.name,
                enrolledStudentIds: []
              };
              newState.subjects.push(subject);
            }
            if (!subject.enrolledStudentIds.includes(student.id)) {
              subject.enrolledStudentIds.push(student.id);
            }
            
            let mark = newState.marks.find(m => m.studentId === student.id && m.subjectId === subject.id);
            if (mark) {
              mark.score = md.score;
            } else {
              newState.marks.push({
                id: 'm_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
                studentId: student.id,
                subjectId: subject.id,
                score: md.score
              });
            }
          });

          ps.attendanceData.forEach(ad => {
            let subject = newState.subjects.find(s => s.name === ad.name && s.teacherId === targetTeacherId);
            if (subject) {
              let att = newState.attendance.find(a => a.date === ad.date && a.subjectId === subject.id);
              if (!att) {
                att = {
                  id: 'att_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
                  date: ad.date,
                  teacherId: targetTeacherId,
                  subjectId: subject.id,
                  records: []
                };
                newState.attendance.push(att);
              }
              let rec = att.records.find(r => r.studentId === student.id);
              if (rec) {
                rec.present = ad.present;
              } else {
                att.records.push({ studentId: student.id, present: ad.present });
              }
            }
          });
        });

        return newState;
      });

      if (resolvedTeacherId) {
        setActiveTeacherId(resolvedTeacherId);
      }

      return { success: true, message: parsedStudents.length > 1 ? 'زانیارییەکانی سەرجەم فێرخوازان بەسەرکەوتوویی هاوردە کران!' : 'زانیارییەکانی فێرخوازەکە بەسەرکەوتوویی هاوردە کران!' };

    } catch (e) {
      return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
    }
  };

  if (!isLoaded) return null;

  return (
    <StoreContext.Provider
      value={{
        data,
        activeTeacherId,
        setActiveTeacherId,
        addTeacher,
        deleteTeacher,
        addStudent,
        updateStudent,
        deleteStudent,
        addSubject,
        updateSubject,
        deleteSubject,
        setMark,
        saveAttendance,
        deleteAttendanceRecord,
        clearAllAttendance,
        deleteStudentMarks,
        clearAllMarks,
        exportData,
        importData,
        importStudentCSV,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
