import { ProjectStatus, Member } from '@/app/types';

export interface StatusConfigItem {
  label: string;
  color: string;
  badgeLight?: string;
  badgeDark?: string;
  dot?: string;
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfigItem> = {
  not_started: {
    label: '未着手',
    color: 'bg-slate-500/20 text-slate-300',
    badgeLight: 'bg-slate-100 text-slate-700',
    badgeDark: 'bg-slate-800 text-slate-300',
    dot: 'bg-slate-400',
  },
  editing: {
    label: '編集作業中',
    color: 'bg-blue-500/20 text-blue-300',
    badgeLight: 'bg-blue-100 text-blue-700',
    badgeDark: 'bg-blue-900/40 text-blue-300',
    dot: 'bg-blue-400',
  },
  client_review: {
    label: '先方確認中',
    color: 'bg-amber-500/20 text-amber-300',
    badgeLight: 'bg-amber-100 text-amber-700',
    badgeDark: 'bg-amber-900/40 text-amber-300',
    dot: 'bg-amber-400',
  },
  revision_requested: {
    label: '修正指示あり',
    color: 'bg-rose-500/20 text-rose-300',
    badgeLight: 'bg-rose-100 text-rose-700',
    badgeDark: 'bg-rose-900/40 text-rose-300',
    dot: 'bg-rose-400',
  },
  revision: {
    label: '修正作業中',
    color: 'bg-purple-500/20 text-purple-300',
    badgeLight: 'bg-purple-100 text-purple-700',
    badgeDark: 'bg-purple-900/40 text-purple-300',
    dot: 'bg-purple-400',
  },
  revision_submitted: {
    label: '修正提出済み',
    color: 'bg-indigo-500/20 text-indigo-300',
    badgeLight: 'bg-indigo-100 text-indigo-700',
    badgeDark: 'bg-indigo-900/40 text-indigo-300',
    dot: 'bg-indigo-400',
  },
  delivered: {
    label: '納品完了',
    color: 'bg-emerald-500/20 text-emerald-300',
    badgeLight: 'bg-emerald-100 text-emerald-700',
    badgeDark: 'bg-emerald-900/40 text-emerald-300',
    dot: 'bg-emerald-400',
  },
};

export const STATUS_ORDER: ProjectStatus[] = [
  'not_started',
  'editing',
  'client_review',
  'revision_requested',
  'revision',
  'revision_submitted',
  'delivered',
];

export const DEFAULT_MEMBERS: Member[] = [
  { id: '1', name: '未割り当て', role: 'both' },
];