import { Project, ProjectFormData, ProjectLink, ProjectStatus, LinkType } from '@/app/types';

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function sendLineNotification(message: string) {
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

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${week})`;
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDueBadge(dateStr: string | null): {
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

export function isGigafileExpiring(dateStr: string | null): boolean {
  const days = daysUntil(dateStr);
  return days !== null && days <= 1;
}

export function projectHasAlert(p: Project): boolean {
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

export function emptyFormData(): ProjectFormData {
  return {
    clientName: '',
    title: '',
    status: 'not_started',
    mainEditor: '',
    director: '望月',
    internalDueDate: '',
    draftDueDate: '',
    draftSubmittedDate: '',
    clientSubmittedDate: '',
    revisionCompletedDate: '',
    deliveredDate: '',
    priority: 0,
    revisionNote: '',
    googleDriveUrl: '',
    frameIoUrl: '',
    gigafileUrl: '',
    gigafileExpiresAt: '',
    youtubeUrl: '',
  };
}

export function projectToFormData(p: Project): ProjectFormData {
  const findUrl = (t: LinkType) => p.links.find((l) => l.linkType === t)?.url ?? '';
  const gigafile = p.links.find((l) => l.linkType === 'gigafile');
  return {
    clientName: p.clientName,
    title: p.title,
    status: p.status,
    mainEditor: p.mainEditor,
    director: p.director,
    internalDueDate: p.internalDueDate ?? '',
    draftDueDate: p.draftDueDate ?? '',
    draftSubmittedDate: p.draftSubmittedDate ?? '',
    clientSubmittedDate: p.clientSubmittedDate ?? '',
    revisionCompletedDate: p.revisionCompletedDate ?? '',
    deliveredDate: p.deliveredDate ?? '',
    priority: p.priority,
    revisionNote: p.revisionNote ?? '',
    googleDriveUrl: findUrl('google_drive'),
    frameIoUrl: findUrl('frame_io'),
    gigafileUrl: findUrl('gigafile'),
    gigafileExpiresAt: gigafile?.expiresAt ?? '',
    youtubeUrl: findUrl('youtube_private'),
  };
}

export function formDataToLinks(f: ProjectFormData): ProjectLink[] {
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

export function mapDbToProject(row: any): Project {
  let status = row.status as string;
  if (status === 'draft_review') status = 'client_review';
  if (status === 'waiting_material') status = 'not_started';

  return {
    id: row.id,
    clientName: row.client_name || row.title || '未設定',
    title: row.title || '',
    fileName: row.file_name || row.title || '',
    status: (status as ProjectStatus) || 'not_started',
    mainEditor: row.main_editor || row.assignee || '',
    director: row.director || '',
    internalDueDate: row.internal_due_date || null,
    draftDueDate: row.draft_due_date || row.due_date || null,
    draftSubmittedDate: row.draft_submitted_date || null,
    clientSubmittedDate: row.client_submitted_date || null,
    revisionCompletedDate: row.revision_completed_date || null,
    deliveredDate: row.delivered_date || null,
    priority: row.priority ?? 0,
    revisionNote: row.revision_note || row.description || null,
    links: Array.isArray(row.links) ? row.links : [],
  };
}

export function mapProjectToDb(p: Partial<Project>, descriptionText?: string) {
  return {
    client_name: p.clientName,
    title: p.title,
    file_name: p.fileName || p.title,
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
    delivered_date: p.deliveredDate,
    priority: p.priority,
    revision_note: p.revisionNote,
    description: descriptionText || p.revisionNote,
    links: p.links,
  };
}