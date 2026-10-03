import * as React from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useProduct } from "@/lib/product-context"

type Locale = "en-US" | "tr-TR"

function separators(locale: Locale) {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
  return {
    group: parts.find(part => part.type === "group")?.value ?? ",",
    decimal: parts.find(part => part.type === "decimal")?.value ?? ".",
  }
}

function normalize(text: string, locale: Locale, decimals: boolean) {
  const { group, decimal } = separators(locale)
  const cleaned = text.replace(/[\s\u00a0\u202f₺%]/g, "").replace(/[^\d.,-]/g, "")
  const sign = cleaned.startsWith("-") ? "-" : ""
  const digits = cleaned.replace(/-/g, "")
  if (!decimals) return sign + digits.replace(/[.,]/g, "")
  const lastDot = digits.lastIndexOf(".")
  const lastComma = digits.lastIndexOf(",")
  let mark = ""
  if (lastDot >= 0 && lastComma >= 0) mark = lastDot > lastComma ? "." : ","
  else if (digits.includes(decimal)) mark = decimal
  else if (digits.includes(group)) {
    const pieces = digits.split(group)
    if (pieces.length === 2 && pieces[1].length < 3) mark = group
  }
  if (!mark) return sign + digits.replace(/[.,]/g, "")
  const index = digits.lastIndexOf(mark)
  return sign + digits.slice(0, index).replace(/[.,]/g, "") + "." + digits.slice(index + 1).replace(/[.,]/g, "")
}

function display(text: string, locale: Locale, decimals: boolean) {
  const normalized = normalize(text, locale, decimals)
  if (!normalized || normalized === "-") return normalized
  const sign = normalized.startsWith("-") ? "-" : ""
  const [integer, fraction] = (sign ? normalized.slice(1) : normalized).split(".")
  const grouped = integer ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(integer)) : "0"
  return sign + grouped + (fraction !== undefined ? separators(locale).decimal + fraction : "")
}

function formatEdit(text: string, caret: number, locale: Locale, decimals: boolean) {
  const rank = [...text.slice(0, caret)].filter(char => /\d/.test(char)).length
  const formatted = display(text, locale, decimals)
  let nextCaret = 0
  let seen = 0
  while (nextCaret < formatted.length && seen < rank) {
    if (/\d/.test(formatted[nextCaret])) seen++
    nextCaret++
  }
  if (rank && formatted[nextCaret] === separators(locale).group) nextCaret++
  if (decimals && /[.,]$/.test(text.slice(0, caret)) && formatted[nextCaret] === separators(locale).decimal) nextCaret++
  return { formatted, nextCaret }
}

type FinancialInputProps = {
  id: string
  label: string
  value: number
  onValueChange: (value: number) => void
  locale?: Locale
  className?: string
  disabled?: boolean
  invalid?: boolean
  hideLabel?: boolean
  emptyWhenZero?: boolean
  min?: number
  max?: number
}

function FinancialInput({ id, label, value, onValueChange, locale, className, disabled, invalid, hideLabel, emptyWhenZero, min, max, decimals, unit }: FinancialInputProps & { decimals: boolean; unit: string }) {
  const { language } = useProduct()
  locale ??= language === "tr" ? "tr-TR" : "en-US"
  const inputRef = React.useRef<HTMLInputElement>(null)
  const pendingCaret = React.useRef<number | null>(null)
  const lastValue = React.useRef(value)
  const lastLocale = React.useRef(locale)
  const [text, setText] = React.useState(() => emptyWhenZero && value === 0 ? "" : display(String(value), locale, decimals))

  React.useLayoutEffect(() => {
    if (lastValue.current !== value || lastLocale.current !== locale) {
      lastValue.current = value
      lastLocale.current = locale
      setText(emptyWhenZero && value === 0 ? "" : display(String(value), locale, decimals))
    }
  }, [value, locale, decimals, emptyWhenZero])

  React.useLayoutEffect(() => {
    const input = inputRef.current
    if (pendingCaret.current !== null && input && input === document.activeElement) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [text])

  return <Field className={className}>
    <FieldLabel htmlFor={id} className={hideLabel ? "sr-only" : "text-[12px] font-semibold text-ink-soft"}>{label}</FieldLabel>
    <InputGroup className="shadow-none">
      <InputGroupInput
        ref={inputRef}
        id={id}
        value={text}
        onChange={event => {
          const next = formatEdit(event.target.value, event.target.selectionStart ?? event.target.value.length, locale, decimals)
          const normalized = normalize(next.formatted, locale, decimals)
          const raw = Number(normalized)
          const finite = Number.isFinite(raw) ? raw : 0
          const bounded = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, finite))
          const nextText = bounded === finite ? next.formatted : display(String(bounded), locale, decimals)
          pendingCaret.current = bounded === finite ? next.nextCaret : nextText.length
          lastValue.current = bounded
          setText(nextText)
          onValueChange(lastValue.current)
        }}
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className="font-semibold tabular-nums"
      />
      <InputGroupAddon align={decimals ? "inline-end" : "inline-start"} className="text-[12px] font-medium text-muted-foreground">{unit}</InputGroupAddon>
    </InputGroup>
  </Field>
}

export function MoneyInput(props: FinancialInputProps) {
  return <FinancialInput {...props} decimals={false} unit="₺" />
}

export function PercentInput(props: FinancialInputProps) {
  return <FinancialInput {...props} decimals unit="%" />
}
