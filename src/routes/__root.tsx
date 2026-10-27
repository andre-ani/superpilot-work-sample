import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '@fontsource-variable/geist'
import { SuperpilotGrid } from '@/components/superpilot-grid'
import { AppError, AppNotFound } from '@/components/app-error'
import stylesheet from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'superpilot' },
      { name: 'description', content: 'An Instagram ad creation work sample.' },
    ],
    links: [{ rel: 'stylesheet', href: stylesheet }],
  }),
  errorComponent: ({ reset }) => <AppError onReset={reset} />,
  notFoundComponent: () => <AppNotFound />,
  component: () => <Outlet />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const media=matchMedia('(prefers-color-scheme: dark)');const sync=()=>{const theme=localStorage.getItem('superpilot-theme-v1');document.documentElement.classList.toggle('dark',theme==='dark'||theme==='system'&&media.matches)};sync();media.addEventListener('change',()=>{try{if(localStorage.getItem('superpilot-theme-v1')==='system')sync()}catch{}})}catch{}` }} />
        <HeadContent />
      </head>
      <body className="isolate">
        <SuperpilotGrid />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
