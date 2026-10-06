import { ConfirmPill } from './confirm-pill'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog"
import { HoldToDeleteButton } from "@/components/ui/hold-to-delete-button"
import { Button } from "@/components/ui/button"

/** 確認ダイアログ。confirm() の代わりに使う(Arc Dialog) */
function ConfirmDialog({
  open, onOpenChange, title, confirmLabel, destructive = true, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}) {
  return <ConfirmPill open={open} title={title} confirmLabel={confirmLabel} destructive={destructive}
    onCancel={() => onOpenChange(false)} onConfirm={async () => { await onConfirm(); onOpenChange(false) }} />
}

export { ConfirmDialog }
