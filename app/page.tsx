'use client';

import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BulkActionModal, { BulkUpdateData } from '@/components/BulkActionModal';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clapperboard,
  Clock,
  Copy,
  ExternalLink,
  HardDrive,
  Lock,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  Video,
  X,
  Table as TableIcon,
  LayoutGrid,
  Sun,
  Moon,
} from 'lucide-react';

const DIRECTOR_PASSWORD = '0531';

type ProjectStatus =
  | 'not_started'
  | 'editing'
  | 'client_review'
  | 'revision_requested'
  | 'revision'
  | 'revision_submitted'
  | 'delivered';

type LinkType = 'google_drive' | 'frame_io' | 'gigafile' | 'youtube_private';
type ViewMode = 'editor' | 'director' | 'client';

interface ProjectLink {
  id: string;
  linkType: LinkType;
  url: string;
  expiresAt: string | null;
}

interface Project {
  id: string;
  clientName: string;
  title: string;
  fileName: string;
  status: ProjectStatus;
  mainEditor: string;
  director: string;
  internalDueDate: string | null;
  draftDueDate: string | null;
  draftSubmittedDate: string | null;
  clientSubmittedDate: string | null;
  revisionCompletedDate: string | null;
  priority: 0 | 1 | 2;
  revisionNote: string | null;
  links: ProjectLink[];
}

interface DashboardFilters {
  clientName: string | 'all';
  editor: string | 'all';
  keyword: string;
  onlyAlerts: boolean;
}

interface ProjectFormData {
  clientName: string;
  title: string;
  fileName: string;
  status: ProjectStatus;
  mainEditor: string;
  director: string;
  internalDueDate: string;
  draftDueDate: string;
  draftSubmittedDate: string;
  clientSubmittedDate: string;
  revisionCompletedDate: string;
  priority: 0 | 1 | 2;
  revisionNote: string;
  googleDriveUrl: string;
  frameIoUrl: string;
  gigafileUrl: string;
  gigafileExpiresAt: string;
  youtubeUrl: string;
}

interface EditorWorkload {
  name: string;
  activeCount: number;
  overdueCount: number;
  deliveredCount: number;
  totalCount: number;
}

interface ClientProgress {
  name: string;
  totalCount: number;
  deliveredCount: number;
  overdueCount: number;
  deliveredRate: number;
}

const STATUS_ORDER: ProjectStatus[] = [
  'not_started',
  'editing',
  'client_review',
  'revision_requested',
  'revision',
  'revision_submitted',
  'delivered',
];

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badgeDark: string; badgeLight: string; dot: string }
> = {
  not_started: {
    label: '未着手',
    badgeDark: 'bg-slate-700 text-slate-100 border-slate-500',
    badgeLight: 'bg-slate-100 text-slate-800 border-slate-300',
    dot: 'bg-slate-400',
  },
  editing: {
    label: '編集',
    badgeDark: 'bg-indigo-950 text-indigo-200 border-indigo-700',
    badgeLight: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  client_review: {
    label: 'CL確認中',
    badgeDark: 'bg-amber-950 text-amber-200 border-amber-700',
    badgeLight: 'bg-amber-50 text-amber-900 border-amber-200',
    dot: 'bg-amber-500',
  },
  revision_requested: {
    label: 'CLから修正',
    badgeDark: 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-700',
    badgeLight: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
    dot: 'bg-fuchsia-500',
  },
  revision: {
    label: '修正',
    badgeDark: 'bg-rose-950 text-rose-200 border-rose-700',
    badgeLight: 'bg-rose-50 text-rose-900 border-rose-200',
    dot: 'bg-rose-500',
  },
  revision_submitted: {
    label: '修正提出',
    badgeDark: 'bg-sky-950 text-sky-200 border-sky-700',
    badgeLight: 'bg-sky-50 text-sky-900 border-sky-200',
    dot: 'bg-sky-500',
  },
  delivered: {
    label: '納品完了',
    badgeDark: 'bg-emerald-950 text-emerald-200 border-emerald-700',
    badgeLight: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

const LINK_CONFIG: Record<LinkType, { label: string; icon: typeof HardDrive }> = {
  google_drive: { label: 'Googleドライブ', icon: HardDrive },
  frame_io: { label: 'Frame.io', icon: MessageSquareText },
  gigafile: { label: 'ギガファイル便', icon: Upload },
  youtube_private: { label: 'YouTube限定公開', icon: Video },
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function sendLineNotification(message: string) {
  try {
    await fetch('/api/line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: process.env.NEXT_PUBLIC_LINE_GROUP_ID || 'C4f8916165fe5f1c5e2d68e832dd10aef',
        message,
      }),
    });
  } catch (err) {
    console.error('LINE notification failed:', err);
  }
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${week})`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueBadge(dateStr: string | null): {
  label: string;
  level: 'overdue' | 'soon' | 'normal' | 'none';
} {
  const days = daysUntil(dateStr);
  if (days === null) return { label: '未設定', level: 'none' };
  if (days < 0) return { label: `${Math.abs(days)}日超過`, level: 'overdue' };
  if (days === 0) return { label: '本日締切', level: 'soon' };
  if (days <= 2) return { label: `あと${days}日`, level: 'soon' };
  return { label: `あと${days}日`, level: 'normal' };
}

function isGigafileExpiring(dateStr: string | null): boolean {
  const days = daysUntil(dateStr);
  return days !== null && days <= 1;
}

function projectHasAlert(p: Project): boolean {
  const internalDue = getDueBadge(p.internalDueDate);
  const draftDue = getDueBadge(p.draftDueDate);
  const gigafileAlert = p.links.some(
    (l) => l.linkType === 'gigafile' && isGigafileExpiring(l.expiresAt)
  );

  const isWorkInPhase = p.status === 'not_started' || p.status === 'editing';

  const internalOverdue = isWorkInPhase && internalDue.level === 'overdue';
  const draftOverdue = isWorkInPhase && draftDue.level === 'overdue' && !p.draftSubmittedDate;

  return internalOverdue || draftOverdue || gigafileAlert;
}

function emptyFormData(): ProjectFormData {
  return {
    clientName: '',
    title: '',
    fileName: '',
    status: 'not_started',
    mainEditor: '',
    director: '',
    internalDueDate: '',
    draftDueDate: '',
    draftSubmittedDate: '',
    clientSubmittedDate: '',
    revisionCompletedDate: '',
    priority: 0,
    revisionNote: '',
    googleDriveUrl: '',
    frameIoUrl: '',
    gigafileUrl: '',
    gigafileExpiresAt: '',
    youtubeUrl: '',
  };
}

function projectToFormData(p: Project): ProjectFormData {
  const findUrl = (t: LinkType) => p.links.find((l) => l.linkType === t)?.url ?? '';
  const gigafile = p.links.find((l) => l.linkType === 'gigafile');
  return {
    clientName: p.clientName,
    title: p.title,
    fileName: p.fileName,
    status: p.status,
    mainEditor: p.mainEditor,
    director: p.director,
    internalDueDate: p.internalDueDate ?? '',
    draftDueDate: p.draftDueDate ?? '',
    draftSubmittedDate: p.draftSubmittedDate ?? '',
    clientSubmittedDate: p.clientSubmittedDate ?? '',
    revisionCompletedDate: p.revisionCompletedDate ?? '',
    priority: p.priority,
    revisionNote: p.revisionNote ?? '',
    googleDriveUrl: findUrl('google_drive'),
    frameIoUrl: findUrl('frame_io'),
    gigafileUrl: findUrl('gigafile'),
    gigafileExpiresAt: gigafile?.expiresAt ?? '',
    youtubeUrl: findUrl('youtube_private'),
  };
}

function formDataToLinks(f: ProjectFormData): ProjectLink[] {
  const links: ProjectLink[] = [];
  if (f.googleDriveUrl.trim())
    links.push({ id: generateId('l'), linkType: 'google_drive', url: f.googleDriveUrl.trim(), expiresAt: null });
  if (f.frameIoUrl.trim())
    links.push({ id: generateId('l'), linkType: 'frame_io', url: f.frameIoUrl.trim(), expiresAt: null });
  if (f.gigafileUrl.trim())
    links.push({
      id: generateId('l'),
      linkType: 'gigafile',
      url: f.gigafileUrl.trim(),
      expiresAt: f.gigafileExpiresAt || null,
    });
  if (f.youtubeUrl.trim())
    links.push({ id: generateId('l'), linkType: 'youtube_private', url: f.youtubeUrl.trim(), expiresAt: null });
  return links;
}

function mapDbToProject(row: any): Project {
  let status = row.status as string;
  if (status === 'draft_review') status = 'client_review';
  if (status === 'waiting_material') status = 'not_started';

  return {
    id: row.id,
    clientName: row.client_name || row.title || '未設定',
    title: row.title || '',
    fileName: row.file_name || '',
    status: (status as ProjectStatus) || 'not_started',
    mainEditor: row.main_editor || row.assignee || '',
    director: row.director || '',
    internalDueDate: row.internal_due_date || null,
    draftDueDate: row.draft_due_date || row.due_date || null,
    draftSubmittedDate: row.draft_submitted_date || null,
    clientSubmittedDate: row.client_submitted_date || null,
    revisionCompletedDate: row.revision_completed_date || null,
    priority: row.priority ?? 0,
    revisionNote: row.revision_note || row.description || null,
    links: Array.isArray(row.links) ? row.links : [],
  };
}

function mapProjectToDb(p: Partial<Project>, descriptionText?: string) {
  return {
    client_name: p.clientName,
    title: p.title,
    file_name: p.fileName,
    status: p.status,
    main_editor: p.mainEditor,
    assignee: p.mainEditor,
    director: p.director,
    internal_due_date: p.internalDueDate,
    draft_due_date: p.draftDueDate,
    due_date: p.draftDueDate,
    draft_submitted_date: p.draftSubmittedDate,
    client_submitted_date: p.clientSubmittedDate,
    revision_completed_date: p.revisionCompletedDate,
    priority: p.priority,
    revision_note: p.revisionNote,
    description: descriptionText || p.revisionNote,
    links: p.links,
  };
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-emerald-600 bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
        <Check className="h-3.5 w-3.5" />
        {message}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  isSelected,
  isLight,
  onToggleSelect,
  onStatusChange,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  project: Project;
  isSelected: boolean;
  isLight: boolean;
  onToggleSelect: (id: string) => void;
  onStatusChange: (id: string, next: ProjectStatus) => void;
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
  const textSub = isLight ? 'text-slate-600' : 'text-neutral-300';
  const badgeStyle = isLight ? statusConfig.badgeLight : statusConfig.badgeDark;

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
            aria-label="編集"
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

      <div className={`mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs ${textSub}`}>
        <span>編集: <strong className={isLight ? 'text-slate-900 font-semibold' : 'text-neutral-100 font-medium'}>{project.mainEditor || '未割当'}</strong></span>
        <span>Dir: <strong className={isLight ? 'text-slate-900 font-semibold' : 'text-neutral-100 font-medium'}>{project.director || '未割当'}</strong></span>
      </div>

      <div className={`mb-3 space-y-1.5 border-t pt-2 ${isLight ? 'border-slate-100' : 'border-neutral-800/80'}`}>
        <DueRow icon={<Clock className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />} label="締め切り日" dateStr={project.internalDueDate} badge={internalDue} suppressAlert={!isWorkInPhase} isLight={isLight} />
        <DueRow
          icon={<Calendar className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`} />}
          label="初稿提出期日"
          dateStr={project.draftDueDate}
          badge={draftDue}
          done={draftDone}
          suppressAlert={!isWorkInPhase}
          isLight={isLight}
        />
        <PlainDateRow label="先方提出日(CL)" dateStr={project.clientSubmittedDate} isLight={isLight} />
        <PlainDateRow label="修正完了日" dateStr={project.revisionCompletedDate} isLight={isLight} />
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

function DueRow({
  icon,
  label,
  dateStr,
  badge,
  done,
  suppressAlert = false,
  isLight,
}: {
  icon: React.ReactNode;
  label: string;
  dateStr: string | null;
  badge: { label: string; level: 'overdue' | 'soon' | 'normal' | 'none' };
  done?: boolean;
  suppressAlert?: boolean;
  isLight: boolean;
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
      <span className={`flex items-center gap-1.5 font-medium ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
        {icon}
        {label}
        <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-200'}`}>{formatDateShort(dateStr)}</span>
      </span>
      <span className={`font-semibold ${levelStyle}`}>{displayBadgeText}</span>
    </div>
  );
}

function PlainDateRow({ label, dateStr, isLight }: { label: string; dateStr: string | null; isLight: boolean }) {
  return (
    <div className={`flex items-center justify-between text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
      <span>{label}</span>
      <span className={dateStr ? (isLight ? 'text-slate-900 font-semibold' : 'text-neutral-100 font-semibold') : (isLight ? 'text-slate-400' : 'text-neutral-400')}>
        {formatDateShort(dateStr)}
      </span>
    </div>
  );
}

function ClientTableView({
  projects,
  clientNames,
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
  selectedClient: string;
  isLight: boolean;
  onSelectClient: (c: string) => void;
  onEditProject: (p: Project) => void;
  onCopyLink: (url: string, label: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}) {
  const currentClient = selectedClient === 'all' && clientNames.length > 0 ? clientNames[0] : selectedClient;
  const clientProjects = projects.filter((p) => p.clientName === currentClient);

  const totalCount = clientProjects.length;
  const deliveredCount = clientProjects.filter((p) => p.status === 'delivered').length;
  const activeCount = totalCount - deliveredCount;
  const overdueCount = clientProjects.filter(projectHasAlert).length;
  const rate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 ${bgCard}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>クライアント選択:</span>
            <select
              value={currentClient}
              onChange={(e) => onSelectClient(e.target.value)}
              className={`rounded-md border px-3 py-1.5 text-xs font-bold focus:border-amber-500 focus:outline-none ${isLight ? 'border-slate-300 bg-white text-slate-800' : 'border-neutral-700 bg-neutral-950 text-neutral-100'}`}
            >
              {clientNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
              全 <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{totalCount}</span> 件
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

        <div className="space-y-1">
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
              <th className="p-3">先方提出日(CL)</th>
              <th className="p-3">期日アラート</th>
              <th className="p-3 text-center">Googleドライブ</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-800' : 'divide-neutral-800/80 text-neutral-200'}`}>
            {clientProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className={`p-8 text-center font-medium ${isLight ? 'text-slate-400' : 'text-neutral-400'}`}>
                  このクライアントの案件はありません
                </td>
              </tr>
            ) : (
              clientProjects.map((project) => {
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
                      {project.fileName && (
                        <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>{project.fileName}</p>
                      )}
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
                    <td className="p-3">
                      {hasAlert ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
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

function DirectorPanel({
  editorWorkload,
  clientProgress,
  isLight,
}: {
  editorWorkload: EditorWorkload[];
  clientProgress: ClientProgress[];
  isLight: boolean;
}) {
  const maxActive = Math.max(1, ...editorWorkload.map((w) => w.activeCount));
  const bgCard = isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800';

  return (
    <div className={`mb-4 rounded-lg border ${bgCard}`}>
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
        <Users className="h-4 w-4 text-amber-600" />
        <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>ディレクター管理パネル</h2>
        <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
          担当者別の負荷とクライアント別の進捗をひと目で確認
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <div className={`border-b p-4 lg:border-b-0 lg:border-r ${isLight ? 'border-slate-200' : 'border-neutral-800'}`}>
          <h3 className={`mb-3 flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>
            <Users className="h-3.5 w-3.5 text-slate-400" />
            担当者別 抱え案件数・負荷
          </h3>
          {editorWorkload.length === 0 ? (
            <p className="text-xs text-slate-400">担当者データがありません</p>
          ) : (
            <div className="space-y-3">
              {editorWorkload.map((w) => {
                const ratio = w.activeCount / maxActive;
                const level =
                  w.overdueCount >= 2 ? 'danger' : w.overdueCount >= 1 ? 'warn' : 'ok';
                return (
                  <div key={w.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{w.name}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
                          進行中 <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{w.activeCount}</span>件
                        </span>
                        {w.overdueCount > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              level === 'danger'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            要対応 {w.overdueCount}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={`h-1.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-neutral-800'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${
                          level === 'danger'
                            ? 'bg-rose-500'
                            : level === 'warn'
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.max(4, ratio * 100)}%` }}
                      />
                    </div>
                    <p className={`mt-0.5 text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                      累計{w.totalCount}件中 納品完了{w.deliveredCount}件
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className={`mb-3 flex items-center gap-1.5 text-xs font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            クライアント別 進行状況
          </h3>
          {clientProgress.length === 0 ? (
            <p className="text-xs text-slate-400">クライアントデータがありません</p>
          ) : (
            <div className="space-y-3">
              {clientProgress.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{c.name}</span>
                    <span className={isLight ? 'text-slate-600' : 'text-neutral-300'}>
                      納品完了率{' '}
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>{c.deliveredRate}%</span>
                    </span>
                  </div>
                  <div className={`h-1.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-neutral-800'}`}>
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(4, c.deliveredRate)}%` }}
                    />
                  </div>
                  <div className={`mt-0.5 flex items-center gap-2 text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                    <span>全{c.totalCount}件</span>
                    {c.overdueCount > 0 && (
                      <span className="font-bold text-rose-600 ml-2">期日超過 {c.overdueCount}件</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({
  projects,
  selectedIds,
  isLight,
  onToggleSelect,
  onStatusChange,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  projects: Project[];
  selectedIds: string[];
  isLight: boolean;
  onToggleSelect: (id: string) => void;
  onStatusChange: (id: string, next: ProjectStatus) => void;
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
                    onToggleSelect={onToggleSelect}
                    onStatusChange={onStatusChange}
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

function FilterBar({
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

function ProjectFormModal({
  initial,
  isEdit,
  isLight,
  onSave,
  onClose,
}: {
  initial: ProjectFormData;
  isEdit: boolean;
  isLight: boolean;
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
            <label className={labelClass}>タイトル *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="例: 保育園での一日"
              required
            />
          </div>

          <div>
            <label className={labelClass}>ファイル名/案件名</label>
            <input
              className={inputClass}
              value={form.fileName}
              onChange={(e) => update('fileName', e.target.value)}
              placeholder="例: runa_nursery_01"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>メイン担当者（編集者）</label>
              <input
                className={inputClass}
                value={form.mainEditor}
                onChange={(e) => update('mainEditor', e.target.value)}
                placeholder="例: 山田"
              />
            </div>
            <div>
              <label className={labelClass}>ディレクター</label>
              <input
                className={inputClass}
                value={form.director}
                onChange={(e) => update('director', e.target.value)}
                placeholder="例: 望月"
              />
            </div>
          </div>

          <div className={`rounded-md border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'}`}>
            <p className={`mb-2.5 flex items-center gap-1.5 text-[11px] font-bold ${isLight ? 'text-slate-800' : 'text-neutral-200'}`}>
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              期日・実績日
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label="締め切り日"
                value={form.internalDueDate}
                onChange={(v) => update('internalDueDate', v)}
                accent
                isLight={isLight}
              />
              <DateField
                label="初稿提出期日"
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
                label="先方提出日（CL提出日）"
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

export default function VideoProgressApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light'); // 初期設定をライトモードに設定
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [selectedClientView, setSelectedClientView] = useState<string>('all');
  const [isDirectorUnlocked, setIsDirectorUnlocked] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  const [filters, setFilters] = useState<DashboardFilters>({
    clientName: 'all',
    editor: 'all',
    keyword: '',
    onlyAlerts: false,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalState, setModalState] = useState<
    { mode: 'add' } | { mode: 'edit'; project: Project } | null
  >(null);

  const isLight = theme === 'light';

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setProjects(data.map(mapDbToProject));
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyBulkUpdate = async (updates: BulkUpdateData) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.editor) {
      dbUpdates.main_editor = updates.editor;
      dbUpdates.assignee = updates.editor;
    }
    if (updates.director) dbUpdates.director = updates.director;
    if (updates.internalDeadline) dbUpdates.internal_due_date = updates.internalDeadline;
    if (updates.firstDraftDate) {
      dbUpdates.draft_due_date = updates.firstDraftDate;
      dbUpdates.due_date = updates.firstDraftDate;
    }
    if (updates.clientDeadline) dbUpdates.client_submitted_date = updates.clientDeadline;

    try {
      const { error } = await supabase
        .from('movies')
        .update(dbUpdates)
        .in('id', selectedIds);

      if (error) throw error;

      const updatedTitles = projects
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => p.title);

      await fetch('/api/line-bulk-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemsCount: selectedIds.length,
          updatedFields: updates,
          itemTitles: updatedTitles,
        }),
      });

      showToast(`${selectedIds.length}件の案件を一括更新しました`);
      fetchProjects();
      setSelectedIds([]);
    } catch (err: any) {
      alert('一括更新に失敗しました: ' + err.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      showToast(`${selectedIds.length}件の案件を一括削除しました`);
      fetchProjects();
      setSelectedIds([]);
    } catch (err: any) {
      alert('一括削除に失敗しました: ' + err.message);
    }
  };

  const handleSelectDirectorView = () => {
    if (isDirectorUnlocked) {
      setViewMode('director');
    } else {
      setInputPassword('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === DIRECTOR_PASSWORD) {
      setIsDirectorUnlocked(true);
      setViewMode('director');
      setShowPasswordModal(false);
      showToast('ディレクター画面のロックを解除しました');
    } else {
      setPasswordError('パスワードが正しくありません');
    }
  };

  async function handleStatusChange(id: string, next: ProjectStatus) {
    const target = projects.find((p) => p.id === id);
    if (!target) return;

    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: next } : p)));

    try {
      const { error } = await supabase
        .from('movies')
        .update({ status: next })
        .eq('id', id);

      if (error) throw error;

      const lineMessage =
        `🔄 ステータスが変更されました！\n\n` +
        `【クライアント】${target.clientName}\n` +
        `【案件名】${target.title}\n` +
        `【メイン担当】${target.mainEditor || '未設定'}\n` +
        `【新ステータス】${STATUS_CONFIG[next].label}`;

      await sendLineNotification(lineMessage);
      showToast('ステータスを更新し、LINEに通知しました');
    } catch (err) {
      alert('ステータスの更新に失敗しました');
      fetchProjects();
    }
  }

  function handleCopyLink(url: string, label: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    showToast(`${label}のURLをコピーしました`);
  }

  function handleOpenAddModal() {
    setModalState({ mode: 'add' });
  }

  function handleOpenEditModal(project: Project) {
    setModalState({ mode: 'edit', project });
  }

  async function handleDeleteProject(project: Project) {
    if (!confirm(`「${project.title}」を削除してもよろしいですか？`)) return;

    try {
      const { error } = await supabase.from('movies').delete().eq('id', project.id);
      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== project.id));

      const lineMessage =
        `🗑️ 案件が削除されました\n\n` +
        `【クライアント】${project.clientName}\n` +
        `【案件名】${project.title}`;

      await sendLineNotification(lineMessage);
      showToast('案件を削除しました');
    } catch (err) {
      alert('削除に失敗しました');
    }
  }

  async function handleSaveProject(data: ProjectFormData) {
    const links = formDataToLinks(data);

    if (modalState?.mode === 'edit') {
      const updatedProject: Project = {
        ...modalState.project,
        clientName: data.clientName.trim(),
        title: data.title.trim(),
        fileName: data.fileName.trim(),
        status: data.status,
        mainEditor: data.mainEditor.trim(),
        director: data.director.trim(),
        internalDueDate: data.internalDueDate || null,
        draftDueDate: data.draftDueDate || null,
        draftSubmittedDate: data.draftSubmittedDate || null,
        clientSubmittedDate: data.clientSubmittedDate || null,
        revisionCompletedDate: data.revisionCompletedDate || null,
        priority: data.priority,
        revisionNote: data.revisionNote.trim() || null,
        links,
      };

      try {
        const { error } = await supabase
          .from('movies')
          .update(mapProjectToDb(updatedProject))
          .eq('id', updatedProject.id);

        if (error) throw error;

        setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));

        const lineMessage =
          `📝 案件情報が更新されました！\n\n` +
          `【クライアント】${updatedProject.clientName}\n` +
          `【タイトル】${updatedProject.title}\n` +
          `【担当者】${updatedProject.mainEditor || '未設定'}\n` +
          `【ステータス】${STATUS_CONFIG[updatedProject.status].label}`;

        await sendLineNotification(lineMessage);
        showToast('案件情報を更新しました');
      } catch (err) {
        alert('更新に失敗しました');
      }
    } else {
      const newProjectData = {
        clientName: data.clientName.trim(),
        title: data.title.trim(),
        fileName: data.fileName.trim() || data.title.trim(),
        status: data.status,
        mainEditor: data.mainEditor.trim(),
        director: data.director.trim(),
        internalDueDate: data.internalDueDate || null,
        draftDueDate: data.draftDueDate || null,
        draftSubmittedDate: data.draftSubmittedDate || null,
        clientSubmittedDate: data.clientSubmittedDate || null,
        revisionCompletedDate: data.revisionCompletedDate || null,
        priority: data.priority,
        revisionNote: data.revisionNote.trim() || null,
        links,
      };

      try {
        const { data: inserted, error } = await supabase
          .from('movies')
          .insert([mapProjectToDb(newProjectData)])
          .select('*')
          .single();

        if (error) throw error;

        const insertedProject = mapDbToProject(inserted);
        setProjects((prev) => [insertedProject, ...prev]);

        const lineMessage =
          `🎬 新規案件が追加されました！\n\n` +
          `【クライアント】${insertedProject.clientName}\n` +
          `【タイトル】${insertedProject.title}\n` +
          `【メイン担当】${insertedProject.mainEditor || '未設定'}\n` +
          `【初稿期日】${insertedProject.draftDueDate || '未設定'}\n` +
          `【ステータス】${STATUS_CONFIG[insertedProject.status].label}`;

        await sendLineNotification(lineMessage);
        showToast('新規案件を追加し、LINEに通知しました');
      } catch (err) {
        alert('保存に失敗しました');
      }
    }

    setModalState(null);
  }

  const clientNames = useMemo(
    () => Array.from(new Set(projects.map((p) => p.clientName).filter(Boolean))).sort(),
    [projects]
  );
  const editorNames = useMemo(
    () =>
      Array.from(
        new Set(projects.flatMap((p) => [p.mainEditor, p.director]).filter(Boolean))
      ).sort(),
    [projects]
  );

  const editorWorkload = useMemo<EditorWorkload[]>(() => {
    const names = Array.from(new Set(projects.map((p) => p.mainEditor).filter(Boolean)));
    return names
      .map((name) => {
        const owned = projects.filter((p) => p.mainEditor === name);
        return {
          name,
          activeCount: owned.filter((p) => p.status !== 'delivered').length,
          overdueCount: owned.filter(projectHasAlert).length,
          deliveredCount: owned.filter((p) => p.status === 'delivered').length,
          totalCount: owned.length,
        };
      })
      .sort((a, b) => b.activeCount - a.activeCount);
  }, [projects]);

  const clientProgress = useMemo<ClientProgress[]>(() => {
    const names = Array.from(new Set(projects.map((p) => p.clientName).filter(Boolean)));
    return names
      .map((name) => {
        const owned = projects.filter((p) => p.clientName === name);
        const deliveredCount = owned.filter((p) => p.status === 'delivered').length;
        return {
          name,
          totalCount: owned.length,
          deliveredCount,
          overdueCount: owned.filter(projectHasAlert).length,
          deliveredRate: owned.length > 0 ? Math.round((deliveredCount / owned.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.clientName !== 'all' && p.clientName !== filters.clientName) return false;
      if (filters.editor !== 'all' && p.mainEditor !== filters.editor && p.director !== filters.editor)
        return false;
      if (
        filters.keyword &&
        !`${p.title}${p.fileName}`.toLowerCase().includes(filters.keyword.toLowerCase())
      )
        return false;
      if (filters.onlyAlerts && !projectHasAlert(p)) return false;
      return true;
    });
  }, [projects, filters]);

  const summary = useMemo(() => {
    const overdueCount = filteredProjects.filter(projectHasAlert).length;
    const gigafileCount = filteredProjects.filter((p) =>
      p.links.some((l) => l.linkType === 'gigafile' && isGigafileExpiring(l.expiresAt))
    ).length;
    const activeCount = filteredProjects.filter((p) => p.status !== 'delivered').length;
    const revisionCount = filteredProjects.filter((p) => p.status === 'revision' || p.status === 'revision_requested' || p.status === 'revision_submitted').length;
    return { overdueCount, gigafileCount, activeCount, revisionCount };
  }, [filteredProjects]);

  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center font-semibold ${isLight ? 'bg-slate-50 text-slate-600' : 'bg-neutral-950 text-neutral-300'}`}>
        <p className="text-sm">案件データを読み込み中...</p>
      </div>
    );
  }

  const bgMain = isLight ? 'bg-slate-50 text-slate-800' : 'bg-neutral-950 text-neutral-100';
  const bgHeader = isLight ? 'bg-white/90 border-slate-200' : 'bg-neutral-950/95 border-neutral-800';

  return (
    <div className={`min-h-screen font-sans pb-20 ${bgMain}`}>
      {/* ヘッダー */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur ${bgHeader}`}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Clapperboard className="h-5 w-5 text-amber-600" />
            <div>
              <h1 className={`text-sm font-bold tracking-wide ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>動画制作・案件進捗管理システム</h1>
              <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Aqua Fides / 動画管理ダッシュボード</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* テーマ切り替えボタン */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {isLight ? <Moon className="h-3.5 w-3.5 text-slate-600" /> : <Sun className="h-3.5 w-3.5 text-amber-400" />}
              <span>{isLight ? 'ダークモード' : 'ライトモード(白)'}</span>
            </button>

            <div className={`flex items-center rounded-lg border p-1 ${isLight ? 'border-slate-200 bg-slate-100' : 'border-neutral-800 bg-neutral-900'}`}>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === 'editor'
                    ? 'bg-amber-600 text-white shadow'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                編集者用(カンバン)
              </button>

              <button
                type="button"
                onClick={() => setViewMode('client')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === 'client'
                    ? 'bg-amber-600 text-white shadow'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-300 hover:text-white'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                クライアント別
              </button>

              <button
                type="button"
                onClick={handleSelectDirectorView}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-all ${
                  viewMode === 'director'
                    ? 'bg-amber-600 text-white shadow'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-300 hover:text-white'
                }`}
              >
                {!isDirectorUnlocked && <Lock className="h-3 w-3 text-amber-600" />}
                <Users className="h-3.5 w-3.5" />
                ディレクター用
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-5">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="進行中の案件" value={summary.activeCount} tone="default" isLight={isLight} />
          <SummaryCard
            label="期日超過"
            value={summary.overdueCount}
            tone={summary.overdueCount > 0 ? 'danger' : 'default'}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            isLight={isLight}
          />
          <SummaryCard
            label="ギガファイル便 期限間近"
            value={summary.gigafileCount}
            tone={summary.gigafileCount > 0 ? 'warn' : 'default'}
            isLight={isLight}
          />
          <SummaryCard label="修正関連対応中" value={summary.revisionCount} tone="default" isLight={isLight} />
        </div>

        {viewMode === 'director' && isDirectorUnlocked && (
          <DirectorPanel editorWorkload={editorWorkload} clientProgress={clientProgress} isLight={isLight} />
        )}

        {viewMode === 'client' ? (
          <ClientTableView
            projects={filteredProjects}
            clientNames={clientNames}
            selectedClient={selectedClientView}
            isLight={isLight}
            onSelectClient={setSelectedClientView}
            onEditProject={handleOpenEditModal}
            onCopyLink={handleCopyLink}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        ) : (
          <div className="space-y-4">
            <FilterBar
              filters={filters}
              isLight={isLight}
              onChange={setFilters}
              clientNames={clientNames}
              editorNames={editorNames}
              onOpenAddModal={handleOpenAddModal}
            />
            <KanbanBoard
              projects={filteredProjects}
              selectedIds={selectedIds}
              isLight={isLight}
              onToggleSelect={handleToggleSelect}
              onStatusChange={handleStatusChange}
              onCopyLink={handleCopyLink}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteProject}
            />
          </div>
        )}
      </main>

      <BulkActionModal
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onApplyBulkUpdate={handleApplyBulkUpdate}
        onBulkDelete={handleBulkDelete}
        editorsList={editorNames}
        directorsList={['望月']}
      />

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-lg border p-6 shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'}`}>
            <div className="mb-4 flex items-center gap-2 text-amber-600">
              <Lock className="h-5 w-5" />
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-neutral-100'}`}>ディレクター用画面の保護</h2>
            </div>
            <p className={`mb-4 text-xs font-medium ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
              暗証番号を入力してディレクター用管理パネルを開放してください。
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  autoFocus
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none font-medium ${isLight ? 'border-slate-300 bg-white text-slate-800 focus:border-amber-500' : 'border-neutral-700 bg-neutral-950 text-neutral-100 focus:border-amber-500'}`}
                />
                {passwordError && (
                  <p className="mt-1.5 text-xs text-rose-600 font-semibold">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-500 shadow"
                >
                  解除する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalState && (
        <ProjectFormModal
          isEdit={modalState.mode === 'edit'}
          isLight={isLight}
          initial={modalState.mode === 'edit' ? projectToFormData(modalState.project) : emptyFormData()}
          onSave={handleSaveProject}
          onClose={() => setModalState(null)}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
  isLight,
}: {
  label: string;
  value: number;
  tone: 'default' | 'danger' | 'warn';
  icon?: React.ReactNode;
  isLight: boolean;
}) {
  const toneClass = {
    default: isLight ? 'text-slate-900' : 'text-neutral-100',
    danger: 'text-rose-600 font-bold',
    warn: 'text-amber-600 font-bold',
  }[tone];

  return (
    <div className={`rounded-lg border p-3.5 ${isLight ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'}`}>
      <p className={`mb-1.5 flex items-center gap-1 text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
        {icon}
        {label}
      </p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
