export type ProjectStatus =
  | 'not_started'
  | 'editing'
  | 'client_review'
  | 'revision_requested'
  | 'revision'
  | 'revision_submitted'
  | 'delivered';

export interface ProjectLink {
  label: string;
  url: string;
  linkType?: string;
}

export interface Project {
  id: string;
  title: string;
  clientName: string;
  videoType?: string;
  mainEditor?: string;
  director?: string;
  status: ProjectStatus;
  draftDueDate?: string;
  clientSubmittedDate?: string;
  deliveredDate?: string;
  driveUrl?: string;
  gigafileUrl?: string;
  gigafileExpDate?: string;
  notes?: string;
  links?: ProjectLink[];
}

export type MemberRole = 'editor' | 'director' | 'both';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
}

export type DateFilterType = 'none' | 'clientSubmitted' | 'delivered' | 'clientSubmittedDate' | 'deliveredDate';
export type DateConditionType = 'exact' | 'before' | 'after';

export interface DashboardFilters {
  keyword: string;
  clientName: string;
  editor: string;
  status?: string;
  onlyAlerts: boolean;
  missingField?: 'none' | 'clientSubmittedDate' | 'deliveredDate' | 'mainEditor';
  dateType?: DateFilterType;
  dateCondition?: DateConditionType;
  targetDate?: string;
}