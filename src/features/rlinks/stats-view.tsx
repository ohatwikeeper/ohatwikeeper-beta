import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts'

// 短縮リンクの解析の本体。持ち主の詳細画面と共有ページで使う。届いた項目だけを描く
export interface Item { name: string; count: number; flag?: string; region?: string | null }
export interface Stats {
  link: { slug: string; short_url: string; title?: string | null; original_url?: string; created_at?: string; tags?: string[]; utm?: Record<string, string> }
  totals?: { clicks?: number; logged?: number; unique?: number; bots?: number; humans?: number }
  timeline?: { date: string; count: number }[]; dow?: number[]; hour?: number[]
  referrers?: Item[]; countries?: Item[]; cities?: Item[]; browsers?: Item[]; os?: Item[]; devices?: Item[]; languages?: Item[]; ab?: Item[]
}

const ACCENT = 'var(--color-d-accent, #6dcbf7)'
const tip = { contentStyle: { background: '#0e1013', border: '1px solid rgb(255 255 255 / .12)', borderRadius: 8, fontSize: 12 }, cursor: { fill: 'rgb(255 255 255 / .05)' } }
const axis = { stroke: 'rgb(255 255 255 / .35)', fontSize: 11, tickLine: false, axisLine: false } as const

function Breakdown({ title, items }: { title: string; items: Item[] }) {
  const { t } = useTranslation()
  const max = Math.max(1, ...items.map((i) => i.count))
  const sum = items.reduce((a, b) => a + b.count, 0) || 1
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-d-text3">{title}</h3>
      {items.length === 0 ? <p className="py-3 text-sm text-d-text3">{t('rl.noData')}</p> : (
        <ul className="divide-y divide-d-border/60 border-y border-d-border/60">
          {items.map((i) => (
            <li key={`${i.name}-${i.region ?? ''}-${i.flag ?? ''}`} className="relative flex items-center justify-between gap-3 py-2 text-sm">
              <span className="absolute inset-y-1 left-0 -z-0 rounded bg-d-med" style={{ width: `${(i.count / max) * 100}%` }} />
              <span className="relative min-w-0 truncate">
                {i.flag && <span className="mr-1.5" aria-hidden>{i.flag}</span>}
                {i.name}
                {i.region && i.region !== i.name && <span className="ml-1.5 text-xs text-d-text3">{i.region}</span>}
              </span>
              <span className="relative shrink-0 tabular-nums text-d-text2">{i.count.toLocaleString()} <span className="text-xs text-d-text3">({Math.round((i.count / sum) * 100)}%)</span></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function StatsView({ d }: { d: Stats }) {
  const { t } = useTranslation()
  const DOW = [1, 2, 3, 4, 5, 6, 0].map((w) => t('rc.wdays').split(',')[w] ?? '')
  const tot = d.totals
  const kpis: [string, number][] = tot ? ([
    [t('rl.dClicks'), tot.clicks], [t('rl.dLogged'), tot.logged], [t('rl.dUnique'), tot.unique],
    [t('rs.dHumans'), tot.humans], [t('rl.dBots'), tot.bots],
  ].filter(([, v]) => typeof v === 'number') as [string, number][]) : []
  const lists: [string, Item[] | undefined][] = [
    [t('rl.dRef'), d.referrers], [t('rl.dCountry'), d.countries], [t('rs.f.cities'), d.cities],
    [t('rl.dBrowser'), d.browsers], ['OS', d.os], [t('rl.cDevice'), d.devices], [t('rl.dLang'), d.languages], [t('rs.f.ab'), d.ab],
  ]
  const shown = lists.filter(([, v]) => v) as [string, Item[]][]
  const utm = d.link.utm ? Object.entries(d.link.utm) : []
  return (
    <>
      {kpis.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-y-4 border-y border-d-border py-5 md:auto-cols-fr md:grid-flow-col md:divide-x md:divide-d-border">
          {kpis.map(([l, v], i) => (
            <div key={l} className={i ? 'md:px-6' : 'md:pr-6'}><dt className="text-[11px] uppercase tracking-wider text-d-text3">{l}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{v.toLocaleString()}</dd></div>
          ))}
        </dl>
      )}

      {(d.link.tags?.length || utm.length) ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          {d.link.tags?.map((g) => <span key={g} className="inline-flex h-6 items-center rounded-full border border-d-border px-2.5 leading-5 text-d-text2">#{g}</span>)}
          {utm.map(([k, v]) => <span key={k} className="inline-flex h-6 items-center rounded-full bg-d-med px-2.5 font-mono leading-5 text-d-text2">{k}={v}</span>)}
        </div>
      ) : null}

      {d.timeline && (
        <section className="mt-8">
          <h2 className="mb-3 font-bold">{t('rl.d30')}</h2>
          <div className="h-56"><ResponsiveContainer>
            <AreaChart data={d.timeline}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6dcbf7" stopOpacity={0.35} /><stop offset="100%" stopColor="#6dcbf7" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="rgb(255 255 255 / .06)" vertical={false} />
              <XAxis dataKey="date" {...axis} tickFormatter={(v: string) => v.slice(5)} interval={4} />
              <YAxis {...axis} allowDecimals={false} width={28} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="count" name={t('rl.dClick')} stroke="#6dcbf7" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer></div>
        </section>
      )}

      {(d.dow || d.hour) && (
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {d.dow && (
            <section>
              <h2 className="mb-3 font-bold">{t('rl.dDow')}</h2>
              <div className="h-40"><ResponsiveContainer><BarChart data={d.dow.map((n, i) => ({ k: DOW[i], n }))}><XAxis dataKey="k" {...axis} /><YAxis {...axis} allowDecimals={false} width={28} /><Tooltip {...tip} /><Bar dataKey="n" name={t('rl.dClick')} fill={ACCENT} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </section>
          )}
          {d.hour && (
            <section>
              <h2 className="mb-3 font-bold">{t('rl.dHour')}</h2>
              <div className="h-40"><ResponsiveContainer><BarChart data={d.hour.map((n, h) => ({ k: h, n }))}><XAxis dataKey="k" {...axis} interval={2} /><YAxis {...axis} allowDecimals={false} width={28} /><Tooltip {...tip} /><Bar dataKey="n" name={t('rl.dClick')} fill={ACCENT} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </section>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {shown.map(([title, items]) => <Breakdown key={title} title={title} items={items} />)}
        </div>
      )}
      <p className="mt-8 text-xs text-d-text3">{t('rl.dNote')}</p>
    </>
  )
}
