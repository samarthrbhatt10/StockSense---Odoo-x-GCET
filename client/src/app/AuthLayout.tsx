import { Outlet } from 'react-router'

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                className="text-primary-foreground"
              />
              <path
                d="M4 8.5 12 13l8-4.5M12 13v7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
                className="text-primary-foreground"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold tracking-tight text-foreground">StockSense</p>
          <p className="text-sm text-muted-foreground">Inventory management</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
