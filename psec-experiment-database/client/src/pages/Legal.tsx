import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

type LegalKind = "privacy" | "terms" | "research-ethics" | "content-policy";

type Section = { title: string; paragraphs: string[]; bullets?: string[] };

const copy = {
  zh: {
    privacy: {
      eyebrow: "PSEC / 隐私与数据",
      title: "隐私政策",
      intro: "本政策说明 PSEC 学生研究档案如何收集、使用、保存和保护信息。它是面向社团成员的清晰说明，不替代学校、监护人或专业法律意见。",
      sections: [
        { title: "我们处理哪些信息", paragraphs: ["登录时会处理学校邮箱、账号标识、姓名（如你提供）、登录时间和用于防滥用的请求信息。投稿、审核和证据补充可能包含研究文本、成员 ID、附件、审核历史和删除记录。"], bullets: ["不要上传身份证件、住址、电话号码、健康信息、账号密码或可识别受试者资料。", "附件可能包含照片、录音、视频、原始数据或文档元数据；上传前请检查。"] },
        { title: "使用目的和公开范围", paragraphs: ["这些信息用于学校邮箱登录、保存和审核研究档案、处理附件、维护版本历史、发送验证码和防止滥用。只有被管理员批准的记录和明确设置为公开的附件才会进入公开档案；公开内容可能被搜索、下载、转载或长期保存。"] },
        { title: "保存、删除与更正", paragraphs: ["我们会在实现上述目的所需期间保存投稿、审核和版本记录。成员可以在“我的记录”删除自己的项目；已删除内容会从公开视图移除，但为安全、争议处理和审计而保留的必要历史不一定立即物理删除。发现错误、需要更正或希望提出删除请求时，请通过社团或学校渠道联系管理员，并说明记录标题。"] },
        { title: "未成年人和受试者", paragraphs: ["本网站可能由未成年人使用。涉及未成年人的个人信息、照片、视频、声音或研究数据前，应取得适用法律要求的监护人同意和学校批准。PSEC 不替代学校伦理审查，也不代表管理员审核就是研究批准。"] },
        { title: "第三方服务与境外处理", paragraphs: ["网站使用阿里云服务器、对象存储和邮件服务来运行应用、保存附件和发送验证码。服务器或服务商可能位于境外；请不要上传不必要的个人信息或可识别受试者资料。服务商的处理还受其自身条款和隐私政策约束。"] },
        { title: "安全说明", paragraphs: ["我们使用学校邮箱验证码、受限附件访问、最小权限配置和管理员审核等措施，但互联网传输和在线服务不存在绝对安全保证。若你发现疑似泄露、越权访问或恶意内容，请尽快通过学校/社团渠道报告。"] },
      ] as Section[],
    },
    terms: {
      eyebrow: "PSEC / 网站规则",
      title: "使用条款",
      intro: "使用 PSEC 即表示你理解这是学生社团的教育性研究档案，而不是商业出版平台、伦理审查机构、医疗服务或法律咨询服务。",
      sections: [
        { title: "可以做什么", paragraphs: ["你可以在遵守学校规则、适用法律和本条款的前提下浏览公开档案、提交研究想法、补充结果和上传研究材料。投稿先进入私有审核队列，管理员可以要求修改、拒绝、隐藏或删除内容。"] },
        { title: "你对投稿负责", paragraphs: ["你应保证提交内容真实、合法，并已取得上传所需的版权、肖像、隐私、保密和其他许可。不得伪造数据，不得冒充他人，不得上传恶意软件、机密材料或未经同意的个人信息。"] },
        { title: "研究不是自动获批", paragraphs: ["管理员审核只表示内容符合档案发布流程，不表示研究在科学上正确、伦理上获批、风险可接受或可以直接复现。涉及人的研究必须在开始前完成必要的学校审批、参与者知情同意、未成年人监护人同意、隐私保护和事后说明。"] },
        { title: "内容许可与公开", paragraphs: ["你保留自己作品的权利，但向 PSEC 授予非独占、免版税、为审核、存档、备份、教育展示和维护网站所必要的使用许可。只有明确发布到公开档案的内容才会公开；一旦公开，其他人可能保存、下载或再传播。"] },
        { title: "服务变更与责任范围", paragraphs: ["我们可能因安全、维护、学校要求或资源限制暂停服务、调整功能或下架内容。网站按现状提供；在适用法律允许的范围内，PSEC 不保证档案永久可用、内容无误或第三方链接安全。"] },
        { title: "违规处理与联系", paragraphs: ["违反本条款的内容可以被拒绝、隐藏、删除或限制账号访问。版权、隐私、肖像或安全问题请通过社团/学校渠道联系管理员，提供相关记录、具体问题和必要的证明。"] },
      ] as Section[],
    },
    "research-ethics": {
      eyebrow: "PSEC / 参与者安全",
      title: "研究伦理与安全规则",
      intro: "这是一份学生研究的最低安全清单，不是伦理审查意见。遇到不确定情况，先暂停收集数据，向指导老师或学校负责部门咨询。",
      sections: [
        { title: "开始前", paragraphs: ["明确研究问题、参与者、风险、退出方式、数据用途、保存期限和联系人。涉及人的项目须按照学校要求完成审批；涉及未成年人时，应取得监护人同意和学生本人适当的同意/同意表达。"] },
        { title: "知情同意", paragraphs: ["参与者应知道研究在做什么、可能有什么不适、是否可以跳过问题、如何退出、谁能看到数据以及如何联系研究团队。不得用压力、欺骗或不合理奖励替代真实同意；必要的事后说明应及时完成。"] },
        { title: "禁止直接上传的资料", paragraphs: [], bullets: ["姓名与联系方式、身份证件、住址、学校学号或可单独识别某人的组合信息。", "健康、心理、家庭、性取向、宗教、政治观点、纪律处分等敏感信息。", "未经明确授权的照片、录音、视频、聊天记录、屏幕截图或第三方文档。", "会造成现实伤害、羞辱、歧视、骚扰或安全风险的实验数据。"] },
        { title: "最低风险原则", paragraphs: ["优先使用匿名、聚合或模拟数据；限制访问人员；分离身份信息与研究数据；不要为追求‘真实’而增加不必要的压力、欺骗或风险。研究结果、照片和报告发布前应再次检查是否能识别参与者。"] },
        { title: "经典实验的复现", paragraphs: ["档案中的经典范式只用于学习和讨论，不代表鼓励原样复现。历史研究可能不符合今天的伦理标准；任何复现都必须重新评估风险、同意、去欺骗和学校审批。"] },
      ] as Section[],
    },
    "content-policy": {
      eyebrow: "PSEC / 内容与版权",
      title: "内容与版权规则",
      intro: "研究档案依赖成员的诚实投稿。以下规则帮助我们保护作者、参与者、学校和其他成员。",
      sections: [
        { title: "允许的内容", paragraphs: ["与社会科学学习、研究设计、执行记录、结果和反思有关，且不含不必要个人信息的原创内容或有合法许可的材料。引用他人作品时应注明来源，并尽量使用链接、摘要或自己制作的图表。"] },
        { title: "禁止的内容", paragraphs: [], bullets: ["侵犯版权、商标、隐私、肖像、名誉或保密义务的内容。", "伪造、篡改、抄袭、冒名或故意误导他人的研究记录。", "违法、危险、骚扰、歧视、色情、恶意软件、钓鱼或试图绕过访问控制的内容。", "未经授权的受试者信息、学校内部文件、第三方账号信息或可识别媒体。"] },
        { title: "审核、下架与纠错", paragraphs: ["管理员可以暂缓发布、要求修改、隐藏或删除内容，但审核通过不构成事实、科学或伦理认证。发现错误、隐私泄露或侵权时，请提供记录链接、问题说明和权利/身份材料；我们会先限制公开访问并进行核查。"] },
        { title: "作者责任与许可", paragraphs: ["作者保留作品权利，并负责确保自己拥有上传和授权所需的权利。向 PSEC 提交内容即表示授予本网站为审核、存档、备份和教育展示所需的非独占许可；这不会自动把作品的全部版权转让给 PSEC。"] },
      ] as Section[],
    },
  },
  en: {
    privacy: {
      eyebrow: "PSEC / Privacy & data",
      title: "Privacy policy",
      intro: "This policy explains how the PSEC student research archive collects, uses, stores, and protects information. It is a plain-language notice for club members, not a substitute for school, guardian, or professional legal advice.",
      sections: [
        { title: "Information we process", paragraphs: ["When you sign in, we process your school email, account identifier, name if provided, sign-in time, and limited request information used to prevent abuse. Submissions, reviews, and evidence supplements may contain research text, member IDs, attachments, review history, and deletion records."], bullets: ["Do not upload identity documents, addresses, phone numbers, health information, passwords, or identifiable participant data.", "Attachments may contain photos, audio, video, raw data, or document metadata; check them before uploading."] },
        { title: "Purposes and public visibility", paragraphs: ["We use this information for school-email sign-in, archiving and reviewing research, processing attachments, keeping version history, sending verification codes, and preventing abuse. Only approved records and attachments explicitly made public enter the public archive; public material may be searchable, downloaded, copied, or retained by others."] },
        { title: "Retention, deletion, and correction", paragraphs: ["We keep submission, review, and version records for as long as needed for these purposes. Members can delete their own projects from My Records; necessary safety, dispute, and audit history may remain after public removal. To correct information or request deletion, contact the administrator through the club or school channel and identify the record title."] },
        { title: "Minors and participants", paragraphs: ["Minors may use this website. Before collecting or uploading information, photos, video, audio, or research data about minors, obtain the consent and school approval required by the applicable rules. PSEC is not an ethics board, and admin review is not research approval."] },
        { title: "Third-party services and overseas processing", paragraphs: ["The site uses Alibaba Cloud servers, object storage, and mail services to run the application, store attachments, and send verification codes. Servers or providers may be outside your country; do not upload unnecessary personal information or identifiable participant data. Providers are also governed by their own terms and privacy policies."] },
        { title: "Security", paragraphs: ["We use school-email codes, restricted attachment access, least-privilege configuration, and admin review, but no internet transmission or online service is absolutely secure. Report suspected disclosure, unauthorized access, or malicious content through the school or club channel as soon as possible."] },
      ] as Section[],
    },
    terms: {
      eyebrow: "PSEC / Site rules",
      title: "Terms of use",
      intro: "By using PSEC, you understand that it is an educational student-club archive, not a commercial publishing platform, ethics board, medical service, or legal advice service.",
      sections: [
        { title: "Permitted use", paragraphs: ["You may browse the public archive, submit research ideas, add results, and upload research material when you follow school rules, applicable law, and these terms. Submissions enter a private review queue; administrators may request changes, reject, hide, or remove content."] },
        { title: "Your responsibility", paragraphs: ["You must ensure that your submission is lawful and that you have the copyright, image, privacy, confidentiality, and other permissions needed to upload it. Do not fabricate data, impersonate another person, upload malware or confidential material, or submit personal information without permission."] },
        { title: "Research is not automatically approved", paragraphs: ["Admin review only means that content passed the archive workflow. It does not mean the research is scientifically correct, ethically approved, low-risk, or ready to reproduce. Human-subject research needs the required school review, informed consent, guardian consent where applicable, privacy protection, and debriefing before it begins."] },
        { title: "Content licence and publication", paragraphs: ["You keep your rights in your work, while granting PSEC a non-exclusive, royalty-free licence necessary to review, archive, back up, display for education, and operate the site. Only content expressly published to the public archive is public; once public, others may save, download, or redistribute it."] },
        { title: "Changes and liability", paragraphs: ["We may suspend the service, change features, or remove content for safety, maintenance, school requirements, or resource limits. The site is provided as available; to the extent permitted by law, PSEC does not guarantee permanent availability, error-free content, or the safety of third-party links."] },
        { title: "Enforcement and contact", paragraphs: ["Content that violates these terms may be rejected, hidden, removed, or associated with restricted access. For copyright, privacy, image-rights, or safety concerns, contact the administrator through the club or school channel with the record, the issue, and necessary supporting information."] },
      ] as Section[],
    },
    "research-ethics": {
      eyebrow: "PSEC / Participant safety",
      title: "Research ethics & safety rules",
      intro: "This is a minimum safety checklist for student research, not an ethics opinion. If you are unsure, stop collecting data and ask a supervisor or the relevant school office.",
      sections: [
        { title: "Before you begin", paragraphs: ["Define the question, participants, risks, withdrawal process, data use, retention period, and contact person. Human-subject projects must follow the school review process; projects involving minors need guardian permission and an age-appropriate agreement from the student."] },
        { title: "Informed consent", paragraphs: ["Participants should know what the study does, what discomfort may occur, whether questions can be skipped, how to withdraw, who can see the data, and how to contact the team. Pressure, deception, or unreasonable rewards cannot replace meaningful consent; debrief promptly when needed."] },
        { title: "Do not upload directly", paragraphs: [], bullets: ["Names and contact details, identity documents, addresses, school IDs, or combinations that identify a person.", "Health, psychological, family, sexual-orientation, religious, political, or disciplinary information.", "Photos, audio, video, chats, screenshots, or third-party documents without clear authorization.", "Data that could cause real-world harm, humiliation, discrimination, harassment, or safety risk."] },
        { title: "Minimum-risk principle", paragraphs: ["Prefer anonymous, aggregated, or simulated data; limit access; separate identity data from research data; do not add pressure, deception, or risk merely to make a study feel more real. Re-check results, photos, and reports for identifiability before publication."] },
        { title: "Repeating classic experiments", paragraphs: ["Classic paradigms in the archive are for learning and discussion, not an invitation to reproduce them unchanged. Historical studies may not meet current ethical standards; every repeat needs a fresh risk, consent, debriefing, and school-review assessment."] },
      ] as Section[],
    },
    "content-policy": {
      eyebrow: "PSEC / Content & copyright",
      title: "Content & copyright rules",
      intro: "The archive depends on honest member submissions. These rules help protect authors, participants, the school, and other members.",
      sections: [
        { title: "Allowed content", paragraphs: ["Original material or lawfully licensed material connected to social-science learning, research design, execution records, results, and reflection, without unnecessary personal information. Cite other people’s work and prefer links, summaries, or charts you created yourself."] },
        { title: "Prohibited content", paragraphs: [], bullets: ["Material that infringes copyright, trademarks, privacy, image rights, reputation, or confidentiality.", "Fabricated, altered, plagiarized, impersonating, or deliberately misleading research records.", "Illegal, dangerous, harassing, discriminatory, sexual, malicious, phishing, or access-control-bypassing content.", "Unauthorized participant information, internal school documents, third-party account information, or identifiable media."] },
        { title: "Review, removal, and correction", paragraphs: ["Administrators may hold, request changes to, hide, or remove material; approval is not a factual, scientific, or ethics certification. Report an error, privacy issue, or infringement with the record link, explanation, and rights or identity information; we may restrict public access while checking it."] },
        { title: "Author responsibility and licence", paragraphs: ["Authors keep their rights and are responsible for having the permissions needed to upload and licence their work. Submission grants PSEC the non-exclusive licence needed to review, archive, back up, and display it for education; it does not automatically transfer all copyright to PSEC."] },
      ] as Section[],
    },
  },
} as const;

export default function Legal({ kind }: { kind: LegalKind }) {
  const { language, t } = useLanguage();
  const page = copy[language][kind];
  return (
    <div className="page-legal">
      <section className="page-hero navy-grid py-12 lg:py-16">
        <div className="page-container">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 rounded-full text-sm text-white/60 transition-colors hover:text-signal"
          >
            <ArrowLeft size={15} aria-hidden="true" /> {t("backToOverview")}
          </Link>
          <div className="section-kicker mt-7 flex items-center gap-2 text-signal">
            <ShieldCheck size={15} aria-hidden="true" /> {page.eyebrow}
          </div>
          <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.45rem,6vw,5rem)] leading-[1.08] tracking-[-.035em]">
            {page.title}
          </h1>
          <p className="mt-5 content-measure text-base leading-7 text-white/68">
            {page.intro}
          </p>
        </div>
      </section>
      <div className="page-container py-10 lg:py-16">
        <div className="content-measure">
          <div className="surface-card flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 text-xs text-muted-foreground">
            <span>
              {language === "zh"
                ? "版本：2026-09-13-v1 · 最后更新：2026 年 9 月 13 日"
                : "Version: 2026-09-13-v1 · Last updated: September 13, 2026"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ExternalLink size={13} aria-hidden="true" />
              {language === "zh"
                ? "以学校政策和适用法律为准"
                : "Subject to school policy and applicable law"}
            </span>
          </div>
          <article className="mt-10">
            {page.sections.map(section => (
              <section
                key={section.title}
                className="mt-9 border-t border-border pt-9 first:mt-0 first:border-t-0 first:pt-0"
              >
                <h2 className="font-display text-2xl tracking-[-.02em] text-ink">
                  {section.title}
                </h2>
                {section.paragraphs.map(paragraph => (
                  <p
                    key={paragraph}
                    className="mt-4 text-[15px] leading-7 text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-muted-foreground">
                    {section.bullets.map(bullet => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <p className="mt-10 border-t border-border pt-8 text-sm leading-6 text-muted-foreground">
              {language === "zh"
                ? "如果你是未成年人，或研究涉及他人、敏感信息或现实风险，请先向监护人、指导老师或学校负责部门咨询。"
                : "If you are a minor, or your study involves other people, sensitive information, or real-world risk, consult a guardian, supervisor, or the relevant school office first."}
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
