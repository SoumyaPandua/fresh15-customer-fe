import type { Metadata, Viewport } from "next";
import "@/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Fresh15 — Groceries delivered in 15 minutes",
  description: "Order fruits, vegetables, dairy, bakery and daily essentials — delivered in 15 minutes.",
  applicationName: "Fresh15",
  authors: [{ name: "Fresh15" }],
  openGraph: {
    title: "Fresh15 — Groceries delivered in 15 minutes",
    description: "Order fruits, vegetables, dairy, bakery and daily essentials — delivered in 15 minutes.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fresh15 — Groceries delivered in 15 minutes",
    description: "Order fresh groceries, snacks and essentials in seconds.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16a34a",
};

const themeScript = `try{const t=JSON.parse(localStorage.getItem('fresh15-theme')||'{}');const m=t?.state?.theme;if(m==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
