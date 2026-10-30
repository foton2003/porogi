import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '@lork/sdk'
import {
  ALL_PARTS,
  ARCH_DIRECTIONS,
  FOAM_TAILGATE_OLD_PRICE,
  MATERIALS,
  type PartType,
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
} from '@/data/catalog'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import ImageLightbox from '@/components/ImageLightbox'
import { useCart } from '@/store/cart'
import { markContact, rememberCallbackProfile } from '@/lib/callbackScript'
import { sendUisLead } from '@/lib/uisLead'

/** Фото ремонтного комплекта арок (вложение komplekt_arok.jpeg). */
const KIT_ARCH_IMAGE =
  'https://storage.yandexcloud.net/lork/public/services/svc_web_216407ed44a1e90bc4b7524e/assets/att_c149dcbb798767a8088c897c404d8dca/komplekt_arok.jpeg'
/** Фото ремонтного комплекта порогов (вложение komplekt_porogov.jpeg). */
const KIT_POROG_IMAGE =
  'https://storage.yandexcloud.net/lork/public/services/svc_web_216407ed44a1e90bc4b7524e/assets/att_dda0a506c22515fa403a342fd460977b/komplekt_porogov.jpeg'

function createOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${stamp}-${random}`
}

/** Description по шаблону из задания: деталь, автомобиль и цена от.
 *  Для пенок — тот же шаблон с фиксированной ценой (без «Гарантия» —
 *  формулировки наследуются от текущих шаблонов карточки). */
function productDescription(
  kind: PartType,
  brand: string,
  model: string,
  generation: string,
  fromPrice: string,
  foam?: { title: string },
): string {
  const vehicle = [brand, model, generation].filter(Boolean).join(' ')
  if (foam)
    return `Новая ${foam.title.toLowerCase()} для ${vehicle}. От производителя со 100% повторением оригинальной детали. Цена ${fromPrice}.`
  return kind === 'порог'
    ? `Новый ремонтный кузовной порог для ${vehicle}. От производителя со 100% повторением оригинальной детали. Цена от ${fromPrice}. Гарантия.`
    : `Новая ремонтная кузовная колёсная арка для ${vehicle}. От производителя со 100% повторением оригинальной детали. Цена от ${fromPrice}. Гарантия.`
}

/** Title по шаблону из задания: тип, автомобиль и кузов. */
function productHeading(
  kind: PartType,
  brand: string,
  model: string,
  generation: string,
  body: string,
  foam?: { title: string },
): string {
  const vehicle = [brand, model, generation, body].filter(Boolean).join(' ')
  if (foam) return `Купить ${foam.title.toLowerCase()} на ${vehicle}`
  return kind === 'порог'
    ? `Купить кузовной ремонтный порог на ${vehicle}`
    : `Купить кузовную ремонтную арку на ${vehicle}`
}

export default function ProductCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const part = useMemo(() => ALL_PARTS.find((item) => item.id === id), [id])
  const { addLine, lines } = useCart()

  const [materialId, setMaterialId] = useState(MATERIALS[0].id)
  const [kitId, setKitId] = useState(kitsFor(part?.type ?? 'порог', part?.foamKind)[0]?.id ?? 'one-side')
  const [directionId, setDirectionId] = useState<'front' | 'rear'>('rear')
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const [addedOpen, setAddedOpen] = useState(false)

  const [quickOpen, setQuickOpen] = useState(false)
  const [quickPhone, setQuickPhone] = useState('')
  const [quickError, setQuickError] = useState('')
  const [quickSent, setQuickSent] = useState(false)
  const [quickConsent, setQuickConsent] = useState(false)
  const [quickSending, setQuickSending] = useState(false)

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

  const showDirection = needsArchDirection(part)
  const foam = isFoam(part)
  /* Для пенок цена фиксированная — материал и направление не участвуют. */
  const price = linePrice(
    part,
    foam ? MATERIALS[0].id : materialId,
    foam ? 'foam' : kitId,
    !foam && showDirection ? directionId : undefined,
  )
  const basePrice = basePriceFor(part, foam ? MATERIALS[0].id : materialId)
  const oldPrice = part.foamKind === 'foam-tailgate' ? FOAM_TAILGATE_OLD_PRICE : null
  const material = MATERIALS.find((item) => item.id === materialId)
  const kits = kitsFor(part.type, part.foamKind)
  const kit = kits.find((item) => item.id === kitId) ?? kits[0]
  /* Подмена главного фото при выборе «Ремонтного комплекта»:
     арки → komplekt_arok.jpeg, пороги → komplekt_porogov.jpeg;
     при снятии опции возвращается исходный кадр part.images[activeImage]. */
  const kitPhoto =
    !foam && part.type === 'арка' && kitId === 'full-repair-arch'
      ? KIT_ARCH_IMAGE
      : !foam && part.type === 'порог' && kitId === 'full-repair'
        ? KIT_POROG_IMAGE
        : null
  const mainImage = kitPhoto ?? part.images[activeImage]
  const directionLabel = showDirection ? archDirectionLabel(directionId) : null
  const inCart = lines.some((line) => line.partId === part.id)

  /* Микроразметка Schema.org (JSON-LD): товар + продавец.
     URL извлекается из адреса страницы, чтобы не терять языковую
     часть пути. Данные — из карточки каталога, без выдуманных фактов. */
  const canonicalUrl = `${window.location.origin}${window.location.pathname}`
  const productSchema = {
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
      url: canonicalUrl,
      priceCurrency: 'RUB',
      price: basePrice,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Магазин кузовных порогов и арок' },
    },
  }

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(productSchema)
    document.head.appendChild(script)
    return () => {
      document.head.removeChild(script)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part.id])

  /* SEO: title и meta description по шаблонам из задания — меняются вместе
     с карточкой товара. H1 остаётся прежним. Значения берутся из карточки
     каталога (марка, модель, поколение, кузов, базовая цена), без выдуманных
     фактов: «цена от» — это базовая цена выбранного материала, как в фидах. */
  const seoHeading = productHeading(
    part.type,
    part.vehicle.brand,
    part.vehicle.model,
    part.vehicle.generation,
    part.body,
    part.foamKind ? { title: foamTitle(part.foamKind) } : undefined,
  )
  const seoDescription = productDescription(
    part.type,
    part.vehicle.brand,
    part.vehicle.model,
    part.vehicle.generation,
    formatPrice(basePrice),
    part.foamKind ? { title: foamTitle(part.foamKind) } : undefined,
  )
  useEffect(() => {
    document.title = seoHeading
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', seoDescription)
    return () => {
      document.title = 'ПорогиПро — ремонтные пороги и колёсные арки'
      const defaultMeta = document.querySelector('meta[name="description"]')
      if (defaultMeta) {
        defaultMeta.setAttribute(
          'content',
          'Новые ремонтные пороги и колёсные арки для автомобилей: каталог с подбором по марке, модели и году выпуска, корзина и оформление заказа.',
        )
      }
    }
  }, [seoHeading, seoDescription])

  const handleAdd = () => {
    addLine({
      partId: part.id,
      materialId,
      kitId: foam ? 'foam' : kitId,
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
      const phone = `+7${quickPhone}`
      const comment = `Заказ в 1 клик: ${part.title}${showDirection ? ` · Направление: ${archDirectionLabel(directionId)}` : ''} (арт. ${part.sku}) · ${foam ? 'Фиксированная цена' : `Материал: ${material?.label} · Комплектация: ${kit?.label}`} · ${formatPrice(price)}\nСтраница: ${window.location.href}`
      const { error } = await db.from('orders_public').insert({
        order_number: createOrderNumber(),
        customer_name: 'Заказ в 1 клик',
        phone,
        city: '—',
        comment,
        items: [
          {
            partId: part.id,
            title: archDirectionTitle(part, directionId),
            sku: part.sku,
            material: foam ? '—' : material?.label ?? '',
            kit: foam ? 'Стандарт' : kit?.label ?? '',
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
          {part.foamKind ? foamTitle(part.foamKind) : part.type} · {part.vehicle.brand} {part.vehicle.model}
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
            {/* Фото товара открывается в лайтбоксе с увеличением по клику. */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full cursor-zoom-in"
              aria-label={`Увеличить фото: ${part.title}`}
            >
              <img
                src={mainImage}
                alt={
                  kitPhoto
                    ? `${part.title} — ремонтный комплект, фото ${activeImage + 1}`
                    : isSchemeImage(mainImage)
                      ? `${part.title} — схема зоны установки`
                      : `${part.title} — фото ${activeImage + 1}`
                }
                className={`aspect-[4/3] w-full ${
                  isSchemeImage(mainImage) ? 'object-contain p-3' : 'object-cover'
                }`}
              />
            </button>
          </div>
          {part.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {part.images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={isSchemeImage(image) ? 'Схема зоны установки' : `Фото ${index + 1}`}
                  className={`h-24 w-28 overflow-hidden rounded-md border-2 transition-colors ${
                    index === activeImage ? 'border-accent' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <img
                    src={image}
                    alt=""
                    className={`h-full w-full ${isSchemeImage(image) ? 'object-contain p-1' : 'object-cover'}`}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {foam ? 'Цена' : 'Цена с выбранными опциями'}
                </div>
                <div className="text-3xl font-bold text-accent">{formatPrice(price)}</div>
                {oldPrice && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground line-through">
                      {formatPrice(oldPrice)}
                    </span>
                    <span className="rounded-full bg-[#dc2626] px-2 py-0.5 text-xs font-semibold text-white">
                      Скидка {formatPrice(oldPrice - basePrice)}
                    </span>
                  </div>
                )}
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

            {!foam && (
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
            )}

            {!foam && (
            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Комплектация</legend>
              <div className="mt-2 grid gap-2">
                {kits.map((option) => {
                  const optionPrice = linePrice(
                    part,
                    materialId,
                    option.id,
                    showDirection ? directionId : undefined,
                  )
                  const suffix =
                    option.id === 'two-sides'
                      ? `+${formatPrice(basePrice)}`
                      : option.id === 'full-repair' || option.id === 'full-repair-arch'
                        ? `+${formatPrice(optionPrice)}`
                        : ''
                  const includes =
                    part.type === 'порог' && option.id === 'full-repair'
                      ? 'Два порога, два усилителя порога и две торцевые заглушки'
                      : part.type === 'арка' && option.id === 'full-repair-arch'
                        ? 'две наружные и две внутренние арки'
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
            )}

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
                Выбрано:{' '}
                {foam && part.foamKind
                  ? `${foamTitle(part.foamKind)} для ${part.vehicle.brand} ${part.vehicle.model}`
                  : `${directionLabel ? `${directionLabel} · ` : ''}${material?.label} · ${kit?.label}`}
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
                {foam
                  ? 'Фиксированная цена'
                  : `${showDirection ? `Направление: ${directionLabel} · ` : ''}Материал: ${material?.label} · Комплектация: ${kit?.label}`}
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
                    {foam
                      ? 'Фиксированная цена'
                      : `${showDirection ? `Направление: ${directionLabel} · ` : ''}Материал: ${material?.label} · Комплектация: ${kit?.label}`}
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

      {lightboxOpen && (
        <ImageLightbox
          src={mainImage}
          alt={part.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
