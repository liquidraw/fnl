
# Build Troubleshooting
- API routes force Node runtime: `export const runtime = 'nodejs'`.
- `/stats` is `force-dynamic` to avoid build-time fetch.
- `engines.node: >=20` in package.json.
- Ensure env vars exist on the platform; run `schema.sql` on the DB.
