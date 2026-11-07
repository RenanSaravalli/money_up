"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Check, Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

export type AppTheme = "dark" | "light";

const STORAGE_KEY = "fluxo-theme";
const ThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
} | null>(null);
const themes: Array<{
  value: AppTheme;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    label: "Claro",
    description: "Visual leve",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Escuro",
    description: "Menos brilho",
    icon: Moon,
  },
];

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "light" ? "#F4F7FC" : "#102B70");
}

function readStoredTheme(): AppTheme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  const cookie = document.cookie.match(/(?:^|; )fluxo-theme=([^;]*)/);
  return cookie && decodeURIComponent(cookie[1]) === "light" ? "light" : "dark";
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener("fluxo-theme-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("fluxo-theme-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<AppTheme>(
    subscribeToTheme,
    readStoredTheme,
    (): AppTheme => "dark",
  );

  useLayoutEffect(() => {
    // React remounts the document in development; re-read the external source
    // so that this also restores the attribute after that remount.
    applyTheme(readStoredTheme());
  }, [theme]);

  function setTheme(nextTheme: AppTheme) {
    localStorage.setItem(STORAGE_KEY, nextTheme);
    document.cookie = `${STORAGE_KEY}=${nextTheme}; path=/; max-age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    applyTheme(nextTheme);
    window.dispatchEvent(new Event("fluxo-theme-change"));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      <Toaster theme={theme} position="top-center" richColors closeButton />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider ausente");
  return context;
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="profile-theme-section">
      <div className="profile-theme-heading">
        <span>Aparência</span>
        <small>Escolha como o Fluxo aparece neste aparelho.</small>
      </div>
      <div
        className="theme-options"
        role="group"
        aria-label="Tema do aplicativo"
      >
        {themes.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn("theme-option", theme === option.value && "active")}
            aria-pressed={theme === option.value}
            onClick={() => setTheme(option.value)}
          >
            <span className="theme-option-icon">
              <option.icon size={18} />
            </span>
            <span>
              {option.label}
              <small>{option.description}</small>
            </span>
            {theme === option.value && (
              <Check className="theme-option-check" size={15} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
