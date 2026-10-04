import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="text-6xl font-bold tracking-tight">404</div>
        <p className="text-muted-foreground">Такой страницы не существует.</p>
        <Link
          to="/"
          className="mt-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          На главную
        </Link>
      </div>

      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Предложение не является публичной офертой.
        </div>
      </footer>
    </div>
  )
}
