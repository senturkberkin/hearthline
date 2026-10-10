import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function FieldInfo({ label, children, align = "start" }: { label: string; children: ReactNode; align?: "start" | "center" | "end" }) {
  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label={label} className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Info aria-hidden="true" className="size-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent align={align} sideOffset={6} className="w-[min(290px,calc(100vw-32px))] p-4 text-[12px] leading-5">
      {children}
    </PopoverContent>
  </Popover>
}

export function FieldInfoLabel({ children, info, infoLabel }: { children: ReactNode; info: ReactNode; infoLabel: string }) {
  return <span className="inline-flex items-center gap-1">
    <span>{children}</span>
    <FieldInfo label={infoLabel}>{info}</FieldInfo>
  </span>
}
