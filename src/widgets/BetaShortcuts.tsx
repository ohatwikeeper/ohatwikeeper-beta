import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog as ArcDialog, DialogContent } from '@/components/arc/dialog/dialog'
import { IS_BETA } from '@/lib/beta/env'

const KEYS: [string, string, string][] = [
  ['g d', 'ダッシュボードへ', '/dashboard'],
  ['g f', 'フォルダへ', '/folder'],
  ['g n', '通知へ', '/notification'],
  ['g s', '設定へ', '/settings'],
  ['/', 'ユーザー検索へ', '/search'],
]

/** beta 限定: キーボードショートカット(g→移動 / ? で一覧) */
export default function BetaShortcuts() {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const g = useRef(0)
  useEffect(() => {
    if (!IS_BETA) return
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey || el.closest('input,textarea,select,[contenteditable="true"]')) return
      if (e.key === '?') { setOpen((v) => !v); return }
      if (e.key === '/') { e.preventDefault(); nav('/search'); return }
      if (e.key === 'g') { g.current = Date.now(); return }
      if (Date.now() - g.current < 1000) {
        const hit = KEYS.find(([k]) => k === `g ${e.key}`)
        if (hit) { g.current = 0; nav(hit[2]) }
      }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [nav])
  if (!IS_BETA) return null
  return (
    <ArcDialog open={open} onOpenChange={setOpen}>
      <DialogContent title="キーボードショートカット (beta)" description="入力欄の外で使えます" className="dash-vars">
        <ul className="flex flex-col gap-2 text-sm">
          {KEYS.map(([k, label]) => <li key={k} className="flex justify-between"><span>{label}</span><kbd className="rounded border border-d-border px-2 font-mono text-xs">{k}</kbd></li>)}
          <li className="flex justify-between"><span>この一覧</span><kbd className="rounded border border-d-border px-2 font-mono text-xs">?</kbd></li>
        </ul>
      </DialogContent>
    </ArcDialog>
  )
}
