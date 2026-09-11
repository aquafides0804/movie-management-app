'use client';

import { useState, useMemo } from 'react';
import { Project, DateFilterType, DateConditionType } from '@/app/types';
import { STATUS_CONFIG, STATUS_ORDER } from '@/app/constants';
import { projectHasAlert, getDueBadge, formatDateShort } from '@/app/utils';
import { Building2, Filter, Pencil, HardDrive, Copy, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function ClientTableView({
  projects,
  clientNames,
  editorNames,
  selectedClient,
  isLight,
  onSelectClient,
  onEditProject,
  onCopyLink,
  selectedIds,
  onToggleSelect,
}: {
  projects: Project[];
  clientNames: string[];
  editorNames: string[];
  selectedClient: string;
  isLight: boolean;
  onSelectClient: (c: string) => void;
  onEditProject: (p: Project) => void;
  onCopyLink: (url: string, label: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}) {
  const [selectedEditor, setSelectedEditor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [dateFieldType, setDateFieldType] = useState<DateFilterType>('none');
  const [targetDate, setTargetDate] = useState<string>('');
  const [dateCondition, setDateCondition] = useState<DateConditionType>('exact');

  // テーブルの列見出しクリックによる並び替え（CL提出日 / 納品日 のみ対象）
  type TableSortField = 'clientSubmittedDate' | 'deliveredDate';
  const [sortField, setSortField] = useState<TableSortField | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleHeaderSort = (field: TableSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const rawClientProjects = useMemo(() => {
    if (selectedClient === 'all') return projects;
    return projects.filter((p) => p.clientName === selectedClient);
  }, [projects, selectedClient]);

  const clientProjects = useMemo(() => {
    return rawClientProjects.filter((p) => {
      if (selectedEditor !== 'all') {
        if (selectedEditor === 'unassigned') {
          if (p.mainEditor) return false;
        } else if (p.mainEditor !== selectedEditor) {
          return false;
        }
      }
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      if (dateFieldType !== 'none' && targetDate) {
        const val = dateFieldType === 'deliveredDate' ? p.deliveredDate : p.clientSubmittedDate;
        if (!val) return false;

        if (dateCondition === 'exact' && val !== targetDate) return false;
        if (dateCondition === 'before' && val > targetDate) return false;
        if (dateCondition === 'after' && val < targetDate) return false;
      }

      return true;
    });
  }, [rawClientProjects, selectedEditor, selectedStatus, dateFieldType, targetDate, dateCondition]);

  const sortedClientProjects = useMemo(() => {
    if (!sortField) return clientProjects;

    return [...clientProjects].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      // 日付未設定の案件は常に末尾に配置
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;

      const timeA = new Date(valA).getTime();
      const timeB = new Date(valB).getTime();

      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [clientProjects, sortField, sortOrder]);

  const totalCount = rawClientProjects.length;
  const deliveredCount = rawClientProjects.filter((p) => p.status === 'delivered').length;
  const activeCount = totalCount - deliveredCount;
  const overdueCount = rawClientProjects.filter(projectHasAlert).length;
  const rate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const selectClass = `rounded-md border px-2.5 py-1 text-xs font-bold focus:border-amber-500 focus:outline-none ${
    isLight ? 'border-slate-300 bg-white text-slate-800' : 'border-neutral-700 bg-neutral-950 text-neutral-100'
  }`;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${bgCard}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>クライアント選択:</span>
              <select
                value={selectedClient}
                onChange={(e) => onSelectClient(e.target.value)}
                className={selectClass}
              >
                <option value="all">全クライアント（すべて表示）</option>
                {clientNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 border-l pl-3 border-slate-200">
              <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>担当編集者:</span>
              <select
                value={selectedEditor}
                onChange={(e) => setSelectedEditor(e.target.value)}
                className={selectClass}
              >
                <option value="all">全員</option>
                <option value="unassigned">未割り当て</option>
                {editorNames.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 border-l pl-3 border-slate-200">
              <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-neutral-300'}`}>ステータス:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={selectClass}
              >
                <option value="all">全ステータス</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
              表示中 <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{clientProjects.length}</span> / {totalCount} 件
            </div>
            <div className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
              進行中 <span className="font-bold text-amber-600">{activeCount}</span> 件
            </div>
            <div className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
              完了 <span className="font-bold text-emerald-600">{deliveredCount}</span> 件
            </div>
            {overdueCount > 0 && (
              <div className="rounded bg-rose-100 px-2 py-0.5 text-rose-700 font-semibold border border-rose-200">
                要対応 {overdueCount} 件
              </div>
            )}
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-2 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
            <Filter className="h-3.5 w-3.5" />
            <span>日付絞り込み:</span>
          </div>

          <select
            value={dateFieldType}
            onChange={(e) => setDateFieldType(e.target.value as DateFilterType)}
            className={selectClass}
          >
            <option value="none">指定なし</option>
            <option value="deliveredDate">納品日</option>
            <option value="clientSubmittedDate">CL提出日</option>
          </select>

          {dateFieldType !== 'none' && (
            <>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={`rounded-md border px-2 py-1 text-xs font-bold focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-white text-slate-800 [color-scheme:light]'
                    : 'border-neutral-700 bg-neutral-950 text-neutral-100 [color-scheme:dark]'
                }`}
              />

              <select
                value={dateCondition}
                onChange={(e) => setDateCondition(e.target.value as DateConditionType)}
                className={selectClass}
              >
                <option value="exact">指定日ぴったり</option>
                <option value="before">指定日以前（過去含む）</option>
                <option value="after">指定日以降（未来含む）</option>
              </select>

              {targetDate && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFieldType('none');
                    setTargetDate('');
                  }}
                  className={`rounded px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 ${isLight ? 'border border-rose-200' : 'bg-neutral-800'}`}
                >
                  日付条件クリア
                </button>
              )}
            </>
          )}
        </div>

        <div className="space-y-1 mt-3">
          <div className={`flex justify-between text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
            <span>納品完了率</span>
            <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{rate}%</span>
          </div>
          <div className={`h-2 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-neutral-800'}`}>
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`overflow-x-auto rounded-lg border shadow ${bgCard}`}>
        <table className="w-full text-left text-xs">
          <thead className={`border-b text-xs font-semibold uppercase tracking-wider ${isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-neutral-800 bg-neutral-950/90 text-neutral-300'}`}>
            <tr>
              <th className="p-3 w-10 text-center">選択</th>
              <th className="p-3">案件名 / タイトル</th>
              <th className="p-3">担当編集者</th>
              <th className="p-3">ステータス</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('clientSubmittedDate')}
                  className={`flex items-center gap-1 uppercase tracking-wider ${
                    sortField === 'clientSubmittedDate' ? 'text-amber-600' : ''
                  } hover:text-amber-600 transition-colors`}
                  title="クリックしてCL提出日で並び替え"
                >
                  CL提出日
                  {sortField === 'clientSubmittedDate' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => handleHeaderSort('deliveredDate')}
                  className={`flex items-center gap-1 uppercase tracking-wider ${
                    sortField === 'deliveredDate' ? 'text-amber-600' : ''
                  } hover:text-amber-600 transition-colors`}
                  title="クリックして納品日で並び替え"
                >
                  納品日
                  {sortField === 'deliveredDate' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </th>
              <th className="p-3">期日アラート</th>
              <th className="p-3 text-center">Googleドライブ</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-800' : 'divide-neutral-800/80 text-neutral-200'}`}>
            {sortedClientProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className={`p-8 text-center font-medium ${isLight ? 'text-slate-400' : 'text-neutral-400'}`}>
                  条件に一致する案件はありません
                </td>
              </tr>
            ) : (
              sortedClientProjects.map((project) => {
                const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['not_started'];
                const draftDue = getDueBadge(project.draftDueDate);
                const gDrive = project.links.find((l) => l.linkType === 'google_drive');
                const hasAlert = projectHasAlert(project);

                return (
                  <tr
                    key={project.id}
                    className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/70'}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(project.id)}
                        onChange={() => onToggleSelect(project.id)}
                        className="h-4 w-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => onEditProject(project)}
                        className={`font-bold text-left flex items-center gap-1.5 ${isLight ? 'text-slate-900 hover:text-amber-600' : 'text-neutral-100 hover:text-amber-400'}`}
                      >
                        {project.title}
                        <Pencil className="h-3 w-3 text-slate-400" />
                      </button>
                    </td>
                    <td className="p-3 font-semibold">
                      {project.mainEditor || '未割り当て'}
                      {project.director && <span className={`text-[10px] block font-normal ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Dir: {project.director}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold ${isLight ? statusConfig.badgeLight : statusConfig.badgeDark}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">
                      {formatDateShort(project.clientSubmittedDate || project.draftDueDate)}
                    </td>
                    <td className="p-3 font-semibold text-emerald-600">
                      {formatDateShort(project.deliveredDate)}
                    </td>
                    <td className="p-3">
                      {hasAlert ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          {draftDue.label}
                        </span>
                      ) : (
                        <span className={`font-medium text-[11px] ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>{draftDue.label}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {gDrive ? (
                        <div className={`inline-flex items-center gap-1 rounded border px-2 py-1 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-700 bg-neutral-950'}`}>
                          <a
                            href={gDrive.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 hover:underline flex items-center gap-1 font-bold"
                          >
                            <HardDrive className="h-3.5 w-3.5" /> 開く
                          </a>
                          <button
                            type="button"
                            onClick={() => onCopyLink(gDrive.url, 'Googleドライブ')}
                            className={`ml-1 ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-300 hover:text-white'}`}
                            title="URLをコピー"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}