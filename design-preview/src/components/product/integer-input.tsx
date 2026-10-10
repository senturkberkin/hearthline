import * as React from "react"
import { Input } from "@/components/ui/input"

export function IntegerInput({ id, value, onValueChange, min, max }: { id: string; value: number; onValueChange: (value: number) => void; min: number; max: number }) {
  const [text, setText] = React.useState(() => String(value))
  const isEditing = React.useRef(false)
  const normalize = (raw: string) => Math.min(max, Math.max(min, Math.round(Number(raw))))

  React.useEffect(() => {
    if (!isEditing.current) setText(String(value))
  }, [value])

  return <Input
    id={id}
    type="number"
    inputMode="numeric"
    min={min}
    max={max}
    value={text}
    onFocus={() => { isEditing.current = true }}
    onChange={event => {
      const raw = event.target.value
      setText(raw)
      if (raw === "") return
      const next = normalize(raw)
      if (Number.isFinite(next)) onValueChange(next)
    }}
    onBlur={() => {
      isEditing.current = false
      if (text === "") { setText(String(value)); return }
      const next = normalize(text)
      setText(String(next))
      if (next !== value) onValueChange(next)
    }}
  />
}
