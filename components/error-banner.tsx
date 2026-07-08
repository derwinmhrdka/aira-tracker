interface ErrorBannerProps {
  message?: string
  onRetry?: () => void
}

export function ErrorBanner({
  message = 'Gagal memuat data',
  onRetry,
}: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 font-semibold underline"
        >
          Coba lagi
        </button>
      )}
    </div>
  )
}
