# Commits History

## 2026-06-11

### feat(holiday): 看板视图显示中国节假日标记（休/补）
- **Branch**: main
- **Files**: src/holiday/service.ts, src/holiday/types.ts, src/view.ts, src/main.ts, src/i18n.ts, styles.css
- **Decisions**:
  - 新增独立 HolidayService 模块，不污染 TaskCache
  - 采用"同步读取 + 异步预取"模式，不阻塞渲染
  - 普通周末（周六/周日）自动显示"休"标记
  - API 数据优先（补班日显示"补"而非"休"）
  - 缓存仅在 session 期间有效，Obsidian 关闭时自动失效
  - 数据来源: https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json

## 2026-06-10

### fix(zentao): 完成任务工时支持小数输入（如 0.5）
- **Branch**: main
- **Files**: src/zentao/client.ts
- **Bug Fix**:
  - **症状**: 输入工时 0.5 最终变成 1
  - **根因**: `parseInt("0.5")` 返回 0，然后 `0 || 1` 触发 fallback
  - **修复**: 改用 `parseFloat` + 条件判断 `parsed > 0`

### refactor(zentao): 周报项目名称去重——文件名与文件夹名相同时只保留文件名
- **Branch**: main
- **Files**: src/zentao/weekly-report.ts
- **Decisions**:
  - extractProjectNameFromPath 增加 folder/folder 去重逻辑
  - 当文件名与直接父文件夹名相同时，只返回文件名而非完整路径

### fix(zentao): 周报项目名称路径解析逻辑调整
- **Branch**: main
- **Files**: src/zentao/weekly-report.ts
- **Decisions**:
  - 从缓存获取下周工作任务
  - 项目名称格式: projectName/executionName，相同则只返回一个
  - 开头添加空行避免 YAML front matter 问题
  - 任务前后添加空行

### feat(zentao): 周报数据来源调整 + 同步任务存储重构
- **Branch**: main
