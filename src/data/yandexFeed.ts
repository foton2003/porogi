import part0 from '@/feed/yandex-part-0'
import part1 from '@/feed/yandex-part-1'
import part2 from '@/feed/yandex-part-2'
import part3 from '@/feed/yandex-part-3'
import part4 from '@/feed/yandex-part-4'
import part5 from '@/feed/yandex-part-5'

/**
 * YML-фид Яндекс.Маркета: собирается из автосгенерированных фрагментов src/feed/*.
 * Полная копия фида также лежит в public/uploads/yandex.xml.
 */
export const YANDEX_FEED_XML: string =
  `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-10-09T00:00:00+03:00">
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
  </shop>
</yml_catalog>
`
