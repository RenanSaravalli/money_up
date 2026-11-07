import type { Metadata, Viewport } from "next";
import { PwaRegistration } from "@/components/pwa-registration";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("fluxo-theme");
    var cookie = document.cookie.match(/(?:^|; )fluxo-theme=([^;]*)/);
    var theme = stored === "light" || (!stored && cookie && decodeURIComponent(cookie[1]) === "light") ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  title: {
    default: "Fluxo — Suas finanças, em movimento",
    template: "%s · Fluxo",
  },
  description:
    "Seu espaço pessoal para acompanhar receitas, despesas e contas. Clareza para o seu dinheiro, todos os dias.",
  applicationName: "Fluxo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fluxo",
  },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#102B70",
  colorScheme: "dark light",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRegistration />
      </body>
    </html>
  );
}
