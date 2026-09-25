# 阿里云 OSS 切换与上线

网站使用私有 OSS Bucket 存放附件，仍通过 `/storage/<原有 storageKey>` 访问。服务器先检查附件权限，再返回有效期 60 秒的 OSS 下载链接。数据库和 DirectMail 不需要更换；这里不需要把任何密钥放进浏览器代码或 GitHub。

## 1. 创建 Bucket 和权限

1. 在阿里云 OSS 控制台创建 **标准存储、私有读写** Bucket；地域优先选择与轻量服务器相同的雅加达（`oss-ap-southeast-5`）。确认实际 Bucket 地域；不要使用公开读权限。OSS 的存储、请求和公网下行均可能产生费用，建议先开费用预警。
2. 在 RAM 创建仅供该网站程序使用的身份与 AccessKey，不使用主账号 AccessKey，不授予 `AliyunOSSFullAccess`。为该身份绑定如下自定义策略，把 `YOUR_BUCKET` 改成真实 Bucket 名称。该策略只允许读取和写入网站的对象，不允许删除或管理 Bucket：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["oss:PutObject", "oss:GetObject"],
      "Resource": "acs:oss:*:*:YOUR_BUCKET/psec-*"
    }
  ]
}
```

3. 只在服务器应用目录的 `.env` 增加以下四项，其他已有变量保留。不要在聊天、截图、终端输出或 GitHub 中展示 AccessKey。设置文件权限为仅运行账户可读（`chmod 600 .env`）。

```dotenv
OSS_REGION=oss-ap-southeast-5
OSS_BUCKET=实际的私有Bucket名称
OSS_ACCESS_KEY_ID=RAM的AccessKeyId
OSS_ACCESS_KEY_SECRET=RAM的AccessKeySecret
```

轻量服务器是否能使用实例角色需要按实际产品和实例能力确认；没有确认前不假设支持。以上使用独立的最小权限 RAM 身份。

### systemd 读取位置

`psec-web` 应明确从应用目录加载环境文件，不要依赖 systemd 默认的工作目录。检查 `/etc/systemd/system/psec-web.service` 时，确认服务段至少包含以下路径设置（路径中不要写入密钥）：

```ini
[Service]
User=your-service-user
WorkingDirectory=/path/to/psec-experiment-database
EnvironmentFile=/path/to/psec-experiment-database/.env
ExecStart=/usr/bin/node /path/to/psec-experiment-database/dist/index.js
```

如果服务使用其他 Node.js 安装路径，只调整 `ExecStart` 的可执行文件路径；仍需保留 `WorkingDirectory` 和 `EnvironmentFile`。修改 unit 后执行 `sudo systemctl daemon-reload`，再重启服务。应用也会从构建产物所在项目目录寻找 `.env` 作为兜底，但生产环境应优先使用 systemd 的 `EnvironmentFile`，这样启动目录变化不会影响配置。

## 2. 核对旧附件

新上传会写入 OSS；已有数据库行只有 `storageKey`，**文件本体不会自动迁移**。在切断旧存储之前，核对数据库里的 `attachments.storageKey` 和 `submissions.attachmentKey`，以及其他上传对象是否存在。旧文件需要从原存储或本地备份取回，再以**完全相同的对象 Key** 上传至新 Bucket；不要改成公开读，也不要直接改数据库地址。

若旧存储已不可访问，请先保留现状并确认哪些旧文件无法找回；未迁移的旧链接在切换后会由 OSS 返回 404。最好先在测试环境用一张图片和一个 PDF 验证下载，再确定是否切换生产环境。

## 3. 部署与验证

确认密钥和旧附件准备就绪后，在服务器上对 MySQL 做私有备份，再执行：

```bash
ssh your-server-alias
cd /path/to/psec-experiment-database
git status --short --branch
git pull --ff-only origin main
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm exec drizzle-kit migrate
sudo systemctl restart psec-web
sudo systemctl status psec-web --no-pager
```

If the normal migration command fails because the old migration ledger tries to
recreate tables that already exist, stop and back up the database first. Then
run this one-time repair and retry the migration:

```bash
pnpm run db:repair-evidence
pnpm exec drizzle-kit migrate
```

The repair command is an idempotent baseline for the old exported database: it
verifies the core tables, repairs the record-based evidence columns, creates the
school-email code table if it is absent, and records the already-present
migrations through `0012`. It does not print or change any credentials.

如果服务器的当前分支不是预定的生产分支，先停止，不要在生产目录强行切换分支或覆盖未提交改动。迁移命令使用现有 `.env` 的数据库地址，执行前要确认备份已完成。

打开 `https://psec.club/`，使用普通账号上传附件并下载，再验证未登录/无权用户不能访问私有附件；管理员也要检查投稿附件。若服务启动失败，查看 `sudo journalctl -u psec-web -n 80 --no-pager`，不要把含密钥的日志直接贴到公开渠道。**GitHub 推送和生产部署是两件不同的事。**
