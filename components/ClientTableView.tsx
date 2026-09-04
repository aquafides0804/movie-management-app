'use client';

import React, { useState, useMemo } from 'react';
import {
  Project,
  ProjectStatus,
  DateFilterType,
  DateConditionType,
} from '@/app/types';
import { STATUS_CONFIG, STATUS_ORDER } from '@/app/constants';
import {
  formatDateShort,
  getDueBadge,
  projectHasAlert,
} from '@/app/utils';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  AlertTriangle,
  Building2,
  Filter,
  Pencil,
  HardDrive,
  Copy,
} from 'lucide-react';

interface ClientTableViewProps {
  projects: Project[];
  clientNames: string[];
  editorNames: string[];
  selectedClient: string;
  isLight: boolean;
  onSelectClient: (client: string) => void;
  onEditProject: (project: Project) => void;
  onCopyLink: (url: string) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

type SortField = 'title' | 'mainEditor' | 'clientSubmittedDate' | 'deliveredDate' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function ClientTableView({
  projects,
  clientNames,
  editorNames,
  selectedClient,
  isLight,
  onSelectClient,
  onEditProject,
  onCopyLink,
  selectedIds = [],
  onToggleSelect,
}: ClientTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      if (sortField === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortField === 'mainEditor') {
        valA = a.mainEditor || '';
        valB = b.mainEditor || '';
      } else if (sortField === 'clientSubmittedDate') {
        valA = a.clientSubmittedDate || '';
        valB = b.clientSubmittedDate || '';
      } else if (sortField === 'deliveredDate') {
        valA = a.deliveredDate || '';
        valB = b.deliveredDate || '';
      }

      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;

      const compare = valA.localeCompare(valB, 'ja');
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [projects, sortField, sortOrder]);

  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const tableHeaderBg = isLight ? 'bg-slate-100 text-slate-700' : 'bg-neutral-800 text-neutral-300';
  const tableRowHover = isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/50';

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-amber-500 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-amber-500 ml-1 inline" />
    );
  };

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${bgCard}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b border-neutral-800 font-bold ${tableHeaderBg}`}>
              <th className="p-3 w-10 text-center">選択</th>
              <th className="p-3 cursor-pointer hover:text-amber-500" onClick={() => handleSort('title')}>
                案件名 {renderSortIcon('title')}
              </th>
              <th className="p-3">クライアント</th>
              <th className="p-3 cursor-pointer hover:text-amber-500" onClick={() => handleSort('mainEditor')}>
                担当編集者 {renderSortIcon('mainEditor')}
              </th>
              <th className="p-3">ステータス</th>
              <th className="p-3 cursor-pointer hover:text-amber-500" onClick={() => handleSort('clientSubmittedDate')}>
                CL提出日 {renderSortIcon('clientSubmittedDate')}
              </th>
              <th className="p-3 cursor-pointer hover:text-amber-500" onClick={() => handleSort('deliveredDate')}>
                納品日 {renderSortIcon('deliveredDate')}
              </th>
              <th className="p-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {sortedProjects.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.not_started;

              return (
                <tr key={p.id} className={`transition-colors ${tableRowHover} ${isSelected ? 'bg-amber-500/10' : ''}`}>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect && onToggleSelect(p.id)}
                      className="rounded border-neutral-700 bg-neutral-800 text-amber-500 focus:ring-amber-500"
                    />
                  </td>
                  <td className="p-3 font-bold">
                    <div className="flex items-center gap-1.5">
                      {projectHasAlert(p) && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                      <span>{p.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-neutral-400">{p.clientName}</td>
                  <td className="p-3">{p.mainEditor || <span className="text-neutral-500">未割り当て</span>}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="p-3 text-neutral-400">{formatDateShort(p.clientSubmittedDate || '')}</td>
                  <td className="p-3 text-neutral-400">{formatDateShort(p.deliveredDate || '')}</td>
                  <td className="p-3 text-right space-x-1">
                    {p.gigafileUrl && (
                      <button
                        onClick={() => onCopyLink(p.gigafileUrl || '')}
                        className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-amber-400"
                        title="ギガファイル便URLコピー"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onEditProject(p)}
                      className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white"
                      title="編集"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}