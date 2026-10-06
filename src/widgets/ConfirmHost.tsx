import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { setConfirmHandler, type ConfirmOptions } from '@/lib/confirm'

// 確認は大きなモーダルではなく、ぼかし背景の上に出る小さなピル(質問+ボタンのみ)
export default function ConfirmHost({ children }: { children: ReactNode }) {
  const { t: tr } = useTranslation()
  const [opt, setOpt] = useState<ConfirmOptions | null>(null)
  const done = useRef<((ok: boolean) => void) | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setConfirmHandler((o, d) => { done.current?.(false); done.current = d; setOpt(o) })
    return () => setConfirmHandler(null)
  }, [])

  const close = (ok: boolean) => { done.current?.(ok); done.current = null; setOpt(null) }

  useEffect(() => {
    if (!opt) return
    cancelRef.current?.focus()
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [opt])

  return (
    <>
      {children}
      {createPortal(
        <AnimatePresence>
          {opt && (
            <motion.div
              className="dash-vars fixed inset-0 z-[100] flex items-center justify-center p-4"
              initial={{ backgroundColor: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' }}
              animate={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
              exit={{ backgroundColor: 'rgba(0,0,0,0)', backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.18 }}
              onMouseDown={(e) => { if (e.target === e.currentTarget) close(false) }}
            >
              <motion.div
                role="alertdialog" aria-label={opt.title}
                className="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-border bg-popover px-5 py-2.5 shadow-2xl"
                initial={{ opacity: 0, scale: 0.9, y: 8, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, y: 4, filter: 'blur(4px)' }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              >
                <span className="text-sm font-medium text-foreground">{opt.title}</span>
                <span className="flex gap-2">
                  <button ref={cancelRef} type="button" onClick={() => close(false)} className="h-8 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground">{tr('lg.cancel')}</button>
                  <button type="button" onClick={() => close(true)} className={`h-8 rounded-full px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 ${opt.destructive === false ? 'bg-primary text-primary-foreground' : 'bg-destructive'}`}>{opt.confirmLabel ?? tr('cm.delete')}</button>
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
