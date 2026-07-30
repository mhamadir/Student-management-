import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, Trash2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function TeacherSelector() {
  const { data, activeTeacherId, setActiveTeacherId, addTeacher, deleteTeacher } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTeacherName.trim()) {
      addTeacher(newTeacherName.trim());
      setNewTeacherName('');
      setIsAdding(false);
    }
  };

  const confirmDelete = () => {
    if (activeTeacherId) {
      deleteTeacher(activeTeacherId);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <ConfirmModal
        isOpen={showConfirm}
        message="دڵنیایت لە سڕینەوەی ئەم مامۆستایە؟ هەموو فێرخوازەکانیش دەسڕێنەوە!"
        onConfirm={confirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
      {!isAdding ? (
        <div className="flex items-center gap-2">
          <select
            className="flex-1 bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-sm"
            value={activeTeacherId || ''}
            onChange={(e) => setActiveTeacherId(e.target.value || null)}
          >
            <option value="" disabled>هەڵبژاردن...</option>
            {data.teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            onClick={() => setIsAdding(true)}
            className="p-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors"
            title="زیادکردنی مامۆستا"
          >
            <Plus className="w-4 h-4" />
          </button>
          {activeTeacherId && (
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              title="سڕینەوەی مامۆستا"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <input
            type="text"
            autoFocus
            className="w-full px-2 py-1 text-slate-900 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="ناوی مامۆستا"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
          />
          <div className="flex gap-2 text-xs font-medium">
            <button type="submit" className="flex-1 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors">پاشەکەوت</button>
            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors">لابردن</button>
          </div>
        </form>
      )}
    </div>
  );
}
