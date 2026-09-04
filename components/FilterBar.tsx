'use client';

import React from 'react';
import { DashboardFilters } from '@/app/types';
import { Calendar, Search, Filter, AlertTriangle } from 'lucide-react';

interface FilterBarProps {
  filters: DashboardFilters;
  isLight: boolean;
  onChange: (filters: DashboardFilters) => void;
  clientNames: string[];
  editorNames: string[];
  onOpenAddModal: () => void;
}

export default function FilterBar({
  filters,
  isLight,
  onChange,
  clientNames,
  editorNames,
}: FilterBarProps) {
  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const inputBg = isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-neutral-800 border-neutral-700 text-white';

  return (
    <div className={`rounded-xl border p-4 shadow-sm space-y-4 ${bgCard}`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* キーワード検索 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="案件名、クライアント名で検索..."
            value={filters.keyword}
            onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
            className={`w-full rounded-lg border pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 ${inputBg}`}
          />
        </div>

        {/* クライアント選択 */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-neutral-400 whitespace-nowrap">クライアント:</span>
          <select
            value={filters.clientName}
            onChange={(e) => onChange({ ...filters, clientName: e.target.value })}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold focus:outline-none ${inputBg}`}
          >
            <option value="all">全クライアント（すべて表示）</option>
            {clientNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* 担当編集者選択 */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-neutral-400 whitespace-nowrap">担当者:</span>
          <select
            value={filters.editor}
            onChange={(e) => onChange({ ...filters, editor: e.target.value })}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold focus:outline-none ${inputBg}`}
          >
            <option value="all">全員</option>
            <option value="unassigned">未割り当て</option>
            {editorNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* 未入力フィルター（CL提出日未入力など） */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-bold text-neutral-400 whitespace-nowrap">未入力絞り込み:</span>
          <select
            value={filters.missingField || 'none'}
            onChange={(e) => onChange({ ...filters, missingField: e.target.value as any })}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold focus:outline-none ${inputBg}`}
          >
            <option value="none">指定なし</option>
            <option value="clientSubmittedDate">CL提出日が未入力</option>
            <option value="deliveredDate">納品日が未入力</option>
            <option value="mainEditor">担当編集者が未割り当て</option>
          </select>
        </div>

        {/* アラートのみ */}
        <button
          onClick={() => onChange({ ...filters, onlyAlerts: !filters.onlyAlerts })}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
            filters.onlyAlerts
              ? 'bg-rose-500/20 border-rose-500 text-rose-400'
              : 'border-neutral-700 text-neutral-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          アラートのみ
        </button>
      </div>
    </div>
  );
}