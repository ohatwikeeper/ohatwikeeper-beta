import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FlaskConical, GitCommitHorizontal } from 'lucide-react'
import PageHeader from '@/components/dashboard-ui/PageHeader'

interface BetaInfo { generatedAt?: string; base: string; notes: string; commits: { hash: string; date: string; msg: string }[] }

function useBetaInfo() {
  const [info, setInfo] = useState<BetaInfo | null>(null)
  useEffect(() => {
    const load = () => fetch('/app-api/beta-info').then((r) => r.json()).then(setInfo).catch(() => {})
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])
  return info
}

const day = (s: string) => s.slice(0, 10)

export default function BetaPage() {
  const info = useBetaInfo()
  const diff = useLocation().pathname.replace(/\/$/, '') === '/beta/diff'
  const lines = (info?.notes ?? '').split('\n').map((l) => l.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean)
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <PageHeader
        icon={diff ? GitCommitHorizontal : FlaskConical}
        title={diff ? 'beta の変更履歴' : 'beta 版の新機能'}
        desc={diff ? `本番(${info?.base || '最新'})からの変更です。30秒ごとに自動更新されます` : '本番にはまだない機能です。30秒ごとに自動更新されます'}
        right={diff
          ? <Link to="/beta" className="text-sm text-d-text2 underline">新機能の一覧へ</Link>
          : <Link to="/beta/diff" className="text-sm text-d-text2 underline">変更履歴(diff)を見る</Link>}
      />
      {!info && <p className="text-sm text-d-text3">読み込み中…</p>}
      {info && !diff && (lines.length
        ? <ul className="flex flex-col gap-2">{lines.map((l, i) => <li key={i} className="rounded-lg border border-d-border px-4 py-3 text-sm text-d-text">{l}</li>)}</ul>
        : <p className="text-sm text-d-text3">beta だけにある機能は今のところありません。</p>)}
      {info && diff && (info.commits.length
        ? <ul className="flex flex-col divide-y divide-d-border rounded-lg border border-d-border">
            {info.commits.map((c) => (
              <li key={c.hash} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                <code className="text-xs text-d-text3">{c.hash}</code>
                <span className="grow text-d-text">{c.msg}</span>
                <time className="text-xs text-d-text3">{day(c.date)}</time>
              </li>
            ))}
          </ul>
        : <p className="text-sm text-d-text3">本番との差分はありません。</p>)}
    </div>
  )
}
