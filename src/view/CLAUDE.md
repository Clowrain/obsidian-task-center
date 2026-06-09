[根目录](../../../CLAUDE.md) > [src](../CLAUDE.md) > **view**

# view — 视图辅助模块

## 模块职责

看板视图 (`view.ts` / `TaskCenterView`) 的拆分辅助模块集合。每个文件负责一个独立的 UI 能力，被 `view.ts` 导入使用。所有模块都是 Obsidian API 依赖的（DOM 操作、Modal 等）。

## 入口与接口

### `state.ts` — 视图状态类型
- 导出 `ViewState` 接口（tab/anchor/selectedTaskId/filter/savedViewId/savedViewTag/savedViewTime/savedViewStatus 等）
- 导出 `TabKey` 类型联合（today/week/month/completed/unscheduled/list/matrix）
- 导出 `FilterPopoverKey` 类型联合

### `dnd.ts` — 拖拽驻留追踪
- `TabDwellTracker<TabKey>` — rAF + performance.now 驱动的跨 tab 拖拽切换（600ms 驻留触发 tab 切换）
- UX.md 6.1 / ARCHITECTURE.md 11 的硬约束实现

### `touch.ts` — 移动端手势
- `attachLongPress` — 长按检测（默认 500ms，移动阈值 4px）
- `attachCardGestures` — 卡片级手势（左滑完成、右滑放弃）
- PointerEvent 统一处理 touch/mouse/pen

### `bottom-sheet.ts` — 移动端底部弹出
- `BottomSheet extends Modal` — 基于 Obsidian Modal 的底部弹出面板
- 用于长按操作、Tab 管理、日期选择等移动端交互

### `undo.ts` — 撤销栈
- `UndoStack` — 容量 20 的 LIFO 撤销栈，Ctrl/Cmd+Z 触发
- `UndoEntry` / `UndoOp` — 字节级正向操作记录，反向应用实现撤销
- 仅捕获视图发起的写操作（CLI 写入不记录）

### `filter-popover.ts` — 筛选弹窗逻辑
- `shouldCloseFilterPopoverOnPointerDown` — 判断外部点击关闭
- `isClickInsideFilterControls` — 判断点击是否在筛选控件内

### `layout.ts` — 布局计算
- `weekMinHeightFromViewHeightPx` — 周视图最小高度计算

### `source-dialog.ts` — 源码编辑外壳
- `openTaskSourceEditShell` — 桌面端分栏源码编辑器（在侧边 leaf 中打开 MarkdownView）

### `source-open-state.ts` — 源码打开状态
- `markdownSourceOpenState` — 构造跳转到指定行的 leaf state

### `query-dsl-modal.ts` — 查询 DSL 编辑器
- `QueryDslModal extends Modal` — JSON 格式查询 DSL 编辑器，支持 update 和 saveAs 两种提交模式

### `saved-view-name-modal.ts` — 视图命名弹窗
- `SavedViewNameModal extends Modal` — 简单的文本输入弹窗，用于重命名/新建视图时输入名称

## 关键依赖

- `obsidian` — Modal, App, Platform, TFile, WorkspaceLeaf 等
- `../types.ts` — ParsedTask 等类型
- `../i18n.ts` — 国际化

## 相关文件清单

```
src/view/
  state.ts                 # ViewState / TabKey / FilterPopoverKey 类型
  dnd.ts                   # 拖拽驻留追踪器
  touch.ts                 # 移动端长按和手势
  bottom-sheet.ts          # 移动端底部弹出面板
  undo.ts                  # 撤销栈
  filter-popover.ts        # 筛选弹窗关闭逻辑
  layout.ts                # 布局计算
  source-dialog.ts         # 源码编辑外壳
  source-open-state.ts     # 源码打开状态构造
  query-dsl-modal.ts       # 查询 DSL 编辑器弹窗
  saved-view-name-modal.ts # 视图命名弹窗
```

## 变更记录 (Changelog)

- 2026-06-09: 初始生成
