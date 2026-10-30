import { createServer, type Plugin } from 'vite'
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const FEED_PATHS = ['/yandex.xml', '/uploads/yandex.xml']

/** Generate both public feed URLs from the same pure TypeScript source. */
export function yandexFeedPlugin(root: string): Plugin {
  let building = false
  return {
    name: 'porogi-static-yandex-feed',
    configResolved(config) { building = config.command === 'build' },
    async buildStart() {
      if (!building) return
      const cacheDir = await mkdtemp(path.join(tmpdir(), 'porogi-feed-'))
      let loader: Awaited<ReturnType<typeof createServer>> | undefined
      try {
        loader = await createServer({
        root,
        cacheDir,
        configFile: false,
        server: { middlewareMode: true, hmr: false },
        resolve: { alias: { '@': path.join(root, 'src') } },
        logLevel: 'error',
        })
        const { YANDEX_XML_DOCUMENT: xml } = await loader.ssrLoadModule('/src/data/yandexXml.ts')
        if (typeof xml !== 'string' || !xml.startsWith('<?xml ') ||
            (xml.match(/<\?xml\s/g) ?? []).length !== 1 || !xml.includes('<collections>')) {
          throw new Error('Invalid generated Yandex feed')
        }
        for (const url of FEED_PATHS) {
          this.emitFile({ type: 'asset', fileName: url.slice(1), source: xml })
        }
      } finally {
        await loader?.close()
        await rm(cacheDir, { recursive: true, force: true })
      }
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!FEED_PATHS.includes((request.url ?? '').split('?')[0]) ||
            !['GET', 'HEAD'].includes(request.method ?? '')) return next()
        try {
          const { YANDEX_XML_DOCUMENT: xml } = await server.ssrLoadModule('/src/data/yandexXml.ts')
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/xml; charset=utf-8')
          response.setHeader('Content-Length', Buffer.byteLength(xml))
          response.setHeader('Cache-Control', 'no-store')
          response.end(request.method === 'HEAD' ? undefined : xml)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
