import { createContext, useState, type Child } from "hono/jsx";
import { Context } from "hono";

export const GameContext = createContext<null>(null);
export function GameContextProvider({ children }: { children: Child }) {
  return <GameContext.Provider value={null}>{children}</GameContext.Provider>;
}

export function MainLayout({ children, c }: { children: Child; c: Context }) {
  return (
    <html>
      <head>
        <title>Master F Tool</title>
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="msapplication-navbutton-color" content="#0a0a0a" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <script src="https://cdn.jsdelivr.net/npm/appwrite@21.4.0"></script>
        <script src="//unpkg.com/alpinejs" defer></script>
        
        <script
          src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.8/dist/htmx.min.js"
          integrity="sha384-/TgkGk7p307TH7EXJDuUlgG3Ce1UVolAOFopFekQkkXihi5u/6OCvVKyz1W+idaz"
          crossorigin="anonymous"
          defer
        ></script>
        <script src="/static/htmx-hook.js" defer></script>

        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body class="m-0 p-0 min-h-screen bg-neutral-950">
        <GameContextProvider>{children}</GameContextProvider>
      </body>
    </html>
  );
}
