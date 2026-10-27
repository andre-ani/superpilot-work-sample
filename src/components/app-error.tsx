import { Link, useRouter } from '@tanstack/react-router'
import { IconAlertCircle, IconHome2, IconMapOff, IconRefresh } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type ErrorFrameProps = {
  icon: ReactNode
  title: string
  description: string
  actions: ReactNode
}

function ErrorFrame({ icon, title, description, actions }: ErrorFrameProps) {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-transparent px-5 py-12 text-foreground sm:px-8">
        <section className="w-full max-w-lg rounded-2xl border border-border/80 bg-background p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-primary">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10" aria-hidden="true">
            {icon}
          </span>
          <span>superpilot</span>
        </div>
        <div className="mt-8 space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-2">{actions}</div>
      </section>
    </main>
  )
}

function reloadPage() {
  window.location.reload()
}

export function AppError({ onReset }: { onReset?: () => void }) {
  const router = useRouter()

  return (
    <ErrorFrame
      icon={<IconAlertCircle size={20} stroke={1.8} />}
      title="This screen couldn’t load."
      description="Try loading it again, or go back to the start. Your saved work won’t be cleared."
      actions={
        <>
          <Button onClick={() => { void router.invalidate().finally(() => onReset?.()) }}>
            <IconRefresh aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" onClick={reloadPage}>
            <IconRefresh aria-hidden="true" />
            Reload page
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/">
              <IconHome2 aria-hidden="true" />
              Back to start
            </Link>
          </Button>
        </>
      }
    />
  )
}

export function AppNotFound() {
  return (
    <ErrorFrame
      icon={<IconMapOff size={20} stroke={1.8} />}
      title="That page is not available."
      description="The link may be out of date. Your saved work is still here; head back to the start to continue."
      actions={
        <>
          <Button asChild>
            <Link to="/">
              <IconHome2 aria-hidden="true" />
              Back to start
            </Link>
          </Button>
          <Button variant="outline" onClick={reloadPage}>
            <IconRefresh aria-hidden="true" />
            Reload page
          </Button>
        </>
      }
    />
  )
}
