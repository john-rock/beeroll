import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ThemeToggle } from "./components/ThemeToggle";
import PlausibleProvider from 'next-plausible'

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "beeroll - Local first screen recording",
  description: "Lightweight, browser-based screen recording application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const root = document.documentElement;
                  
                  // Remove any existing theme classes
                  root.classList.remove('light', 'dark');
                  
                  if (savedTheme === 'dark' || (savedTheme === 'system' && systemPrefersDark) || (!savedTheme && systemPrefersDark)) {
                    root.classList.add('dark');
                  } else {
                    root.classList.add('light');
                  }
                } catch (e) {
                  // Fallback to system preference if localStorage fails
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.add('light');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        <PlausibleProvider domain="beeroll.app" trackFileDownloads taggedEvents>
          <ThemeProvider>
            {children}
            <ThemeToggle />
          </ThemeProvider>
        </PlausibleProvider>
      </body>
    </html>
  );
}
