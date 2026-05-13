# DECISIONS

## D001 - DB-first rebuild strategy

Keep live DB, `database/`, and generated Drizzle schema as project anchors. Do not rebuild the repo from scratch.

## D002 - Active vs planned paths

Only `apps/api-core` is an active build target right now. Other app/package folders remain planned placeholders until scaffolded.

## D003 - Current app naming

Use current repo names:
- `apps/api-core`
- `apps/pos-web`
- `apps/realtime-gateway`
- `apps/local-agent`
- `apps/mobile-app`

Do not use stale names:
- `apps/api`
- `apps/web`
- `apps/gateway`
- `apps/agent`
- `apps/mobile`

## D004 - Migration layout

Target migration layout:

```text
database/migrations/
  fresh/
    001_full_install.sql
  upgrade/
    010_rename_tenant_to_business.sql
    011_accounts_google_oauth.sql
    012_security_hardening.sql
```

Do not move existing migration files until a focused DB task verifies fresh install and upgrade order against the live DB.

## D005 - Claude Code MCP scope

Use project-scoped MCP config in `.mcp.json` for repo-local tools that are safe to share. Keep database credentials out of `.mcp.json`; configure Postgres MCP separately as a local/user-scoped server.
