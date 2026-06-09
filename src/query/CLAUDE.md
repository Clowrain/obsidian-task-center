[根目录](../../../CLAUDE.md) > [src](../CLAUDE.md) > **query**

# query — 查询引擎（过滤 / 投影 / 摘要）

## 模块职责

纯函数查询引擎，对 `EffectiveTask[]` 执行过滤、视图投影和摘要计算。无 DOM、无 Obsidian 依赖，被 GUI 视图、CLI API 和 summary 计算共享。

## 入口与接口

### `filter.ts` — `applyQueryFilters`
- 输入: `EffectiveTask[]` + `QueryPresetFilters`
- 语义:
  - `search`: 标题/tag 关键词匹配（不区分大小写）
  - `tags`: AND 匹配（所有指定 tag 必须存在）
  - `status`: 多选，基于 `effectiveStatus`
  - `time`: 按字段日期 token 匹配，使用 effective 继承日期
  - `unscheduled`: `effectiveScheduled === null`

### `projection.ts` — `applyViewProjection`
- 输入: `EffectiveTask[]` + `QueryPresetViewConfig` + 周起始日 + 锚点日期
- 产出 4 种视图模型:
  - **List**: 按 `view.sections` 分段
  - **Week**: 7 天列 + 可选 tray
  - **Month**: 日历单元格 + 可选 tray
  - **Matrix**: 2D 桶矩阵 (X x Y) + 未匹配池

### `summary.ts` — `computeSummary`
- 输入: `EffectiveTask[]` + `QueryPresetSummaryMetric[]`
- 支持度量: `count` / `sum` / `ratio` / `top_n` / `group_by`

## 关键依赖

- `../task-tree.ts` — `EffectiveTask` 类型
- `../types.ts` — `QueryPresetFilters`, `QueryPresetViewConfig`, `QueryPresetSummaryMetric`
- `../time-filter.ts` — `taskMatchesTimeToken` 时间 token 匹配
- `../dates.ts` — 日期操作

## 测试

- `test/query-filter.test.mjs` — 过滤器测试
- `test/query-projection.test.mjs` — 投影测试
- `test/query-summary.test.mjs` — 摘要测试
- `test/query-dsl.test.mjs` — DSL 解析测试

## 相关文件清单

```
src/query/
  filter.ts         # 过滤器执行 (纯函数)
  projection.ts     # 视图投影 (纯函数)
  summary.ts        # 摘要计算 (纯函数)
```

## 变更记录 (Changelog)

- 2026-06-09: 初始生成
