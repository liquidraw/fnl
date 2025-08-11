
# DigitalOcean App Platform Quickstart
```bash
doctl auth init
doctl apps spec validate .do/app.yaml
# first time
doctl apps create --spec .do/app.yaml
# updates
doctl apps update $(doctl apps list --format ID --no-header) --spec .do/app.yaml
```
Set SECRET env vars in App settings: `DATABASE_URL`, `LEADERBOARD_SECRET`. Run `schema.sql` once.
