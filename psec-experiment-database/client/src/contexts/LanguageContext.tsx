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
    heroEyebrow: "平和社会实验社 · 研究档案",
    heroTitle: "让问题，\n经得起检验。",
    heroDescription: "一个由学生维护的社会科学研究档案，记录想法、实验设计、证据与下一步问题。",
    exploreArchive: "浏览研究档案",
    addEvidence: "补充实验证据",
    liveArchive: "档案运行中",
    records: "条记录",
    disciplines: "个学科",
    archiveNote: "每一条记录，都保留它的理论依据、作者和演进过程。",
    scrollToExplore: "向下滚动，开始探索",
    clubEyebrow: "01 / 关于社团",
    clubTitle: "把社会问题，变成可以认真检验的实验。",
    clubDescription: "平和社会实验社鼓励同学观察社会、提出可验证的问题，并在负责任的研究过程中共同学习。未完成的问题不是终点，而是共同工作的起点。",
    archiveMemory: "档案是我们的共同记忆：让思考变得清晰，记录贡献，也让下一位研究者更容易继续。",
    whatPsec: "PSEC 是什么",
    whatPsecText: "一个把社会观察转化为伦理、可检验问题的学生研究社团。",
    whatArchive: "我们记录什么",
    whatArchiveText: "想法、设计、执行记录、证据、结果，以及下一个问题。",
    beginRecord: "开始一条记录",
    beginRecordText: "提交你的研究想法，让它随着实践继续成长。",
    databaseEyebrow: "02 / 研究档案",
    databaseTitle: "研究不应该停在一个版本。",
    databaseDescription: "从问题到设计，从证据到结果，档案让每一次修改都可追溯，也让好的问题继续流动。",
    archiveCardTitle: "找到那条线索",
    archiveCardText: "按学科、理论或研究者查找已公开的记录。",
    iterateCardTitle: "留下演进轨迹",
    iterateCardText: "保留投稿、审核、结果和反思，诚实记录研究如何变得更好。",
    shareCardTitle: "让证据被看见",
    shareCardText: "公开已批准的报告与图片，也为作品集保留清晰的证据链。",
    startEyebrow: "03 / 从这里开始",
    startTitle: "找到一个值得继续的问题。",
    startDescription: "搜索实验、理论、研究者、学科或档案分类。",
    searchPlaceholder: "搜索研究档案…",
    searchResults: "搜索结果",
    shown: "条结果",
    noMatch: "没有找到匹配的公开记录。",
    browseAll: "浏览全部档案",
    latestEyebrow: "04 / 最新投稿",
    latestTitle: "你的下一个研究，从这里开始。",
    latestDescription: "无论是还没成形的想法、可以执行的方案，还是已经完成的项目，都可以留下作者、时间和演进轨迹。",
    openForm: "打开投稿表单",
    noRecords: "还没有成员投稿，欢迎成为第一位。",
    notesEyebrow: "05 / 档案原则",
    notesTitle: "让想法变得清楚。",
    standardize: "保持一致",
    standardizeText: "使用清晰、统一的字段，让其他成员可以理解并延伸你的工作。",
    iterate: "允许迭代",
    iterateText: "诚实保存未完成的工作。清晰的下一个问题，本身就是有价值的结果。",
    protect: "保护参与者",
    protectText: "在涉及人的研究中，提前考虑同意、隐私、风险最小化、事后说明和学校审核。",
    resultsAdded: "已有结果",
    archiveRecords: "公开记录",
    searchArchive: "搜索档案",
    brandArchive: "研究档案",
    brandTitle: "社会实验数据库",
    footerDescription: "关于实验、思考框架和下一个问题的共同记忆，由 PSEC 成员共同维护。",
    rights: "保留所有权利 · 2026",
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
    heroEyebrow: "Pinghe Social Experiment Club · Research archive",
    heroTitle: "Questions worth\ntesting.",
    heroDescription: "A student-led social science archive for ideas, experimental designs, evidence, and the next question.",
    exploreArchive: "Explore the archive",
    addEvidence: "Add experiment evidence",
    liveArchive: "Archive live",
    records: "records",
    disciplines: "disciplines",
    archiveNote: "Every record keeps its theoretical basis, author, and revision trail.",
    scrollToExplore: "Scroll to explore",
    clubEyebrow: "01 / The club",
    clubTitle: "Turn social questions into careful experiments.",
    clubDescription: "Pinghe Social Experiment Club brings students together to notice the social world closely, form testable questions, and learn through responsible research. An unfinished question is not a dead end—it is the beginning of shared work.",
    archiveMemory: "The archive is our common memory: a place to make thinking legible, recognize contributors, and give the next researcher a clearer place to begin.",
    whatPsec: "What is PSEC",
    whatPsecText: "A student research club that turns social observation into ethical, testable questions.",
    whatArchive: "What we archive",
    whatArchiveText: "Ideas, designs, execution records, evidence, results, and the next question.",
    beginRecord: "Begin a record",
    beginRecordText: "Add your research idea and let the record grow with your work.",
    databaseEyebrow: "02 / The research archive",
    databaseTitle: "Research should never stop at one version.",
    databaseDescription: "From question to design, evidence to result, the archive keeps every revision legible and lets good questions stay in motion.",
    archiveCardTitle: "Find the thread",
    archiveCardText: "Browse published records by discipline, theory, or researcher.",
    iterateCardTitle: "Keep the trail",
    iterateCardText: "Preserve submissions, reviews, results, and reflections as the work evolves.",
    shareCardTitle: "Show the evidence",
    shareCardText: "Share approved reports and images with a clear, durable chain of evidence.",
    startEyebrow: "03 / Start here",
    startTitle: "Find a question worth continuing.",
    startDescription: "Search by experiment, theory, researcher, discipline, or archive category.",
    searchPlaceholder: "Search the archive…",
    searchResults: "Search results",
    shown: "shown",
    noMatch: "No published records match this search.",
    browseAll: "Browse all records",
    latestEyebrow: "04 / Latest submissions",
    latestTitle: "Your next study starts here.",
    latestDescription: "Submit an unfinished concept, a ready-to-run protocol, or a completed project. Every entry keeps its author, timestamp, and iteration trail.",
    openForm: "Open submission form",
    noRecords: "No member records yet — be the first to add one.",
    notesEyebrow: "05 / Archive principles",
    notesTitle: "Make the idea legible.",
    standardize: "Standardize",
    standardizeText: "Use clear, consistent fields so another member can understand and extend the work.",
    iterate: "Iterate",
    iterateText: "Archive unfinished work honestly. A clear next question is already a useful result.",
    protect: "Protect participants",
    protectText: "Plan consent, privacy, debriefing, risk minimization, and school review before collecting human-subject data.",
    resultsAdded: "Results added",
    archiveRecords: "Published records",
    searchArchive: "Search archive",
    brandArchive: "Research archive",
    brandTitle: "Social Experiment Database",
    footerDescription: "A shared research memory for experiments, thought frameworks, and next questions. Built by PSEC members.",
    rights: "All rights reserved · 2026",
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
