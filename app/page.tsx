'use client';

import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Project,
  ProjectStatus,
  ProjectFormData,
  DashboardFilters,
  ViewMode,
  EditorWorkload,
  ClientProgress,
} from '@/app/types';
import { DIRECTOR_PASSWORD, STATUS_CONFIG } from '@/app/constants';
import {
  mapDbToProject,
  mapProjectToDb,
  formDataToLinks,
  projectToFormData,
  emptyFormData,
  projectHasAlert,
  isGigafileExpiring,
  sendLineNotification,
} from '@/app/utils';

import BulkActionModal, { BulkUpdateData } from '@/components/BulkActionModal';
import KanbanBoard from '@/components/KanbanBoard';
import ClientTableView from '@/components/ClientTableView';
import DirectorPanel from '@/components/DirectorPanel';
import FilterBar from '@/components/FilterBar';
import MemberManagementModal from '@/components/MemberManagementModal';
import ProjectFormModal from '@/components/ProjectFormModal';

import {
  AlertTriangle,
  Check,
  Clapperboard,
  LayoutGrid,
  Lock,
  Moon,
  Sun,
  Table as TableIcon,
  Users,
} from 'lucide-react';

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

export default function VideoProgressApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [selectedClientView, setSelectedClientView] = useState<string>('all');
  const [isDirectorUnlocked, setIsDirectorUnlocked] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);

  const [customEditors, setCustomEditors] = useState<string[]>(['金本さん', '中山さん', '内田', '山田']);
  const [customDirectors, setCustomDirectors] = useState<string[]>(['望月']);

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

    const fetchMembers = async () => {
      const { data, error } = await supabase.from('members').select('*');
      if (error) {
        console.error('メンバー取得エラー:', error);
        return;
      }
      
      // DBにデータが存在する場合は、DBのデータで完全上書きする
      if (data && data.length > 0) {
        const editors = data.filter((m) => m.role === 'editor').map((m) => m.name);
        const directors = data.filter((m) => m.role === 'director').map((m) => m.name);
        setCustomEditors(editors);
        setCustomDirectors(directors);
      }
    };

    fetchMembers();
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

  const handleAddMember = async (name: string, role: 'editor' | 'director') => {
    if (role === 'editor') {
      if (customEditors.includes(name)) return;
      setCustomEditors((prev) => [...prev, name]);
    } else {
      if (customDirectors.includes(name)) return;
      setCustomDirectors((prev) => [...prev, name]);
    }

    try {
      const { error } = await supabase.from('members').insert({ name, role });
      if (error) throw error;
      showToast(`「${name}」を追加しました`);
    } catch (error) {
      console.error('メンバー追加エラー:', error);
      showToast('メンバーの追加保存に失敗しました');
    }
  };

  const handleDeleteMember = async (targetName: string, role: 'editor' | 'director') => {
    if (!confirm(`「${targetName}」を削除してもよろしいですか？\n※この担当者が割り当てられている案件は自動的に未割当に変更されます。`)) {
      return;
    }

    try {
      // 1. ローカルStateの更新
      if (role === 'editor') {
        setCustomEditors((prev) => prev.filter((n) => n !== targetName));
      } else {
        setCustomDirectors((prev) => prev.filter((n) => n !== targetName));
      }

      // 2. Supabase の members テーブルから削除
      const { error: memberError } = await supabase
        .from('members')
        .delete()
        .eq('name', targetName)
        .eq('role', role);

      if (memberError) throw memberError;

      // 3. 該当する案件の担当を解除（空文字または未割当へ）
      const targetKey = role === 'editor' ? 'main_editor' : 'director';
      const affectedProjects = projects.filter((p) => (role === 'editor' ? p.mainEditor : p.director) === targetName);

      if (affectedProjects.length > 0) {
        const affectedIds = affectedProjects.map((p) => p.id);
        const { error: projectError } = await supabase
          .from('movies')
          .update({ [targetKey]: '' })
          .in('id', affectedIds);

        if (projectError) throw projectError;

        // ローカルの案件一覧も更新
        setProjects((prev) =>
          prev.map((p) => {
            if (role === 'editor' && p.mainEditor === targetName) return { ...p, mainEditor: '' };
            if (role === 'director' && p.director === targetName) return { ...p, director: '' };
            return p;
          })
        );
      }

      showToast(`「${targetName}」を削除しました`);
    } catch (error) {
      console.error('メンバー削除エラー:', error);
      showToast('メンバーの追加保存に失敗しました');
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

      // 「納品完了」にステータス変更された時のみLINE通知
      if (next === 'delivered') {
        const lineMessage =
          `🎉 【納品完了】案件が完了しました！\n\n` +
          `■ クライアント: ${target.clientName}\n` +
          `■ 案件名: ${target.title}\n` +
          `■ 担当者: ${target.mainEditor || '未設定'}`;

        await sendLineNotification(lineMessage);
        showToast('納品完了に更新し、LINEに通知しました');
      } else {
        showToast('ステータスを更新しました');
      }
    } catch (err) {
      alert('ステータスの更新に失敗しました');
      fetchProjects();
    }
  }

  async function handleQuickUpdate(id: string, fields: Partial<Project>) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));

    const dbPayload = mapProjectToDb(fields);

    try {
      const { error } = await supabase
        .from('movies')
        .update(dbPayload)
        .eq('id', id);

      if (error) throw error;
      showToast('更新しました');
    } catch (err) {
      console.error('Quick update failed:', err);
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
        fileName: data.title.trim(),
        status: data.status,
        mainEditor: data.mainEditor.trim(),
        director: data.director.trim(),
        internalDueDate: data.internalDueDate || null,
        draftDueDate: data.draftDueDate || null,
        draftSubmittedDate: data.draftSubmittedDate || null,
        clientSubmittedDate: data.clientSubmittedDate || null,
        revisionCompletedDate: data.revisionCompletedDate || null,
        deliveredDate: data.deliveredDate || null,
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
        fileName: data.title.trim(),
        status: data.status,
        mainEditor: data.mainEditor.trim(),
        director: data.director.trim(),
        internalDueDate: data.internalDueDate || null,
        draftDueDate: data.draftDueDate || null,
        draftSubmittedDate: data.draftSubmittedDate || null,
        clientSubmittedDate: data.clientSubmittedDate || null,
        revisionCompletedDate: data.revisionCompletedDate || null,
        deliveredDate: data.deliveredDate || null,
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
    () => Array.from(new Set([...customEditors, ...projects.map((p) => p.mainEditor).filter(Boolean)])).sort(),
    [projects, customEditors]
  );

  const directorNames = useMemo(
    () => Array.from(new Set([...customDirectors, ...projects.map((p) => p.director).filter(Boolean)])).sort(),
    [projects, customDirectors]
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
            <button
              type="button"
              onClick={() => setShowMemberModal(true)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-amber-600" />
              <span>担当者管理</span>
            </button>

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
            editorNames={editorNames}
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
              editorNames={editorNames}
              directorNames={directorNames}
              onToggleSelect={handleToggleSelect}
              onStatusChange={handleStatusChange}
              onQuickUpdate={handleQuickUpdate}
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
        directorsList={directorNames}
      />

      {showMemberModal && (
        <MemberManagementModal
          isLight={isLight}
          editorList={editorNames}
          directorList={directorNames}
          onAddMember={handleAddMember}
          onDeleteMember={handleDeleteMember}
          onClose={() => setShowMemberModal(false)}
        />
      )}

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
          editorNames={editorNames}
          directorNames={directorNames}
          initial={modalState.mode === 'edit' ? projectToFormData(modalState.project) : emptyFormData()}
          onSave={handleSaveProject}
          onClose={() => setModalState(null)}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  );
}