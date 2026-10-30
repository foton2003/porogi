import { useEffect } from 'react'

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

/**
 * Увеличенное фото во всплывающем окне: подложка, кнопка ✕ и Esc.
 * Используется для фото пенок в каталоге и на карточке товара.
 */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Увеличенное фото: ${alt}`}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть фото"
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/40 text-xl text-white transition-colors hover:bg-black/60"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}
