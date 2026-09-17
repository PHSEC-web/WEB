# PSEC Social Experiment Database

PSEC Social Experiment Database 是一个由学生维护的社会科学研究档案平台。它帮助成员记录研究想法、实验设计、执行证据、结果和后续问题，让研究过程可以被追踪、审核和继续。

线上站点：[psec.club](https://psec.club/)

## 项目特点

- 研究档案：按学科、阶段和关键词浏览已发布的研究记录。
- 研究投稿：成员可以提交研究想法、实验设计和项目资料。
- 执行证据：将照片、数据、报告等证据追加到已完成的研究项目。
- 审核发布：管理员审核投稿和证据后，再将内容发布到公开档案。
- 版本记录：保存记录的编辑、审核、附件和结果追加历史。
- 证据包：查看、打印或下载完整的研究证据包 PDF。
- 邮箱登录：使用学校邮箱发送一次性验证码登录。
- 双语界面：支持中文和英文切换。
- 私有附件：附件通过阿里云 OSS 私有存储，并由服务器进行权限校验后提供临时下载地址。
- 研究伦理：提交和发布流程包含隐私、版权、参与者安全和公开范围提示。

## 技术栈

- 前端：React、TypeScript、Vite、Tailwind CSS、Wouter、Lucide React
- 后端：Node.js、Express、tRPC
- 数据库：MySQL、Drizzle ORM、Drizzle Kit
- 文件存储：阿里云 OSS 私有 Bucket
- 邮件服务：阿里云 DirectMail SMTP
- 认证：学校邮箱验证码、JWT 会话、独立管理员会话
- 测试：Vitest
- 包管理：pnpm

## 目录结构

```text
.
├── psec-experiment-database/
│   ├── client/          # React 前端
│   ├── server/          # Express、tRPC、认证、数据库和存储逻辑
│   ├── shared/          # 前后端共享类型和内容
│   ├── drizzle/         # 数据库 schema、迁移和种子数据
│   ├── docs/             # 项目文档
│   ├── scripts/          # 数据库维护脚本
│   └── package.json
├── database-backup/      # 脱敏或结构性数据库文件
├── README_LOCAL_SETUP.md # 本地迁移和初始化说明
└── README.md
```

## 本地开发

环境要求：

- Node.js 22 或更高版本
- pnpm 10 或更高版本
- MySQL 8 或兼容的 TiDB 实例

进入应用目录并安装依赖：

```bash
cd psec-experiment-database
pnpm install
```

根据 [`LOCAL_ENVIRONMENT_TEMPLATE.txt`](psec-experiment-database/LOCAL_ENVIRONMENT_TEMPLATE.txt) 创建本地 `.env`，填写本地数据库、JWT、SMTP、OSS 和管理员配置。`.env` 只应保存在本机或服务器上，不能提交到 Git。

常用命令：

```bash
pnpm dev       # 启动开发服务器
pnpm check     # TypeScript 检查
pnpm test      # 运行测试
pnpm build     # 生成生产构建
pnpm db:push   # 生成并应用 Drizzle 迁移
```

本地开发服务器默认地址通常为 `http://localhost:3000/`。

## 生产部署

生产环境使用 Ubuntu、systemd、MySQL、阿里云 OSS 和 DirectMail。完整的环境变量、OSS 权限、旧附件迁移和部署检查清单见：

- [`README_LOCAL_SETUP.md`](README_LOCAL_SETUP.md)：本地迁移、初始化和敏感数据说明
- [`OSS_DEPLOYMENT.md`](psec-experiment-database/OSS_DEPLOYMENT.md)：阿里云 OSS 配置和部署流程
- [`LEGAL_REVIEW.md`](psec-experiment-database/docs/LEGAL_REVIEW.md)：法律、隐私、版权和研究安全说明

正式部署前至少应完成：

1. 备份数据库。
2. 确认 `.env` 没有进入 Git 历史或公开日志。
3. 运行 `pnpm check`、`pnpm test` 和 `pnpm build`。
4. 确认 OSS Bucket 为私有读写，并使用最小权限 RAM 身份。
5. 验证普通用户登录、投稿、附件上传/下载、管理员审核和服务重启。

## 分支约定

- `main`：已合并、可作为正式版本基线的代码。
- `ui-redesign`：稳定 UI 和体验改进分支，生产环境当前跟踪的版本线。
- `phase-c`：下一阶段功能和界面开发分支。开发期间不直接部署到生产环境。

合并前应通过 TypeScript 检查、自动化测试和生产构建。不要为了修改 GitHub Contributors 统计而重写提交历史；提交使用的邮箱应已绑定并验证到对应的 GitHub 账号。

## 安全原则

- 不提交 `.env`、数据库数据导出、密码、Token、AccessKey、私钥或 SMTP 密码。
- 不把 OSS Bucket 设置为公开读写。
- 不在前端代码中放置数据库凭据或云服务密钥。
- 管理员密码只从服务器环境变量读取。
- 公开档案应移除不必要的个人信息，并确认附件的公开范围。
- 涉及人的研究必须先考虑知情同意、隐私、风险最小化、事后说明和学校审核要求。

## License

应用包的 `package.json` 标注为 MIT。仓库根目录目前没有单独的 `LICENSE` 文件；如需公开发布或正式分发，建议补充完整的许可证文件并确认项目内容的版权归属。项目内字体和 PDF 生成依赖的许可信息见 [`THIRD_PARTY_NOTICES.md`](psec-experiment-database/THIRD_PARTY_NOTICES.md)。
