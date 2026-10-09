import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '@lork/sdk'
import {
  ARCH_DIRECTIONS,
  MATERIALS,
  PARTS,
  archDirectionLabel,
  archDirectionTitle,
  basePriceFor,
  formatPrice,
  kitsFor,
  linePrice,
  needsArchDirection,
} from '@/data/catalog'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import { useCart } from '@/store/cart'

function createOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${stamp}-${random}`
}

export default function ProductCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const part = useMemo(() => PARTS.find((item) => item.id === id), [id])
  const { addLine, lines } = useCart()

  const [materialId, setMaterialId] = useState(MATERIALS[0].id)
  const [kitId, setKitId] = useState(kitsFor(part?.type ?? 'порог')[0]?.id ?? 'one-side')
  const [directionId, setDirectionId] = useState<'front' | 'rear'>('rear')
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [addedOpen, setAddedOpen] = useState(false)

  const [quickOpen, setQuickOpen] = useState(false)
  const [quickPhone, setQuickPhone] = useState('')
  const [quickError, setQuickError] = useState('')
  const [quickSending, setQuickSending] = useState(false)
  const [quickSent, setQuickSent] = useState(false)
  const [quickConsent, setQuickConsent] = useState(false)


  if (!part) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Деталь не найдена</h1>
        <p className="mt-2 text-muted-foreground">Возможно, ссылка устарела.</p>
        <Link
          to="/catalog"
          className="mt-5 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Вернуться в каталог
        </Link>
      </div>
    )
  }

  const price = linePrice(part, materialId, kitId)
  const basePrice = basePriceFor(part, materialId)
  const material = MATERIALS.find((item) => item.id === materialId)
  const kits = kitsFor(part.type)
  const kit = kits.find((item) => item.id === kitId) ?? kits[0]
  const showDirection = needsArchDirection(part)
  const directionLabel = showDirection ? archDirectionLabel(directionId) : null
  const inCart = lines.some((line) => line.partId === part.id)

  const handleAdd = () => {
    addLine({
      partId: part.id,
      materialId,
      kitId,
      ...(showDirection ? { directionId } : {}),
      qty: 1,
    })
    setAdded(true)
    setAddedOpen(true)
    window.setTimeout(() => setAdded(false), 2200)
  }

  const closeAdded = () => {
    setAddedOpen(false)
  }

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
        comment: `Заказ в 1 клик: ${part.title}${showDirection ? ` · Направление: ${archDirectionLabel(directionId)}` : ''} (арт. ${part.sku}) · Материал: ${material?.label} · Комплектация: ${kit?.label} · ${formatPrice(price)}\nСтраница: ${window.location.href}`,
        items: [
          {
            partId: part.id,
            title: archDirectionTitle(part, directionId),
            sku: part.sku,
            material: material?.label ?? '',
            kit: kit?.label ?? '',
            direction: showDirection ? archDirectionLabel(directionId) : null,
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
    } catch {
      setQuickError('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setQuickSending(false)
    }
  }

  const proceedFromAdded = (destination: 'cart' | 'quick') => {
    closeAdded()
    if (destination === 'cart') navigate('/checkout')
    else openQuick()
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-accent">
          Главная
        </Link>
        <span>/</span>
        <Link to="/catalog" className="hover:text-accent">
          Каталог
        </Link>
        <span>/</span>
        <span className="text-foreground">{part.title}</span>
      </nav>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {part.type} · {part.vehicle.brand} {part.vehicle.model}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {part.title} {part.years}
        </h1>
        <div className="mt-1 text-sm text-muted-foreground">
          Поколение: {part.vehicle.generation} · Арт. {part.sku}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <img
              src={part.images[activeImage]}
              alt={`${part.title} — фото ${activeImage + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          {part.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {part.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Фото ${index + 1}`}
                  className={`h-24 w-28 overflow-hidden rounded-md border-2 transition-colors ${
                    index === activeImage ? 'border-accent' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Цена с выбранными опциями</div>
                <div className="text-3xl font-bold text-accent">{formatPrice(price)}</div>
              </div>
            </div>

            {showDirection && (
              <fieldset className="mt-5">
                <legend className="text-sm font-medium">Направление</legend>
                <div className="mt-2 grid gap-2">
                  {ARCH_DIRECTIONS.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                        option.id === directionId
                          ? 'border-accent bg-secondary'
                          : 'border-border bg-background hover:border-muted-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name="direction"
                        value={option.id}
                        checked={option.id === directionId}
                        onChange={() => setDirectionId(option.id)}
                        className="mt-1 accent-[oklch(60%_0.15_155)]"
                      />
                      <span className="flex-1">
                        <span className="font-medium">{option.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Материал</legend>
              <div className="mt-2 grid gap-2">
                {MATERIALS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                      option.id === materialId
                        ? 'border-accent bg-secondary'
                        : 'border-border bg-background hover:border-muted-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="material"
                      value={option.id}
                      checked={option.id === materialId}
                      onChange={() => setMaterialId(option.id)}
                      className="mt-1 accent-[oklch(60%_0.15_155)]"
                    />
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatPrice(option.basePrices[part.type])}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Комплектация</legend>
              <div className="mt-2 grid gap-2">
                {kits.map((option) => {
                  const suffix =
                    part.type === 'арка'
                      ? option.id === 'two-sides'
                        ? `+${formatPrice(1950 + (materialId === 'galvanized' ? 700 : 0))}`
                        : ''
                      : option.id === 'two-sides'
                        ? `+${formatPrice(basePrice + (materialId === 'galvanized' ? 600 : 0))}`
                        : option.id === 'full-repair'
                          ? `+${formatPrice(basePrice * 2 + (materialId === 'galvanized' ? 600 : 0) + 3000)}`
                          : ''
                  const includes =
                    part.type === 'порог' && option.id === 'full-repair'
                      ? 'Два порога, два усилителя порога и две торцевые заглушки'
                      : null
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                        option.id === kitId
                          ? 'border-accent bg-secondary'
                          : 'border-border bg-background hover:border-muted-foreground'
                      }`}
                    >
                      <input
                        type="radio"
                        name="kit"
                        value={option.id}
                        checked={option.id === kitId}
                        onChange={() => setKitId(option.id)}
                        className="mt-1 accent-[oklch(60%_0.15_155)]"
                      />
                      <span className="flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-medium">{option.label}</span>
                          {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
                        </span>
                        {includes && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            В комплекте: {includes}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={handleAdd}
                disabled={inCart}
                className={
                  inCart
                    ? 'h-12 w-full rounded-md border border-[#0369a1] bg-white px-5 text-sm font-medium text-[#0369a1] transition-colors sm:h-11 sm:w-auto sm:flex-1'
                    : 'h-12 w-full rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:h-11 sm:w-auto sm:flex-1'
                }
              >
                {inCart ? 'Товар уже в корзине' : 'Добавить в корзину'}
              </button>

              <button
                type="button"
                onClick={openQuick}
                className="h-12 w-full rounded-md border border-[#7dd3fc] bg-[#e0f2fe] px-5 text-sm font-medium text-[#0369a1] transition-colors hover:border-[#38bdf8] hover:bg-[#bae6fd] sm:h-11 sm:w-auto"
              >
                Заказ в 1 клик
              </button>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              <div>
                Выбрано: {directionLabel ? `${directionLabel} · ` : ''}
                {material?.label} · {kit?.label}
              </div>
              <div className="mt-1">Итого: {formatPrice(price)}</div>
            </div>

            <div
              className={`mt-3 rounded-md border px-3 py-2 text-sm transition-opacity ${
                added
                  ? 'border-accent bg-secondary text-foreground opacity-100'
                  : 'border-transparent bg-secondary text-foreground opacity-0'
              }`}
              role="status"
            >
              Товар добавлен в корзину
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Описание</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{part.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Артикул</dt>
                <dd className="font-medium">{part.sku}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Исполнение</dt>
                <dd className="font-medium">100% повторение оригинала</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Автомобиль</dt>
                <dd className="font-medium">
                  {part.vehicle.brand} {part.vehicle.model}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Поколение</dt>
                <dd className="font-medium">{part.vehicle.generation}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {addedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="added-order-title"
          onClick={closeAdded}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="added-order-title" className="text-xl font-bold tracking-tight">
                  Товар добавлен в корзину
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Выберите, как оформить покупку.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAdded}
                aria-label="Закрыть окно"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-2 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-md border border-border bg-secondary p-3 text-sm">
              <div className="font-medium">{archDirectionTitle(part, directionId)}</div>
              <div className="mt-1 text-muted-foreground">
                {showDirection ? `Направление: ${directionLabel} · ` : ''}
                Материал: {material?.label} · Комплектация: {kit?.label}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Арт. {part.sku}</span>
                <span className="font-semibold text-accent">{formatPrice(price)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Итого</span>
                <span className="font-semibold text-accent">{formatPrice(price)}</span>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => proceedFromAdded('cart')}
                className="min-h-11 w-full rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Оформить заказ
              </button>
              <button
                type="button"
                onClick={() => proceedFromAdded('quick')}
                className="min-h-11 w-full rounded-md border border-[#7dd3fc] bg-[#e0f2fe] px-5 text-sm font-medium text-[#0369a1] transition-colors hover:border-[#38bdf8] hover:bg-[#bae6fd]"
              >
                Купить в 1 клик
              </button>
              <button
                type="button"
                onClick={closeAdded}
                className="min-h-11 w-full rounded-md border border-border px-5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
              >
                Продолжить покупки
              </button>
            </div>

          </div>
        </div>
      )}

      {quickOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-order-title"
          onClick={closeQuick}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {quickSent ? (
              <div>
                <h2 id="quick-order-title" className="text-xl font-bold tracking-tight">
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
                    <h2 id="quick-order-title" className="text-xl font-bold tracking-tight">
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
                  <div className="font-medium">{archDirectionTitle(part, directionId)}</div>
                  <div className="mt-1 text-muted-foreground">
                    {showDirection ? `Направление: ${directionLabel} · ` : ''}
                    Материал: {material?.label} · Комплектация: {kit?.label}
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
                      className="h-full w-full bg-transparent px-3 text-sm outline-none"
                    />
                  </div>
                </label>

                {quickError && (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {quickError}
                  </p>
                )}

                <ConsentCheckbox
                  id="quick-consent"
                  checked={quickConsent}
                  onChange={(checked) => {
                    setQuickConsent(checked)
                    if (checked) setQuickError((current) =>
                      current === 'Отметьте согласие на обработку персональных данных.'
                        ? ''
                        : current,
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
    </div>
  )
}
