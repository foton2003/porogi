import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, X } from 'lucide-react'
import { BRANDS, buildCatalogPath, modelsForBrand, yearsFor } from '@/data/catalog'

type Level = 'brand' | 'model' | 'years'

interface MobileVehicleMenuProps {
  open: boolean
  onClose: () => void
}

/**
 * Мобильное трёхуровневое меню каталога: Марка → Модель → Год выпуска.
 * Данные берутся из тех же функций каталога, что и фильтр на странице,
 * поэтому пункт меню открывает ровно тот же адрес, что и ручной подбор.
 *
 * Слой рендерится через портал в document.body: он не должен быть потомком
 * sticky-шапки с backdrop-blur — на реальных Android это ломало отрисовку
 * fixed-оверлея (список марок не появлялся), в то время как в десктопной
 * эмуляции баг маскировался.
 */
export default function MobileVehicleMenu({ open, onClose }: MobileVehicleMenuProps) {
  const navigate = useNavigate()
  const [level, setLevel] = useState<Level>('brand')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [mounted, setMounted] = useState(false)

  const models = useMemo(() => (brand ? modelsForBrand(brand) : []), [brand])
  const years = useMemo(() => (brand && model ? yearsFor(brand, model) : []), [brand, model])

  /* Прячем слой до первого кадра после открытия, чтобы не было «мигания» пустого пространства. */
  useLayoutEffect(() => {
    if (!open) return
    setMounted(false)
    const frame = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  /* Закрываем меню на любой смене маршрута (выбор года, тап по «Контакты» и т. д.). */
  useEffect(() => {
    if (!open) return
    const previous = window.location.pathname
    const check = () => {
      if (window.location.pathname !== previous) onClose()
    }
    window.addEventListener('popstate', check)
    const timer = window.setInterval(check, 250)
    return () => {
      window.removeEventListener('popstate', check)
      window.clearInterval(timer)
    }
  }, [open, onClose])

  /* Блокируем прокрутку страницы и закрываем по Escape, пока меню открыто. */
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const reset = () => {
    setBrand('')
    setModel('')
    setLevel('brand')
    setMounted(false)
  }

  const close = () => {
    onClose()
    // Состояние сбрасываем после закрытия, чтобы меню не «мигнуло» предыдущим уровнем.
    window.setTimeout(reset, 200)
  }

  const pickBrand = (value: string) => {
    setBrand(value)
    setModel('')
    setLevel('model')
  }

  const pickModel = (value: string) => {
    setModel(value)
    setLevel('years')
  }

  const pickYear = (value: string) => {
    navigate(buildCatalogPath('все', brand, model, value))
    close()
  }

  const goBack = () => {
    if (level === 'years') setLevel('model')
    else if (level === 'model') setLevel('brand')
    else close()
  }

  const title =
    level === 'brand' ? 'Выберите марку' : level === 'model' ? 'Выберите модель' : 'Год выпуска'
  const subtitle =
    level === 'brand'
      ? undefined
      : level === 'model'
        ? brand
        : `${brand} ${model}`

  const items =
    level === 'brand' ? BRANDS : level === 'model' ? models : years.filter(Boolean)

  return createPortal(
    <div
      className={`fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col border-t border-border bg-background sm:hidden ${
        mounted ? '' : 'invisible'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Меню каталога"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={goBack}
          aria-label={level === 'brand' ? 'Закрыть меню каталога' : 'Назад'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title}</div>
          {subtitle ? (
            <div className="truncate text-sm text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть меню каталога"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <nav
        aria-label={title}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => {
                  if (level === 'brand') pickBrand(item)
                  else if (level === 'model') pickModel(item)
                  else pickYear(item)
                }}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-base transition-colors hover:bg-secondary"
              >
                <span className="min-w-0 truncate">{item}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Нет доступных вариантов.</p>
        ) : null}
      </nav>
    </div>,
    document.body,
  )
}
