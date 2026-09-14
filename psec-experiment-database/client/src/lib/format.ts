import type { Language } from "@/contexts/LanguageContext";

function dateFor(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function localeFor(language: Language) {
  return language === "zh" ? "zh-CN" : "en-US";
}

export function formatDate(value: unknown, language: Language) {
  const date = dateFor(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(localeFor(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: unknown, language: Language) {
  const date = dateFor(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(localeFor(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
