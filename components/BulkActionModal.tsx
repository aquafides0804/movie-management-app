'use client';

import React, { useState } from 'react';
import { CheckSquare, Trash2, Edit3, X, AlertCircle } from 'lucide-react';

interface BulkActionModalProps {
  selectedCount: number;
  onClearSelection: () => void;
  onApplyBulkUpdate: (updates: BulkUpdateData) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  editorsList: string[];
  directorsList: string[];
}

export interface BulkUpdateData {
  status?: string;
  editor?: string;
  director?: string;
  internalDeadline?: string;
  firstDraftDate?: string;
  clientDeadline?: string;
}

export default function BulkActionModal({
  selectedCount,
  onClearSelection,
  onApplyBulkUpdate,
  onBulkDelete,
  editorsList,
  directorsList,
}: BulkActionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<string>('');
  const [editor, setEditor] = useState<string>('');
  const [director, setDirector] = useState<string>('');
  const [internalDeadline, setInternalDeadline] = useState<string>('');
  const [firstDraftDate, setFirstDraftDate] = useState<string>('');
  const [clientDeadline, setClientDeadline] = useState<string>('');

  if (selectedCount === 0) return null;

  const handleApply = async () => {
    const updates: BulkUpdateData = {};
    if (status) updates.status = status;
    if (editor) updates.editor = editor;
    if (director) updates.director = director;
    if (internalDeadline) updates.internalDeadline = internalDeadline;
    if (firstDraftDate) updates.firstDraftDate = firstDraftDate;
    if (clientDeadline) updates.clientDeadline = clientDeadline;

    if (Object.keys(updates).length === 0) {
      alert('変更する項目を1つ以上選択してください。');
      return;
    }

    setLoading(true);
    try {
      await onApplyBulkUpdate(updates);
      setIsOpen(false);
      setStatus('');
      setEditor('');
      setDirector('');
      setInternalDeadline('');
      setFirstDraftDate('');
      setClientDeadline('');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`選択された ${selectedCount} 件の案件を削除してもよろしいですか？`)) return;
    setIsDeleting(true);
    try {
      await onBulkDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* 画面下部に浮かぶ一括操作バー */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-amber-500/40 text-white px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-6 min-w-[360px] max-w-[90vw]">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <CheckSquare className="w-5 h-5" />
          <span>{selectedCount} 件選択中</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm"
          >
            <Edit3 className="w-4 h-4" />
            一括変更
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg flex items-center gap-1.5 transition text-sm"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>

          <button
            onClick={onClearSelection}
            className="p-2 text-slate-400 hover:text-white transition"
            title="選択解除"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 一括変更用ポップアップ（モーダル） */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> {selectedCount} 件の一括変更
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              変更したい項目のみ指定してください。空欄の項目は元のデータが保持されます。
            </p>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ステータス</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">(変更なし)</option>
                  <option value="not_started">未着手</option>
                  <option value="editing">編集</option>
                  <option value="client_review">CL確認中</option>
                  <option value="revision_requested">CLから修正</option>
                  <option value="revision">修正</option>
                  <option value="revision_submitted">修正提出</option>
                  <option value="delivered">納品完了</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">編集担当者</label>
                <select
                  value={editor}
                  onChange={(e) => setEditor(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">(変更なし)</option>
                  {editorsList.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ディレクター</label>
                <select
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">(変更なし)</option>
                  {directorsList.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                 <label className="block text-xs font-semibold text-slate-300 mb-1">締め切り日</label>
                <input
                  type="date"
                  value={internalDeadline}
                  onChange={(e) => setInternalDeadline(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 [color-scheme:dark]"
                />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">初稿提出日</label>
                  <input
                    type="date"
                    value={firstDraftDate}
                    onChange={(e) => setFirstDraftDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">先方提出日(CL)</label>
                  <input
                    type="date"
                    value={clientDeadline}
                    onChange={(e) => setClientDeadline(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                キャンセル
              </button>
              <button
                onClick={handleApply}
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                {loading ? '更新中...' : '一括変更を適用する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}