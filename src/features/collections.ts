import { ARKA_IMAGE, POROG_IMAGE, type Part, type PartType } from '@/data/catalog'

/** Домен магазина, на котором опубликован сайт и обслуживается yandex.xml. */
const SITE_ORIGIN = 'https://porogi.pro'

/** Экранирование текста для XML-узла или значения атрибута в двойных кавычках. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface CollectionSource {
  /**
   * Все позиции каталога после нормализации марок и моделей: используется только
   * для перечисления пар «марка + модель» в том же порядке, что и фильтр каталога.
   */
  parts: Part[]
  /** URL страницы каталога для фильтра «пороги и арки» + марка + модель. */
  buildPath: (brand: string, model: string) => string
  /** <title> страницы каталога для пары «марка + модель». */
  heading: (brand: string, model: string) => string
  /** meta description страницы каталога для пары «марка + модель». */
  description: (brand: string, model: string) => string
}

interface CollectionPage {
  brand: string
  model: string
  kinds: Set<PartType>
}

const KIND_ORDER: PartType[] = ['порог', 'арка']

const KIND_IMAGE: Record<PartType, string> = {
  порог: POROG_IMAGE,
  арка: ARKA_IMAGE,
}

/**
 * Страницы каталога по марке и модели: порядок вхождения в PARTS совпадает с
 * порядком марок и моделей в селектах фильтра.
 */
function collectionPages(parts: Part[]): CollectionPage[] {
  const pages = new Map<string, CollectionPage>()

  for (const part of parts) {
    const { brand, model } = part.vehicle
    if (!brand || !model) continue
    const key = `${brand}::${model}`
    const existing = pages.get(key)
    if (existing) existing.kinds.add(part.type)
    else pages.set(key, { brand, model, kinds: new Set<PartType>([part.type]) })
  }

  return Array.from(pages.values())
}

/**
 * Блок <collections> для YML-фида: страница каталога на каждую пару «марка + модель»
 * с картинками тех типов деталей, которые для этой модели реально есть в каталоге.
 */
export function buildYandexCollections(source: CollectionSource): string {
  const entries = collectionPages(source.parts).map((page) => {
    const kinds = KIND_ORDER.filter((kind) => page.kinds.has(kind))
    const pictures = kinds.map((kind) => `      <picture>${escapeXml(KIND_IMAGE[kind])}</picture>`)
    return [
      `    <collection id="${escapeXml(`${page.brand} ${page.model}`)}">`,
      `      <url>${escapeXml(SITE_ORIGIN + source.buildPath(page.brand, page.model))}</url>`,
      ...pictures,
      `      <name>${escapeXml(source.heading(page.brand, page.model))}</name>`,
      `      <description>${escapeXml(source.description(page.brand, page.model))}</description>`,
      '    </collection>',
    ].join('\n')
  })

  return ['  <collections>', ...entries, '  </collections>'].join('\n') + '\n'
}
