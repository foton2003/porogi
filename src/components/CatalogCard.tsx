import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@lork/sdk'
import {
  ARCH_DIRECTIONS,
  MATERIALS,
  archDirectionLabel,
  archDirectionTitle,
  basePriceFor,
  formatPrice,
  kitsFor,
  linePrice,
  needsArchDirection,
  type Part,
} from '@/data/catalog'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import { getCallbackProfile, markContact, onCallbackEvent, rememberCallbackProfile } from '@/lib/callbackScript'

function createOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${stamp}-${random}`
}

interface CatalogCardProps {
  part: Part
}

/** Карточка товара в каталоге с действиями «Выбрать комплектацию», «Купить в 1 клик» и «Консультация». */
export default function CatalogCard({ part }: CatalogCardProps) {
  const navigate = useNavigate()

  const material = MATERIALS[0]
  const kit = useMemo(() => kitsFor(part.type)[0], [part.type])
  const showDirection = needsArchDirection(part)
  const price = linePrice(part, material.id, kit.id)
  const basePrice = basePriceFor(part, material.id)

  const [quickOpen, setQuickOpen] = useState(false)
  const [quickPhone, setQuickPhone] = useState('')
  const [quickError, setQuickError] = useState('')
  const [quickSending, setQuickSending] = useState(false)
  const [quickSent, setQuickSent] = useState(false)
  const [quickConsent, setQuickConsent] = useState(false)

  /* Отправка любой формы отключает скрипт обратного звонка. */
  useEffect(() => {
    if (quickSent) markContact()
  }, [quickSent])

  const [callOpen, setCallOpen] = useState(false)

  /* Скрипт обратного звонка: показывает форму на первом визите по таймеру
     или при попытке закрыть сайт; данные из Cookie подставляются в форму. */
  useEffect(() => {
    let cancelled = false
    const onShown = () => {
      if (cancelled) return
      const profile = getCallbackProfile()
      if (profile.name) setCallName(profile.name)
      if (profile.phone) setCallPhone(profile.phone.replace(/^\+7/, ''))
      setCallOpen(true)
      setCallError('')
      setCallSent(false)
      setCallConsent(false)
    }
    const off = onCallbackEvent((event) => {
      if (event.type === 'callback-form-shown') onShown()
    })
    return () => {
      cancelled = true
      off()
    }
  }, [])

  const [callName, setCallName] = useState('')
  const [callPhone, setCallPhone] = useState('')
  const [callError, setCallError] = useState('')
  const [callSending, setCallSending] = useState(false)
  const [callSent, setCallSent] = useState(false)
  const [callConsent, setCallConsent] = useState(false)

  const openQuick = () => {
    setQuickOpen(true)
    setQuickError('')
    setQuickSent(false)
    setQuickConsent(false)
  }

  const closeQuick = () => {
    setQuickOpen(false)
    setQuickError('')
    setQuickConsent(false)
  }

  const handleQuickPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').replace(/^7/, '').slice(0, 10)
    setQuickPhone(digits)
  }

  const submitQuick = async (event: FormEvent) => {
    event.preventDefault()
    if (quickSending) return
    if (quickPhone.length !== 10) {
      setQuickError('Введите номер телефона полностью: +7 и 10 цифр.')
      return
    }
    if (!quickConsent) {
      setQuickError('Отметьте согласие на обработку персональных данных.')
      return
    }
    setQuickError('')
    setQuickSending(true)
    try {
      const { error } = await db.from('orders_public').insert({
        order_number: createOrderNumber(),
        customer_name: 'Заказ в 1 клик',
        phone: `+7${quickPhone}`,
        city: '—',
        comment: `Заказ в 1 клик из каталога: ${part.title}${showDirection ? ` · Направление: ${archDirectionLabel()}` : ''} (арт. ${part.sku}) · Материал: ${material.label} · Комплектация: ${kit.label} · ${formatPrice(price)}\nСтраница: ${window.location.href}`,
        items: [
          {
            partId: part.id,
            title: archDirectionTitle(part),
            sku: part.sku,
            material: material.label,
            kit: kit.label,
            direction: showDirection ? archDirectionLabel() : null,
            qty: 1,
            unitPrice: price,
            sum: price,
          },
        ],
        total: price,
        status: 'new',
        consent_pdn: true,
      })
      if (error) throw error
      setQuickSent(true)
      setQuickPhone('')
      setQuickConsent(false)
      rememberCallbackProfile({ phone: `+7${quickPhone}` })
      markContact()
    } catch {
      setQuickError('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setQuickSending(false)
    }
  }

  const openCall = () => {
    setCallOpen(true)
    setCallError('')
    setCallSent(false)
    setCallConsent(false)
  }

  const closeCall = () => {
    setCallOpen(false)
    setCallError('')
    setCallConsent(false)
  }

  const handleCallPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').replace(/^7/, '').slice(0, 10)
    setCallPhone(digits)
  }

  const submitCall = async (event: FormEvent) => {
    event.preventDefault()
    if (callSending) return
    const name = callName.trim()
    if (name.length < 2) {
      setCallError('Укажите имя — минимум 2 символа.')
      return
    }
    if (callPhone.length !== 10) {
      setCallError('Введите номер телефона полностью: +7 и 10 цифр.')
      return
    }
    if (!callConsent) {
      setCallError('Отметьте согласие на обработку персональных данных.')
      return
    }
    setCallError('')
    setCallSending(true)
    try {
      const { error } = await db.from('orders_public').insert({
        order_number: 'CALLBACK',
        customer_name: name,
        phone: `+7${callPhone}`,
        city: '—',
        comment: `Консультация по товару из каталога: ${part.title} (арт. ${part.sku}).\nСтраница: ${window.location.href}`,
        items: [],
        total: 0,
        status: 'callback',
        consent_pdn: true,
      })
      if (error) throw error
      setCallSent(true)
      setCallName('')
      setCallPhone('')
      setCallConsent(false)
      rememberCallbackProfile({ name, phone: `+7${callPhone}` })
      markContact()
    } catch {
      setCallError('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setCallSending(false)
    }
  }

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-accent">
      <Link to={`/product/${part.id}`} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-surface">
          <img
            src={part.images[0]}
            alt={part.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{part.type}</span>
            <span>Арт. {part.sku}</span>
          </div>
          <h2 className="mt-1 font-semibold leading-snug">{part.title}</h2>
          <div className="mt-1 text-sm text-muted-foreground">
            {part.vehicle.generation} · Кузов: {part.body}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-bold text-accent">от {formatPrice(basePrice)}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {part.side}
            </span>
          </div>
        </div>
      </Link>

      <div className="grid gap-2 border-t border-border p-4 pt-3">
        <button
          type="button"
          onClick={() => navigate(`/product/${part.id}`)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Выбрать комплектацию
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openQuick}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#7dd3fc] bg-[#e0f2fe] px-3 text-sm font-medium text-[#0369a1] transition-colors hover:border-[#38bdf8] hover:bg-[#bae6fd]"
          >
            Купить в 1 клик
          </button>
          <button
            type="button"
            onClick={openCall}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Консультация
          </button>
        </div>
      </div>

      {quickOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`quick-order-title-${part.id}`}
          onClick={closeQuick}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {quickSent ? (
              <div>
                <h2 id={`quick-order-title-${part.id}`} className="text-xl font-bold tracking-tight">
                  Заявка отправлена
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Сейчас перезвоним, уточним детали и оформим заказ ☎️
                </p>
                <button
                  type="button"
                  onClick={closeQuick}
                  className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={submitQuick} noValidate>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`quick-order-title-${part.id}`} className="text-xl font-bold tracking-tight">
                      Заказ в 1 клик
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Сейчас перезвоним, уточним детали и оформим заказ ☎️
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeQuick}
                    aria-label="Закрыть форму"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm">
                  <div className="font-medium">{archDirectionTitle(part)}</div>
                  <div className="mt-1 text-muted-foreground">
                    {showDirection ? `Направление: ${archDirectionLabel()} · ` : ''}
                    Материал: {material.label} · Комплектация: {kit.label}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Арт. {part.sku}</span>
                    <span className="font-semibold text-accent">{formatPrice(price)}</span>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-medium">Номер телефона</span>
                  <div className="flex h-11 w-full overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                    <span className="flex items-center border-r border-input bg-secondary px-3 text-sm font-medium text-muted-foreground">
                      +7
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={quickPhone
                        .replace(/(\d{3})(?=\d)/g, '$1 ')
                        .replace(/(\d{3}) (\d{3})(?=\d)/g, '$1 $2 ')}
                      onChange={(event) => handleQuickPhone(event.target.value)}
                      placeholder="(999) 123-45-67"
                      aria-label="Номер телефона, начинается с +7"
                      className="h-full w-full bg-transparent px-3 text-base outline-none"
                    />
                  </div>
                </label>

                {quickError && (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {quickError}
                  </p>
                )}

                <ConsentCheckbox
                  id={`quick-consent-${part.id}`}
                  checked={quickConsent}
                  onChange={(checked) => {
                    setQuickConsent(checked)
                    if (checked)
                      setQuickError((current) =>
                        current === 'Отметьте согласие на обработку персональных данных.' ? '' : current,
                      )
                  }}
                />

                <button
                  type="submit"
                  disabled={quickSending}
                  className="mt-5 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                >
                  {quickSending ? 'Отправляем…' : 'Отправить заявку'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {callOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`consultation-title-${part.id}`}
          onClick={closeCall}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {callSent ? (
              <div>
                <h2 id={`consultation-title-${part.id}`} className="text-xl font-bold tracking-tight">
                  Заявка отправлена
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Быстро перезвоним и поможем.
                </p>
                <button
                  type="button"
                  onClick={closeCall}
                  className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={submitCall} noValidate>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id={`consultation-title-${part.id}`} className="text-xl font-bold tracking-tight">
                      Быстро перезвоним и поможем
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Оставьте имя и номер телефона — свяжемся с вами.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCall}
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
                    value={callName}
                    onChange={(event) => setCallName(event.target.value)}
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
                      value={callPhone
                        .replace(/(\d{3})(?=\d)/g, '$1 ')
                        .replace(/(\d{3}) (\d{3})(?=\d)/g, '$1 $2 ')}
                      onChange={(event) => handleCallPhone(event.target.value)}
                      placeholder="(999) 123-45-67"
                      aria-label="Номер телефона, начинается с +7"
                      className="h-full w-full bg-transparent px-3 text-base outline-none"
                    />
                  </div>
                </label>

                {callError && (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {callError}
                  </p>
                )}

                <ConsentCheckbox
                  id={`consultation-consent-${part.id}`}
                  checked={callConsent}
                  onChange={(checked) => {
                    setCallConsent(checked)
                    if (checked)
                      setCallError((current) =>
                        current === 'Отметьте согласие на обработку персональных данных.' ? '' : current,
                      )
                  }}
                />

                <button
                  type="submit"
                  disabled={callSending}
                  className="mt-5 w-full rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                >
                  {callSending ? 'Отправляем…' : 'Отправить заявку'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
