---
name: crabbox
description: Run CI checks (typecheck, lint, unit tests, e2e) via the Blacksmith testbox backend. Use when you need to warm up a testbox, run checks against a warm instance, or stop a testbox slug.
---

# Crabbox

本仓库默认走 `blacksmith-testbox` 后端。

## 预热

```bash
crabbox warmup
```

如果你的 Blacksmith 账号需要显式 org，先设：

```bash
export CRABBOX_BLACKSMITH_ORG=<your-org>
```

## 常用检查

```bash
crabbox run -- pnpm run typecheck
crabbox run -- pnpm run lint
crabbox run -- pnpm run test:unit
crabbox run -- pnpm run test:e2e
```

## 复用暖机

```bash
crabbox warmup
crabbox run --id <slug> -- pnpm run test:unit
crabbox run --id <slug> -- pnpm run test:e2e
crabbox stop <slug>
```

## 说明

- 预热 workflow: `.github/workflows/blacksmith-testbox.yml`
- Crabbox 配置: `.crabbox.yaml`
- 本仓库的正式 PR / release gate 仍然看 `.github/workflows/ci.yml` 和 `release.yml`
