'use client';

import { useState } from 'react';
import { Project, ProjectStatus } from '@/app/types';
import { STATUS_CONFIG, STATUS_ORDER } from '@/app/constants';
import { projectHasAlert } from '@/app/utils';
import ProjectCard from './ProjectCard';

// Project 型に含まれる日付フィールドのキーのみに限定
type SortKey = 'editorDeadline' | 'directorDeadline' | 'clientSubmissionDate' | 'revisionCompletedDate' | 'deliveryDate';

export default function KanbanBoard({
  projects,
  selectedIds,
  isLight,
  editorNames,
  directorNames,
  onToggleSelect,
  onStatusChange,
  onQuickUpdate,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  selectedIds: string[];
  isLight: boolean;
  editorNames: string[];
  directorNames: string[];
  onToggleSelect: (id: string) => void;
  onStatusChange: (id: string, next: ProjectStatus) => void;
  onQuickUpdate: (id: string, fields: Partial<Project>) => void;
  onCopyLink: (url: string, label: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  // STATUS_ORDER に含まれるステータス値に合わせて初期化
  const [columnSortKey, setColumnSortKey] = useState<Partial<Record<ProjectStatus, SortKey>>>({
    not_started: 'editorDeadline',
    editing: 'editorDeadline',
    client_review: 'clientSubmissionDate',
    delivered: 'deliveryDate',
  });

  const [columnSortOrder, setColumnSortOrder] = useState<Partial<Record<ProjectStatus, 'asc' | 'desc'>>>({
    not_started: 'asc',
    editing: 'asc',
    client_review: 'asc',
    delivered: 'desc',
  });

  // 安全にプロパティを取り出して比較するソート関数
  const sortProjects = (items: Project[], sortKey: SortKey, order: 'asc' | 'desc') => {
    return [...items].sort((a, b) => {
      const valA = a[sortKey as keyof Project] as string | undefined;
      const valB = b[sortKey as keyof Project] as string | undefined;

      // 日付未設定の場合は最下部に配置
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;

      const timeA = new Date(valA).getTime();
      const timeB = new Date(valB).getTime();

      return order === 'asc' ? timeA - timeB : timeB - timeA;
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const rawColumnProjects = projects.filter((p) => p.status === status);
        const alertCount = rawColumnProjects.filter(projectHasAlert).length;

        // 現在のカラムのソート条件を適用（デフォルトは編集者締切・昇順）
        const currentSortKey = columnSortKey[status] || 'editorDeadline';
        const currentSortOrder = columnSortOrder[status] || 'asc';
        const columnProjects = sortProjects(rawColumnProjects, currentSortKey, currentSortOrder);

        const colBg = isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-neutral-950/80 border-neutral-800/80';
        const selectBg = isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-neutral-900 border-neutral-700 text-neutral-300';

        return (
          <div key={status} className={`flex w-72 shrink-0 flex-col rounded-lg border ${colBg}`}>
            {/* ヘッダー情報 */}
            <div className="flex flex-col border-b border-slate-200/60 dark:border-neutral-800/60 p-2.5 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                  <h2 className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-neutral-100'}`}>{config.label}</h2>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-neutral-800 text-neutral-300'}`}>
                    {columnProjects.length}
                  </span>
                </div>
                {alertCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                    要対応 {alertCount}
                  </span>
                )}
              </div>

              {/* カラムごとのソート選択ドロップダウン */}
              <div className="flex items-center gap-1">
                <select
                  value={currentSortKey}
                  onChange={(e) =>
                    setColumnSortKey((prev) => ({
                      ...prev,
                      [status]: e.target.value as SortKey,
                    }))
                  }
                  className={`flex-1 text-[11px] px-1.5 py-1 rounded border ${selectBg} focus:outline-none`}
                >
                  <option value="editorDeadline">編集者締切日</option>
                  <option value="directorDeadline">Dir締切日</option>
                  <option value="clientSubmissionDate">CL提出日</option>
                  <option value="revisionCompletedDate">修正完了日</option>
                  <option value="deliveryDate">納品日</option>
                </select>

                <button
                  onClick={() =>
                    setColumnSortOrder((prev) => ({
                      ...prev,
                      [status]: currentSortOrder === 'asc' ? 'desc' : 'asc',
                    }))
                  }
                  className={`text-[11px] px-2 py-1 rounded border font-semibold ${selectBg} hover:opacity-80`}
                  title={currentSortOrder === 'asc' ? '昇順（古い順/近い順）' : '降順（新しい順/遠い順）'}
                >
                  {currentSortOrder === 'asc' ? '▲ 昇順' : '▼ 降順'}
                </button>
              </div>
            </div>

            {/* 案件カードリスト */}
            <div className="flex flex-1 flex-col gap-2.5 p-2.5">
              {columnProjects.length === 0 ? (
                <p className={`rounded-md border border-dashed py-6 text-center text-xs font-medium ${isLight ? 'border-slate-300 text-slate-400' : 'border-neutral-800 text-neutral-400'}`}>
                  案件なし
                </p>
              ) : (
                columnProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSelected={selectedIds.includes(project.id)}
                    isLight={isLight}
                    editorNames={editorNames}
                    directorNames={directorNames}
                    onToggleSelect={onToggleSelect}
                    onStatusChange={onStatusChange}
                    onQuickUpdate={onQuickUpdate}
                    onCopyLink={onCopyLink}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}