'use client';

import { useState } from 'react';
import { ProjectFormData, ProjectStatus } from '@/app/types';
import { STATUS_CONFIG, STATUS_ORDER } from '@/app/constants';
import { X, Calendar } from 'lucide-react';

export default function ProjectFormModal({
  initial,
  isEdit,
  isLight,
  editorNames,
  directorNames,
  onSave,
  onClose,
}: {
  initial: ProjectFormData;
  isEdit: boolean;
  isLight: boolean;
  editorNames: string[];
  directorNames: string[];
  onSave: (data: ProjectFormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProjectFormData>(initial);

  function update<K extends keyof ProjectFormData>(key: K, value: ProjectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName.trim() || !form.title.trim()) return;
    onSave(form);
  }

  const bgModal = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const inputClass = isLight
    ? 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none'
    : 'w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs font-medium text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none';
  const labelClass = `mb-1 block text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-neutral-300'}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border shadow-2xl ${bgModal}`}>
        <div className={`sticky top-0 flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-neutral-900'}`}>
          <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>
            {isEdit ? '案件を編集' : '新規案件を追加'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1 ${isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>クライアント名 *</label>
              <input
                className={inputClass}
                value={form.clientName}
                onChange={(e) => update('clientName', e.target.value)}
                placeholder="例: ルナ様"
                required
              />
            </div>
            <div>
              <label className={labelClass}>ステータス</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => update('status', e.target.value as ProjectStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>タイトル / 案件名 *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="例: 保育園での一日"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>メイン担当者（編集者）</label>
              <select
                className={inputClass}
                value={form.mainEditor}
                onChange={(e) => update('mainEditor', e.target.value)}
              >
                <option value="">未割当</option>
                {editorNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ディレクター</label>
              <select
                className={inputClass}
                value={form.director}
                onChange={(e) => update('director', e.target.value)}
              >
                <option value="">未割当</option>
                {directorNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`rounded-md border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'}`}>
            <p className={`mb-2.5 flex items-center gap-1.5 text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              期日・実績日
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label="編集者締切日"
                value={form.internalDueDate}
                onChange={(v) => update('internalDueDate', v)}
                accent
                isLight={isLight}
              />
              <DateField
                label="Dir締切日"
                value={form.draftDueDate}
                onChange={(v) => update('draftDueDate', v)}
                accent
                isLight={isLight}
              />
              <DateField
                label="初稿提出日（実績）"
                value={form.draftSubmittedDate}
                onChange={(v) => update('draftSubmittedDate', v)}
                isLight={isLight}
              />
              <DateField
                label="CL提出日"
                value={form.clientSubmittedDate}
                onChange={(v) => update('clientSubmittedDate', v)}
                isLight={isLight}
              />
              <DateField
                label="修正完了日"
                value={form.revisionCompletedDate}
                onChange={(v) => update('revisionCompletedDate', v)}
                isLight={isLight}
              />
              <DateField
                label="納品日"
                value={form.deliveredDate}
                onChange={(v) => update('deliveredDate', v)}
                isLight={isLight}
              />
              <div>
                <label className={labelClass}>優先度</label>
                <select
                  className={inputClass}
                  value={form.priority}
                  onChange={(e) => update('priority', Number(e.target.value) as 0 | 1 | 2)}
                >
                  <option value={0}>通常</option>
                  <option value={1}>高</option>
                  <option value={2}>急ぎ</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>修正指示メモ</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.revisionNote}
              onChange={(e) => update('revisionNote', e.target.value)}
              placeholder="例: テロップの誤字修正・BGM音量調整"
            />
          </div>

          <div className={`border-t pt-3 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
            <p className={`mb-2 text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>外部リンク</p>
            <div className="space-y-2">
              <input
                className={inputClass}
                value={form.googleDriveUrl}
                onChange={(e) => update('googleDriveUrl', e.target.value)}
                placeholder="素材GoogleドライブURL"
              />
              <input
                className={inputClass}
                value={form.frameIoUrl}
                onChange={(e) => update('frameIoUrl', e.target.value)}
                placeholder="Frame.io URL"
              />
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <input
                  className={inputClass}
                  value={form.gigafileUrl}
                  onChange={(e) => update('gigafileUrl', e.target.value)}
                  placeholder="ギガファイル便URL"
                />
                <DateField
                  label=""
                  value={form.gigafileExpiresAt}
                  onChange={(v) => update('gigafileExpiresAt', v)}
                  accent
                  isLight={isLight}
                />
              </div>
              <input
                className={inputClass}
                value={form.youtubeUrl}
                onChange={(e) => update('youtubeUrl', e.target.value)}
                placeholder="YouTube限定公開URL"
              />
            </div>
          </div>

          <div className={`flex justify-end gap-2 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-neutral-700 text-neutral-200 hover:border-neutral-500'}`}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-500 shadow"
            >
              {isEdit ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  accent = false,
  isLight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accent?: boolean;
  isLight: boolean;
}) {
  return (
    <div>
      {label && <label className={`mb-1 block text-[11px] font-semibold ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>{label}</label>}
      <div className="relative">
        <Calendar
          className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
            accent ? 'text-amber-600' : 'text-slate-400'
          }`}
        />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border py-1.5 pl-8 pr-2 text-xs font-medium focus:outline-none ${isLight ? 'border-slate-300 bg-white text-slate-800 [color-scheme:light]' : 'border-neutral-700 bg-neutral-950 text-neutral-100 [color-scheme:dark]'}`}
        />
      </div>
    </div>
  );
}