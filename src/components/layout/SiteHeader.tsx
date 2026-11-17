"use client";

import Link from "next/link";
import { useApp } from "@/context/AppProviders";
import type { ThemePreference } from "@/lib/preferences";
import styles from "./SiteHeader.module.css";

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Theme: match system",
  light: "Theme: light",
  dark: "Theme: dark",
};

export function SiteHeader() {
  const { settings, updateSettings, history } = useApp();

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Triad home">
        <Logo />
        <span>triad</span>
      </Link>
      <nav className={styles.nav} aria-label="Site">
        <Link href="/history" className={styles.link}>
          History
          {history.length > 0 && <span className={styles.count}>{history.length}</span>}
        </Link>
        <button
          type="button"
          className={styles.icon}
          aria-pressed={settings.sound}
          aria-label="Sound effects"
          title={settings.sound ? "Sound on" : "Sound off"}
          onClick={() => updateSettings({ sound: !settings.sound })}
        >
          {settings.sound ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        <button
          type="button"
          className={styles.icon}
          aria-label={`${THEME_LABEL[settings.theme]}. Change theme`}
          title={THEME_LABEL[settings.theme]}
          onClick={() => updateSettings({ theme: NEXT_THEME[settings.theme] })}
        >
          <ThemeIcon theme={settings.theme} />
        </button>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className={styles.logo}>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--ink)" />
      <circle cx="10" cy="22" r="3" fill="var(--p1)" />
      <circle cx="16" cy="16" r="3" fill="var(--bg)" />
      <circle cx="22" cy="10" r="3" fill="var(--p2)" />
    </svg>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SoundOnIcon() {
  return (
    <svg {...iconProps}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  if (theme === "light") {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...iconProps}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  );
}
