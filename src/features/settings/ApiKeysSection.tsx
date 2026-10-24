import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Eye, EyeOff, Key, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PageLoader } from '@/components/ui/page-loader'
import { confirmDialog } from '@/lib/confirm'
import { csrfHeaders, friendlyError } from '@/lib/dashboard/api'
import { toast } from '@/lib/toast'

interface ApiKey { id: number; name: string; note: string | null; api_key: string; created_at: string; last_used_at: string | null }

async function call<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(`/app-api/settings${path}`, {
    method, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(method === 'GET' ? {} : csrfHeaders()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || d.ok === false) throw new Error(d.error || `HTTP ${r.status}`)
  return d
}
const fmt = (s: string | null) => s?.slice(0, 16).replace('T', ' ')

function KeyRow({ k, reload }: { k: ApiKey; reload: () => Promise<void> }) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(k.name)
  const [note, setNote] = useState(k.note ?? '')

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) toast.success(ok); await reload() } catch (e: any) { toast.error(friendlyError(e, t('ak.fail'))) }
  }
  const copy = () => navigator.clipboard.writeText(k.api_key).then(() => { setCopied(true); toast.success(t('st.keyCopied')); setTimeout(() => setCopied(false), 2000) })

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-d-border bg-d-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-d-text">{k.name || t('ak.unnamed')}</p>
          {k.note && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-d-text2">{k.note}</p>}
        </div>
        <Button variant="outline" size="sm" className="shrink-0 border-d-border" onClick={() => setEditing((v) => !v)} aria-label={t('ak.edit')}>
          <Pencil className="size-3.5" />
        </Button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2">
          <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={t('ak.namePh')} aria-label={t('ak.name')} />
          <Textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} placeholder={t('ak.notePh')} aria-label={t('ak.note')} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => run(async () => { await call(`/api_keys/${k.id}`, 'PATCH', { name, note }); setEditing(false) }, t('ak.savedMsg'))}>{t('ak.save')}</Button>
            <Button size="sm" variant="outline" className="border-d-border" onClick={() => { setName(k.name); setNote(k.note ?? ''); setEditing(false) }}>{t('ak.cancel')}</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-d-text">{show ? k.api_key : k.api_key.replace(/^([a-z]+_).*/, '$1') + '••••••••••••••••••••••••'}</code>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="border-d-border" onClick={() => setShow(!show)} title={show ? t('st.hide') : t('st.show')} aria-label={show ? t('st.hide') : t('st.show')}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-d-border" onClick={copy}>
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}{t('st.copy')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs tabular-nums text-d-text3">
          {t('ak.made')} {fmt(k.created_at)} / {t('ak.lastUsed')} {fmt(k.last_used_at) ?? t('ak.never')}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 border-d-border"
            onClick={async () => { if (await confirmDialog(t('st.regenQ'))) run(() => call(`/api_keys/${k.id}/regenerate`, 'POST'), t('st.regenDone')) }}>
            <RefreshCw className="size-3.5" />{t('st.regen')}
          </Button>
          <Button variant="destructive" size="sm" className="flex items-center gap-1.5 border-red-500/30"
            onClick={async () => { if (await confirmDialog(t('st.delKeyQ'))) run(() => call(`/api_keys/${k.id}`, 'DELETE'), t('st.delKeyDone')) }}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  )
}

export default function ApiKeysSection() {
  const { t } = useTranslation()
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [max, setMax] = useState(10)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try { const d = await call<{ keys: ApiKey[]; max: number }>('/api_keys'); setKeys(d.keys); setMax(d.max) }
    catch (e: any) { toast.error(friendlyError(e, t('ak.fail'))) }
  }, [])
  useEffect(() => { void reload() }, [reload])

  const create = async () => {
    setBusy(true)
    try { await call('/api_keys', 'POST', { name, note }); setName(''); setNote(''); toast.success(t('ak.createdMsg')); await reload() }
    catch (e: any) { toast.error(friendlyError(e, t('ak.fail'))) }
    finally { setBusy(false) }
  }

  if (!keys) return <PageLoader />
  const full = keys.length >= max
  return (
    <div className="flex flex-col gap-4">
      {keys.length === 0 ? (
        <div className="rounded-xl border border-d-border bg-d-bg py-8 text-center">
          <Key className="mx-auto mb-2 size-8 text-d-text3" />
          <p className="text-xs text-d-text3">{t('st.noKey')}</p>
        </div>
      ) : <ul className="flex flex-col gap-3">{keys.map((k) => <KeyRow key={k.id} k={k} reload={reload} />)}</ul>}

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-d-border p-4">
        <Input value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder={t('ak.namePh')} aria-label={t('ak.name')} disabled={full} />
        <Textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} placeholder={t('ak.notePh')} aria-label={t('ak.note')} disabled={full} />
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={create} disabled={busy || full}>{t('ak.create')}</Button>
          <span className="text-xs text-d-text3 tabular-nums">{keys.length}/{max}{full ? ` ${t('ak.limit', { n: max })}` : ''}</span>
        </div>
      </div>
    </div>
  )
}
