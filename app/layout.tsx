import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./lib/theme-context";
import { AuthProvider } from "./lib/auth-context";
import { ToastProvider } from "./lib/toast-context";
import AuthGuard from "./components/AuthGuard";
import AIChatWidget from "./components/AIChatWidget";

export const metadata: Metadata = {
  title: "Nexus Community | Connect, Discuss & Collaborate",
  description: "Next-generation community platform for engineers, creators, and technology leaders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased dark"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('nexus-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isLight = t === 'light' || (t === 'system' && !prefersDark);
                if (isLight) {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-orange-500/30 selection:text-orange-200 transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <AuthGuard>
                {children}
                <AIChatWidget />
              </AuthGuard>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
