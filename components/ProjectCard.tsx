'use client';

import { useState } from 'react';
import { Project, ProjectStatus } from '@/app/types';
import { STATUS_CONFIG, STATUS_ORDER, LINK_CONFIG } from '@/app/constants';
import { getDueBadge, projectHasAlert, isGigafileExpiring } from '@/app/utils';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function ProjectCard({
  project,
  isSelected,
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
  project: Project;
  isSelected: boolean;
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
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['not_started'];
  const internalDue = getDueBadge(project.internalDueDate);
  const draftDue = getDueBadge(project.draftDueDate);
  const draftDone = !!project.draftSubmittedDate;

  const isWorkInPhase = project.status === 'not_started' || project.status === 'editing';

  const hasGigafileAlert = project.links.some(
    (l) => l.linkType === 'gigafile' && isGigafileExpiring(l.expiresAt)
  );
  const hasAlert = projectHasAlert(project);

  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';
  const textTitle = isLight ? 'text-slate-900 hover:text-amber-600' : 'text-neutral-100 hover:text-amber-400';
  const textClient = isLight ? 'text-amber-700' : 'text-amber-300';
  const badgeStyle = isLight ? statusConfig.badgeLight : statusConfig.badgeDark;

  const selectStyle = `w-full bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
    isLight ? 'text-slate-800' : 'text-neutral-100'
  }`;

  return (
    <div
      className={`group relative rounded-lg border p-3.5 shadow-sm transition-colors ${bgCard} ${
        isSelected ? 'ring-2 ring-amber-500 border-amber-500' : ''
      } ${hasAlert ? 'border-rose-500' : ''}`}
    >
      {project.priority > 0 && (
        <div
          className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${
            project.priority === 2 ? 'bg-rose-500' : 'bg-amber-500'
          }`}
        />
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(project.id)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
          <div className="min-w-0">
            <p className={`truncate text-xs font-bold ${textClient}`}>{project.clientName}</p>
            <h3 className={`truncate text-sm font-bold cursor-pointer ${textTitle}`} onClick={() => onEdit(project)}>{project.title}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {hasAlert && <AlertTriangle className="h-4 w-4 text-rose-500" />}
          <button
            type="button"
            onClick={() => onEdit(project)}
            className={`rounded p-1 ${isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'}`}
            aria-label="詳細編集"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(project)}
            className="rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
            aria-label="削除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <button
          type="button"
          onClick={() => setStatusMenuOpen((v) => !v)}
          className={`flex w-full items-center justify-between gap-1 rounded-md border px-2 py-1 text-xs font-bold ${badgeStyle}`}
        >
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </button>

        {statusMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
            <ul className={`absolute z-20 mt-1 w-full overflow-hidden rounded-md border shadow-lg ${isLight ? 'border-slate-200 bg-white' : 'border-neutral-700 bg-neutral-800'}`}>
              {STATUS_ORDER.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(project.id, s);
                      setStatusMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs ${isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-neutral-700 text-neutral-300'}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                    {STATUS_CONFIG[s].label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1.5 text-xs">
        <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950'}`}>
          <span className="text-[10px] text-slate-400 font-semibold shrink-0">編集:</span>
          <select
            value={project.mainEditor || ''}
            onChange={(e) => onQuickUpdate(project.id, { mainEditor: e.target.value })}
            className={selectStyle}
          >
            <option value="">未割当</option>
            {editorNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950'}`}>
          <span className="text-[10px] text-slate-400 font-semibold shrink-0">Dir:</span>
          <select
            value={project.director || ''}
            onChange={(e) => onQuickUpdate(project.id, { director: e.target.value })}
            className={selectStyle}
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

      <div className={`mb-3 space-y-1.5 border-t pt-2 ${isLight ? 'border-slate-100' : 'border-neutral-800/80'}`}>
        <InlineDueRow
          icon={<Clock className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />}
          label="編集者締切日"
          dateStr={project.internalDueDate}
          badge={internalDue}
          suppressAlert={!isWorkInPhase}
          isLight={isLight}
          onChangeDate={(val) => onQuickUpdate(project.id, { internalDueDate: val })}
        />
        <InlineDueRow
          icon={<Calendar className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />}
          label="Dir締切日"
          dateStr={project.draftDueDate}
          badge={draftDue}
          done={draftDone}
          suppressAlert={!isWorkInPhase}
          isLight={isLight}
          onChangeDate={(val) => onQuickUpdate(project.id, { draftDueDate: val })}
        />
        <InlinePlainDateRow
          label="CL提出日"
          dateStr={project.clientSubmittedDate}
          isLight={isLight}
          onChangeDate={(val) => onQuickUpdate(project.id, { clientSubmittedDate: val })}
        />
        <InlinePlainDateRow
          label="修正完了日"
          dateStr={project.revisionCompletedDate}
          isLight={isLight}
          onChangeDate={(val) => onQuickUpdate(project.id, { revisionCompletedDate: val })}
        />
        <InlinePlainDateRow
          label="納品日"
          dateStr={project.deliveredDate}
          isLight={isLight}
          onChangeDate={(val) => onQuickUpdate(project.id, { deliveredDate: val })}
        />

        {hasGigafileAlert && (
          <div className="flex items-center gap-1.5 rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            ギガファイル便の有効期限が近づいています
          </div>
        )}
        {project.revisionNote && (
          <p className={`rounded px-2 py-1 text-[11px] border ${isLight ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-neutral-800 text-neutral-300 border-neutral-700'}`}>
            修正指示: {project.revisionNote}
          </p>
        )}
      </div>

      {project.links.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 border-t pt-2.5 ${isLight ? 'border-slate-100' : 'border-neutral-800'}`}>
          {project.links.map((link) => {
            const cfg = LINK_CONFIG[link.linkType];
            const Icon = cfg.icon;
            return (
              <div
                key={link.id}
                className={`flex items-center overflow-hidden rounded-md border ${isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-700 bg-neutral-950'}`}
                title={cfg.label}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-neutral-200 hover:bg-neutral-800'}`}
                >
                  <Icon className="h-3 w-3 text-amber-600" />
                  <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                </a>
                <button
                  type="button"
                  onClick={() => onCopyLink(link.url, cfg.label)}
                  className={`border-l px-1.5 py-1 ${isLight ? 'border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-900' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white'}`}
                  aria-label={`${cfg.label}のURLをコピー`}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineDueRow({
  icon,
  label,
  dateStr,
  badge,
  done,
  suppressAlert = false,
  isLight,
  onChangeDate,
}: {
  icon: React.ReactNode;
  label: string;
  dateStr: string | null;
  badge: { label: string; level: 'overdue' | 'soon' | 'normal' | 'none' };
  done?: boolean;
  suppressAlert?: boolean;
  isLight: boolean;
  onChangeDate: (val: string | null) => void;
}) {
  const level = (done || suppressAlert) ? 'normal' : badge.level;
  const levelStyle = {
    overdue: 'text-rose-600 font-bold',
    soon: 'text-amber-600 font-bold',
    normal: isLight ? 'text-slate-600' : 'text-neutral-300',
    none: isLight ? 'text-slate-400' : 'text-neutral-400',
  }[level];

  const displayBadgeText = done ? '提出済み' : (suppressAlert && badge.level === 'overdue') ? '経過' : badge.label;

  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className={`flex items-center gap-1 font-medium ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
        {icon}
        <span className="w-16">{label}</span>
        <input
          type="date"
          value={dateStr || ''}
          onChange={(e) => onChangeDate(e.target.value || null)}
          className={`rounded border px-1 py-0.5 text-[11px] font-bold focus:outline-none ${
            isLight
              ? 'border-slate-200 bg-white text-slate-900 hover:border-amber-400 [color-scheme:light]'
              : 'border-neutral-700 bg-neutral-950 text-neutral-100 hover:border-amber-400 [color-scheme:dark]'
          }`}
        />
      </span>
      <span className={`font-semibold ${levelStyle}`}>{displayBadgeText}</span>
    </div>
  );
}

function InlinePlainDateRow({
  label,
  dateStr,
  isLight,
  onChangeDate,
}: {
  label: string;
  dateStr: string | null;
  isLight: boolean;
  onChangeDate: (val: string | null) => void;
}) {
  return (
    <div className={`flex items-center justify-between text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
      <span>{label}</span>
      <input
        type="date"
        value={dateStr || ''}
        onChange={(e) => onChangeDate(e.target.value || null)}
        className={`rounded border px-1 py-0.5 text-[11px] font-bold focus:outline-none ${
          isLight
            ? 'border-slate-200 bg-white text-slate-900 hover:border-amber-400 [color-scheme:light]'
            : 'border-neutral-700 bg-neutral-950 text-neutral-100 hover:border-amber-400 [color-scheme:dark]'
        }`}
      />
    </div>
  );
}