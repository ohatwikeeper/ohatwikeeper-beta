import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, LogOut, Palette, Sun } from 'lucide-react'
import { askLogout } from '@/widgets/LogoutDialog'
import type { Profile } from '@/lib/dashboard/types'
import { useTranslation } from 'react-i18next'
import { fmt, joinedLabel } from '@/lib/dashboard/format'
import type { DashTheme } from '@/lib/dashboard/theme'
import OwnerBadge from '@/features/profile/OwnerBadge'
import LanguageSwitcher from '@/components/dashboard-ui/LanguageSwitcher'
import ThemeToggle from '@/features/profile/ThemeToggle'
import BioText from '@/features/profile/BioText'
import { Link } from 'react-router-dom'
import NotificationBell from '@/features/profile/NotificationBell'
import Tip from '@/components/dashboard-ui/Tip'

// アイコン列: 普段は小さく重ねて表示し、ホバー/フォーカスで左へ展開(タッチ端末は常時展開)
const Slot = ({ children }: { children: React.ReactNode }) => <span className="flex shrink-0">{children}</span>
const STACK = [Compass, Sun, Palette]

// 通知・言語などのポップアップが開いている間は畳まない(ツールチップは対象外)
const popupOpen = () => !!document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]')
const useStackOpen = () => {
  const [open, setOpen] = useState(false)
  const pinned = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(0)
  // 閉じるのは少し遅らせて、境界でのちらつきを防ぐ
  const hover = (v: boolean) => { window.clearTimeout(timer.current); timer.current = 0; if (v) setOpen(true) }
  useEffect(() => {
    if (!open) return
    // ポップオーバー操作中は開いたままにし、外側を押したら畳む
    const h = (e: PointerEvent) => {
      if (box.current?.contains(e.target as Node) || (e.target as Element).closest?.('[data-radix-popper-content-wrapper]')) return
      pinned.current = false; setOpen(false)
    }
    // 表示が切り替わっても確実に閉じられるよう、enter/leave ではなくカーソル位置の範囲判定で畳む
    const m = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || pinned.current || popupOpen()) return
      const r = box.current?.getBoundingClientRect()
      const inside = !!r && e.clientX >= r.left - 6 && e.clientX <= r.right + 6 && e.clientY >= r.top - 6 && e.clientY <= r.bottom + 6
      if (inside) { window.clearTimeout(timer.current); timer.current = 0 }
      else if (!timer.current) timer.current = window.setTimeout(() => { timer.current = 0; setOpen(false) }, 120)
    }
    document.addEventListener('pointerdown', h)
    document.addEventListener('pointermove', m)
    return () => { document.removeEventListener('pointerdown', h); document.removeEventListener('pointermove', m); window.clearTimeout(timer.current) }
  }, [open])
  return { open, setOpen, pinned, box, hover }
}

export default function ProfileHeader({ profile, onTour, theme, onToggleTheme }: {
  profile: Profile
  onTour?: () => void
  theme: DashTheme
  onToggleTheme: (x: number, y: number) => void
  accent: string
  onAccent: (name: string) => void
}) {
  const nav = useNavigate()
  const { open, setOpen, pinned, box, hover } = useStackOpen()
  const { t, i18n } = useTranslation()
  const showX = profile.has_x_linked
  const nums: [string, number][] = [
    ...(showX ? ([['Following', profile.following], ['Followers', profile.followers], ['Tweets', profile.tweets]] as [string, number][]) : []),
    ['Views', profile.page_views],
  ]
  return (
    <section id="profile-header">
      <OwnerBadge own />
      {profile.banner_url && (
        <img src={profile.banner_url} alt="" className="mb-2 h-24 w-full rounded-xl object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      )}
      <div className="flex items-start justify-between">
        <img className={`size-20 rounded-full bg-d-light ${profile.banner_url ? 'border-4 border-background -mt-10' : ''}`} src={profile.avatar_url} alt="" />
        <div className="flex items-center">
          <div className="pointer-events-none relative h-9 w-[224px] max-w-full" ref={box}>
          <div
            className={`pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center transition-opacity ${open ? 'pointer-events-none opacity-0 duration-150' : 'opacity-100 delay-100 duration-200'}`}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') hover(true) }}
            onPointerDown={(e) => { if (e.pointerType !== 'mouse') { pinned.current = true; setOpen(true) } }}
          >
            {STACK.map((I, k) => (
              <span key={k} className={`flex size-8 items-center justify-center rounded-full border-2 border-background bg-d-light text-d-text2 ${k ? '-ml-3' : ''}`}><I className="size-4" /></span>
            ))}
            <span className="ml-1.5 text-xs font-medium text-d-text3">+3</span>
          </div>
          <div
            className={`absolute right-0 top-0 flex items-center transition-[opacity,transform] ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'pointer-events-auto translate-x-0 opacity-100 duration-300' : 'pointer-events-none translate-x-2 opacity-0 duration-150'}`}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') hover(true) }}
            onPointerDownCapture={(e) => { pinned.current = e.pointerType !== 'mouse' }}
          >
          {onTour && (
          <Slot><Tip label={t('nb.tour')}>
            <button
              type="button"
              onClick={onTour}
              aria-label={t('nb.tour')}
              data-cuelume-skip
              className="flex size-9 items-center justify-center rounded-full text-d-text2 transition-colors duration-200 hover:text-d-text"
            >
              <Compass className="size-[18px]" />
            </button>
          </Tip></Slot>
          )}
          <Slot><ThemeToggle theme={theme} onToggle={onToggleTheme} /></Slot>
          <Slot><Tip label={t('nb.themeSettings')}>
            <button
              type="button"
              onClick={() => nav('/settings/theme')}
              aria-label={t('nb.openThemeSettings')}
              data-cuelume-skip
              className="flex size-9 items-center justify-center rounded-full text-d-text2 transition-colors duration-200 hover:text-d-text"
            >
              <Palette className="size-[18px]" />
            </button>
          </Tip></Slot>
          <Slot><LanguageSwitcher compact /></Slot>
          <Slot><NotificationBell /></Slot>
          <Slot><Tip label={t('nb.logout')}>
            <button
              type="button"
              onClick={askLogout}
              aria-label={t('nb.logout')}
              data-cuelume-skip
              className="flex size-9 items-center justify-center rounded-full text-d-text2 transition-colors duration-200 hover:text-red-400"
            >
              <LogOut className="size-[18px]" />
            </button>
          </Tip></Slot>
          </div>
        </div>
        </div>
      </div>
      <h1 className="mt-4 font-[family-name:var(--d-serif)] text-2xl font-semibold tracking-tight leading-tight">
        {showX ? profile.name : t('nb.user')}
      </h1>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        {showX && (
          <a href={`https://x.com/${profile.screen_name}`} target="_blank" rel="noopener" title={t('nb.viewOnX')} className="!text-d-text2 hover:!text-d-text">
            @{profile.screen_name}
          </a>
        )}
        {profile.is_developer && <Link to="/dev" className="border border-d-dev px-1.5 text-xs !text-d-dev no-underline">Developer</Link>}
      </div>
      <BioText html={profile.bio_html} />

      {(profile.location || profile.website?.url) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-d-text3">
          {profile.location && <span className="inline-flex items-center gap-1"><i className="bx bx-map" />{profile.location}</span>}
          {profile.website?.url && (
            <a href={profile.website.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 !text-d-text2">
              <i className="bx bx-link" />{profile.website.display_url ?? profile.website.url}
            </a>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-d-text3">{t('nb.joined', { d: joinedLabel(profile.joined, i18n.language) })}</p>
      <dl className="mt-4 grid grid-cols-2 border-t border-d-border text-sm">
        {nums.map(([l, v]) => (
          <div key={l} className="border-b border-d-border py-2">
            <dd className="font-bold tabular-nums">{fmt(v)}</dd>
            <dt className="text-xs text-d-text3">{l}</dt>
          </div>
        ))}
      </dl>
    </section>
  )
}
