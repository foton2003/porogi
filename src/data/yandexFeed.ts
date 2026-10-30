import part0 from '@/feed/yandex-part-0'
import part1 from '@/feed/yandex-part-1'
import part2 from '@/feed/yandex-part-2'
import part3 from '@/feed/yandex-part-3'
import part4 from '@/feed/yandex-part-4'
import part5 from '@/feed/yandex-part-5'
import { PARTS, buildCatalogPath } from '@/data/catalog'
import { catalogDescription, catalogHeading } from '@/lib/catalogSeo'
import { buildYandexCollections } from '@/features/collections'

/**
 * Блок <collections>: по одной коллекции на каждую страницу каталога
 * «пороги и арки» → марка → модель. Title и description берутся из тех же
 * шаблонов, что и на самой странице каталога.
 */
export const YANDEX_COLLECTIONS_XML: string = buildYandexCollections({
  parts: PARTS,
  buildPath: (brand, model) => buildCatalogPath('все', brand, model, ''),
  heading: (brand, model) => catalogHeading('все', brand, model, '', ''),
  description: (brand, model) => catalogDescription(brand, model, ''),
})

/**
 * YML-фид Яндекс.Маркета: собирается из автосгенерированных фрагментов src/feed/*.
 * Элемент <collections> ставится внутри <shop> сразу после <offers>.
 * Полная копия фида лежит в public/uploads/yandex.xml.
 */
export const YANDEX_FEED_XML: string =
  `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-10-20T00:00:00+03:00">
  <shop>
    <name>Магазин кузовных порогов и арок</name>
    <company>Магазин кузовных порогов и арок</company>
    <url>https://porogi.pro/</url>
    <currencies>
      <currency id="RUR" rate="1" symbol="₽"/>
    </currencies>
    <categories>
      <category id="1">Кузовные детали</category>
      <category id="2" parentId="1">Кузовные пороги</category>
      <category id="3" parentId="1">Колёсные арки</category>
    </categories>
    <offers>
` +
  part0 +
  part1 +
  part2 +
  part3 +
  part4 +
  part5 +
  `    </offers>
` +
  YANDEX_COLLECTIONS_XML +
  `  </shop>
</yml_catalog>
`
