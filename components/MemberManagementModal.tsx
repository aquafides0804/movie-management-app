'use client';

import { useState } from 'react';
import { Users, X, UserPlus, Trash2 } from 'lucide-react';

export default function MemberManagementModal({
  isLight,
  editorList,
  directorList,
  onAddMember,
  onDeleteMember,
  onClose,
}: {
  isLight: boolean;
  editorList: string[];
  directorList: string[];
  onAddMember: (name: string, role: 'editor' | 'director') => void;
  onDeleteMember: (name: string, role: 'editor' | 'director') => void;
  onClose: () => void;
}) {
  const [newEditorName, setNewEditorName] = useState('');
  const [newDirectorName, setNewDirectorName] = useState('');

  const bgModal = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const inputClass = isLight
    ? 'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-amber-500 focus:outline-none'
    : 'rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-100 focus:border-amber-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-md rounded-lg border shadow-2xl ${bgModal}`}>
        <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-neutral-900'}`}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" />
            <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>担当者一覧の管理</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1 ${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-4 max-h-[75vh] overflow-y-auto">
          <div>
            <h3 className={`mb-2 text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>編集者 一覧</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="新しい編集者名"
                value={newEditorName}
                onChange={(e) => setNewEditorName(e.target.value)}
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (newEditorName.trim()) {
                    onAddMember(newEditorName.trim(), 'editor');
                    setNewEditorName('');
                  }
                }}
                className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-500"
              >
                <UserPlus className="h-3.5 w-3.5" /> 追加
              </button>
            </div>

            <div className="space-y-1.5">
              {editorList.length === 0 ? (
                <p className="text-xs text-slate-400">登録されている編集者はいません</p>
              ) : (
                editorList.map((name) => (
                  <div
                    key={name}
                    className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs font-semibold ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-neutral-800 bg-neutral-950 text-neutral-200'
                    }`}
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteMember(name, 'editor')}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5"
                      title="削除（担当案件は未割当になります）"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`border-t pt-4 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
            <h3 className={`mb-2 text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>ディレクター 一覧</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="新しいDir名"
                value={newDirectorName}
                onChange={(e) => setNewDirectorName(e.target.value)}
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => {
                  if (newDirectorName.trim()) {
                    onAddMember(newDirectorName.trim(), 'director');
                    setNewDirectorName('');
                  }
                }}
                className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-500"
              >
                <UserPlus className="h-3.5 w-3.5" /> 追加
              </button>
            </div>

            <div className="space-y-1.5">
              {directorList.length === 0 ? (
                <p className="text-xs text-slate-400">登録されているディレクターはいません</p>
              ) : (
                directorList.map((name) => (
                  <div
                    key={name}
                    className={`flex items-center justify-between rounded border px-2.5 py-1.5 text-xs font-semibold ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-neutral-800 bg-neutral-950 text-neutral-200'
                    }`}
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => onDeleteMember(name, 'director')}
                      className="text-slate-400 hover:text-rose-600 rounded p-0.5"
                      title="削除（担当案件は未割当になります）"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className={`flex justify-end border-t px-4 py-2.5 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border px-3.5 py-1 text-xs font-semibold ${
              isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-neutral-700 text-neutral-200 hover:border-neutral-800'
            }`}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}