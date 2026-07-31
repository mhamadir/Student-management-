import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">ئایا دڵنیایت؟</h3>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            پاشگەزبوونەوە
          </button>
          <div className="w-px bg-slate-100"></div>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="flex-1 py-4 font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            سڕینەوە
          </button>
        </div>
      </div>
    </div>
  );
}
