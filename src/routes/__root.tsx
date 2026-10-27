import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import '@fontsource-variable/geist'
import stylesheet from '@/styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Superpilot — Ad studio' },
      { name: 'description', content: 'An Instagram ad creation work sample.' },
    ],
    links: [{ rel: 'stylesheet', href: stylesheet }],
  }),
  component: () => <Outlet />,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.classList.toggle('dark',localStorage.getItem('superpilot-theme-v1')==='dark')}catch{}` }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
