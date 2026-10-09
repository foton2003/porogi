import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  BRANDS,
  PARTS,
  VEHICLES,
  buildCatalogPath,
  formatPrice,
  generationsFor,
  modelsForBrand,
  parseCatalogPath,
} from '@/data/catalog'

const types = ['все', 'порог', 'арка'] as const

const FILTER_KEY = 'sill-arch-catalog-filter-v1'

type SavedFilter = { brand: string; model: string; generation: string; type: string }

function loadFilter(): SavedFilter {
  try {
    const raw = window.localStorage.getItem(FILTER_KEY)
    if (!raw) return { brand: '', model: '', generation: '', type: 'все' }
    const parsed = JSON.parse(raw) as Partial<SavedFilter>
    return {
      brand: typeof parsed.brand === 'string' ? parsed.brand : '',
      model: typeof parsed.model === 'string' ? parsed.model : '',
      generation: typeof parsed.generation === 'string' ? parsed.generation : '',
      type:
        typeof parsed.type === 'string' && (types as readonly string[]).includes(parsed.type)
          ? parsed.type
          : 'все',
    }
  } catch {
    return { brand: '', model: '', generation: '', type: 'все' }
  }
}

function saveFilter(value: SavedFilter) {
  try {
    window.localStorage.setItem(FILTER_KEY, JSON.stringify(value))
  } catch {
    // localStorage может быть недоступен — фильтр просто не сохранится
  }
}

export default function Catalog() {
  const location = useLocation()
  const navigate = useNavigate()
  const [initial] = useState(() => {
    const parsed = parseCatalogPath(location.pathname.split('/').filter(Boolean).slice(1))
    return parsed
      ? { brand: parsed.brand ?? '', model: parsed.model ?? '', generation: parsed.generation ?? '', type: parsed.type }
      : loadFilter()
  })
  const [appliedPath, setAppliedPath] = useState(location.pathname)
  const [brand, setBrand] = useState(initial.brand)
  const [model, setModel] = useState(initial.model)
  const [generation, setGeneration] = useState(initial.generation)
  const [type, setType] = useState<(typeof types)[number]>(
    initial.type as (typeof types)[number],
  )
  const [mobileOpen, setMobileOpen] = useState(!(initial.brand && initial.model && initial.generation))
  const [visibleCount, setVisibleCount] = useState(9)

  /* Читаем фильтр из дружелюбного пути /catalog/[тип]/[марка]/[модель]/[поколение]/. */
  useEffect(() => {
    const segments = location.pathname
      .split('/')
      .filter(Boolean)
      .slice(1)
    const parsed = parseCatalogPath(segments)
    setAppliedPath(location.pathname)
    if (!parsed) return
    setType(parsed.type)
    setBrand(parsed.brand ?? '')
    setModel(parsed.model ?? '')
    setGeneration(parsed.generation ?? '')
    setVisibleCount(9)
    if (parsed.generation) setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (appliedPath !== location.pathname) return
    saveFilter({ brand, model, generation, type })
  }, [brand, model, generation, type, appliedPath, location.pathname])

  /* Синхронизируем путь с выбранными фильтрами (replace — без спама в истории). */
  useEffect(() => {
    // A newly opened URL takes priority over filter state from the previous URL.
    // Wait for the read effect to apply it before writing a canonical address.
    if (appliedPath !== location.pathname) return
    const target = buildCatalogPath(type, brand, model, generation)
    if (location.pathname !== target) {
      navigate(target, { replace: true })
    }
  }, [type, brand, model, generation, appliedPath, location.pathname, navigate])

  const handleGeneration = (value: string) => {
    setGeneration(value)
    if (value) setMobileOpen(false)
  }

  const models = useMemo(() => (brand ? modelsForBrand(brand) : []), [brand])
  const generations = useMemo(
    () => (brand && model ? generationsFor(brand, model) : []),
    [brand, model],
  )

  const results = useMemo(() => {
    return PARTS.filter((part) => {
      if (brand && part.vehicle.brand !== brand) return false
      if (model && part.vehicle.model !== model) return false
      if (generation && part.vehicle.generation !== generation) return false
      if (type !== 'все' && part.type !== type) return false
      return true
    })
  }, [brand, model, generation, type])

  const paged = !generation
  const visible = paged ? results.slice(0, visibleCount) : results

  useEffect(() => {
    setVisibleCount(9)
  }, [brand, model, generation, type])

  const handleBrand = (value: string) => {
    setBrand(value)
    setModel('')
    setGeneration('')
  }

  const handleModel = (value: string) => {
    setModel(value)
    setGeneration('')
  }

  const reset = () => {
    setBrand('')
    setModel('')
    setGeneration('')
    setType('все')
    setMobileOpen(true)
    setVisibleCount(9)
    try {
      window.localStorage.removeItem(FILTER_KEY)
    } catch {
      // localStorage может быть недоступен — удалять нечего
    }
  }

  const vehicleReady = Boolean(brand && model && generation)
  const collapsedVehicle = vehicleReady
    ? VEHICLES.find(
        (item) =>
          item.brand === brand && item.model === model && item.generation === generation,
      )
    : undefined

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Каталог ремонтных порогов и арок</h1>
        <p className="mt-2 text-muted-foreground">
          Выберите марку, модель и поколение автомобиля — покажем пороги и колёсные арки, которые
          подходят для вашего кузова.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        {vehicleReady && (
          <div className="mb-4 rounded-md border border-accent/50 bg-secondary p-3 text-sm sm:hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">Выбранный автомобиль</div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="text-sm font-medium text-[#16a34a] underline-offset-4 hover:underline"
                >
                  Изменить автомобиль
                </button>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Сбросить выбранный автомобиль"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-[#16a34a] transition-colors hover:text-[#15803d]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-1 text-muted-foreground">
              {[collapsedVehicle?.brand ?? brand, collapsedVehicle?.model ?? model, collapsedVehicle?.generation ?? generation]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        )}
        <div
          className={`${
            mobileOpen ? 'grid' : 'grid sm:hidden'
          } grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4`}
        >
          <label className={`${vehicleReady && !mobileOpen ? 'hidden sm:hidden' : 'block'} sm:hidden`}>
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Марка</span>
            <select
              value={brand}
              onChange={(event) => handleBrand(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Все марки</option>
              {BRANDS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={`${vehicleReady && !mobileOpen ? 'hidden sm:hidden' : 'block'} sm:hidden`}>
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Модель</span>
            <select
              value={model}
              onChange={(event) => handleModel(event.target.value)}
              disabled={!brand}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{brand ? 'Все модели' : 'Сначала выберите марку'}</option>
              {models.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className={`${vehicleReady && !mobileOpen ? 'hidden sm:hidden' : 'block'} sm:hidden`}>
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Поколение</span>
            <select
              value={generation}
              onChange={(event) => handleGeneration(event.target.value)}
              disabled={!model}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{model ? 'Все поколения' : 'Сначала выберите модель'}</option>
              {generations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="hidden md:block">
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Марка</span>
            <select
              value={brand}
              onChange={(event) => handleBrand(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Все марки</option>
              {BRANDS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="hidden md:block">
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Модель</span>
            <select
              value={model}
              onChange={(event) => handleModel(event.target.value)}
              disabled={!brand}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{brand ? 'Все модели' : 'Сначала выберите марку'}</option>
              {models.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="hidden md:block">
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Поколение</span>
            <select
              value={generation}
              onChange={(event) => handleGeneration(event.target.value)}
              disabled={!model}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{model ? 'Все поколения' : 'Сначала выберите модель'}</option>
              {generations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="hidden md:block">
            <span className="mb-1.5 block text-sm font-medium">Тип детали</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as (typeof types)[number])}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {types.map((item) => (
                <option key={item} value={item}>
                  {item === 'все' ? 'Пороги и арки' : item === 'порог' ? 'Пороги' : 'Арки'}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 hidden flex-wrap items-center justify-between gap-3 border-t border-border pt-4 sm:flex">
          <div className="flex flex-1 items-end justify-end text-sm text-muted-foreground">
            <span>
              Найдено позиций:{' '}
              <span className="font-semibold text-foreground">{results.length}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm transition-colors hover:border-accent hover:text-accent"
          >
            Сбросить фильтр
          </button>
        </div>
      </section>

      {results.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="font-semibold">Подходящих деталей не найдено</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Измените марку, модель или поколение — в каталоге есть другие варианты.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Показать все детали
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((part) => (
            <Link
              key={part.id}
              to={`/product/${part.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-accent"
            >
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
                  <span className="font-bold text-accent">
                    от {formatPrice(part.type === 'арка' ? 1950 : 1790)}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {part.side}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {paged && results.length > visibleCount && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + 9)}
            className="inline-flex min-h-11 items-center rounded-md border border-[#7dd3fc] bg-[#e0f2fe] px-6 text-sm font-medium text-[#0369a1] transition-colors hover:border-[#38bdf8] hover:bg-[#bae6fd]"
          >
            Показать еще
          </button>
        </div>
      )}
    </div>
  )
}
