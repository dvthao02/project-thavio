# Encoding Safety (UTF-8)

## Terminal setup (PowerShell)
Run once per session before editing files:

```powershell
chcp 65001
[Console]::InputEncoding  = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
```

## Rules
- Always save source files as UTF-8 (no BOM).
- Avoid ad-hoc text conversion scripts unless necessary.
- Prefer `apply_patch` for code edits.
- If using PowerShell write commands, always pass `-Encoding utf8`.

## Pre-commit guard
- Hook: `.githooks/pre-commit`
- Checker: `apps/admin-web/scripts/check-encoding.cjs`
- Manual run:

```powershell
pnpm.cmd --dir apps/admin-web run check:encoding
```
