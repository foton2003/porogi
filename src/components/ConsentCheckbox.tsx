interface ConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  id: string
}

/** Обязательное согласие на обработку персональных данных для всплывающих форм. */
export default function ConsentCheckbox({ checked, onChange, error, id }: ConsentCheckboxProps) {
  return (
    <div className="mt-4">
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:border-muted-foreground"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 h-5 w-5 shrink-0 accent-[oklch(60%_0.15_155)]"
        />
        <span className="text-xs leading-relaxed text-muted-foreground">
          Я согласен на обработку персональных данных
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
