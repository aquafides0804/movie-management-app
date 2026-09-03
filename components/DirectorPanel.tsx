'use client';

import { EditorWorkload, ClientProgress } from '@/app/types';
import { Users, Building2 } from 'lucide-react';

export default function DirectorPanel({
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