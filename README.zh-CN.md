# Obsidian Task Center

[简体中文](https://github.com/CorrectRoadH/obsidian-task-center/blob/main/README.zh-CN.md) / [English](https://github.com/CorrectRoadH/obsidian-task-center/blob/main/README.md)

Task Center 是一个 Obsidian 插件：在 Obsidian Tasks markdown 之上，增加今日 / 周 / 月任务看板、父子任务渲染、自然语言 Quick Add、移动端手势，以及方便 AI agent 使用的 CLI。

它不创建新数据库，也不发明新任务格式。任务仍然是 markdown：

```markdown
- [ ] 准备发布 #work ⏳ 2026-05-15 📅 2026-05-20 [estimate:: 90m]
    - [ ] 写 release notes [estimate:: 30m]
- [x] 修完回归 ✅ 2026-04-28 [actual:: 45m]
- [-] 放弃旧方案 ❌ 2026-04-28
```

![周视图拖拽演示](screenshots/week-drag.gif)

![月视图拖拽演示](screenshots/month-drag.gif)

![Month view](screenshots/month.png)

## 为什么用 Task Center

Obsidian Tasks 负责任务语法和查询模型。Task Center 继续使用这套基础，只补上纯笔记里不太顺手的工作表面：

| 需求 | Task Center 提供 |
| --- | --- |
| 安排一周任务 | 全页看板：今日、周、月、已完成、未排期 |
| 调整计划 | 拖到日期改排期，拖到卡片变子任务，拖到放弃区标记放弃 |
| 管理父子任务 | 递归父子卡片，支持排期 / 状态继承 |
| 快速捕捉 | Spotlight 风格 Quick Add，支持中英文自然语言日期 |
| 复盘估时 | 通过 `[estimate::]` / `[actual::]` 汇总计划与实际耗时 |
| 移动端使用 | 手机布局、长按菜单、滑动动作、避让软键盘 |
| 让 AI agent 帮忙 | 稳定的 `obsidian task-center:*` CLI，输出适合 grep 和自动化 |

## 安装

从 Obsidian 社区插件安装 Task Center：

[点击这里安装 Task Center](https://community.obsidian.md/plugins/task-center)

### 前置条件

1. 至少安装并启用一个任务格式 companion：[Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) 或 [Dataview](https://github.com/blacksmithgu/obsidian-dataview)。Task Center 能读写 Tasks emoji 与 Dataview inline-field 两种任务元数据，并期望其中一个 companion 插件负责在 vault 其他地方展示或查询同一批元数据。
2. 启用 Obsidian 内置 **Daily Notes** 核心插件，并配置 "New file location"。Quick Add 会把新任务写入当天 Daily Note；如果 Daily Notes 没启用或没配置，Task Center 会拒绝写入，而不是偷偷写到 inbox fallback。

### AI Agent Skill
```bash
npx skills add CorrectRoadH/obsidian-task-center
```

## 视图

- **今日**：逾期、今日安排、未排期推荐三组，并提供快捷动作。
- **周**：七列看板，高亮今天，显示每日任务数与估时合计。
- **月**：日历网格，每天都是拖拽落点。
- **已完成**：按周分组的复盘时间线，展示估时与实际耗时。
- **未排期**：按 deadline 和创建顺序排序的任务池。

把卡片拖到某天会改 `⏳`。拖到另一张卡片上会变成子任务。拖到底部放弃区会标记 `[-] ❌`，不会删除源 markdown 行。

## 语法

Task Center 支持 Obsidian Tasks 使用的两种任务格式风味：

```markdown
- [ ] Tasks emoji 风味 ⏳ 2026-05-15 📅 2026-05-20 ➕ 2026-05-01 [estimate:: 90m]
- [ ] Dataview 风味 [scheduled:: 2026-05-15] [due:: 2026-05-20] [created:: 2026-05-01] [estimate:: 90m]
```

读取侧是宽松的：同一个 vault 里 Tasks emoji 与 Dataview inline fields 可以混用，Task Center 都会识别。写入侧由 **设置 → Task Center → 任务格式风味** 控制。拖拽到日期、日期选择、Quick Add、CLI 写操作都会使用这里选择的风味写入新的任务元数据。Task Center 改写某个字段时，会清理同一字段的另一种写法，避免旧日期之后继续被读取。

| 含义 | Tasks emoji 风味 | Dataview 风味 | Task Center 支持 |
| --- | --- | --- | --- |
| 排期 | `⏳ YYYY-MM-DD` | `[scheduled:: YYYY-MM-DD]` | 读 / 写 |
| 截止 / deadline | `📅 YYYY-MM-DD` | `[due:: YYYY-MM-DD]` | 读 / 写 |
| 开始 | `🛫 YYYY-MM-DD` | `[start:: YYYY-MM-DD]` | 读 / 保留 |
| 创建 | `➕ YYYY-MM-DD` | `[created:: YYYY-MM-DD]` | 读 / 新建时写 |
| 完成 | `✅ YYYY-MM-DD` | `[completion:: YYYY-MM-DD]` | 读 / 写 |
| 取消 / 放弃 | `❌ YYYY-MM-DD` | `[cancelled:: YYYY-MM-DD]` | 读 / 搭配 `[-]` 写 |
| 循环 | `🔁 every week` | `[repeat:: every week]` | 读 / 保留 |
| 优先级 | `🔺 ⏫ 🔼 🔽 ⏬` | `[priority:: highest/high/medium/low/lowest]` | 读 / 保留 |

如果同一行同一日期字段同时出现两种风味，Task Center 以 Tasks emoji 值为准。这是一个保守规则：不主动重新解释旧 emoji 数据，同时让 Dataview 风味的 vault 可以自然工作。

估时和实际耗时使用 `[estimate:: 90m]`、`[estimate:: 1h30m]`、`[actual:: 75m]` 这类 inline field。标签和未知 inline field 会字节级保留。

## CLI

Task Center 注册到 Obsidian 原生 CLI，不提供额外 wrapper 脚本。

```bash
obsidian task-center
obsidian task-center:list scheduled=today
obsidian task-center:list scheduled=unscheduled tag='#work'
obsidian task-center:show ref=Tasks/Inbox.md:L42
obsidian task-center:add text="Review launch checklist" tag='#work' scheduled=2026-05-15
obsidian task-center:schedule ref=Tasks/Inbox.md:L42 date=2026-05-16
obsidian task-center:done ref=Tasks/Inbox.md:L42 at=2026-04-28
obsidian task-center:review days=7
obsidian task-center:review days=7 format=json
obsidian task-center:query-list
obsidian task-center:query-run id=preset-today view=week
obsidian task-center:query-set-default id=preset-week
```

CLI 输出适合人和 agent 读：列表行有稳定 id，写操作幂等，变更命令输出 `before` / `after`；Query Tab 命令可以按稳定 id 列出、运行、新建、更新、重命名、复制、隐藏、删除和设默认。

安装配套 AI skill：

```bash
npx skills add CorrectRoadH/obsidian-task-center
```

## Crabbox

仓库已经带好本地 Crabbox 配置，默认走 Blacksmith Testbox 后端做远程验证：

```bash
crabbox warmup
crabbox run -- pnpm run typecheck
crabbox run -- pnpm run test:unit
crabbox run -- pnpm run test:e2e
```

默认配置在 `.crabbox.yaml`，预热 workflow 在 `.github/workflows/blacksmith-testbox.yml`。如果你的 Blacksmith 账号需要显式 org，先 `export CRABBOX_BLACKSMITH_ORG=<your-org>` 再执行 `crabbox warmup`。

## 设置

| 设置 | 默认值 | 控制内容 |
| --- | --- | --- |
| 默认视图 | 周 | 打开 Task Center 时先显示哪个标签 |
| 每周开始日 | 周一 | 周视图和月历边界 |
| 启动时打开看板 | 关闭 | Obsidian 启动时是否自动打开看板 |
| 自动打创建日期 | 开启 | 新建任务是否写入创建日期 |
| 任务格式风味 | Tasks emoji | Task Center 写 Tasks emoji 元数据还是 Dataview inline fields |
| 强制移动端布局 | 关闭 | 在宽屏上也使用手机布局 |

## License

MIT.
