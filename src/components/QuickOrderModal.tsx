import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { db } from '@lork/sdk'
import {
  ARCH_DIRECTIONS,
  MATERIALS,
  archDirectionTitle,
  formatPrice,
  isFoam,
  kitsFor,
  linePrice,
  needsArchDirection,
  type Part,
} from '@/data/catalog'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import { markContact, rememberCallbackProfile } from '@/lib/callbackScript'
import { sendUisLead } from '@/lib/uisLead'

function createOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${stamp}-${random}`
}

interface QuickOrderModalProps {
  part: Part
  onClose: () => void
}

/** Форма «Заказ в 1 клик» для карточек популярных товаров на главной.
    Комплектация базовая — та же цена, что показана на карточке. */
export default function QuickOrderModal({ part, onClose }: QuickOrderModalProps) {
  const foam = isFoam(part)
  const material = MATERIALS[0]
  const kit = useMemo(() => kitsFor(part.type, part.foamKind)[0], [part.type, part.foamKind])
  const showDirection = needsArchDirection(part)
  const price = linePrice(part, material.id, kit.id)

  const [phone, setPhone] = useState('')
  const [direction, setDirection] = useState<'front' | 'rear' | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  /* Отправка любой формы отключает скрипт обратного звонка. */
  useEffect(() => {
    if (sent) markContact()
  }, [sent])

  const handlePhone = (value: string) => {
    const digits = value.replace(/\D/g, '').replace(/^7/, '').slice(0, 10)
    setPhone(digits)
  }

  const title = showDirection
    ? direction
      ? archDirectionTitle(part, direction)
      : part.title
    : archDirectionTitle(part)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending) return
    if (showDirection && !direction) {
      setError('Выберите направление арки: передняя или задняя.')
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
    const directionLabel = showDirection && direction ? ARCH_DIRECTIONS.find((item) => item.id === direction)?.label : null
    const comment = `Заказ в 1 клик с главной страницы: ${title} (арт. ${part.sku}) · ${
      foam ? 'Фиксированная цена' : `Материал: ${material.label} · Комплектация: ${kit.label}`
    }${directionLabel ? ` · Направление: ${directionLabel}` : ''} · ${formatPrice(price)}\nСтраница: ${window.location.href}`
    setError('')
    setSending(true)
    try {
      const { error: insertError } = await db.from('orders_public').insert({
        order_number: createOrderNumber(),
        customer_name: 'Заказ в 1 клик',
        phone: fullPhone,
        city: '—',
        comment,
        items: [
          {
            partId: part.id,
            title,
            sku: part.sku,
            material: foam ? '—' : material.label,
            kit: foam ? 'Стандарт' : kit.label,
            direction: directionLabel ?? null,
            qty: 1,
            unitPrice: price,
            sum: price,
          },
        ],
        total: price,
        status: 'new',
        consent_pdn: true,
      })
      if (insertError) throw insertError
      /* Заявка сохранена — передаём её в UIS; сбой UIS не влияет на отправку. */
      void sendUisLead({ phone: fullPhone, message: comment })
      setSent(true)
      setPhone('')
      setConsent(false)
      rememberCallbackProfile({ phone: fullPhone })
    } catch {
      setError('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-quick-order-title"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        {sent ? (
          <div>
            <h2 id="home-quick-order-title" className="text-xl font-bold tracking-tight">
              Заявка отправлена
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Сейчас перезвоним, уточним детали и оформим заказ ☎️
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="home-quick-order-title" className="text-xl font-bold tracking-tight">
                  Заказ в 1 клик
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Сейчас перезвоним, уточним детали и оформим заказ ☎️
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть форму"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm">
              <div className="font-medium">{title}</div>
              <div className="mt-1 text-muted-foreground">
                {foam
                  ? 'Фиксированная цена'
                  : `Материал: ${material.label} · Комплектация: ${kit.label}`}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Арт. {part.sku}</span>
                <span className="font-semibold text-accent">{formatPrice(price)}</span>
              </div>
            </div>

            {showDirection && (
              <fieldset className="mt-4">
                <legend className="mb-1.5 block text-sm font-medium">Направление арки</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ARCH_DIRECTIONS.map((item) => (
                    <label
                      key={item.id}
                      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                        direction === item.id
                          ? 'border-[#38bdf8] bg-[#bae6fd] text-[#0369a1]'
                          : 'border-border bg-background hover:border-accent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="home-arch-direction"
                        value={item.id}
                        checked={direction === item.id}
                        onChange={() => {
                          setDirection(item.id)
                          setError((current) =>
                            current === 'Выберите направление арки: передняя или задняя.'
                              ? ''
                              : current,
                          )
                        }}
                        className="sr-only"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Номер телефона</span>
              <div className="flex h-11 w-full overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                <span className="flex items-center border-r border-input bg-secondary px-3 text-sm font-medium text-muted-foreground">
                  +7
                </span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={[phone.slice(0, 3), phone.slice(3, 6), phone.slice(6, 8), phone.slice(8, 10)]
                    .filter(Boolean)
                    .join(' ')}
                  onChange={(event) => handlePhone(event.target.value)}
                  placeholder="999 123 45 67"
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
              id="home-quick-consent"
              checked={consent}
              onChange={(checked) => {
                setConsent(checked)
                if (checked)
                  setError((current) =>
                    current === 'Отметьте согласие на обработку персональных данных.' ? '' : current,
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
