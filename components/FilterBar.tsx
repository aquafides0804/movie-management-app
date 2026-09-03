'use client';

import { DashboardFilters } from '@/app/types';
import { Search, AlertTriangle, Plus } from 'lucide-react';

export default function FilterBar({
  filters,
  isLight,
  onChange,
  clientNames,
  editorNames,
  onOpenAddModal,
}: {
  filters: DashboardFilters;
  isLight: boolean;
  onChange: (f: DashboardFilters) => void;
  clientNames: string[];
  editorNames: string[];
  onOpenAddModal: () => void;
}) {
  function update<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  const bgBar = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const inputClass = isLight
    ? 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-amber-500'
    : 'border-neutral-700 bg-neutral-950 text-neutral-100 placeholder:text-neutral-400 focus:border-amber-500';

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border p-2.5 ${bgBar}`}>
      <div className="relative">
        <Search className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => update('keyword', e.target.value)}
          placeholder="案件名・タイトルを検索"
          className={`w-56 rounded-md border py-1.5 pl-8 pr-2 text-xs font-medium focus:outline-none ${inputClass}`}
        />
      </div>

      <select
        value={filters.clientName}
        onChange={(e) => update('clientName', e.target.value)}
        className={`rounded-md border px-2.5 py-1.5 text-xs font-medium focus:outline-none ${inputClass}`}
      >
        <option value="all">全クライアント</option>
        {clientNames.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filters.editor}
        onChange={(e) => update('editor', e.target.value)}
        className={`rounded-md border px-2.5 py-1.5 text-xs font-medium focus:outline-none ${inputClass}`}
      >
        <option value="all">全担当者</option>
        {editorNames.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => update('onlyAlerts', !filters.onlyAlerts)}
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-colors ${
          filters.onlyAlerts
            ? 'border-rose-500 bg-rose-50 text-rose-700'
            : isLight
            ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
            : 'border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-neutral-500'
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        要対応のみ
      </button>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="ml-auto flex items-center gap-1.5 rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-500 transition-colors shadow"
      >
        <Plus className="h-3.5 w-3.5" />
        新規案件追加
      </button>
    </div>
  );
}