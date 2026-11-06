import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";
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
  colorScheme: "dark",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
        <PwaRegistration />
      </body>
    </html>
  );
}
