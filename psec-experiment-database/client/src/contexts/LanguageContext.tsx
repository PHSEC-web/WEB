import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "zh" | "en";

const translations = {
  zh: {
    overview: "概览",
    socialPsychology: "社会心理学",
    behavioralEconomics: "行为经济学",
    sociology: "社会学",
    philosophy: "哲学",
    search: "搜索",
    myRecords: "我的记录",
    submitIdea: "提交研究想法",
    archive: "研究档案",
    submissionGuidelines: "投稿说明",
    adminAccess: "管理员入口",
    languageLabel: "切换语言",
    loading: "正在加载档案…",
  },
  en: {
    overview: "Overview",
    socialPsychology: "Social Psychology",
    behavioralEconomics: "Behavioral Economics",
    sociology: "Sociology",
    philosophy: "Philosophy",
    search: "Search",
    myRecords: "My records",
    submitIdea: "Submit an idea",
    archive: "Research archive",
    submissionGuidelines: "Submission guidelines",
    adminAccess: "Admin Access",
    languageLabel: "Switch language",
    loading: "Loading archive…",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

type LanguageContextValue = {
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "zh";
    return window.localStorage.getItem("psec-language") === "en" ? "en" : "zh";
  });

  useEffect(() => {
    window.localStorage.setItem("psec-language", language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      toggleLanguage: () => setLanguage(current => (current === "zh" ? "en" : "zh")),
      t: (key: TranslationKey) => translations[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
