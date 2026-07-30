const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

const importStudentCSV = `
  const importStudentCSV = (csvData: string) => {
    try {
      const cleanCsv = csvData.replace(/^\\uFEFF/, '');
      const lines = cleanCsv.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (!lines[0]?.includes('مامۆستا:')) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }
      
      const teacherMatch = lines[0].match(/مامۆستا:\\s*(.+?)"?/);
      const teacherName = teacherMatch ? teacherMatch[1].replace(/"/g, '').trim() : '';

      const isStudentCSV = lines.some(l => l.includes('ناوی تەواو')) && lines.some(l => l.includes('ژمارەی فێرخواز')) && lines.some(l => l.includes('مێژووی لەدایکبوون'));
      if (!isStudentCSV) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      const profileHeaderIdx = lines.findIndex(l => l.includes('ناوی تەواو') && l.includes('ژمارەی فێرخواز'));
      const profileRow = lines[profileHeaderIdx + 1];
      if (!profileRow) return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };

      const profileMatch = profileRow.match(/"(.*?)"/g);
      if (!profileMatch || profileMatch.length < 7) {
        return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
      }

      const vals = profileMatch.map(m => m.slice(1, -1));
      const createdAt = vals[0];
      const notes = vals[1];
      const job = vals[2];
      const phone = vals[3];
      const birthdate = vals[4];
      const rollNumber = vals[5];
      const fullName = vals[6];

      const classMarksHeaderIdx = lines.findIndex(l => l.includes('وانەکان و نمرەکان'));
      const marksData: { name: string, score: number | '' }[] = [];
      if (classMarksHeaderIdx !== -1) {
        let i = classMarksHeaderIdx + 2;
        while (i < lines.length && !lines[i].includes('تۆماری ئامادەبوون')) {
          const match = lines[i].match(/"(.*?)"/g);
          if (match && match.length >= 3) {
            const v = match.map(m => m.slice(1, -1));
            const scoreStr = v[1];
            const name = v[2];
            let score: number | '' = '';
            if (scoreStr !== '' && scoreStr !== '-') {
              score = Number(scoreStr);
              if (isNaN(score)) score = '';
            }
            marksData.push({ name, score });
          }
          i++;
        }
      }

      const attendanceHeaderIdx = lines.findIndex(l => l.includes('تۆماری ئامادەبوون (ڕۆژانە)'));
      const attendanceData: { name: string, date: string, present: boolean }[] = [];
      if (attendanceHeaderIdx !== -1) {
        let i = attendanceHeaderIdx + 2;
        while (i < lines.length) {
          const match = lines[i].match(/"(.*?)"/g);
          if (match && match.length >= 4) {
            const v = match.map(m => m.slice(1, -1));
            attendanceData.push({
              present: v[0] === 'هاتوو',
              date: v[2],
              name: v[3]
            });
          }
          i++;
        }
      }

      setData(prev => {
        const newState = { ...prev };
        let targetTeacherId = activeTeacherId;
        if (teacherName) {
          const t = newState.teachers.find(t => t.name === teacherName);
          if (t) {
            targetTeacherId = t.id;
          } else {
            targetTeacherId = 't_' + Date.now().toString(36);
            newState.teachers.push({ id: targetTeacherId, name: teacherName });
          }
        }
        if (!targetTeacherId) targetTeacherId = newState.teachers[0]?.id || 't_default';

        let student = newState.students.find(s => s.rollNumber === rollNumber || s.fullName === fullName);
        if (student) {
          student.fullName = fullName;
          student.rollNumber = rollNumber;
          student.birthdate = birthdate;
          student.phone = phone;
          student.job = job;
          student.notes = notes;
          student.teacherId = targetTeacherId;
          student.createdAt = createdAt;
        } else {
          student = {
            id: 's_' + Date.now().toString(36),
            teacherId: targetTeacherId,
            fullName,
            rollNumber,
            birthdate,
            phone,
            job,
            notes,
            createdAt
          };
          newState.students.push(student);
        }

        marksData.forEach(md => {
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

        attendanceData.forEach(ad => {
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

        return newState;
      });

      return { success: true, message: 'زانیارییەکانی فێرخوازەکە بەسەرکەوتوویی هاوردە کران' };

    } catch (e) {
      return { success: false, message: 'فایلی هەڵبژێردراو نەناسراوە! تکایە فایلی دروستی فێرخوازان بەکاربهێنە' };
    }
  };
`;

code = code.replace('  if (!isLoaded) return null;', importStudentCSV + '\n  if (!isLoaded) return null;');
code = code.replace('exportData,\n        importData,', 'exportData,\n        importData,\n        importStudentCSV,');

fs.writeFileSync('src/store.tsx', code);
