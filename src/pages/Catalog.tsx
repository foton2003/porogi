import { catalogHeading, catalogDescription } from '@/lib/catalogSeo'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ALL_PARTS,
  BRANDS,
  PARTS,
  buildCatalogPath,
  foamGate,
  generationForYears,
  modelsForBrand,
  parseCatalogYearPath,
  yearsFor,
  yearsForGeneration,
} from '@/data/catalog'
import CatalogCard from '@/components/CatalogCard'

const types = ['все', 'порог', 'арка'] as const

/** Значения <title> и meta description по умолчанию — как в index.html. */
const SITE_TITLE = 'ПорогиПро — ремонтные пороги и колёсные арки'
const SITE_DESCRIPTION =
  'Новые ремонтные пороги и колёсные арки для автомобилей: каталог с подбором по марке, модели и году выпуска, корзина и оформление заказа.'

const FILTER_KEY = 'sill-arch-catalog-filter-v1'

export { catalogHeading, catalogDescription } from '@/lib/catalogSeo'

type SavedFilter = { brand: string; model: string; years: string; type: string }
type StoredFilter = { brand?: unknown; model?: unknown; years?: unknown; generation?: unknown; type?: unknown }

const EMPTY_FILTER: SavedFilter = { brand: '', model: '', years: '', type: 'все' }

function loadFilter(): SavedFilter {
  try {
    const raw = window.localStorage.getItem(FILTER_KEY)
    if (!raw) return EMPTY_FILTER
    const parsed = JSON.parse(raw) as StoredFilter
    const brand = typeof parsed.brand === 'string' ? parsed.brand : ''
    const model = typeof parsed.model === 'string' ? parsed.model : ''
    const savedYears = typeof parsed.years === 'string' ? parsed.years : ''
    // Фильтр, сохранённый до замены поколения на год, переводим на первый год выпуска.
    const legacyGeneration = typeof parsed.generation === 'string' ? parsed.generation : ''
    return {
      brand,
      model,
      years: savedYears || yearsForGeneration(brand, model, legacyGeneration),
      type:
        typeof parsed.type === 'string' && (types as readonly string[]).includes(parsed.type)
          ? parsed.type
          : 'все',
    }
  } catch {
    return EMPTY_FILTER
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
    const parsed = parseCatalogYearPath(location.pathname.split('/').filter(Boolean).slice(1))
    return parsed
      ? { brand: parsed.brand ?? '', model: parsed.model ?? '', years: parsed.years ?? '', type: parsed.type }
      : loadFilter()
  })
  const [appliedPath, setAppliedPath] = useState(location.pathname)
  const [brand, setBrand] = useState(initial.brand)
  const [model, setModel] = useState(initial.model)
  const [years, setYears] = useState(initial.years)
  const [type, setType] = useState<(typeof types)[number]>(
    initial.type as (typeof types)[number],
  )
  const [mobileOpen, setMobileOpen] = useState(
    !(initial.brand && initial.model),
  )
  const [visibleCount, setVisibleCount] = useState(9)

  /* Читаем фильтр из дружелюбного пути /catalog/[тип]/[марка]/[модель]/[год выпуска]/. */
  useEffect(() => {
    const segments = location.pathname
      .split('/')
      .filter(Boolean)
      .slice(1)
    const parsed = parseCatalogYearPath(segments)
    setAppliedPath(location.pathname)
    if (!parsed) return
    setType(parsed.type)
    setBrand(parsed.brand ?? '')
    setModel(parsed.model ?? '')
    setYears(parsed.years ?? '')
    setVisibleCount(9)
    if (parsed.years) setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (appliedPath !== location.pathname) return
    saveFilter({ brand, model, years, type })
  }, [brand, model, years, type, appliedPath, location.pathname])

  /* Синхронизируем путь с выбранными фильтрами (replace — без спама в истории). */
  useEffect(() => {
    // A newly opened URL takes priority over filter state from the previous URL.
    // Wait for the read effect to apply it before writing a canonical address.
    if (appliedPath !== location.pathname) return
    const target = buildCatalogPath(type, brand, model, years)
    if (location.pathname !== target) {
      navigate(target, { replace: true })
    }
  }, [type, brand, model, years, appliedPath, location.pathname, navigate])

  const handleYears = (value: string) => {
    setYears(value)
    if (value) setMobileOpen(false)
  }

  const models = useMemo(() => (brand ? modelsForBrand(brand) : []), [brand])
  const yearsOptions = useMemo(
    () => (brand && model ? yearsFor(brand, model) : []),
    [brand, model],
  )
  const generation = useMemo(
    () => (brand && model && years ? generationForYears(brand, model, years) : ''),
    [brand, model, years],
  )

  const results = useMemo(() => {
    /* Пенки добавляются только при полном выборе авто (марка + модель + год);
       типы «Арка» и «Порог» в фильтре не меняются. */
    const showFoams = foamGate(brand, model, years)
    const matches = (part: (typeof ALL_PARTS)[number]) => {
      if (brand && part.vehicle.brand !== brand) return false
      if (model && part.vehicle.model !== model) return false
      if (years && part.years !== years) return false
      if (type !== 'все' && part.type !== type) return false
      return true
    }
    /* Порядок выдачи: пороги, затем арки, затем пенки. Внутри группы
       сохраняется порядок каталога. Пенки появляются только при полном
       выборе авто, поэтому под «Показать еще» не попадают. */
    const cores = PARTS.filter(matches)
    const sills = cores.filter((part) => part.type === 'порог')
    const arches = cores.filter((part) => part.type === 'арка')
    const foams = showFoams
      ? ALL_PARTS.filter((part) => part.foamKind && matches(part))
      : []
    return [...sills, ...arches, ...foams]
  }, [brand, model, years, type])

  const paged = !years
  const visible = paged ? results.slice(0, visibleCount) : results

  useEffect(() => {
    setVisibleCount(9)
  }, [brand, model, years, type])

  const handleBrand = (value: string) => {
    setBrand(value)
    setModel('')
    setYears('')
  }

  const handleModel = (value: string) => {
    setModel(value)
    setYears('')
  }

  const reset = () => {
    setBrand('')
    setModel('')
    setYears('')
    setType('все')
    setMobileOpen(true)
    setVisibleCount(9)
    try {
      window.localStorage.removeItem(FILTER_KEY)
    } catch {
      // localStorage может быть недоступен — удалять нечего
    }
  }

  const vehicleReady = Boolean(brand && model && years)

  const heading = useMemo(
    () => catalogHeading(type, brand, model, years, generation),
    [type, brand, model, years, generation],
  )
  const description = useMemo(
    () => catalogDescription(brand, model, years),
    [brand, model, years],
  )

  /* SEO: H1, title и meta description меняются вместе с фильтром каталога. */
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    document.title = heading
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', description)
    headingRef.current?.focus({ preventScroll: true })
  }, [heading, description])

  /* Восстанавливаем глобальные title и description при уходе со страницы
     (каталог переопределяет их, а <head> в index.html — единственный источник). */
  useEffect(() => {
    return () => {
      document.title = SITE_TITLE
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', SITE_DESCRIPTION)
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold tracking-tight outline-none">
          {heading}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Выберите марку, модель и год выпуска автомобиля — покажем пороги или колёсные арки, которые
          подходят для вашего кузова.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        {vehicleReady && (
          <div className="mb-4 rounded-md border border-accent/50 bg-secondary p-3 text-sm sm:hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium">Выбранный автомобиль</div>
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
          <div className="mt-1 font-bold text-muted-foreground">
            {[brand, model, years].filter(Boolean).join(' · ')}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="mt-2 text-sm font-medium text-[#16a34a] underline-offset-4 hover:underline"
          >
            Изменить автомобиль
          </button>
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
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Год выпуска</span>
            <select
              value={years}
              onChange={(event) => handleYears(event.target.value)}
              disabled={!model}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{model ? 'Все годы' : 'Сначала выберите модель'}</option>
              {yearsOptions.map((item) => (
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
            <span className="mb-1.5 block text-sm font-bold text-[#16a34a]">Год выпуска</span>
            <select
              value={years}
              onChange={(event) => handleYears(event.target.value)}
              disabled={!model}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{model ? 'Все годы' : 'Сначала выберите модель'}</option>
              {yearsOptions.map((item) => (
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
            Измените марку, модель или год выпуска — в каталоге есть другие варианты.
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
            <CatalogCard key={part.id} part={part} />
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
