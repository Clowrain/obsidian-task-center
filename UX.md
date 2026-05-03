# UX

> 这份文档讲**界面长啥样、交互怎么走**。
>
> - 想知道**谁要什么 / 为什么** → [USER_STORIES.md](./USER_STORIES.md)（SSOT，验收以那份为准）
> - 想知道**数据怎么存 / 模块怎么拆 / 性能怎么扛** → [ARCHITECTURE.md](./ARCHITECTURE.md)
>
> 每条 UX 决策都尽量回引 `US-xxx`，方便双向追溯。没有故事支撑的 UI 不写进本文件；跨故事通用约束需要说明约束来源。

---

## 0. 设计原则

1. **markdown 是 Truth，UI 只是它的镜子**。屏幕看到的每一张卡都对应文件里的一行，UI 操作 = 改那行。不引入只存在于内存 / 前端的"虚拟任务"。（US-401 / US-407）
2. **不重发明 Obsidian**。颜色、间距、圆角、阴影、字体全部走 Obsidian CSS 变量；不引第三方 UI 库；尊重用户主题。（呼应 P1 角色"不愿切出"）
3. **借 Obsidian 原生能力，不做低配替代品**。当用户预期是 Obsidian 编辑器、所见即所得、主题一致、快捷键一致时，`textarea` / 自制 preview / 只读 renderer 只能算技术 fallback，不能算体验完成。体验 gate 必须先验证是否能复用 Obsidian 原生能力；确实不能时，要在 release note / task 中标明"降级"，不能包装成完成。
4. **每个动作都要有可观测的结果**。看不见的 = 没发生。任何"卡片消失 / 出现 / 变形"都要有 0.12–0.18s 的过渡，让眼睛跟得上。（US-127）
5. **PM 一票否决**：任何 UI 上"看起来有用但没人故事"的东西都不做，先去 USER_STORIES 加故事再加 UI。设计不是放装饰品的地方。

---

## 1. 表面（Surfaces）

插件对用户暴露 **4 个表面**，互不替代：

| Surface | 形态 | 何时进入 | 主要故事 |
| --- | --- | --- | --- |
| **Task Center 主视图** | 一个全 tab 的 WorkspaceLeaf，标签 = `task-center` | 命令面板"Open Task Center" / `⌘/Ctrl+Shift+T` / ribbon icon / 状态栏点击 / `obsidian command id=task-center:open` | US-101~149 / US-161~169 / US-720 |
| **状态栏小部件** | Obsidian 状态栏右下，文字徽标 | 启用插件即在 | US-106 / US-405 |
| **Quick Add 浮窗** | Spotlight 风格紧凑输入；移动端为 bottom sheet | `⌘/Ctrl+T`（看板内）/ 看板上的 `+ Add` 按钮 / 命令面板 | US-163 / US-167 / US-169 |
| **Obsidian CLI 动词** | 注册到 Obsidian 原生 CLI 的 `task-center:*` 命名空间 | shell：`obsidian task-center:<verb>` | US-201~215 / US-228 |

**不做**：浮动小窗、独立 Electron 窗口、菜单栏 tray、独立设置 webview。任务永远在 vault 里，UI 永远在 Obsidian 里。

---

## 2. 信息架构（IA）

Task Center 的可配置核心是**一份 query DSL**，而不是几组彼此独立的 UI 状态。用户在工具条里点搜索、标签、排期、状态、view、summary，本质上都是在编辑同一个声明式对象：

```yaml
query:
  id: stable-id
  name: 可显示名称
  filters: ...
  view: ...
  summary: ...
```

多数用户不会直接手写 DSL；他们面对的是图形化编辑器。但 UX 必须保证：界面上每个控件都有明确的 DSL 落点，反过来每个已保存的 query preset 也都能被界面无损回显。

同一个 query 编辑面板内要同时容纳两种入口：

- 可视化编辑：默认入口，按 `filters / view / summary` 分块配置
- DSL 直编：高级入口，直接查看和修改同一份 query 的文本表示

两者编辑的是同一个 tab draft；切换入口不会切换对象。

同时，UI 里不应再出现一个和 tab 平行的一等“当前 query”对象。这里的运行时关系只有三层：

- `tab`：持久化 query preset
- `draft`：挂在该 tab 上的未保存改动
- `effective query`：当前激活 tab 的已保存配置加上 draft 覆盖后的实际生效结果

所以用户体验上始终是在“编辑当前 tab 的 query”，不是在 tab 外再切一个“当前 query”。

```
Task Center 主视图
├─ 顶部 Query Tab 栏：预设 tab + 用户自定义 tab，每个带数量 badge  (US-105 / US-109g / US-166)
├─ 工具条：
│   ├─ 搜索 / 标签 / 排期 / 更多时间 / 状态 filters                 (US-109)
│   ├─ View 选择与配置：list / week / month / matrix                 (US-100 / US-117)
│   ├─ Summary 配置与当前 query 摘要                                 (US-109 / US-302 / US-303)
│   ├─ 保存 / 更新 / 另存为新 tab / 放弃改动                          (US-109c / US-117)
│   └─ 快速添加按钮 `+ Add`                                          (US-163)
├─ 主区：当前 query 的 view 输出
│   ├─ list view：可选 sections，例如今日预设的逾期 / 今日 / 未排期推荐
│   ├─ week view：7 列 Mon~Sun（或 Sun~Sat，跟设置）
│   ├─ month view：日历 6×7
│   └─ matrix view：用户配置的二维 buckets
└─ 底部固定的放弃目标区                                               (US-123)

状态栏右下：📋 N today · ⚠ M overdue            (US-106)
```

**Tab 切换不重置** query 状态：week 当前周、month 当前月、list 滚动位置、matrix 折叠 / 滚动、临时筛选关键字都按 tab 各自记忆。关闭看板时记最后停留的 query tab，下次打开回到那一个（US-405）。

**首次打开**走"默认 tab"设置（US-111），候选来自启用中的预设 tab + 用户自定义 tab。

---

## 3. 看板全局布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  今日·M 本周·M 我的优先级·M 已完成·M  🔎 [搜索任务...] [标签] [排期] [状态] [View] [更新] + Add │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Mon 4-21    Tue 4-22    Wed 4-23   Thu 今 4-24   Fri 4-25  ...      │  ← 当前 query 使用 week view
│  3 · 2h45m   1 · 30m     4 · 5h      ── 高亮 ──   2 · 1h30m          │    顶部一行 N tasks · XhYm (US-116)
│                                                                      │
│  ┌────┐      ┌────┐      ┌────┐      ┌────┐       ┌────┐             │
│  │卡片│      │卡片│      │卡片│      │卡片│       │卡片│             │
│  └────┘      └────┘      └────┘      └────┘       └────┘             │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                            ⏹ 拖到这里 = 放弃                          │  ← 底部 sticky (US-123)
└──────────────────────────────────────────────────────────────────────┘
```

- **未排期**只是 `time.scheduled is empty` filter，不是常驻池。用户要从未排期任务改期，可以切到“未排期”query tab，再通过动作菜单或桌面跨 tab / 日期 drop 路径改期（US-104 / US-114 / US-121）。
- **放弃目标区**始终 sticky 在底部，所有 tab 可见。可见 UI 不使用“垃圾桶/删除”文案或 trash 图标，避免用户误会为删除文件内容（US-123）。
- **桌面底部辅助区对齐**：当某个桌面 query 在主区下方同时呈现“未排期区”和“放弃目标区”时，两者必须落在同一套内容对齐线里。放弃区要与上方主内容、未排期区共用左边界与可读宽度，视觉上是同一列体系里的下方区块，不能实现成右侧孤立的窄栏。

---

## 4. View 与预设 Query 规格

### 4.0 今日预设 Query（list view）

- **入口**：预设 query tab，`data-tab="today"`；语义上它是 `view.type = list` 的一个 preset。为兼容现有 e2e / DOM 契约，容器可继续保留 `data-view="today"`，但实现语义必须等价于 `data-preset="today"` 的 list query，而不是新增一个通用 view 类型（US-720a）。
- **目标问题**：默认回答“今天先做什么”，但它只是可复制 / 可编辑的 query preset，不是独立 view 类型，也不是固定方法论。
- **默认 sections**：逾期 `data-section="overdue"`、今日安排 `data-section="today"`、未排期推荐 `data-section="unscheduled-rec"`；每组最多 3 条，卡片显示标题、来源路径提示、日期/估时信息（US-720b）。用户复制该 query 后可以改 section 标题、条件、数量、顺序。
- **快捷动作**：每张卡至少有“完成”“改到明天”“放弃”；“改到明天”按钮提供 `data-action="reschedule-tomorrow"`，写入 `⏳ <tomorrow>` 并走现有 writer 路径（US-720c）。
- **空状态**：三组均空时显示 `data-today-empty`，文案居中，不出现空白页面（US-720d）。
- **首屏视觉中心**：空状态在主区视觉居中；有任务时，sections 顶部保留稳定上边距，不能贴着工具条第一行堆叠（US-720e）。
- **不做**：今日计划模式 / 选一批未排期任务批量排程已从 USER_STORIES 删除，不保留独立 `plan-today` surface。

默认 DSL 形态：

```yaml
id: preset-today
name: 今日
filters:
  status: [todo]
view:
  type: list
  preset: today
  sections:
    - id: overdue
      title: 逾期
      when: deadline < today
      limit: 3
    - id: today
      title: 今日
      when: scheduled == today
      limit: 3
    - id: unscheduled-rec
      title: 未排期推荐
      when: scheduled is empty
      order_by: [deadline_risk, created_desc]
      limit: 3
summary: []
```

### 4.1 Week View

- **列序**：跟设置（周一为首 / 周日为首，US-112）。共 7 列。
- **今日列**：背景 = `--background-secondary-alt`，列头加点强调色 dot（不要整列染色）。
- **列头**：`星期 MM-DD` + 第二行 `N tasks · XhYm`（US-116）。点击列头无操作（避免误触）。
- **列内排序**：按 `⏳` 同日内的"建立时间"升序（先加的在上）；同时间按文件路径字典序。
- **跨周翻**：`< 今 >`；今 = 跳到包含今天的那一周（US-101）。
- **拖入目标**：每一列的整片列体都是 drop zone，不只是已有卡片之间的缝。
- **空列**：列体显示轻量空状态，仍作为该日期的 drop zone；不额外制造新建任务入口，新增任务主路径仍是 Quick Add（US-169）。

### 4.2 Month View

- **形态**：6 行 × 7 列日历（US-102）。月初 / 月末灰显非本月日期。
- **每格**：日期数字 + 最多 3 张卡片缩略；超出显示 `+N more`，点开弹该日任务列表。`+N more` 本身也是该日期的 drop surface（US-122）。
- **每格也是 drop target**（US-122）。
- **拖到 `+N more`**直接落在该天，不需要先展开。
- **与底部辅助区的版式关系**：如果月 view 下方出现未排期区 / 放弃区，这两个区块必须延续月历主体的左对齐线与内容宽度；放弃区不是月历右侧的附属侧栏，而是主内容流中的底部区块。

### 4.3 List View

- **形态**：连续列表，可配置 sections。默认可不分段；也可按日期、文件、tag bucket、用户定义规则分段（US-103）。
- **已完成 / 已放弃**：只是状态 filter + list view 的预设 query。完成历史可按完成时间倒序，放弃历史可按放弃时间倒序；二者不能混成一个状态统计（US-305）。
- **复盘列表**：用户可以配置 summary 行，例如字段 sum / ratio / top N；字段名、误差带、时间范围、拆分维度都来自用户配置（US-303）。
- **未排期**：只是 `time.scheduled is empty` filter + list view 的预设 query；默认排序按 US-104。
- **tag / field 分段**：列表 view 的 section 配置允许用户用任意 tag / inline field DIY，不内置任何方法论或固定分类。

### 4.4 Matrix View

- **形态**：二维矩阵，用户配置横轴、纵轴、bucket 名称与匹配条件（US-103a）。
- **业务解耦**：矩阵不知道“重要/紧急”等方法论。轴名、bucket 名、匹配 tag / inline field / 状态 / 时间条件都由用户配置。
- **未命中**：没有命中任何 bucket 的任务进入“未分组”区；空 bucket 是否显示由 view 配置决定。
- **多命中**：同一任务命中多个 bucket 时默认放入第一个匹配 bucket；用户可显式选择允许重复显示。
- **移动端**：优先纵向堆叠 bucket，保留矩阵语义和 bucket 标题，避免横向挤压。

---

## 5. 任务卡（Card）

### 5.1 卡的解剖

```
┌────────────────────────────────────────────────────┐
│ [✓] 任务标题                            ⏳ 04-25  │  ← 行 1
│     #2象限 #基建                                   │  ← 行 2 (tags)
│     est 90m · actual 75m · 📅 05-15               │  ← 行 3 (meta，按需渲染)
│   ├ [ ] 子任务                          ⏳ 04-26  │  ← 行 4+ (subtasks，递归 US-142)
│   └ [ ] 子任务                                     │
└────────────────────────────────────────────────────┘
```

- 行 1 永远是：checkbox（决定状态语义）+ 标题 + 右侧 schedule badge（仅当 `⏳` 与所在列日期不同时显示，US-149）。
- 行 2 = tag 行；无 tag 不出现。
- 行 3 = meta 行；显示 deadline 与用户配置为 meta / summary 的字段。没有可展示字段时整行不渲染，应用层不硬编码 tag 或字段名（US-108 / US-109 / US-302）。
- 行 4+ = 子任务递归。
- 子任务行 hover：整行出现轻量背景 / 边框；左侧圆圈是独立 button，hover 时圆圈高亮、cursor 为 pointer。桌面子任务行仍可拖拽，但默认鼠标样式服务点击 / 处理，不长期显示 grab / dragging 光标；inline 子任务不作为嵌套 drop target。移动端子任务不提供拖拽。点击圆圈切 todo / done；点击标题 / 行体打开源 Markdown 编辑层定位到该子任务（US-142a / US-168 / US-507）。
- **不显示**：源文件路径（点卡片进入 source edit panel 后可见）、`➕ 创建日期`、未识别的 emoji / 内联字段（字节级保留，但不在卡上画——US-407）。

### 5.2 卡的状态机

| 状态 | 触发 | 视觉 |
| --- | --- | --- |
| 默认 | — | 卡 = `--background-secondary`，1px border = `--background-modifier-border`，圆角 6px |
| Hover | 鼠标停留 | 阴影微抬 (`--shadow-s`)；可显示三点更多按钮；不再显示 `+ 子任务` |
| Focused | 键盘 Tab / 程序聚焦 | border 改成强调色 (`--interactive-accent`)；可接收故事明确的键盘命令 |
| Overdue | `📅` 已过且未完成 | 卡左侧 3px 红色条 (`--color-red`)（US-115） |
| Near-deadline | `📅 ≤ 3 天` | 卡左侧 3px 黄色条 (`--color-yellow`)（US-115） |
| Dragging | 鼠标按下移动 | opacity 0.85 + shadow `--shadow-l`；原位置变成虚线占位框 |
| Completed | `[x]` | checkbox 勾选；标题 line-through；卡 opacity 0.65 |
| Abandoned | `[-] ❌` | checkbox 显示 `−` 线；标题 line-through + italic；左侧条灰色；右上小 ❌ 戳 |
| Hidden by ancestor | 父级是 `[x] / [-]` | 不渲染在活动 tab，按终态继承规则进入历史视图（US-144 / US-145） |

**完成 / 放弃的视觉差异必须一眼能分**——不要都用 strike-through 一种处理。放弃的额外加 italic + 灰色 ❌ 戳（呼应 US-305 "回头复盘才知道自己放弃过什么"）。

### 5.3 父子在卡内的呈现

- 子任务在父卡内**递归显示所有层级**（US-142）。每深一层缩进 16px，**用原生 DOM 嵌套渲染**（不用 ├ └ box-drawing 字符——那是 CLI 形态）。CLI 与 GUI 共享 traversal / sort 函数，渲染层各自适配。
- 子任务行有自己的 hover 和状态圆圈 hover；圆圈是状态操作，行体是打开源 Markdown 编辑层。桌面子任务可以拖拽，但默认不使用 grab 光标，也不接收嵌套 drop；移动端不提供子任务拖拽（US-142a / US-507）。
- 子任务在自己有 `⏳` **且与父不同**时，显示一个 schedule badge（US-149）。
- 父在周 / 月视图当天显示时，**继承的子也跟着显示在父卡内**（US-148）。子若有自己的 `⏳` 落在另一天，**那一天另出一张独立卡**显示该子（仅那条子，不重复显示父）。
- **完成 / 放弃父级 = 整条分支视觉上消失在活动 tab**，可在已完成 tab 历史里看（US-145）。
- **卡片内不再提供 `+ 子任务` 按钮或 inline 子任务输入**（US-141 revised）。新增 / 删除 / 编辑子任务统一进入 US-168 源 Markdown 编辑面板，在原文里按 Obsidian 列表缩进直接写。卡片只负责显示子任务树和状态动作，不再维护第二套子任务编辑器。

### 5.4 Source edit panel（点击卡片唯一查看/编辑路径）

点击任意 Task Card 打开源 Markdown 编辑面板（US-168）。这个入口**取代**旧的"双击打开源文件"、"hover 看上下文"和"右键打开源文件"。本功能的目标不是"能改一段 markdown 文本"，而是**让用户在 Task Center 当前页获得接近 Obsidian 原生编辑器的上下文编辑体验**：

```
┌──────────────────────────────────────────────────────────────┐
│  Tasks/Inbox.md:L42                                      [×] │
│  ───────────────────────────────────────────────────────────  │
│                                                              │
│  <Obsidian 原生 Live Preview / 所见即所得 Markdown editor>       │
│  ...                                                         │
│  - [ ] 父任务                                                │
│      - [ ] 当前任务 ⏳ 2026-04-24   ← 光标在这里，滚动居中      │
│          - [ ] 子任务                                        │
│  ...                                                         │
│                                                              │
│  ───────────────────────────────────────────────────────────  │
│  Esc 关闭 · 修改会按 Obsidian 编辑器保存语义写回                │
└──────────────────────────────────────────────────────────────┘
```

- **唯一查看/编辑入口**：单击卡片。普通看板卡、Today 卡、保存视图过滤后的卡都走同一个 `open task source dialog` 动作。
- **定位**：打开后光标落在任务原始 markdown 行开头，编辑器把该行滚动到可视区域中间；不是只滚到附近，也不是只高亮卡片。
- **编辑能力**：面板里展示并编辑任务所在文件的原文 Markdown，用户可以直接改当前任务、加/删/改子任务、查看上下文。默认验收目标是 Obsidian 自己的 Live Preview / 所见即所得 Markdown 编辑体验：主题、光标、选择、快捷键、列表缩进、checkbox 编辑都应尽量与普通 Obsidian 页面一致。
- **禁止低配冒充**：只读 `MarkdownRenderer`、纯 preview、普通 `textarea` 都不能算 US-168 完成。`textarea` 只允许作为明确标注的临时 fallback / emergency patch；若使用 fallback，本任务必须保持 open 或另开 P1，不允许把 fallback release 当成 100% 体验。
- **形态说明**：#78 spike 已证明 Obsidian public API 不能把 `MarkdownView` 安全嵌进 plugin `Modal`。因此实现可使用 dialog-like shell / floating workspace / popover leaf 等方式承载真实 `WorkspaceLeaf + MarkdownView`，但用户可见旅程必须仍像当前 Task Center 上方的编辑面板：不能裸切到新的 Markdown 页面，不能让 Task Center 消失。
- **保存与刷新**：沿用 Obsidian 编辑器保存语义；文件变更事件到达后，看板刷新，卡片内容与子任务树同步。如果实现有显式 Save，也必须和 Obsidian 自动保存语义不冲突。
- **关闭**：Esc / 右上关闭 / 点击遮罩关闭编辑面板；关闭后仍回到原 Task Center tab / filter / scroll 状态。
- **旧路径删除**：卡片 hover popover 不再存在；卡片双击不再绑定打开源文件；右键菜单不再展示"打开源文件"。减少用户在三套查看/编辑入口之间选择。
- **视觉质量 gate**：不得出现"整屏 textarea / preview markdown"的开发者工具感；不得让用户以为自己离开了 Task Center；不得把标题、路径、按钮挤压成桌面控件堆叠。桌面与移动都必须提供截图/录屏证据，证明编辑器、关闭、保存、定位、背景状态保留可用。
- **移动端**：手机上同一动作可落为全屏编辑面板；仍必须是可编辑 Markdown 编辑体验，不是只读预览；软键盘出现时关闭/保存按钮不能被遮挡。

### 5.5 右键菜单

右键卡片弹原生 Obsidian 风格菜单（US-164）：

```
切换完成                      Space
─────
安排到今天
安排到明天
清空 ⏳
─────
编辑 tag
─────
放弃                          Delete
```

- `编辑 tag` 打开轻量 tag 编辑入口：展示当前 task markdown 里已有的 tag，并允许从当前 view 已存在 tag 中选择追加 / 移除；tag 是普通用户数据，不存在内置互斥分类集合。
- 右键键盘等价：选中卡按 `Menu` 键 / `Shift+F10`。

---

## 6. 交互细则

### 6.1 桌面拖拽

本节只适用于桌面 / pointer 设备。移动端不提供任务 drag/drop、drop target、放弃拖入区或跨 tab dwell；移动端改期 / 放弃 / 嵌套走 `UX-mobile.md` §5.2 的显式动作路径。

- **拖起**：鼠标按下 + 移动 ≥ 4px 才视作拖拽，避免点改名误触发。
- **拖动中视觉**：原卡变虚线占位（保持邻居稳定），跟随鼠标的是缩略浮卡（卡的标题一行 + 一个移动指针图标）。
- **drop target 高亮**：合法目标用 `--background-modifier-hover`；非法目标（自己 / 后代，US-126）用 `--color-red` 浅底 + 禁止光标。
- **跨 tab 拖**：拖动时悬停在另一个 tab 头部 ≥ 600ms 自动切到那个 tab（US-114）。视觉上 tab 头出现进度条从 0% 涨到 100%，到 100% 切换；中途松开取消。
- **卡片消失动画**：当拖拽落定导致卡从原位置消失，原位置 fade-out 100ms + 邻居 transform 平滑上移 150ms（US-127）。原位不动的不放动画。
- **自动滚动**：拖拽时鼠标停在主区上下 40px 范围，主区按 200px/s 自动滚动；松开 / 鼠标回到中央停止。
- **多选**：v1 不做。一次拖一张。

### 6.2 拖到另一张卡 = 嵌套

- 落点 = 另一张卡的卡体（不仅是末尾），把被拖的卡变成它的子任务（US-125 / US-228）。
- **真的会跨文件移动行**——把被拖卡这一行从源文件物理移到目标卡所在的文件、目标位置末尾，并按层级缩进。
- **落定后弹一个 toast**（US-125）：

  ```
  ✓ 「调研」已变成「项目 X」的子任务  · [撤销]
  ```

  - toast 6 秒后自动消失；点撤销 = 恢复到 drag 之前的物理位置 + 缩进 + 文件归属。

### 6.3 拖到放弃目标区 = 放弃

- 拖到底部放弃目标区（US-123）：被拖卡变成 `[-] ❌ 今天`。
- 如果是父任务：所有未打钩的子任务一起继承"放弃"状态；**已打钩的子任务保留**作为历史（US-124）。
- 落定后 toast：

  ```
  ✓ 「项目 X」已放弃 (含 3 个子任务)  · [撤销]
  ```

- 不删文件，不改文件命名，只改 checkbox 字符 + 加 `❌ YYYY-MM-DD` 戳。

### 6.4 不能成环

把 A 拖到 A 自己 / A 的后代上 → drop target 变红 + 禁止光标 + 松开后无操作（US-126）。

### 6.5 标题编辑（由 Source edit panel 承担）

- 卡片层不再提供 inline title input（US-161 revised）。
- 单击卡片标题和单击卡片主体一样，打开 US-168 源 Markdown 编辑面板。
- 用户在 Obsidian 原生 MarkdownView / CodeMirror 编辑器里直接修改原文标题、子任务和上下文；关闭后回到原 Task Center 状态。
- 字节级保留不再靠卡片 input 的局部重写，而是靠用户编辑原文 markdown；CLI/API `rename` 仅作为 agent / 自动化入口。

### 6.6 Quick Add（新建任务）

`⌘/Ctrl+T` / `+ Add` 唤起一个 **Spotlight 风格的紧凑命令面板**（US-163 + US-167 redesign v2 / 2026-04-25）。设计参照 Linear `Cmd+K` + Things 3 add-task：紧凑、命令式、自带语法智能。

```
┌────────────────────────────────────────────────────────────────┐
│  处理示例任务 #3象限 周六 [estimate:: 25m]    │  →  ⏳ 04-26 (Sat) │  ← 单行 input，placeholder 例子；右侧 inline parse hint 暗显
│  ────────────────────────────────────────────────────────────  │
│  [Today]  [Tomorrow]  [周六]  [下周]  [#alpha]  [#beta]           │  ← 可点 quick-chip 行（点 = prefill 到 input）
│  ↵ Daily/2026-04-25.md                              Esc          │  ← 极简 footer，1 行 12px text-muted
└────────────────────────────────────────────────────────────────┘
```

**核心理念**（跟 v1 的差）：
- 删 `<h3>` 标题——input placeholder 自己说了在干嘛
- 删 X 关闭——Esc / 点外部就走，少一个噪音元素
- 删 prose hint "Shortcuts: today/tomorrow/Mon-Sun auto-resolve to..."——改成**可点 chip**：5-7 个 quick chips（`Today / Tomorrow / 周六 / 下周 / 最近使用 tag`），点一下自动 prefill 到 input
- 解析预览**inline 在 input 右侧**（不另起 chip 行），用 `text-muted + monospace` 显 `→ ⏳ 04-26 (Sat)` 这样的暗示，不抢主输入注意力
- 整个 modal 紧凑到 ~240px 高、540px 宽，**无空白堆**

**容器与布局**：
- 桌面：modal 宽 540px，最大高 240px（按内容自适应，预设上限），垂直居中**偏上**（视口 30% 处，类似 Spotlight），不在正中央
- 移动：bottom sheet（沿用 US-509），软键盘按 §13 #5 visualViewport 避让
- 圆角：14px
- 背景：`linear-gradient(180deg, var(--background-primary) 0%, var(--background-secondary) 100%)` —— 让 brand 触感不依赖第三方
- 阴影：优先使用 Obsidian `--shadow-l`；如主题未提供足够层级，仅允许在 `styles.css` 里定义 Task Center 自有 CSS 变量，不在 TS / inline style 写常量颜色。
- 分隔：input 和 chip row 间 1px `--background-modifier-border`；chip row 和 footer 间不分隔（间距说话）

**Input**：
- 单行，无 border、无 background（透明融入容器），focus 时也无 border——靠 cursor 反馈
- font-size 18px 桌面 / 16px 移动（iOS 16px 防 zoom）
- font-weight 400，color `--text-normal`
- placeholder color `--text-faint`，举例式（不是描述式）：`例：买菜 #3 周六 25m`
- padding：input 区域整体 20px 上下 / 24px 左右，input 自身无 padding
- 输入即解析（每 keystroke），输出 → inline parse hint（见下）

**Inline parse hint**（在 input 右侧 / 下方）：
- 解析出 ⏳ → input 右侧暗显 `→ ⏳ 04-26 (Sat)`（text-muted，monospace）
- 解析出 #tag / [estimate::] → 不显（用户自己输入的字面已经在 input 里了，不需要重复）
- 解析出 deadline (📅) → 同 ⏳ 处理
- input 太长时 hint 折行到 input 下方，仍 text-muted

**Quick chips（可点 prefill）**：
- 5-7 个 chip，水平排布，溢出可横向滚动
- 内容：`Today` / `Tomorrow` / `周六` / `下周` / 最近使用或保存的普通 `#tag`
- 点击行为：把对应 token 追加进 input 当前光标位置（已存在则不重复加）；input 重新 focus
- 视觉：浅灰底 chip（`--background-modifier-hover`）+ 12px text-muted + 6px round + hover 加深底色
- chip 间距 6px

**Footer**：
- 单行 12px text-muted
- 左侧：`↵ <实际写入路径>`——`Daily/2026-04-25.md`（由 Obsidian 内置 Daily Notes 核心插件的 folder/format + todayISO 计算；Daily Notes 不可用时显示错误态并禁止提交）
- 右侧：`Esc`
- 不写"取消" / "确认" 等动词——用纯 keystroke 标志（视觉简洁）
- 误操作恢复：错误态在 footer **上方**插一行红色 `⚠ <一句人话>`，input 不清空让用户重试

**默认行为**（不变 v1，从 v2 保留）：
- 唯一写入位置：当天 daily note 文件尾（US-163）。无可用 Daily Note 目标时不写入任何文件，提示用户启用 / 配置 Obsidian Daily Notes。
- 不允许选目标文件入口（仅这一个）
- 自然语言日期：中英两套（`今天/明天/周六/Mon/today/tomorrow`）解析为 ISO ⏳；不识别**不假设**
- 默认打 ➕ 创建戳（设置可关）
- 周列空列占位触发时预填 `⏳ <该列日期>`
- 错误态：footer 上方红色 `⚠`

### 6.7 Undo

- `⌘/Ctrl+Z` 撤销最近 20 步（US-128）。
- 撤销范围 = 在看板内做的所有"卡的字节级写动作"：拖拽改期、改名、勾完成、放弃、嵌套、quick-add。
- **撤销不会跨进程恢复磁盘已经被外部改写的状态**——若文件在期间被其他工具改过，撤销会先校验再退；不能干净撤销时 toast：

  ```
  ⚠ 「调研」自上次变更后被外部修改，撤销不安全已停止
  ```

### 6.8 键盘快捷键总览

**故事明确要求的快捷键**：

| 键 | 动作 |
| --- | --- |
| `⌃1` ~ `⌃9` | 切换顶部可见前 9 个 Query Tab（按用户当前排序） |
| `/` | 聚焦筛选输入框 |
| `⌘/Ctrl+Z` | Undo |

Quick Add 还可以由 Obsidian 命令面板 / 看板 `+ Add` 按钮进入；是否绑定 `⌘/Ctrl+T` 是命令注册细节，不作为移动端或无键盘环境的依赖路径（US-169 / US-510）。

**键盘可达**：tab key 在卡间循环（按视觉顺序：列内自上而下，列间自左向右）。卡上焦点用 2px outline + Obsidian 强调色，**永远不要 `outline:none`**。卡级补充快捷键如果后续加入，必须先补 USER_STORIES，并且不能替代右键菜单 / source edit panel 等主路径。

### 6.9 筛选 / 搜索

- 筛选栏包含明确控件，不使用一个含义泛化的“筛选”下拉；Query Tab = `filters + view + summary`：
  - 搜索框：自由关键字，在标题中匹配，子串，不区分大小写。
  - Query Tab：顶部 tab strip + 更多菜单，不使用原生 select。tab 菜单支持重命名、复制、编辑 query、设为默认、移动、隐藏、删除；桌面双击 tab label 只是重命名快捷方式，不是唯一入口（US-109n~s）。用户从这里进入“编辑 query”后，编辑的就是这个 tab 自己的 query。
  - 标签：按钮 + popover，不使用原生 `<select multiple>`。按钮默认显示“标签”，选 1 个时直接显示该 tag，选多个时显示“第一个 tag +N”；不要在按钮旁边再铺外部 tag chip。popover 顶部是搜索框，下面是自绘 checkbox 行。选项来自当前 query 中除 tag 外的其它 filter 条件下仍存在的合法 `#tag`，每项显示命中数；取消选择在 popover 内完成。
  - 排期：按钮 + 排期范围 popover，不使用原生 select，也不要求用户手输日期。桌面两栏：左侧快捷范围（全部排期、今天、明天、本周、下周、本月），右侧日历视图（月切换、星期头、日期格）。日历视图固定按范围工作：先点开始排期，再点结束排期后应用闭区间；结束早于开始时自动交换；右侧标题区提供“清空排期范围”。移动端堆叠为两列快捷范围 + 下方日历。工具栏按钮只显示紧凑范围摘要，不能撑破相邻按钮。快捷项是轻量 row/chip，不做满宽大主按钮；当前选中只用边框/浅底强调。
  - 更多时间：按钮 + popover，不使用原生 select。未设置高级时间条件时显示“更多时间”；设置了截止 / 完成于 / 创建于中任意条件后显示“时间 +N”。popover 第一层是三行：截止、完成于、创建于；每行左侧字段名，中间是当前范围摘要，右侧是清空按钮。点中间摘要进入该字段自己的范围选择器，标题必须是“截止范围 / 完成于范围 / 创建于范围”，快捷项与日历交互同排期。截止可以额外有“逾期 / 未来 7 天”快捷项；完成于 / 创建于不出现“逾期”。
  - 状态：按钮 + 轻量 popover，不使用原生 select。按钮默认显示“状态”，选项按顺序为全部、待办、完成、放弃；点击全部清空状态条件，点击待办 / 完成 / 放弃以自绘 checkbox 行多选并立即过滤，popover 保持打开方便连续选择，选中态使用同排期快捷范围一致的浅底/边框。
- 时间字段语义必须分开：排期只筛 `⏳ scheduled`；逾期属于 `📅 deadline` 风险表达，未排期属于缺少 `⏳` 的视图 / 状态表达，完成时间和创建时间分别通过“完成于”“创建于”进入更多时间，不进入排期 popover。
- 输入或选择后即过滤（文本输入 ≥ 300ms debounce；按钮 / popover 选择立即生效）。
- **筛选不改文件**，只改可见集合。
- **保存 / 更新 Query Tab** 写入的是 `filters + view + summary` preset：预设 tab、用户 tab、临时改动三者分清。当前 tab 有未保存改动时显示轻量 dirty 标记，主按钮是“更新”，旁边提供“另存为新 tab”和“放弃改动”。这里的“放弃改动”语义是“丢弃当前 tab 的 draft，回到该 tab 已保存版本”，不是切到另一个“当前 query”。移动端只露出“编辑 Query”入口，桌面也可以用同一入口打开 query 编辑面板；不要把整个入口误命名成“筛选 / 视图”（US-117 / US-109p5 / US-109s）。
- **动作语义必须直接可读**：`更新当前 tab` = 覆盖写回当前 tab 的已保存 preset；`另存为新 tab` = 复制当前 effective query 生成新 tab；`保存为 tab` = 仅在当前结果还没有归属 tab 时出现。不要把“保存”同时拿来表示覆盖与新建两种动作，也不要把这些动作放进设置页完成（US-109c / US-109c1 / US-109n2）。
- **主界面的 Tabs 面板必须承担 CRUD 闭环**：`Create` = 新建 tab / 另存为新 tab；`Read` = 打开 tab / 查看当前 query / 打开 DSL；`Update` = 更新、重命名、复制、排序、设默认、隐藏；`Delete` = 删除自定义 tab、恢复预设 tab。设置页只保留全局项（默认 tab、恢复预设 tabs、启动时打开、周起始日），不再放一组半闭合的日常管理按钮（US-109n2 / US-109n3）。
- **这些控件是 DSL 编辑器，不是平行状态机**：点击一个 tag checkbox = 改 `query.filters.tag`；切到 month = 改 `query.view.type`；配置每周汇总 = 改 `query.summary`。任何可见状态都应该能还原成一份规范化 query 对象，并从这份对象重建 UI。
- **同面板双入口**：query 编辑面板默认展示可视化编辑；同面板里提供“编辑 DSL”切换到原始文本。V1 可视化优先覆盖高频 filters；完整 query 的 view / summary 在 dedicated 可视化控件落地前，可先通过同面板内的 DSL 入口完成。DSL 校验失败时，错误要指向具体字段段落，且不覆盖当前已保存版本；校验通过后再回到可视化编辑，控件状态必须完整回显。
- 过滤后空集 → 显示当前条件摘要，并提供“清空筛选”动作（US-109b）。
- 在已完成 / 已放弃等历史 query 也可用，与时间筛选叠加。
- View 配置承载分段 / 分桶：list view 可配置 sections，matrix view 可配置 axis / buckets。应用层不内置任何业务分类；tag / field 字面只来自用户 markdown 与用户配置（US-109f / US-103a）。

默认预设 tab 在 UX 上也应能解释成 DSL，而不是写死页面：

```yaml
- preset-today: { filters: { status: [todo] }, view: { type: list, preset: today }, summary: [] }
- preset-week: { filters: { status: [todo], time: { scheduled: week } }, view: { type: week }, summary: [] }
- preset-month: { filters: { status: [todo], time: { scheduled: month } }, view: { type: month }, summary: [] }
- preset-todo: { filters: { status: [todo] }, view: { type: list }, summary: [] }
- preset-unscheduled: { filters: { status: [todo], time: { scheduled: unscheduled } }, view: { type: list, order_by: [deadline_risk, created_desc] }, summary: [] }
- preset-completed: { filters: { status: [done] }, view: { type: list, order_by: [completed_desc] }, summary: [count, sum(actual), ratio(actual,estimate)] }
- preset-dropped: { filters: { status: [dropped] }, view: { type: list, order_by: [abandoned_desc] }, summary: [count] }
```

### 6.10 状态栏小部件（US-106）

- 文字：`📋 N today · ⚠ M overdue`
- N = 当天 `⏳ = today` 且未 `[x]` 的任务数（含子任务）。
- M = `📅 < today` 且未完成的任务数。
- 点击 = 打开看板（如已开则聚焦）。
- **绝不**在状态栏里加 spinner / 长字符串 / 颜色块。状态栏是被动指示器。

---

## 7. 父子任务的视图规则汇总

> 这块是冲突最容易出现的地方，单列。

| 场景 | 规则 | 故事 |
| --- | --- | --- |
| 父可见时 | 子任务在父卡内递归显示，**不**作为独立顶层卡再出现 | US-143 / US-142 |
| 子的属性继承 | 子无 `⏳ / 📅 / 状态`时继承父的；父变，子继承的同步变；子已经写了就保留 | US-144 / US-147 |
| 完成 / 放弃父 | 整条分支自动完成 / 放弃，**已打钩的子原样保留** | US-124 / US-145 |
| 父子同日创建 | 子不重复打 `➕` 戳 | US-146 |
| 父子 `⏳` 不同日 | 子不再嵌在父卡里，而是在自己 `⏳` 对应的日期 / 视图上下文里作为独立顶层卡显示 | US-148 / US-149 |
| 跨 view | 子卡显示 `⏳ MM-DD` badge 仅当**子的 `⏳` ≠ 父的 `⏳`** | US-149 |

---

## 8. 空状态 / 错误态 / 加载态

### 8.1 看板空状态（vault 一条任务都没有）

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              📭                                     │
│                                                     │
│       还没有任务。按 `+ Add` 建一条，                │
│       或在任意 markdown 文件里写 `- [ ] 任务名`。     │
│                                                     │
│           [+ 在 Daily 加一条]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

故事：US-113。点击 `+ 在 Daily 加一条` = 打开 Quick Add。

### 8.2 当前 tab 空（vault 有任务但当前 tab 没匹配）

- 周 tab 当周空：当周日历正常画 7 列，每列空提示一行小字 "今天没安排任务"。
- 已完成 tab 空：`📭 这一周还没有完成任何任务`。
- 未排期 tab 空：`📭 没有未排期任务，干得漂亮`。

### 8.3 筛选无结果

文字 + 一个清空筛选按钮：`没有符合「<query>」的任务  · [清空筛选]`。

### 8.4 加载态

- **大 vault 首次开看板**显示 skeleton：列头骨架 + 每列 3 张占位卡（灰底，无内容），≤ 1.5s 内被真数据替换。
- **永远不显示 spinning loader 在主区中央**——会让用户觉得"是不是卡了"。骨架是更好的解。
- 如果 ≥ 5s 还没出数据，主区中央显示 `⏳ 正在解析 vault... (N/M files)`，提供取消按钮。

### 8.5 错误态（在 GUI 内）

- **写文件失败**：弹 Obsidian 原生 notice + toast：

  ```
  ⚠ Daily Notes 未启用，无法新建任务
  ```

  原文件不动（US-403 原子写）。

- **拖拽到一个磁盘已删除的目标**：toast `⚠ 目标已不存在，操作取消`。

---

## 9. 设置面板

按 USER_STORIES 整理出唯一的设置项清单；没有故事支撑的设置必须删除或隐藏（US-118）：

| 设置 | 默认 | 说明 | 故事 |
| --- | --- | --- | --- |
| 默认 tab | 当前启用 tab 中的一个 | 首次打开停在哪个 Query Tab；引用稳定 query id，不引用显示名 | US-111 / US-109m |
| 启动时自动打开看板 | 关 | | US-110 |
| 一周第一天 | 周一 | 影响周列序 + 本周边界 | US-112 |
| 自动打 `➕ 创建日期` | 开 | 全局开关，CLI 可单次覆盖（US-213） | US-213 |
| Tab 默认与恢复 | 预设 + 用户自定义 | 这里只放全局入口：默认 tab、恢复默认预设 tabs、必要的导入导出入口。日常的重命名、复制、更新、另存为、排序、隐藏、删除、编辑 query 都在主界面的 tab 菜单、Tabs 面板与 query 编辑面板完成 | US-109n2 / US-109n3 / US-117 |
| AI skill 安装指引 | `npx skills add CorrectRoadH/obsidian-task-center` | 命令明文展示，右侧有复制按钮；只在设置页作为帮助入口，移动端不暴露不可用 CLI 能力 | US-215 |

**版式**：用 Obsidian 原生 `Setting` 组件，不写自定义 webview。每项一行：`label · description · control`。**不**做多 tab 设置；条目少。

---

## 10. 国际化（i18n）

底层规则（呼应 US-402 / US-408~412）：

- **UI 字符串跟随 Obsidian 当前语言**自动切换 zh-CN / en；不暴露插件级语言开关，不要求重启 / 重开看板（实时重渲染）。
- 字符串集中在 `i18n/{zh-CN,en}.ts`（具体文件位置在 ARCHITECTURE.md 决定）。
- **数据字面绝不翻译**。这条是数据兼容硬约束（US-401 / US-407 / US-409）：
  - 用户写在 markdown 里的 **合法 hashtag 字面**（无论是 `#A` `#项目X` 还是其他）—— 原样保留，原样匹配，原样写回；未识别为合法 hashtag 的 `#...` 片段也原样保留，只是不进入筛选候选。
  - 用户写在 markdown 里的 **inline field 字段名**（`[estimate::]` `[planned::]` `[花了::]` ...）—— 同上。
  - **emoji 字段标记**（`⏳ / 📅 / ✅ / ❌ / ➕ / 🛫 / 🔁 / 🔺⏫🔼🔽⏬`）—— 这是 Obsidian Tasks 的字面字段标记，不是装饰，绝不翻译 / 替换。
- **应用层文案可以本地化**：tab 名、列头、按钮、设置项 label / description、空状态、toast、错误信息的"一句人话"部分。这些是**应用提供的字符串**，不是用户数据。
- **CLI 错误码** (`error <code>` 中的 `<code>`) 恒为英文短码（`not_found / ambiguous_slug / ...`，见 §14.3）；它是稳定标识符，AI / 脚本依赖。**仅** 后接的"一句人话"跟语言切换。
- **日期显示**跟随 Obsidian / 系统 locale（月份、星期、月日顺序）；**写回文件的日期**永远是 ISO `YYYY-MM-DD`（数据兼容）。
- **自然语言日期解析**（Quick Add / CLI 输入）至少同时支持中英两套词汇（`今天/明天/昨天/周一~周日/本周/下周/本月/下月` 与 `today/tomorrow/yesterday/Mon~Sun/week/next-week/month/next-month`），不识别时落入未排期，**绝不假设**。

- 切换 Obsidian 语言时，已打开看板**实时**换文案，不需要重开看板（避免丢失当前 tab / 滚动位置）。
- 中英混排（中文标题 + 英文 hashtag、或反之）一切正常工作；卡片渲染按视觉规则不按语言分支。

---

## 11. 视觉与组件约束

### 11.1 颜色 / 字体 / 圆角 / 阴影

- 全部走 Obsidian CSS 变量：
  - 背景：`--background-primary / --background-secondary / --background-secondary-alt`
  - 边框：`--background-modifier-border / --background-modifier-hover`
  - 强调：`--interactive-accent`
  - 状态：`--color-red / --color-yellow / --color-green`
  - 文本：`--text-normal / --text-muted / --text-faint`
  - 阴影：`--shadow-s / --shadow-l`
- **不**写常量 `#xxx`、不引入第三方 token。
- 圆角：6px（卡）、4px（小按钮 / badge）。
- 间距尺度：`4 / 8 / 12 / 16 / 24` px，不引第六档。
- 字体：继承 Obsidian。卡标题 = `--font-text-size`，meta 行 = `0.875em` + `--text-muted`。

### 11.2 动效

| 场景 | 时长 | Easing |
| --- | --- | --- |
| 卡 hover 抬阴影 | 80ms | ease-out |
| 卡消失 | 100ms fade + 150ms 邻居上移 | ease-in-out |
| Tab 切换 | 120ms cross-fade | ease-out |
| 拖拽自动切 tab 进度条 | 600ms 线性 | linear |
| Toast 入场 | 120ms | ease-out |

**Reduced motion**：用户系统启用 `prefers-reduced-motion`，所有过渡降到 ≤ 50ms 或瞬切，但**保留状态变化**（不要让用户失去操作反馈）。

### 11.3 不引入

- 不引第三方 UI 库（Mantine / chakra / antd / radix / shadcn）。
- 不引动画库（除非必要，GSAP / framer-motion 都不要）。CSS transition + transform 够用。
- 不引图标库——用 Obsidian 内置 lucide 图标 + emoji。

---

## 12. 可达性（a11y）

- **键盘可达**：所有可点元素必须可由 Tab 键到达，回车 / 空格触发。卡级动作完整覆盖（见 §6.8）。
- **可见焦点**：用 2px `--interactive-accent` outline，永不 `outline:none`。
- **对比度**：跟 Obsidian 主题。不在主题之上重写文字色。Overdue / near-deadline 的红 / 黄条只是辅助信号，不依赖颜色（同时配 `⚠ overdue` 文字 + `📅 near` 文字在 meta 行作为可读 fallback）。
- **屏幕阅读器**：
  - 卡 = `role="article"`，`aria-label` = "任务: <标题>, 状态 <todo/done/abandoned>, 日期 <⏳>, 估时 <est>"
  - tab 栏 = `role="tablist"`，每个 tab `role="tab"` + `aria-selected`。
  - 桌面拖拽不可达 → 提供键盘等价（`D` 弹日期对话框 + `←/→` 改期 + 嵌套对话框，见下）。
- **拖拽的非鼠标等价**：桌面必须提供键盘路径完成改期 / 放弃 / 嵌套；移动端必须提供动作 sheet / swipe 路径完成同语义操作。具体桌面按键不在本文硬编码，避免与 Obsidian 自身快捷键冲突。
- **可达性 outline 测试**：仅靠键盘 + 屏读完成"加任务 / 改期 / 完成 / 放弃 / 嵌套"五个动作。任何一个走不通都是 P0。

---

## 13. 性能感知层（UX 视角）

ARCHITECTURE 决定具体实现，UX 这里只定**用户能感受到什么**：

- **打开看板 ≤ 1.5s**（vault ≤ 1 万文件、≤ 5000 任务）。超过显示 §8.4 的骨架；超 5s 显示进度。
- **桌面拖拽到落定 ≤ 100ms** 反馈；移动端动作 sheet 确认后的反馈见 `UX-mobile.md`。
- **状态栏更新延迟 ≤ 1s**（不能因为状态栏老更新触发主线程卡顿——回 large-vault startup regression，UX 这里要求"状态栏不能让 Obsidian 整体卡"）。
- **未打开看板时插件应感觉不存在**——只有状态栏一条文字。large-vault startup regression 中"启用就卡死"的反例就是 UX 失败的硬上限。

---

## 14. CLI UX

> 完整动词清单与参数语义见 [USER_STORIES §AI agent](./USER_STORIES.md#ai-agent-想要的)。这里写**输出形态规范**和**错误形态规范**——这是 AI / 用户实际"看到"的部分。

### 14.1 命名空间

`task-center:*` 注册到 Obsidian 原生 CLI（US-201）。**不**写独立二进制、**不**走 shell wrapper。

CLI 不只管 task 动词，也要能查看和管理 query preset DSL：至少支持列出 preset、查看 preset DSL、创建/更新 preset DSL、重命名/复制/隐藏/删除/设默认。CLI 与 GUI 共用同一份 schema 与校验规则。

### 14.2 输出形态规范（必须）

1. **第一列恒为稳定 id**（US-202）：`path:Lnnn` 或 12-char hex hash。
2. **不输出 JSON / YAML**（US-205）。人类与 AI 都读纯文本表格。
3. **每一行可被 grep / awk / cut**：列分隔用 ≥ 2 空格（不强行用 tab，避免与文件路径里的空格冲突）；多列对齐由内部计算。
4. **多行块**（任务 + 子任务）用 box-drawing 字符 (`├ └ │`) 表达层级。这是 **CLI 输出形态**，与 GUI 不强制视觉一致——GUI 卡内子任务用原生 DOM 嵌套渲染。两边共享 tree traversal / sort 函数即可。
5. 写动词永远返回 `ok / before / after` 三行（US-204）：

   ```
   ok      <id>  <标题>
       before  <原始那一行 markdown>
       after   <修改后那一行 markdown>
   ```

6. 幂等命中："已经是目标状态"返回（US-203）：

   ```
   ok  <id>  <标题>  unchanged (already done ✅ 2026-04-23)
   ```

   注意：**仍然是 `ok`，不是 error。** AI 可重复跑。

### 14.3 错误形态规范（必须）

格式（US-211）：

```
error <code>  <一句人话>
```

`<code>` 是短而固定的集合，至少包含：

| code | 含义 | 后续 payload |
| --- | --- | --- |
| `not_found` | 给的 ref 在文件 / hash 里都找不到 | — |
| `ambiguous_slug` | hash 撞多条 | 候选列表（一行一条，`<id>  <标题>`）（US-208 / US-214） |
| `out_of_date` | 行号失效，已 fallback 到 hash | 找到的新 id（不报错继续，仅 stderr 一行 warn） |
| `invalid_date` | 日期解析失败 | 期望格式提示 |
| `write_conflict` | 文件被外部改了，原子写中止 | — |
| `read_only` | 任务在只读区域 / 模板里 | — |

**绝不猜**：`ambiguous_slug` 必须列候选让 AI / 人选；不自动挑第一个。

### 14.4 时间词汇

排期范围跟自然语言一致（US-207）：`today / tomorrow / yesterday / week / next-week / month / next-month / YYYY-MM-DD / FROM..TO`。中文 alias 至少支持 `今天 / 明天 / 昨天 / 本周 / 下周 / 本月 / 下月`。`unscheduled` 是 CLI / 未排期视图里的排期状态，不是范围词。

### 14.5 文档化的工作流（在 `obsidian help task-center` 输出中）

直接给三个示例工作流（US-210），AI / 用户复制改改就能跑：

1. **典型一天收尾**：`stats days=1` → 看哪些超估 / 漏估 → `actual` 补 → `done` 完成 → `schedule` 把没做完的推到明天。
2. **快速捕捉**：`add text="..."`（无 `⏳` 落入未排期）。
3. **补记完成**：`done ref=... at=YYYY-MM-DD`。

### 14.6 帮助输出

`obsidian help task-center`：

- 列出每个动词、一行 summary、`example:` 一行。
- 输出长度 ≤ 一屏（80 行内），不刷屏。

---

## 15. Out of scope（明确不做）

- 多 vault 聚合 / 跨 vault 视图。Obsidian 一次一个 vault。
- 通知 / 提醒 / 闹钟。系统通知是另一个产品的事。
- 协作 / 多人 / 同步。markdown 文件本身可被任何同步工具同步，但插件不管。
- 任务依赖图（A blocks B）/ 甘特图。
- 手写 Dataview 风格 query 语言——Task Center 提供可配置 Query Tab，不提供任意查询语言。
- 富文本卡内容 / 附件 / 评论。
- 主题 / 颜色自定义 UI——主题归 Obsidian。
- 多选拖拽（v1）。

---

## 16. 验收 checklist（PM 验收用）

完成上述实现后，下列每条都必须能由 PM 在代表性 vault 上手动跑通；任意一条不过 = 不放行。

### 看板

- [ ] 预设 tab + 用户自定义 tab 切换正常；`⌃1~9` 切顶部可见前 9 个 tab；更多 tab 可从“更多”入口切换。（US-105 / US-109q / US-166）
- [ ] Tab 菜单、右键、双击重命名、复制、编辑 query、排序、隐藏、删除 undo、恢复预设都成立；移动端有等价 sheet。（US-109n~s）
- [ ] 今日预设 query 的默认三组、改到明天、空状态和首屏视觉中心都成立，复制后可编辑 sections。（US-720）
- [ ] Week view 本周高亮今日列；`< 今 >` 正确翻周；列头显示 `N tasks · XhYm`。（US-101 / US-116）
- [ ] Month view 日历每格可拖入。（US-122）
- [ ] List view 支持状态历史、未排期、用户 section 配置；Matrix view 支持用户自定义 axis / buckets。（US-103 / US-103a / US-104）
- [ ] 状态栏显示 `📋 N today · ⚠ M overdue`，点击打开看板。（US-106）
- [ ] 关闭看板再打开记住上次 tab。（US-405）

### 卡 / 子任务

- [ ] 点标题不会进入 inline input；会打开源 Markdown 编辑面板，用户在原文里改标题。（US-161 / US-168）
- [ ] 卡片上没有 `+ 子任务` / inline 子任务输入；点卡片打开源 Markdown 编辑面板后，在原文里新增子任务，新子按父级继承规则显示。（US-141 / US-144 / US-168）
- [ ] 子任务在父卡内递归显示所有层级，不另起顶层卡。（US-142 / US-143）
- [ ] 完成 / 放弃父级，TODO query 中整条分支消失，已完成 / 已放弃 query 可见。（US-145）
- [ ] 子的 `⏳ ≠` 父时显示 badge；相同时不显示。（US-149）

### 拖拽 / 撤销 / 放弃

- [ ] 拖卡到另一天改 `⏳`，淡出 + 邻居上移有动画。（US-121 / US-127）
- [ ] 拖卡到另一卡变子任务，跨文件移动行，toast + 撤销。（US-125 / US-228）
- [ ] 拖卡到放弃目标区变 `[-] ❌ 今天`，UI 不出现垃圾桶/删除心智；未打钩子任务级联，已打钩子任务保留。（US-123 / US-124）
- [ ] 桌面端若同时显示未排期区与放弃区，放弃区与上方主内容共用左边界和内容宽度，不出现右侧孤立窄栏。（UX §3 / §4.2）
- [ ] 不能把 A 拖到 A 自己 / 后代上。（US-126）
- [ ] `⌘/Ctrl+Z` 撤销 ≤ 20 步拖拽 / 改期 / 改名。（US-128）
- [ ] 拖拽过程中悬停 tab 头 ≥ 600ms 自动切到那个 tab。（US-114）

### Quick Add / 筛选 / 复盘

- [ ] Quick Add 写到当日 daily 文件尾；无可用 Daily Note 时阻止提交并提示配置，不写 fallback 文件。（US-163 / US-701）
- [ ] 自然语言日期解析（中英）。
- [ ] `/` 聚焦筛选；筛选支持 tag / 数值 / 关键字。（US-109 / US-166）
- [ ] Summary preset 能按用户配置字段计算 sum / ratio / top N。（US-303）

### 空 / 错 / 性能

- [ ] vault 一条任务都没有时显示空状态引导。（US-113）
- [ ] 启用插件后**不打开看板**，Obsidian 在 6000+ 文件 vault 上无明显卡顿。（large-vault startup regression 反向验收）
- [ ] 打开看板首次 ≤ 1.5s 出数据；超时显骨架。

### CLI

- [ ] `obsidian task-center:list scheduled=today` 输出第一列为 `path:Lnnn`，子任务用 `├ └`。（US-202 / US-205）
- [ ] 写动词输出 `ok / before / after`。（US-204）
- [ ] 已完成任务再 `done` 返回 `ok ... unchanged`。（US-203）
- [ ] hash 撞多条返回 `ambiguous_slug` + 候选列表。（US-214）
- [ ] `actual minutes=+30m` 增量改时间生效。（US-209）
- [ ] `nest ref=A under=B` 跨文件嵌套生效，与 GUI 拖拽等价。（US-228）
- [ ] 错误格式：`error <code>  <一句人话>`。（US-211）

### 跨角色

- [ ] 改名 / 移动 / 嵌套时未识别的 emoji / inline field 字节级保留。（US-407）
- [ ] callout 里的任务（`> - [ ]`、多层 `>>`）也能解析、渲染、写回。（US-406）
- [ ] 切 Obsidian 语言 zh ↔ en，UI 文案自动切换；hashtag 字面不变。（US-402）
- [ ] `prefers-reduced-motion` 启用时动效降级但状态变化保留。
