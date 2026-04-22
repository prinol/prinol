# PRINOL Artfolio

Cloudflare Pages + Functions + R2 + D1 project.

## Required Cloudflare config
- R2 binding: `ART_BUCKET`
- D1 binding: `DB`
- Secret: `ADMIN_KEY`

`wrangler.jsonc` is already configured for the provided bucket/database.

## Admin access
- Login page: `/admin-login.html`
- Admin page: `/admin.html`

Middleware protects `/admin.html` and write APIs.

## If tables are missing
Run `schema.sql` in D1 once.
