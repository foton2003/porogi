import { useEffect, useState, type FormEvent } from 'react'
import { db } from '@lork/sdk'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import {
  CALLBACK_COOKIES,
  dismissCallback,
  getCallbackProfile,
  markContact,
  onCallbackEvent,
  readCookie,
  rememberCallbackProfile,
  writeCookie,
} from '@/lib/callbackScript'

/** Адаптация формы под данные из Cookie: подпись и введённые ранее значения. */
function promptFromCookie(): string {
  const raw = readCookie(CALLBACK_COOKIES.prompt)
  if (raw && raw.trim()) return raw.trim().slice(0, 160)
  const profile = getCallbackProfile()
  const parts: string[] = []
  if (profile.viewed && profile.viewed.length > 0) {
    const viewed = profile.viewed[0]
    parts.push(viewed.sku ? `${viewed.title} (арт. ${viewed.sku})` : viewed.title)
  }
  if (profile.name) parts.push(`Вы оставляли имя: ${profile.name}`)
  if (profile.phone) parts.push(`Ваш телефон: ${profile.phone}`)
  return parts.join(' · ')
}

/** Записывает Cookie (используется, когда браузер запретил стандартную запись). */
function forceCookie(name: string, value: string): void {
  writeCookie(name, value)
}

/**
 * Скрипт вызова формы обратного звонка: показывает форму на первом визите
 * через 30 секунд без отправленной формы и без клика по телефону либо при
 * попытке закрыть сайт. Данные из Cookie подставляются в форму.
 */
export default function CallbackScript() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [consent, setConsent] = useState(false)

  /* Фиксируем сам факт визита до запуска таймера: canShow() читает seen,
     поэтому запись идёт сразу, а сам показ зависит от promptShown/contact/
     dismissed, которые ставятся позже. */
  useEffect(() => {
    import('@/lib/callbackScript').then(({ markSeen }) => markSeen())
  }, [])

  /* Открываем форму по событию скрипта (таймер или попытка закрыть сайт). */
  useEffect(() => {
    const off = onCallbackEvent((event) => {
      if (event.type !== 'callback-form-shown') return
      const profile = getCallbackProfile()
      setPrompt(promptFromCookie())
      setName(profile.name ?? '')
      setPhone(profile.phone ? profile.phone.replace(/^\+7/, '') : '')
      setError('')
      setSent(false)
      setConsent(false)
      setOpen(true)
    })
    return off
  }, [])

  /* Таймер показа: 30 секунд (или интервал из Cookie) без контакта. */
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (cancelled) return
      import('@/lib/callbackScript').then(({ canShow, showCallback }) => {
        if (!cancelled && canShow()) showCallback('timer')
      })
    }, 30_000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  /* Попытка закрыть сайт: свернул вкладку, ушёл на другую страницу. */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        import('@/lib/callbackScript').then(({ canShow, showCallback }) => {
          if (canShow()) showCallback('exit')
        })
      }
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  const close = () => {
    setOpen(false)
    dismissCallback()
  }

  const handlePhone = (value: string) => {
    const digits = value.replace(/\D/g, '').replace(/^7/, '').slice(0, 10)
    setPhone(digits)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending) return
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Укажите имя — минимум 2 символа.')
      return
    }
    if (phone.length !== 10) {
      setError('Введите номер телефона полностью: +7 и 10 цифр.')
      return
    }
    if (!consent) {
      setError('Отметьте согласие на обработку персональных данных.')
      return
    }
    const fullPhone = `+7${phone}`
    setError('')
    setSending(true)
    try {
      const { error: insertError } = await db.from('orders_public').insert({
        order_number: 'CALLBACK',
        customer_name: trimmedName,
        phone: fullPhone,
        city: '—',
        comment: `Обратный звонок (скрипт первого визита: ${readCookie(CALLBACK_COOKIES.prompt) || '30 секунд'}).${prompt ? `\nПодпись: ${prompt}` : ''}\nСтраница: ${window.location.href}`,
        items: [],
        total: 0,
        status: 'callback',
        consent_pdn: true,
      })
      if (insertError) throw insertError
      markContact()
      rememberCallbackProfile({ name: trimmedName, phone: fullPhone })
      forceCookie(CALLBACK_COOKIES.prompt, '')
      setSent(true)
    } catch {
      setError('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="callback-script-title"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {sent ? (
          <div>
            <h2 id="callback-script-title" className="text-xl font-bold tracking-tight">
              Заявка отправлена
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Быстро перезвоним и поможем.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="callback-script-title" className="text-xl font-bold tracking-tight">
                  Быстро перезвоним и поможем
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Оставьте имя и номер телефона — свяжемся с вами.
                </p>
                {prompt && (
                  <p className="mt-2 rounded-md border border-border bg-secondary p-2 text-xs text-muted-foreground">
                    {prompt}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть форму"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium">Ваше имя</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Как к вам обращаться"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Номер телефона</span>
              <div className="flex h-11 w-full overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center border-r border-input bg-secondary px-3 text-sm font-medium text-muted-foreground">
                  +7
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone
                    .replace(/(\d{3})(?=\d)/g, '$1 ')
                    .replace(/(\d{3}) (\d{3})(?=\d)/g, '$1 $2 ')}
                  onChange={(event) => handlePhone(event.target.value)}
                  placeholder="(999) 123-45-67"
                  aria-label="Номер телефона, начинается с +7"
                  className="h-full w-full bg-transparent px-3 text-base outline-none"
                />
              </div>
            </label>

            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <ConsentCheckbox
              id="callback-script-consent"
              checked={consent}
              onChange={(checked) => {
                setConsent(checked)
                if (checked)
                  setError((current) =>
                    current === 'Отметьте согласие на обработку персональных данных.'
                      ? ''
                      : current,
                  )
              }}
            />

            <button
              type="submit"
              disabled={sending}
              className="mt-5 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
            >
              {sending ? 'Отправляем…' : 'Отправить заявку'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
