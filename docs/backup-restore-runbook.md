# Backup & Restore Runbook

Convex is the source of truth. Two layers of protection:

## Automatic backups (primary)

- Convex dashboard → **Backups** → enable daily automatic backups on the production deployment (retained per plan).
- Restore: dashboard → Backups → pick a snapshot → **Restore**. This replaces current data — export the current state first (below) if partial recovery might be needed.

## Manual export (secondary, scriptable)

```bash
# Full export of the production deployment (all tables + file storage) as a zip
npx convex export --prod --path ./backups/turfpro-$(date +%Y%m%d).zip

# Import into a deployment (e.g. restoring or seeding a staging deployment)
npx convex import --prod ./backups/turfpro-20260709.zip --replace-all
```

- Run the export before every schema migration that alters or removes fields.
- Keep at least 4 weekly exports off-site (e.g. object storage) — they are plain zips of JSONL per table.

## Test the restore path (do this once now, then quarterly)

1. `npx convex export --prod --path test-restore.zip`
2. Create a fresh dev deployment: `npx convex dev` in a scratch checkout.
3. `npx convex import test-restore.zip --replace-all` into that dev deployment.
4. Point a local frontend at it and spot-check: org list, lead counts, an invoice, an audit event.
5. Record the date + result at the bottom of this file.

## Restore log

| Date | Operator | Snapshot | Result |
|---|---|---|---|
| _(add first test here)_ | | | |
