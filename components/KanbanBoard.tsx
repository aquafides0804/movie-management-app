'use client';

import { Project, ProjectStatus } from '@/app/types';
import { STATUS_CONFIG, STATUS_ORDER } from '@/app/constants';
import { projectHasAlert } from '@/app/utils';
import ProjectCard from './ProjectCard';

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
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_ORDER.map((status) => {
        const config = STATUS_CONFIG[status];
        const columnProjects = projects.filter((p) => p.status === status);
        const alertCount = columnProjects.filter(projectHasAlert).length;

        const colBg = isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-neutral-950/80 border-neutral-800/80';

        return (
          <div key={status} className={`flex w-72 shrink-0 flex-col rounded-lg border ${colBg}`}>
            <div className="flex items-center justify-between px-2.5 py-2.5">
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

            <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2.5">
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