import { useEffect } from 'react'
import { YANDEX_FEED_XML } from '@/data/yandexFeed'

/**
 * Страница-роут, отдающая YML-фид Яндекс.Маркета как чистый XML по адресу /yandex.xml.
 * Тело и заголовок документа записываются напрямую в document, без интерфейса сайта.
 */
export default function MarketFeed() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'yandex.xml — фид Яндекс.Маркета'
    document.open('application/xml;charset=utf-8')
    document.write(YANDEX_FEED_XML)
    document.close()
    return () => {
      document.title = previousTitle
    }
  }, [])

  return null
}
