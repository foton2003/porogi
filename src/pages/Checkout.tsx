import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { db } from '@lork/sdk'
import { archDirectionLabel, archDirectionTitle, cartTotal, describeLine, formatPrice, needsArchDirection } from '@/data/catalog'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import { encodeOrderNumber, orderItemsFromLines, orderTotalFromLines, useCart } from '@/store/cart'

interface FieldErrors {
  name?: string
  phone?: string
  city?: string
  consent?: string
}

const CITY_SUGGESTIONS = [
  'Абакан',
  'Ангарск',
  'Армавир',
  'Архангельск',
  'Астрахань',
  'Балаково',
  'Барнаул',
  'Белгород',
  'Березники',
  'Бийск',
  'Благовещенск',
  'Братск',
  'Брянск',
  'Владивосток',
  'Владикавказ',
  'Владимир',
  'Волгоград',
  'Вологда',
  'Воронеж',
  'Грозный',
  'Дербент',
  'Дзержинск',
  'Долгопрудный',
  'Екатеринбург',
  'Иваново',
  'Ижевск',
  'Иркутск',
  'Йошкар-Ола',
  'Казань',
  'Калининград',
  'Каменск-Уральский',
  'Кемерово',
  'Киров',
  'Кострома',
  'Краснодар',
  'Красноярск',
  'Курган',
  'Курск',
  'Кызыл',
  'Липецк',
  'Магадан',
  'Магнитогорск',
  'Махачкала',
  'Москва',
  'Мурманск',
  'Набережные Челны',
  'Нальчик',
  'Нижневартовск',
  'Нижний Новгород',
  'Нижний Тагил',
  'Новороссийск',
  'Новокузнецк',
  'Новосибирск',
  'Норильск',
  'Омск',
  'Оренбург',
  'Орёл',
  'Орск',
  'Одинцово',
  'Петрозаводск',
  'Петропавловск-Камчатский',
  'Пенза',
  'Пермь',
  'Прокопьевск',
  'Псков',
  'Ростов-на-Дону',
  'Рязань',
  'Салават',
  'Самара',
  'Санкт-Петербург',
  'Саранск',
  'Саратов',
  'Северодвинск',
  'Смоленск',
  'Сочи',
  'Ставрополь',
  'Стерлитамак',
  'Сургут',
  'Сызрань',
  'Сыктывкар',
  'Таганрог',
  'Тамбов',
  'Тверь',
  'Тольятти',
  'Томск',
  'Тула',
  'Тюмень',
  'Улан-Удэ',
  'Ульяновск',
  'Уфа',
  'Хабаровск',
  'Чебоксары',
  'Челябинск',
  'Череповец',
  'Чита',
  'Шахты',
  'Электросталь',
  'Энгельс',
  'Южно-Сахалинск',
  'Якутск',
  'Ярославль',
]

function createOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${stamp}-${random}`
}

export default function Checkout() {
  const { lines, clear, saveOrder } = useCart()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+7 ')
  const [city, setCity] = useState('')
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [consent, setConsent] = useState(false)

  const citySuggestions = useMemo(() => {
    const query = city.trim().toLowerCase()
    if (query.length < 1) return []
    return CITY_SUGGESTIONS.filter((item) => item.toLowerCase().includes(query)).slice(0, 6)
  }, [city])

  const items = lines.map((line) => ({ line, described: describeLine(line) }))
  const total = cartTotal(lines)

  if (lines.length === 0) {
    return <Navigate to="/catalog" replace />
  }

  const validate = (): FieldErrors => {
    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = 'Укажите имя'
    const digits = phone.replace(/\D/g, '').replace(/^[78]/, '')
    if (digits.length < 10) next.phone = 'Укажите телефон не короче 10 цифр'
    if (city.trim().length < 2) next.city = 'Укажите город'
    if (!consent) next.consent = 'Отметьте согласие на обработку персональных данных.'
    return next
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitError('')

    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (items.some((item) => item.described === null)) {
      setSubmitError('В корзине есть недоступные товары — вернитесь в корзину.')
      return
    }

    const orderNumber = createOrderNumber()
    const orderItems = orderItemsFromLines(lines)
    const orderTotal = orderTotalFromLines(lines)
    const normalizedPhone = (() => {
      const trimmed = phone.trim()
      if (!trimmed.startsWith('+')) return `+7${trimmed.replace(/\D/g, '').replace(/^[78]/, '')}`
      const digits = trimmed.replace(/\D/g, '').replace(/^78/, '7')
      return `+${digits}`
    })()
    const payload = {
      order_number: orderNumber,
      customer_name: name.trim(),
      phone: normalizedPhone,
      city: city.trim(),
      comment: comment.trim() ? comment.trim() : null,
      items: orderItems,
      total: orderTotal,
      status: 'new',
      consent_pdn: consent,
    }

    setSubmitting(true)
    try {
      const { error } = await db.from('orders_public').insert(payload)
      if (error) throw error
      saveOrder({
        orderNumber,
        customerName: payload.customer_name,
        phone: payload.phone,
        city: payload.city,
        comment: payload.comment,
        items: orderItems,
        total: orderTotal,
        createdAt: new Date().toISOString(),
      })
      clear()
      navigate(`/order/${encodeOrderNumber(orderNumber)}`, {
        replace: true,
        state: { orderNumber },
      })
    } catch {
      setSubmitError('Не удалось сохранить заказ. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (hasError?: string) =>
    `h-11 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
      hasError ? 'border-destructive' : 'border-input'
    }`

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Оформление заказа</h1>
        <p className="mt-2 text-muted-foreground">
          Оставьте контакты — мы свяжемся с вами, чтобы подтвердить состав заказа. Оплата сейчас не
          производится.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} noValidate className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Контактные данные</h2>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Имя</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Как к вам обращаться"
                autoComplete="name"
                className={fieldClass(errors.name)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span className="mt-1 block text-xs text-destructive">{errors.name}</span>}
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Телефон</span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+7 (___) ___-__-__"
                autoComplete="tel"
                className={fieldClass(errors.phone)}
                aria-invalid={Boolean(errors.phone)}
              />
              {errors.phone && (
                <span className="mt-1 block text-xs text-destructive">{errors.phone}</span>
              )}
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Город</span>
              <div className="relative">
                <input
                  type="text"
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value)
                    setCityOpen(true)
                  }}
                  onFocus={() => setCityOpen(true)}
                  onBlur={() => setCityOpen(false)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && citySuggestions.length > 0) {
                      event.preventDefault()
                      setCity(citySuggestions[0])
                      setCityOpen(false)
                    }
                  }}
                  placeholder="Город доставки"
                  autoComplete="address-level2"
                  className={fieldClass(errors.city)}
                  aria-invalid={Boolean(errors.city)}
                  aria-autocomplete="list"
                />
                {cityOpen && citySuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-11 z-20 max-h-52 overflow-y-auto rounded-md border border-input bg-background py-1 shadow-md">
                    {citySuggestions.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onMouseDown={(event) => {
                            event.preventDefault()
                            setCity(item)
                            setCityOpen(false)
                          }}
                          className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {errors.city && <span className="mt-1 block text-xs text-destructive">{errors.city}</span>}
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Комментарий</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                placeholder="Пожелания к заказу, удобное время звонка"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          {submitError && (
            <div className="rounded-md border border-destructive/40 bg-secondary px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <ConsentCheckbox
              id="checkout-consent"
              checked={consent}
              onChange={(checked) => {
                setConsent(checked)
                if (checked) setErrors((current) => ({ ...current, consent: undefined }))
              }}
              error={errors.consent}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
            >
              {submitting ? 'Отправляем заказ…' : 'Оформить заказ'}
            </button>
            <Link
              to="/cart"
              className="rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              Вернуться в корзину
            </Link>
          </div>
        </form>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Состав заказа</h2>

          <ul className="mt-4 space-y-3">
            {items.map(({ line, described }) => {
              if (!described) return null
              return (
                <li
                  key={`${line.partId}-${line.materialId}-${line.kitId}-${line.directionId ?? ''}`}
                  className="border-b border-border pb-3 last:border-none last:pb-0"
                >
                  <div className="text-sm font-medium">{archDirectionTitle(described.part, line.directionId)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {described.material.label} · {described.kit.label}
                    {needsArchDirection(described.part)
                      ? ` · Направление: ${archDirectionLabel(line.directionId)}`
                      : ''}
                    {' · '}
                    {line.qty} шт.
                  </div>
                  <div className="mt-1 text-sm font-semibold text-accent">
                    {formatPrice(described.sum)}
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Итоговая сумма</span>
            <span className="text-2xl font-bold text-accent">{formatPrice(total)}</span>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Оплата не списывается на этом шаге. Способ оплаты согласуется при подтверждении заказа.
          </p>
        </aside>
      </div>
    </div>
  )
}
