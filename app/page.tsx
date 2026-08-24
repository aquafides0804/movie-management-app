'use client';

import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';

// ディレクター用ロック解除用パスワード（※お好みの暗証番号に変更可能です）
const DIRECTOR_PASSWORD = '0531';

// =====================================================================
// 型定義 & 定数
// =====================================================================
type ProjectStatus =
  | 'not_started'
  | 'waiting_material'
  | 'editing'
  | 'draft_review'
  | 'revision'
  | 'delivered';

type LinkType = 'google_drive' | 'frame_io' | 'gigafile' | 'youtube_private';
type ViewMode = 'director' | 'editor';

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
  waitingMaterialCount: number;
  overdueCount: number;
  deliveredRate: number;
}

const STATUS_ORDER: ProjectStatus[] = [
  'not_started',
  'waiting_material',
  'editing',
  'draft_review',
  'revision',
  'delivered',
];

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; badge: string; dot: string }
> = {
  not_started: {
    label: '未着手',
    badge: 'bg-slate-700 text-slate-200 border-slate-600',
    dot: 'bg-slate-400',
  },
  waiting_material: {
    label: '素材待ち',
    badge: 'bg-sky-950 text-sky-300 border-sky-800',
    dot: 'bg-sky-400',
  },
  editing: {
    label: '編集・カット組み',
    badge: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    dot: 'bg-indigo-400',
  },
  draft_review: {
    label: '初稿確認',
    badge: 'bg-amber-950 text-amber-300 border-amber-800',
    dot: 'bg-amber-400',
  },
  revision: {
    label: '修正対応',
    badge: 'bg-rose-950 text-rose-300 border-rose-800',
    dot: 'bg-rose-400',
  },
  delivered: {
    label: '納品完了',
    badge: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    dot: 'bg-emerald-400',
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
  return (
    internalDue.level === 'overdue' ||
    (draftDue.level === 'overdue' && !p.draftSubmittedDate) ||
    gigafileAlert
  );
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
  return {
    id: row.id,
    clientName: row.client_name || row.title || '未設定',
    title: row.title || '',
    fileName: row.file_name || '',
    status: (row.status as ProjectStatus) || 'not_started',
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

// =====================================================================
// サブコンポーネント
// =====================================================================
function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950 px-4 py-2 text-xs font-medium text-emerald-300 shadow-lg">
        <Check className="h-3.5 w-3.5" />
        {message}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onStatusChange,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  project: Project;
  onStatusChange: (id: string, next: ProjectStatus) => void;
  onCopyLink: (url: string, label: string) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[project.status];
  const internalDue = getDueBadge(project.internalDueDate);
  const draftDue = getDueBadge(project.draftDueDate);
  const draftDone = !!project.draftSubmittedDate;

  const hasGigafileAlert = project.links.some(
    (l) => l.linkType === 'gigafile' && isGigafileExpiring(l.expiresAt)
  );
  const hasAlert = projectHasAlert(project);

  return (
    <div
      className={`group relative rounded-lg border bg-neutral-900 p-3.5 shadow-sm transition-colors hover:border-neutral-600 ${
        hasAlert ? 'border-rose-800/60' : 'border-neutral-800'
      }`}
    >
      {project.priority > 0 && (
        <div
          className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${
            project.priority === 2 ? 'bg-rose-500' : 'bg-amber-500'
          }`}
        />
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-neutral-400">{project.clientName}</p>
          <h3 className="truncate text-sm font-semibold text-neutral-100">{project.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {hasAlert && <AlertTriangle className="h-4 w-4 text-rose-400" />}
          <button
            type="button"
            onClick={() => onEdit(project)}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="編集"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(project)}
            className="rounded p-1 text-neutral-500 hover:bg-rose-950 hover:text-rose-300"
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
          className={`flex w-full items-center justify-between gap-1 rounded-md border px-2 py-1 text-xs font-medium ${statusConfig.badge}`}
        >
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>

        {statusMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-neutral-700 bg-neutral-800 shadow-lg">
              {STATUS_ORDER.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(project.id, s);
                      setStatusMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-xs hover:bg-neutral-700 ${
                      s === project.status ? 'text-neutral-100' : 'text-neutral-400'
                    }`}
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

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
        <span>編集: {project.mainEditor || '未割当'}</span>
        <span>Dir: {project.director || '未割当'}</span>
      </div>

      <div className="mb-3 space-y-1.5">
        <DueRow icon={<Clock className="h-3.5 w-3.5" />} label="内部期日" dateStr={project.internalDueDate} badge={internalDue} />
        <DueRow
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="初稿提出期日"
          dateStr={project.draftDueDate}
          badge={draftDue}
          done={draftDone}
        />
        <PlainDateRow label="先方提出日(CL)" dateStr={project.clientSubmittedDate} />
        <PlainDateRow label="修正完了日" dateStr={project.revisionCompletedDate} />
        {hasGigafileAlert && (
          <div className="flex items-center gap-1.5 rounded bg-rose-950/60 px-2 py-1 text-[11px] font-medium text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            ギガファイル便の有効期限が近づいています
          </div>
        )}
        {project.revisionNote && (
          <p className="rounded bg-neutral-800/60 px-2 py-1 text-[11px] text-neutral-400">
            修正指示: {project.revisionNote}
          </p>
        )}
      </div>

      {project.links.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-neutral-800 pt-2.5">
          {project.links.map((link) => {
            const cfg = LINK_CONFIG[link.linkType];
            const Icon = cfg.icon;
            return (
              <div
                key={link.id}
                className="flex items-center overflow-hidden rounded-md border border-neutral-800 bg-neutral-950"
                title={cfg.label}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
                >
                  <Icon className="h-3 w-3" />
                  <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                </a>
                <button
                  type="button"
                  onClick={() => onCopyLink(link.url, cfg.label)}
                  className="border-l border-neutral-800 px-1.5 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
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
}: {
  icon: React.ReactNode;
  label: string;
  dateStr: string | null;
  badge: { label: string; level: 'overdue' | 'soon' | 'normal' | 'none' };
  done?: boolean;
}) {
  const level = done ? 'normal' : badge.level;
  const levelStyle = {
    overdue: 'text-rose-400',
    soon: 'text-amber-400',
    normal: 'text-neutral-400',
    none: 'text-neutral-600',
  }[level];

  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="flex items-center gap-1 text-neutral-500">
        {icon}
        {label}
        <span className="text-neutral-400">{formatDateShort(dateStr)}</span>
      </span>
      <span className={`font-medium ${levelStyle}`}>{done ? '提出済み' : badge.label}</span>
    </div>
  );
}

function PlainDateRow({ label, dateStr }: { label: string; dateStr: string | null }) {
  return (
    <div className="flex items-center justify-between text-[11px] text-neutral-500">
      <span>{label}</span>
      <span className={dateStr ? 'text-neutral-300' : 'text-neutral-600'}>
        {formatDateShort(dateStr)}
      </span>
    </div>
  );
}

function DirectorPanel({
  editorWorkload,
  clientProgress,
}: {
  editorWorkload: EditorWorkload[];
  clientProgress: ClientProgress[];
}) {
  const maxActive = Math.max(1, ...editorWorkload.map((w) => w.activeCount));

  return (
    <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-2.5">
        <Users className="h-4 w-4 text-amber-400" />
        <h2 className="text-sm font-bold text-neutral-100">ディレクター管理パネル</h2>
        <span className="text-[11px] text-neutral-600">
          担当者別の負荷とクライアント別の進捗をひと目で確認
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <div className="border-b border-neutral-800 p-4 lg:border-b-0 lg:border-r">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
            <Users className="h-3.5 w-3.5 text-neutral-500" />
            担当者別 抱え案件数・負荷
          </h3>
          {editorWorkload.length === 0 ? (
            <p className="text-xs text-neutral-600">担当者データがありません</p>
          ) : (
            <div className="space-y-3">
              {editorWorkload.map((w) => {
                const ratio = w.activeCount / maxActive;
                const level =
                  w.overdueCount >= 2 ? 'danger' : w.overdueCount >= 1 ? 'warn' : 'ok';
                return (
                  <div key={w.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-200">{w.name}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-neutral-400">
                          進行中 <span className="font-semibold text-neutral-100">{w.activeCount}</span>件
                        </span>
                        {w.overdueCount > 0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              level === 'danger'
                                ? 'bg-rose-950 text-rose-300'
                                : 'bg-amber-950 text-amber-300'
                            }`}
                          >
                            要対応 {w.overdueCount}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
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
                    <p className="mt-0.5 text-[10px] text-neutral-600">
                      累計{w.totalCount}件中 納品完了{w.deliveredCount}件
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
            <Building2 className="h-3.5 w-3.5 text-neutral-500" />
            クライアント別 進行状況
          </h3>
          {clientProgress.length === 0 ? (
            <p className="text-xs text-neutral-600">クライアントデータがありません</p>
          ) : (
            <div className="space-y-3">
              {clientProgress.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-200">{c.name}</span>
                    <span className="text-neutral-400">
                      納品完了率{' '}
                      <span className="font-semibold text-neutral-100">{c.deliveredRate}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(4, c.deliveredRate)}%` }}
                    />
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-600">
                    <span>全{c.totalCount}件</span>
                    <span>素材待ち {c.waitingMaterialCount}件</span>
                    {c.overdueCount > 0 && (
                      <span className="font-medium text-rose-400">期日超過 {c.overdueCount}件</span>
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
  onStatusChange,
  onCopyLink,
  onEdit,
  onDelete,
}: {
  projects: Project[];
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

        return (
          <div key={status} className="flex w-72 shrink-0 flex-col rounded-lg bg-neutral-950/60">
            <div className="flex items-center justify-between px-2.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                <h2 className="text-sm font-semibold text-neutral-200">{config.label}</h2>
                <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                  {columnProjects.length}
                </span>
              </div>
              {alertCount > 0 && (
                <span className="rounded-full bg-rose-950 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
                  要対応 {alertCount}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2.5">
              {columnProjects.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-800 py-6 text-center text-xs text-neutral-600">
                  案件なし
                </p>
              ) : (
                columnProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
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
  onChange,
  clientNames,
  editorNames,
  onOpenAddModal,
}: {
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
  clientNames: string[];
  editorNames: string[];
  onOpenAddModal: () => void;
}) {
  function update<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => update('keyword', e.target.value)}
          placeholder="案件名・タイトルを検索"
          className="w-56 rounded-md border border-neutral-700 bg-neutral-950 py-1.5 pl-8 pr-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-amber-600 focus:outline-none"
        />
      </div>

      <select
        value={filters.clientName}
        onChange={(e) => update('clientName', e.target.value)}
        className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200 focus:border-amber-600 focus:outline-none"
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
        className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-200 focus:border-amber-600 focus:outline-none"
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
        className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          filters.onlyAlerts
            ? 'border-rose-800 bg-rose-950 text-rose-300'
            : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        要対応のみ
      </button>

      <button
        type="button"
        onClick={onOpenAddModal}
        className="ml-auto flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-500"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accent?: boolean;
}) {
  return (
    <div>
      {label && <label className="mb-1 block text-[11px] font-medium text-neutral-400">{label}</label>}
      <div className="relative">
        <Calendar
          className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
            accent ? 'text-amber-500' : 'text-neutral-500'
          }`}
        />
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border bg-neutral-950 py-1.5 pl-8 pr-2 text-xs text-neutral-200 focus:outline-none [color-scheme:dark] ${
            accent
              ? 'border-amber-800/60 focus:border-amber-500'
              : 'border-neutral-700 focus:border-amber-600'
          }`}
        />
      </div>
    </div>
  );
}

function ProjectFormModal({
  initial,
  isEdit,
  onSave,
  onClose,
}: {
  initial: ProjectFormData;
  isEdit: boolean;
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

  const inputClass =
    'w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-amber-600 focus:outline-none';
  const labelClass = 'mb-1 block text-[11px] font-medium text-neutral-400';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3">
          <h2 className="text-sm font-bold text-neutral-100">
            {isEdit ? '案件を編集' : '新規案件を追加'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
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

          <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-3">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400">
              <Calendar className="h-3.5 w-3.5" />
              期日・実績日
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label="内部期日"
                value={form.internalDueDate}
                onChange={(v) => update('internalDueDate', v)}
                accent
              />
              <DateField
                label="初稿提出期日"
                value={form.draftDueDate}
                onChange={(v) => update('draftDueDate', v)}
                accent
              />
              <DateField
                label="初稿提出日（実績）"
                value={form.draftSubmittedDate}
                onChange={(v) => update('draftSubmittedDate', v)}
              />
              <DateField
                label="先方提出日（CL提出日）"
                value={form.clientSubmittedDate}
                onChange={(v) => update('clientSubmittedDate', v)}
              />
              <DateField
                label="修正完了日"
                value={form.revisionCompletedDate}
                onChange={(v) => update('revisionCompletedDate', v)}
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

          <div className="border-t border-neutral-800 pt-3">
            <p className="mb-2 text-[11px] font-semibold text-neutral-400">外部リンク</p>
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

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-500"
            >
              {isEdit ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// メインコンポーネント（Supabase & LINE 連動 + パスワード保護付きビュー切替）
// =====================================================================
export default function VideoProgressApp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor'); // デフォルトは編集者モード
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

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  }

  // ディレクター用モード切替＆パスワード認証制御
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
          waitingMaterialCount: owned.filter((p) => p.status === 'waiting_material').length,
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
    const overdueCount = filteredProjects.filter((p) => {
      const internalDue = getDueBadge(p.internalDueDate);
      const draftDue = getDueBadge(p.draftDueDate);
      return internalDue.level === 'overdue' || (draftDue.level === 'overdue' && !p.draftSubmittedDate);
    }).length;
    const gigafileCount = filteredProjects.filter((p) =>
      p.links.some((l) => l.linkType === 'gigafile' && isGigafileExpiring(l.expiresAt))
    ).length;
    const activeCount = filteredProjects.filter((p) => p.status !== 'delivered').length;
    const revisionCount = filteredProjects.filter((p) => p.status === 'revision').length;
    return { overdueCount, gigafileCount, activeCount, revisionCount };
  }, [filteredProjects]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        <p className="text-sm">案件データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Clapperboard className="h-5 w-5 text-amber-400" />
            <div>
              <h1 className="text-sm font-bold tracking-wide text-neutral-100">動画制作・案件進捗管理システム</h1>
              <p className="text-[11px] text-neutral-500">Aqua Fides / 動画管理ダッシュボード</p>
            </div>
          </div>

          {/* ディレクター / 編集者 画面切り替えタブ（鍵アイコン付き） */}
          <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-1">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === 'editor'
                  ? 'bg-amber-600 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              編集者用
            </button>
            <button
              type="button"
              onClick={handleSelectDirectorView}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === 'director'
                  ? 'bg-amber-600 text-neutral-950 shadow'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {!isDirectorUnlocked && <Lock className="h-3 w-3 text-amber-400" />}
              <Users className="h-3.5 w-3.5" />
              ディレクター用
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-5">
        {/* 全体統計（サマリーカード） */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="進行中の案件" value={summary.activeCount} tone="default" />
          <SummaryCard
            label="期日超過"
            value={summary.overdueCount}
            tone={summary.overdueCount > 0 ? 'danger' : 'default'}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <SummaryCard
            label="ギガファイル便 期限間近"
            value={summary.gigafileCount}
            tone={summary.gigafileCount > 0 ? 'warn' : 'default'}
          />
          <SummaryCard label="修正対応中" value={summary.revisionCount} tone="default" />
        </div>

        {/* ディレクター管理パネル（認証成功＆ディレクターモード時のみ表示） */}
        {viewMode === 'director' && isDirectorUnlocked && (
          <DirectorPanel editorWorkload={editorWorkload} clientProgress={clientProgress} />
        )}

        {/* フィルター＆カンバンボード */}
        <div className="space-y-4">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            clientNames={clientNames}
            editorNames={editorNames}
            onOpenAddModal={handleOpenAddModal}
          />
          <KanbanBoard
            projects={filteredProjects}
            onStatusChange={handleStatusChange}
            onCopyLink={handleCopyLink}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteProject}
          />
        </div>
      </main>

      {/* パスワード入力モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-lg border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-amber-400">
              <Lock className="h-5 w-5" />
              <h2 className="text-base font-bold text-neutral-100">ディレクター用画面の保護</h2>
            </div>
            <p className="mb-4 text-xs text-neutral-400">
              暗証番号を入力してディレクター用管理パネルを開放してください。
            </p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="パスワードを入力 (初期: 1234)"
                  autoFocus
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                />
                {passwordError && (
                  <p className="mt-1.5 text-xs text-rose-400">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-500"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-500"
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
}: {
  label: string;
  value: number;
  tone: 'default' | 'danger' | 'warn';
  icon?: React.ReactNode;
}) {
  const toneClass = {
    default: 'text-neutral-100',
    danger: 'text-rose-400',
    warn: 'text-amber-400',
  }[tone];

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <p className="mb-1.5 flex items-center gap-1 text-[11px] text-neutral-500">
        {icon}
        {label}
      </p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}