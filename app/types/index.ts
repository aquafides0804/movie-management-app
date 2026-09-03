import { HardDrive } from 'lucide-react';

export type ProjectStatus =
  | 'not_started'
  | 'editing'
  | 'client_review'
  | 'revision_requested'
  | 'revision'
  | 'revision_submitted'
  | 'delivered';

export type LinkType = 'google_drive' | 'frame_io' | 'gigafile' | 'youtube_private';
export type ViewMode = 'editor' | 'director' | 'client';
export type DateFilterType = 'deliveredDate' | 'clientSubmittedDate' | 'none';
export type DateConditionType = 'exact' | 'before' | 'after';

export interface ProjectLink {
  id: string;
  linkType: LinkType;
  url: string;
  expiresAt: string | null;
}

export interface Project {
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
  deliveredDate: string | null;
  priority: 0 | 1 | 2;
  revisionNote: string | null;
  links: ProjectLink[];
}

export interface DashboardFilters {
  clientName: string | 'all';
  editor: string | 'all';
  keyword: string;
  onlyAlerts: boolean;
}

export interface ProjectFormData {
  clientName: string;
  title: string;
  status: ProjectStatus;
  mainEditor: string;
  director: string;
  internalDueDate: string;
  draftDueDate: string;
  draftSubmittedDate: string;
  clientSubmittedDate: string;
  revisionCompletedDate: string;
  deliveredDate: string;
  priority: 0 | 1 | 2;
  revisionNote: string;
  googleDriveUrl: string;
  frameIoUrl: string;
  gigafileUrl: string;
  gigafileExpiresAt: string;
  youtubeUrl: string;
}

export interface EditorWorkload {
  name: string;
  activeCount: number;
  overdueCount: number;
  deliveredCount: number;
  totalCount: number;
}

export interface ClientProgress {
  name: string;
  totalCount: number;
  deliveredCount: number;
  overdueCount: number;
  deliveredRate: number;
}