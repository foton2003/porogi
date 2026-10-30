import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '@lork/sdk'
import {
  ARCH_DIRECTIONS,
  FOAM_TAILGATE_OLD_PRICE,
  MATERIALS,
  archDirectionLabel,
  archDirectionTitle,
  basePriceFor,
  foamTitle,
  formatPrice,
  isFoam,
  isSchemeImage,
  kitsFor,
  linePrice,
  needsArchDirection,
  type Part,
} from '@/data/catalog'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import ImageLightbox from '@/components/ImageLightbox'
import { markContact, rememberCallbackProfile } from '@/lib/callbackScript'
import { sendUisLead } from '@/lib/uisLead'

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
  const foam = isFoam(part)
  /* У пенок фиксированная цена, материал и направление не выбираются. */
  const material = MATERIALS[0]
  const kit = useMemo(() => kitsFor(part.type, part.foamKind)[0], [part.type, part.foamKind])
  const showDirection = needsArchDirection(part)
  const price = linePrice(part, material.id, kit.id)
  const basePrice = basePriceFor(part, material.id)
  const oldPrice =
    part.foamKind === 'foam-tailgate' ? FOAM_TAILGATE_OLD_PRICE : null
  const badge = part.foamKind ? foamTitle(part.foamKind) : part.type
  const [lightboxOpen, setLightboxOpen] = useState(false)

  /* Микроразметка Schema.org (JSON-LD) для карточки товара в каталоге.
     Видимая цена на карточке — «от» (базовая), в разметке — та же. */
  const productSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: part.title,
      sku: part.sku,
      description: part.description,
      image: part.images,
      brand: { '@type': 'Brand', name: part.vehicle.brand },
      manufacturer: { '@type': 'Organization', name: 'Магазин кузовных порогов и арок' },
      category: part.foamKind ? foamTitle(part.foamKind) : part.type,
      offers: {
        '@type': 'Offer',
        url: `${window.location.origin}/product/${part.id}`,
        priceCurrency: 'RUB',
        price: basePrice,
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Магазин кузовных порогов и арок' },
      },
    }),
    [part, basePrice],
  )

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(productSchema)
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
  }, [productSchema])

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
      const phone = `+7${quickPhone}`
      const comment = `Заказ в 1 клик из каталога: ${part.title}${showDirection ? ` · Направление: ${archDirectionLabel()}` : ''} (арт. ${part.sku}) · ${foam ? 'Фиксированная цена' : `Материал: ${material.label} · Комплектация: ${kit.label}`} · ${formatPrice(price)}\nСтраница: ${window.location.href}`
      const { error } = await db.from('orders_public').insert({
        order_number: createOrderNumber(),
        customer_name: 'Заказ в 1 клик',
        phone,
        city: '—',
        comment,
        items: [
          {
            partId: part.id,
            title: archDirectionTitle(part),
            sku: part.sku,
            material: foam ? '—' : material.label,
            kit: foam ? 'Стандарт' : kit.label,
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
      /* Заявка сохранена — передаём её в UIS; сбой UIS не влияет на отправку. */
      void sendUisLead({ phone, message: comment })
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
    const phone = `+7${callPhone}`
    const comment = `Консультация по товару из каталога: ${part.title} (арт. ${part.sku}).\nСтраница: ${window.location.href}`
    setCallError('')
    setCallSending(true)
    try {
      const { error } = await db.from('orders_public').insert({
        order_number: 'CALLBACK',
        customer_name: name,
        phone,
        city: '—',
        comment,
        items: [],
        total: 0,
        status: 'callback',
        consent_pdn: true,
      })
      if (error) throw error
      /* Заявка сохранена — передаём её в UIS; сбой UIS не влияет на отправку. */
      void sendUisLead({ name, phone, message: comment })
      setCallSent(true)
      setCallName('')
      setCallPhone('')
      setCallConsent(false)
      rememberCallbackProfile({ name, phone })
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
          {/* Фото любого товара открывается в лайтбоксе, не переходя по ссылке карточки. */}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setLightboxOpen(true)
            }}
            className="block h-full w-full cursor-zoom-in"
            aria-label={`Увеличить фото: ${part.title}`}
          >
            <img
              src={part.images[0]}
              alt={
                isSchemeImage(part.images[0])
                  ? `${part.title} — схема зоны установки`
                  : part.title
              }
              className={
                isSchemeImage(part.images[0])
                  ? 'h-full w-full object-contain p-3'
                  : `h-full w-full object-cover${
                      foam ? '' : ' transition-transform duration-300 group-hover:scale-105'
                    }`
              }
              loading="lazy"
            />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span>{badge}</span>
            <span>Арт. {part.sku}</span>
          </div>
          <h2 className="mt-1 font-semibold leading-snug">{part.title}</h2>
          <div className="mt-1 text-sm text-muted-foreground">
            {part.vehicle.generation} · Кузов: {part.body}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            {oldPrice ? (
              /* Старая цена зачёркивается, рядом — плашка со скидкой. */
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-accent">{formatPrice(basePrice)}</span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(oldPrice)}
                </span>
                <span className="rounded-full bg-[#dc2626] px-2 py-0.5 text-xs font-semibold text-white">
                  Скидка {formatPrice(oldPrice - basePrice)}
                </span>
              </span>
            ) : (
              <span className="font-bold text-accent">{foam ? formatPrice(basePrice) : `от ${formatPrice(basePrice)}`}</span>
            )}
          </div>
        </div>
      </Link>

      <div className="grid gap-2 border-t border-border p-4 pt-3">
        <button
          type="button"
          onClick={() => navigate(`/product/${part.id}`)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {foam ? 'Перейти к товару' : 'Выбрать комплектацию'}
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
                    {foam
                      ? 'Фиксированная цена'
                      : `${showDirection ? `Направление: ${archDirectionLabel()} · ` : ''}Материал: ${material.label} · Комплектация: ${kit.label}`}
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
                      value={[quickPhone.slice(0, 3), quickPhone.slice(3, 6), quickPhone.slice(6, 8), quickPhone.slice(8, 10)].filter(Boolean).join(' ')}
                      onChange={(event) => handleQuickPhone(event.target.value)}
                      placeholder="999 123 45 67"
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
                      value={[callPhone.slice(0, 3), callPhone.slice(3, 6), callPhone.slice(6, 8), callPhone.slice(8, 10)].filter(Boolean).join(' ')}
                      onChange={(event) => handleCallPhone(event.target.value)}
                      placeholder="999 123 45 67"
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
      {lightboxOpen && (
        <ImageLightbox
          src={part.images[0]}
          alt={part.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
