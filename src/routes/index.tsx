import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IconArrowUp } from '@tabler/icons-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/')({ component: AdStudio })

function AdStudio() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<string[]>([])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = input.trim()
    if (!message) return
    setMessages((current) => [...current, message])
    setInput('')
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">superpilot</span>
          <span className="text-sm text-muted-foreground">Ad studio</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-24">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">What are we making?</h1>
          <p className="mt-3 text-base text-muted-foreground">Start with a brand. Make something worth stopping for.</p>
        </div>

        {messages.length > 0 ? (
          <div role="log" aria-label="Conversation" aria-live="polite" className="mb-6 max-h-64 space-y-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                <p className="ml-auto w-fit max-w-[90%] rounded-xl bg-muted px-4 py-3 text-sm break-words">{message}</p>
                <p className="text-sm text-muted-foreground">Brief captured for this session. Ad generation is coming next.</p>
              </div>
            ))}
          </div>
        ) : null}

        <form onSubmit={submit} className="relative">
          <label htmlFor="prompt" className="sr-only">Describe your ad</label>
          <Input id="prompt" name="prompt" variant="composer" placeholder="Describe an ad for your brand…"
            value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000}
            autoComplete="off" aria-describedby="composer-note" />
          <div className="absolute top-1/2 right-2 -translate-y-1/2">
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send message">
              <IconArrowUp aria-hidden="true" />
            </Button>
          </div>
        </form>
        <p id="composer-note" className="mt-3 text-center text-xs text-muted-foreground">A starting point for your next Instagram ad.</p>
      </main>
    </div>
  )
}
