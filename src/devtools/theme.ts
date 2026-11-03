import { useEffect, useState } from "react";

export type ThemeSetting = "light" | "dark" | "system";

export function useSystemDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return dark;
}

export function useResolvedTheme(setting: ThemeSetting): "light" | "dark" {
  const systemDark = useSystemDark();
  return setting === "system" ? (systemDark ? "dark" : "light") : setting;
}
