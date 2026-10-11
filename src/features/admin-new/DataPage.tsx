import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Check, Columns3, Copy, Download, ExternalLink, GripVertical, Inbox, RefreshCw, Search, X } from 'lucide-react'
import { toast } from '@/lib/toast'
import Shell from './Shell'
import { adminFetch, fmtDate, useDebounced } from '../admin/kit'
import { Cell, COL_LABEL, FILTER_LABEL } from '../admin/data/cells'
import { Pagination } from '@/components/arc/pagination/pagination'
import { JsonViewer } from '@/components/arc/json-viewer/json-viewer'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { ALL_ITEMS } from './nav'

type Row = Record<string, unknown> & { __list: Record<string, unknown> }
interface Filter { key: string; label: string; options: { value: string; label: string }[] }
interface Res {
  title: string; columns: string[]; allColumns?: string[]; defaultColumns?: string[]; rows: Row[]; total: number; approx: boolean; page: number; per: number
  texts?: { key: string; label: string }[]; filters: Filter[]; dated: boolean; editable: { fields: unknown[]; create: boolean } | null
}
const LIVE = ['access', 'api-logs', 'api-errors', 'mails']
const lbl = (c: string) => COL_LABEL[c] ?? c
const looksJson = (s: string) => /^\s*[[{][\s\S]*[\]}]\s*$/.test(s)
const asJson = (v: unknown): unknown => {
  if (v && typeof v === 'object') return v
  if (typeof v === 'string' && looksJson(v)) { try { return JSON.parse(v) } catch { /* 文字列のまま */ } }
  return undefined
}
const REL: Record<string, (v: string) => { to: string; label: string } | null> = {
  request_id: (v) => ({ to: `/admin-new/data/api-logs?q=${encodeURIComponent(v)}`, label: 'APIログで開く' }),
  user_id: (v) => ({ to: `/admin-new/data/users?q=${encodeURIComponent(v)}`, label: 'ユーザーを開く' }),
  logged_in_user_id: (v) => ({ to: `/admin-new/data/users?q=${encodeURIComponent(v)}`, label: 'ユーザーを開く' }),
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <Button variant="ghost" size="icon-xs" aria-label="コピー" onClick={() => { navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1200) }) }}>
      {ok ? <Check /> : <Copy />}
    </Button>
  )
}

function Detail({ row, view, editable, onClose }: { row: Row | null; view: string; editable: boolean; onClose: () => void }) {
  const entries = row ? Object.entries(row).filter(([k]) => k !== '__list') : []
  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle>詳細{row?.id !== undefined ? ` #${String(row.id)}` : ''}</SheetTitle></SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {editable && <Button variant="outline" size="sm" nativeButton={false} render={<Link to={`/admin/data/${view}`} />} className="self-start !text-d-text"><ExternalLink className="size-3.5" />旧画面で編集</Button>}
          {entries.map(([k, v]) => {
            const j = asJson(v)
            const text = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
            const rel = text && REL[k]?.(text)
            return (
              <div key={k} className="rounded-lg border border-d-border p-2.5">
                <div className="mb-1 flex items-center gap-1 text-xs text-d-text3">
                  <span>{lbl(k)}</span><code className="text-[10px] opacity-60">{k}</code>
                  <span className="ml-auto flex items-center">{rel && <Link to={rel.to} className="mr-1 text-xs !text-d-accent">{rel.label}</Link>}{text && <CopyBtn text={text} />}</span>
                </div>
                {j !== undefined ? <JsonViewer data={j} defaultExpandDepth={1} /> : text === '' ? <span className="text-d-text3">-</span> : <div className="text-sm break-all whitespace-pre-wrap text-d-text">{/_at$|^timestamp$|^date$/.test(k) ? `${fmtDate(text)} (${text})` : text}</div>}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** /admin-new/data/:view — 一覧・絞り込み・詳細の汎用ビュー(状態は URL に保持) */
export default function DataPage() {
  const { view = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const [res, setRes] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)
  const [qInput, setQInput] = useState(sp.get('q') ?? '')
  const q = useDebounced(qInput)
  const [sel, setSel] = useState<Row | null>(null)
  const [live, setLive] = useState(false)
  const reqSeq = useRef(0)
  const colKey = `admin-new:cols:${view}`
  const [myCols, setMyCols] = useState<string[]>([])
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  useEffect(() => { try { setMyCols(JSON.parse(localStorage.getItem(colKey) ?? '[]')) } catch { setMyCols([]) }; setQInput(sp.get('q') ?? ''); setSel(null) }, [view]) // eslint-disable-line react-hooks/exhaustive-deps
  const page = Math.max(1, Number(sp.get('page')) || 1)
  const asc = sp.get('dir') === 'asc'
  const qs = useMemo(() => { const n = new URLSearchParams(sp); n.delete('page'); return n.toString() }, [sp])
  const patch = useCallback((o: Record<string, string | null>) => {
    setSp((p) => { const n = new URLSearchParams(p); for (const [k, v] of Object.entries(o)) v ? n.set(k, v) : n.delete(k); if (!('page' in o)) n.delete('page'); return n }, { replace: true })
  }, [setSp])
  useEffect(() => { if ((sp.get('q') ?? '') !== q) patch({ q: q || null }) }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (silent = false) => {
    const my = ++reqSeq.current
    if (!silent) setLoading(true)
    try {
      const r = await adminFetch<Res>(`data/${view}?${qs}&page=${page}${myCols.length ? `&cols=${encodeURIComponent(myCols.join(','))}` : ''}`)
      if (my === reqSeq.current) setRes(r)
    } catch (e) { if (my === reqSeq.current) toast.error((e as Error).message) }
    finally { if (my === reqSeq.current) setLoading(false) }
  }, [view, qs, page, myCols])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!live || !LIVE.includes(view)) return
    const h = setInterval(() => load(true), 5000)
    return () => clearInterval(h)
  }, [live, view, load])

  const saveCols = (c: string[]) => { setMyCols(c); localStorage.setItem(colKey, JSON.stringify(c)) }
  const cur = res?.columns ?? []
  const hidden = (res?.allColumns ?? []).filter((c) => !cur.includes(c))
  const drop = (to: string) => {
    if (!dragCol || dragCol === to) return
    const n = cur.filter((c) => c !== dragCol); n.splice(n.indexOf(to) + (cur.indexOf(dragCol) < cur.indexOf(to) ? 1 : 0), 0, dragCol); saveCols(n)
  }
  const toggleFilter = (key: string, value: string) => {
    const set = new Set((sp.get(key) ?? '').split(',').filter(Boolean)); set.has(value) ? set.delete(value) : set.add(value)
    patch({ [key]: [...set].join(',') || null })
  }
  const pages = res ? Math.max(1, Math.ceil(res.total / res.per)) : 1
  const dr = sp.get('from') ? { from: new Date(sp.get('from') + 'T00:00:00'), to: sp.get('to') ? new Date(sp.get('to') + 'T00:00:00') : undefined } : undefined
  const active = [...sp.keys()].filter((k) => /^(f_|s_|t_)/.test(k) || k === 'from' || k === 'to' || k === 'q').length
  const title = ALL_ITEMS.find((i) => i.to === `/admin-new/data/${view}`)?.label ?? res?.title ?? view

  return (
    <Shell title={title} actions={LIVE.includes(view) ? <label className="hidden items-center gap-2 text-xs text-d-text2 sm:flex"><Switch checked={live} onCheckedChange={setLive} />ライブ</label> : null}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-d-text3" />
            <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="検索(ID・ユーザー名・リクエストID等)" className="h-9 pl-8" />
          </div>
          {res?.dated && <DateRangePicker value={dr} onChange={(v) => patch({ from: v?.from ? format(v.from, 'yyyy-MM-dd') : null, to: v?.to ? format(v.to, 'yyyy-MM-dd') : null })} />}
          <Button variant="outline" size="sm" className="h-9 !text-d-text" onClick={() => patch({ dir: asc ? null : 'asc' })}>{asc ? <ArrowUpWideNarrow className="size-3.5" /> : <ArrowDownWideNarrow className="size-3.5" />}{asc ? '古い順' : '新しい順'}</Button>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="h-9 !text-d-text" />}><Columns3 className="size-3.5" />カラム</PopoverTrigger>
            <PopoverContent align="end" className="max-h-[70vh] w-72 overflow-y-auto p-2">
              <p className="px-1 pb-1 text-xs text-d-text3">ドラッグで並び替え</p>
              {cur.map((c) => (
                <div key={c} draggable onDragStart={() => setDragCol(c)} onDragOver={(e) => { e.preventDefault(); setOverCol(c) }} onDrop={() => { drop(c); setDragCol(null); setOverCol(null) }} onDragEnd={() => { setDragCol(null); setOverCol(null) }}
                  className={`flex items-center gap-2 rounded-md px-1.5 py-1 text-sm ${overCol === c && dragCol !== c ? 'bg-d-accent/15' : 'hover:bg-d-med/60'}`}>
                  <GripVertical className="size-3.5 cursor-grab text-d-text3" /><span className="flex-1 truncate">{lbl(c)}</span>
                  <button type="button" aria-label="非表示" className="text-d-text3 hover:text-d-text" onClick={() => saveCols(cur.filter((x) => x !== c))}><X className="size-3.5" /></button>
                </div>
              ))}
              {hidden.length > 0 && <p className="px-1 pt-2 pb-1 text-xs text-d-text3">非表示(クリックで追加)</p>}
              {hidden.map((c) => <button key={c} type="button" className="block w-full rounded-md px-1.5 py-1 text-left text-sm text-d-text2 hover:bg-d-med/60" onClick={() => saveCols([...cur, c])}>{lbl(c)}</button>)}
              {myCols.length > 0 && <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => { setMyCols([]); localStorage.removeItem(colKey) }}>初期設定に戻す</Button>}
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon-sm" className="size-9" aria-label="再読み込み" onClick={() => load()}><RefreshCw className={loading ? 'animate-spin' : ''} /></Button>
          <Button variant="outline" size="sm" className="h-9 !text-d-text" nativeButton={false} render={<a href={`/app-api/admin/data/${view}?csv=1&${qs}`} />}><Download className="size-3.5" />CSV</Button>
        </div>

        {(res?.filters.length || res?.texts?.length) ? (
          <div className="flex flex-col gap-2">
            {res.filters.filter((f) => f.options.length <= 6).map((f) => {
              const on = new Set((sp.get(f.key) ?? '').split(',').filter(Boolean))
              return (
                <div key={f.key} className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-d-text3">{FILTER_LABEL[f.key] ?? f.label}</span>
                  {f.options.map((o) => (
                    <button key={o.value} type="button" aria-pressed={on.has(o.value)} onClick={() => toggleFilter(f.key, o.value)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${on.has(o.value) ? 'border-d-accent bg-d-accent/15 text-d-text' : 'border-d-border text-d-text2 hover:bg-d-med/60'}`}>{o.label}</button>
                  ))}
                </div>
              )
            })}
            {res.texts && res.texts.length > 0 && <div className="flex flex-wrap gap-2">{res.texts.map((t) => <Input key={t.key} defaultValue={sp.get(t.key) ?? ''} placeholder={t.label} className="h-8 w-40 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') patch({ [t.key]: (e.target as HTMLInputElement).value.trim() || null }) }} />)}</div>}
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-d-text2">
          <span>{res ? `${res.approx ? '約 ' : ''}${res.total.toLocaleString()} 件` : '読み込み中'}</span>
          {active > 0 && <Badge variant="secondary">絞り込み {active}</Badge>}
          {active > 0 && <button type="button" className="underline" onClick={() => { setQInput(''); setSp({}, { replace: true }) }}>すべて解除</button>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-d-border">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-d-med/50 text-left text-xs text-d-text2"><tr>{cur.map((c) => <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">{lbl(c)}</th>)}</tr></thead>
            <tbody className="divide-y divide-d-border">
              {loading && !res ? Array.from({ length: 8 }, (_, i) => <tr key={i}><td colSpan={Math.max(1, cur.length)} className="p-2"><Skeleton className="h-8" /></td></tr>)
                : res?.rows.map((r, i) => (
                  <tr key={i} onClick={() => setSel(r)} className="cursor-pointer transition-colors hover:bg-d-med/40">
                    {cur.map((c) => <td key={c} className="max-w-[320px] truncate px-3 py-2"><Cell col={c} value={r.__list[c]} /></td>)}
                  </tr>
                ))}
            </tbody>
          </table>
          {res && res.rows.length === 0 && <div className="flex flex-col items-center gap-2 py-16 text-d-text3"><Inbox className="size-8" /><p className="text-sm">該当するデータがありません</p></div>}
        </div>
        {pages > 1 && <div className="flex justify-center"><Pagination page={page} pageCount={pages} onPageChange={(p) => patch({ page: p > 1 ? String(p) : null })} label="ページ" /></div>}
      </div>
      <Detail row={sel} view={view} editable={!!res?.editable} onClose={() => setSel(null)} />
    </Shell>
  )
}
