import type { LucideIcon } from 'lucide-react'

const O = (x: string) => `group-hover/ic:${x} group-has-[:focus-visible]/ic:${x} group-has-[[data-popup-open]]/ic:${x} [@media(hover:none)_and_(pointer:coarse)]:${x}`
// 普段は丸いアイコンを重ねた小さなチップにし、ホバー/キーボード操作/ポップアップ表示中は中身を展開する(CSS のみ・状態なし)
export default function IconStack({ chips, total, children }: { chips: LucideIcon[]; total?: number; children: React.ReactNode }) {
  return (
    <div className="group/ic relative h-9 w-[224px] max-w-full">
      <div className={`absolute right-3 top-1/2 flex -translate-y-1/2 items-center opacity-100 transition-opacity duration-150 ${O('opacity-0')} ${O('pointer-events-none')}`}>
        {chips.map((I, k) => (
          <span key={k} className={`flex size-8 items-center justify-center rounded-full border-2 border-background bg-d-light text-d-text2 ${k ? '-ml-3' : ''}`}><I className="size-4" /></span>
        ))}
        <span className="ml-1.5 text-xs font-medium text-d-text3">+{Math.max(0, (total ?? chips.length + 3) - chips.length)}</span>
      </div>
      <div className={`pointer-events-none absolute right-0 top-0 flex translate-x-2 items-center opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${O('pointer-events-auto')} ${O('translate-x-0')} ${O('opacity-100')}`}>
        {children}
      </div>
    </div>
  )
}
