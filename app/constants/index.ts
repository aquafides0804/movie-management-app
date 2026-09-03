import { ProjectStatus, LinkType } from '@/app/types';
import { HardDrive, MessageSquareText, Upload, Video } from 'lucide-react';

export const DIRECTOR_PASSWORD = '0531';

export const STATUS_ORDER: ProjectStatus[] = [
  'not_started',
  'editing',
  'client_review',
  'revision_requested',
  'revision',
  'revision_submitted',
  'delivered',
];

export const STATUS_CONFIG: Record<
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

export const LINK_CONFIG: Record<LinkType, { label: string; icon: typeof HardDrive }> = {
  google_drive: { label: 'Googleドライブ', icon: HardDrive },
  frame_io: { label: 'Frame.io', icon: MessageSquareText },
  gigafile: { label: 'ギガファイル便', icon: Upload },
  youtube_private: { label: 'YouTube限定公開', icon: Video },
};