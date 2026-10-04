import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Copy, FolderOpen, Save, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProduct } from "@/lib/product-context"
import type { SavedScenarioRecord, StorageIssue } from "@/lib/saved-scenarios"

function storageMessage(issue: StorageIssue | null, tx: (en: string, tr: string) => string) {
  if (issue === "unavailable") return tx("This browser cannot save right now. Your current scenario still works.", "Bu tarayıcı şu anda kaydedemiyor. Mevcut senaryon çalışmaya devam eder.")
  if (issue === "write-failed") return tx("The browser could not save this change. Check available storage or browser settings.", "Tarayıcı bu değişikliği kaydedemedi. Depolama alanını veya tarayıcı ayarlarını kontrol et.")
  if (issue === "future") return tx("These saved scenarios were created by a newer version. They have not been changed.", "Kayıtlar daha yeni bir sürümde oluşturulmuş. Bu kayıtlar değiştirilmedi.")
  if (issue === "malformed") return tx("Saved data cannot be read. It has not been deleted.", "Kayıtlı veriler okunamıyor. Silinmediler.")
  return tx("This scenario could not be saved. Check its inputs and try again.", "Senaryo kaydedilemedi. Girdileri kontrol edip yeniden dene.")
}

function DialogFrame({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { tx } = useProduct()
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
    <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] bg-background p-5 text-foreground shadow-xl outline-none sm:p-7" aria-describedby={undefined}>
      <div className="flex items-start justify-between gap-4"><DialogPrimitive.Title className="text-[23px] font-semibold tracking-[-.04em]">{title}</DialogPrimitive.Title><Button type="button" size="icon" variant="ghost" aria-label={tx("Close", "Kapat")} onClick={onClose}><X className="size-4" /></Button></div>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
}

export function SaveScenarioDialog({ children, open: controlledOpen, onOpenChange }: { children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { tx, savedScenarios, saveScenario, saveIssue } = useProduct()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const suggestedName = tx(`Scenario ${savedScenarios.length + 1}`, `Senaryo ${savedScenarios.length + 1}`)
  const shown = controlledOpen ?? open
  React.useEffect(() => { if (shown) setName(suggestedName) }, [shown])
  const changeOpen = (next: boolean) => { setOpen(next); onOpenChange?.(next); if (next) setName(suggestedName) }
  return <DialogPrimitive.Root open={shown} onOpenChange={changeOpen}>
    {children && <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>}
    <DialogFrame title={tx("Save scenario", "Senaryoyu kaydet")} onClose={() => changeOpen(false)}>
      <p className="mt-3 text-[13px] leading-5 text-ink-soft">{tx("Saved only in this browser profile. Changes to this scenario will then save automatically.", "Yalnızca bu tarayıcı profiline kaydedilir. Sonraki değişiklikler otomatik kaydedilir.")}</p>
      <label htmlFor="saved-scenario-name" className="mt-6 block text-[12px] font-semibold">{tx("Scenario name", "Senaryo adı")}</label>
      <Input id="saved-scenario-name" value={name} maxLength={80} onChange={event => setName(event.target.value)} className="mt-2" autoFocus />
      {saveIssue && <p role="alert" className="mt-3 text-[12px] text-destructive">{storageMessage(saveIssue, tx)}</p>}
      <div className="mt-6 flex justify-end"><Button type="button" disabled={!name.trim()} onClick={() => { if (saveScenario(name)) changeOpen(false) }}><Save className="size-4" />{tx("Save on this device", "Bu cihaza kaydet")}</Button></div>
    </DialogFrame>
  </DialogPrimitive.Root>
}

export function SavedScenariosDialog({ children, onLoaded, open: controlledOpen, onOpenChange }: { children?: React.ReactNode; onLoaded?: (record: SavedScenarioRecord) => void; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { tx, savedScenarios, activeSavedId, saveIssue, openSavedScenario, renameSavedScenario, duplicateSavedScenario, deleteSavedScenario, deleteAllSavedScenarios } = useProduct()
  const [open, setOpen] = React.useState(false)
  const shown = controlledOpen ?? open
  const changeOpen = (next: boolean) => { setOpen(next); onOpenChange?.(next) }
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)
  const [confirmAll, setConfirmAll] = React.useState(false)
  const openRecord = (record: SavedScenarioRecord) => { if (openSavedScenario(record.id)) { changeOpen(false); onLoaded?.(record) } }
  return <DialogPrimitive.Root open={shown} onOpenChange={changeOpen}>
    {children && <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>}
    <DialogFrame title={tx("Saved scenarios", "Kayıtlı senaryolar")} onClose={() => changeOpen(false)}>
      <p className="mt-2 text-[12px] text-ink-soft">{tx("Stored only in this browser profile.", "Yalnızca bu tarayıcı profilinde saklanır.")}</p>
      {saveIssue && <p role="alert" className="mt-3 text-[12px] text-destructive">{storageMessage(saveIssue, tx)}</p>}
      <div className="mt-5 space-y-3">{savedScenarios.map(record => <div key={record.id} className="rounded-[14px] bg-muted p-4">
        {editingId === record.id ? <div className="flex flex-wrap gap-2"><Input aria-label={tx("Scenario name", "Senaryo adı")} value={name} maxLength={80} onChange={event => setName(event.target.value)} className="min-w-0 flex-1" /><Button size="sm" disabled={!name.trim()} onClick={() => { if (renameSavedScenario(record.id, name)) setEditingId(null) }}>{tx("Save name", "Adı kaydet")}</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{tx("Cancel", "İptal")}</Button></div> : <div className="flex flex-wrap items-center justify-between gap-2"><div><strong className="block text-[14px] font-semibold">{record.name}</strong>{activeSavedId === record.id && <span className="text-[11px] text-primary">{tx("Current", "Açık")}</span>}</div><Button size="sm" variant="outline" onClick={() => openRecord(record)}><FolderOpen className="size-3.5" />{tx("Open", "Aç")}</Button></div>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px]"><button type="button" className="text-primary hover:underline" onClick={() => { setEditingId(record.id); setName(record.name) }}>{tx("Rename", "Yeniden adlandır")}</button><button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={() => duplicateSavedScenario(record.id, tx(`${record.name} (copy)`, `${record.name} (kopya)`))}><Copy className="size-3" />{tx("Duplicate", "Çoğalt")}</button><button type="button" className="inline-flex items-center gap-1 text-destructive hover:underline" onClick={() => setConfirmDelete(record.id)}><Trash2 className="size-3" />{tx("Delete", "Sil")}</button></div>
        {confirmDelete === record.id && <div className="mt-3 rounded-[9px] bg-background p-3 text-[12px]"><p>{tx("Delete this saved copy? The current calculator stays open.", "Bu kayıtlı kopya silinsin mi? Açık hesaplama korunur.")}</p><div className="mt-2 flex gap-2"><Button size="sm" variant="destructive" onClick={() => { if (deleteSavedScenario(record.id)) setConfirmDelete(null) }}>{tx("Delete", "Sil")}</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>{tx("Cancel", "İptal")}</Button></div></div>}
      </div>)}</div>
      {savedScenarios.length === 0 && <p className="mt-5 rounded-[12px] bg-muted p-4 text-[13px] text-ink-soft">{tx("No saved scenarios in this browser.", "Bu tarayıcıda kayıtlı senaryo yok.")}</p>}
      {(savedScenarios.length > 0 || saveIssue === "malformed" || saveIssue === "future") && <div className="mt-6"><button type="button" className="text-[12px] font-medium text-destructive hover:underline" onClick={() => setConfirmAll(true)}>{tx("Delete all saved scenarios", "Tüm kayıtlı senaryoları sil")}</button>{confirmAll && <div className="mt-3 rounded-[9px] bg-muted p-3 text-[12px]"><p>{tx("Delete every saved scenario in this browser? This cannot be undone.", "Bu tarayıcıdaki tüm kayıtlı senaryolar silinsin mi? İşlem geri alınamaz.")}</p><div className="mt-2 flex gap-2"><Button size="sm" variant="destructive" onClick={() => { if (deleteAllSavedScenarios()) setConfirmAll(false) }}>{tx("Delete all", "Tümünü sil")}</Button><Button size="sm" variant="ghost" onClick={() => setConfirmAll(false)}>{tx("Cancel", "İptal")}</Button></div></div>}</div>}
    </DialogFrame>
  </DialogPrimitive.Root>
}
