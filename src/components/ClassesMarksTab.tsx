import React, { useState } from 'react';
import { useStore } from '../store';
import { Subject } from '../types';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function ClassesMarksTab() {
  const { data, activeTeacherId, addSubject, updateSubject, deleteSubject, setMark } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  
  // State for batch grading selection
  const [selectedStudents, setSelectedStudents] = useState<Record<string, string[]>>({});
  const [batchScore, setBatchScore] = useState<Record<string, string>>({});

  const subjects = data.subjects.filter(s => s.teacherId === activeTeacherId);
  const students = data.students.filter(s => s.teacherId === activeTeacherId);

  const toggleStudentSelection = (subjectId: string, studentId: string) => {
    setSelectedStudents(prev => {
      const current = prev[subjectId] || [];
      if (current.includes(studentId)) {
        return { ...prev, [subjectId]: current.filter(id => id !== studentId) };
      }
      return { ...prev, [subjectId]: [...current, studentId] };
    });
  };

  const toggleAllStudents = (subjectId: string, allIds: string[]) => {
    setSelectedStudents(prev => {
      const current = prev[subjectId] || [];
      if (current.length === allIds.length) {
        return { ...prev, [subjectId]: [] }; // Deselect all
      }
      return { ...prev, [subjectId]: allIds }; // Select all
    });
  };

  const applyBatchScore = (subjectId: string) => {
    const scoreStr = batchScore[subjectId];
    if (scoreStr === undefined || scoreStr === '') return;
    
    let val: number | '' = Number(scoreStr);
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    
    const selectedIds = selectedStudents[subjectId] || [];
    selectedIds.forEach(studentId => {
      setMark(studentId, subjectId, val);
    });
    
    // Clear selection after applying
    setSelectedStudents(prev => ({ ...prev, [subjectId]: [] }));
    setBatchScore(prev => ({ ...prev, [subjectId]: '' }));
  };

  const openAddModal = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setSubjectToDelete(id);
  };

  const confirmDelete = () => {
    if (subjectToDelete) {
      deleteSubject(subjectToDelete);
      setSubjectToDelete(null);
    }
  };

  const getMark = (studentId: string, subjectId: string) => {
    return data.marks.find(m => m.studentId === studentId && m.subjectId === subjectId)?.score || '';
  };

  const getGrade = (score: number | '') => {
    if (score === '') return '-';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="h-full flex flex-col">
      <ConfirmModal
        isOpen={!!subjectToDelete}
        message="دڵنیایت لە سڕینەوەی ئەم وانەیە؟ هەموو نمرەکانی فێرخوازانیش دەسڕێنەوە!"
        onConfirm={confirmDelete}
        onCancel={() => setSubjectToDelete(null)}
      />
      <div className="p-4 md:p-6 border-b border-slate-200 bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">وانەکان و نمرەکان</h2>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">زیادکردنی وانە</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {subjects.length > 0 ? (
          subjects.map(subject => {
            const isExpanded = expandedSubjectId === subject.id;
            const enrolledStudents = students.filter(s => subject.enrolledStudentIds.includes(s.id));

            return (
              <div key={subject.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div 
                  className="bg-slate-50 p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-100"
                  onClick={() => setExpandedSubjectId(isExpanded ? null : subject.id)}
                >
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800">{subject.name}</h3>
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                      {subject.enrolledStudentIds.length} فێرخواز
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(subject); }} 
                      className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(subject.id); }} 
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-white">
                    {enrolledStudents.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <span className="text-sm font-semibold text-slate-700">پێدانی نمرە بەکۆمەڵ:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="نمرە"
                            className="w-20 p-1.5 border border-slate-200 rounded text-center font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={batchScore[subject.id] || ''}
                            onChange={(e) => setBatchScore(prev => ({ ...prev, [subject.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => applyBatchScore(subject.id)}
                            disabled={!(selectedStudents[subject.id]?.length > 0) || batchScore[subject.id] === ''}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            جێبەجێکردن
                          </button>
                          <span className="text-xs text-slate-500">
                            ({selectedStudents[subject.id]?.length || 0} دیاریکراوە)
                          </span>
                        </div>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-right">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr className="text-slate-500 text-sm font-medium">
                                <th className="p-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`select-all-${subject.id}`}
                                      checked={selectedStudents[subject.id]?.length === enrolledStudents.length && enrolledStudents.length > 0}
                                      ref={(input) => {
                                        if (input) {
                                          const selectedCount = selectedStudents[subject.id]?.length || 0;
                                          input.indeterminate = selectedCount > 0 && selectedCount < enrolledStudents.length;
                                        }
                                      }}
                                      onChange={() => toggleAllStudents(subject.id, enrolledStudents.map(s => s.id))}
                                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor={`select-all-${subject.id}`} className="text-xs font-medium text-slate-500 cursor-pointer select-none">
                                      {selectedStudents[subject.id]?.length === enrolledStudents.length && enrolledStudents.length > 0 ? 'لابردنی هەمووان' : 'دیاریکردنی هەمووان'}
                                    </label>
                                  </div>
                                </th>
                                <th className="p-3">ناوی فێرخواز</th>
                                <th className="p-3 w-40">نمرەی کۆتایی (100)</th>
                                <th className="p-3 w-32 text-center">ئاست (Grade)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {enrolledStudents.map(student => {
                                const score = getMark(student.id, subject.id);
                                const isSelected = selectedStudents[subject.id]?.includes(student.id) || false;
                                return (
                                  <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                    <td className="p-3">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleStudentSelection(subject.id, student.id)}
                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 font-semibold text-slate-800">{student.fullName}</td>
                                    <td className="p-3">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                                        value={score}
                                        onChange={(e) => {
                                          let val: number | '' = e.target.value === '' ? '' : Number(e.target.value);
                                          if (val !== '' && val > 100) val = 100;
                                          if (val !== '' && val < 0) val = 0;
                                          setMark(student.id, subject.id, val);
                                        }}
                                      />
                                    </td>
                                    <td className="p-3 font-bold text-center" dir="ltr">
                                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${score !== '' && score >= 50 ? 'text-emerald-700 bg-emerald-100' : score !== '' ? 'text-rose-700 bg-rose-100' : 'text-slate-400 bg-slate-100'}`}>
                                        {getGrade(score)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">هیچ فێرخوازێک بۆ ئەم وانەیە تۆمارنەکراوە.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">هیچ وانەیەک نییە. تکایە وانەیەک زیاد بکە.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <SubjectModal
          activeTeacherId={activeTeacherId!}
          subject={editingSubject}
          students={students}
          onClose={() => setIsModalOpen(false)}
          onSave={(s) => {
            if (editingSubject) {
              updateSubject({ ...s, id: editingSubject.id } as Subject);
            } else {
              addSubject(s);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SubjectModal({
  activeTeacherId,
  subject,
  students,
  onClose,
  onSave
}: {
  activeTeacherId: string;
  subject: Subject | null;
  students: any[];
  onClose: () => void;
  onSave: (s: Omit<Subject, 'id'>) => void;
}) {
  const [name, setName] = useState(subject?.name || '');
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>(subject?.enrolledStudentIds || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('تکایە ناوی وانە بنووسە.');
      return;
    }
    onSave({
      teacherId: activeTeacherId,
      name,
      enrolledStudentIds
    });
  };

  const toggleStudent = (id: string) => {
    setEnrolledStudentIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">{subject ? 'دەستکاری وانە' : 'زیادکردنی وانە'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">ناوی وانە <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="بۆ نموونە: بیرکاری"
            />
          </div>
          
          <div className="flex flex-col flex-1 min-h-[300px]">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-semibold text-slate-700">فێرخوازە بەشداربووەکان</label>
              <button 
                type="button" 
                onClick={() => setEnrolledStudentIds(students.map(s => s.id))}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full transition-colors"
              >
                دیاریکردنی هەمووی
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-y-auto bg-slate-50 flex-1">
              {students.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {students.map(student => (
                    <label key={student.id} className="flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        checked={enrolledStudentIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                      />
                      <span className="font-medium text-slate-700">{student.fullName}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <p className="text-slate-400 font-medium">هیچ فێرخوازێک نییە</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 mt-auto">
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
