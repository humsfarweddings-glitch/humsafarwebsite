# Humsafar Weddings

Wedding planning website — static frontend served at clean endpoints.

## Project structure

```
├── frontend/
│   ├── pages/              ← one .html per page (subfolders allowed)
│   │   ├── index.html      → /
│   │   ├── about-us.html   → /about-us
│   │   └── contact-us.html → /contact-us
│   ├── assets/             ← css, js, images, fonts (only files the site serves)
│   └── 404.html            ← not-found page (used locally and on Vercel)
├── content/                ← page content sources (JSON / Markdown)
├── api/
│   ├── contact-enquiry.py  ← Vercel Function: POST /api/contact-enquiry
│   └── _contact_shared.py  ← validation + Resend email logic (shared with Flask)
├── server/
│   └── app.py              ← Flask dev server (local only); also serves /api/contact-enquiry
├── source-images/          ← LOCAL ONLY (gitignored): originals + retired assets
├── requirements.txt
├── vercel.json              ← production routing (clean URLs on Vercel)
└── .vercelignore
```

### Asset convention

`frontend/assets/` holds **only what a page actually references** — if a file
there is unreferenced, it ships to visitors for nothing. Originals, oversized
masters, and retired assets live in `source-images/`, which is gitignored and
excluded from deploys. When you retire an image, move it to
`source-images/unused-frontend-assets/` rather than leaving it in `assets/`.

## Contact enquiry endpoint

`POST /api/contact-enquiry` validates the contact-us form and emails the
submission via [Resend](https://resend.com). It's implemented once in
`api/_contact_shared.py` and used by both `server/app.py` (local Flask dev)
and `api/contact-enquiry.py` (the Vercel Function that serves it in
production — Vercel Functions in `/api` always take priority over the
catch-all page rewrite in `vercel.json`).

Required environment variable:

| Variable | Description |
|----------|--------------|
| `RESEND_API_KEY` | API key from resend.com. Without it, submissions are validated but fail to send (502). |

Optional overrides (defaults shown):

| Variable | Default |
|----------|---------|
| `RESEND_TO_EMAIL` | `info@humsafarwedding.com` |
| `RESEND_FROM_EMAIL` | `Humsafar Weddings <onboarding@resend.dev>` |

Set them with `vercel env add RESEND_API_KEY` (production/preview) and in a
local `.env`/shell export for `python server/app.py`. The sandbox
`onboarding@resend.dev` sender only delivers to the Resend account's own
verified email — verify a domain in Resend and set `RESEND_FROM_EMAIL` to
send to `info@humsafarwedding.com` in production.

## Adding a new page

Drop an `.html` file into `frontend/pages/` — it instantly gets a clean endpoint,
locally and on Vercel. No code changes needed.

| File                              | Endpoint            |
|-----------------------------------|---------------------|
| `frontend/pages/contact-us.html`  | `/contact-us`       |
| `frontend/pages/india/goa.html`   | `/india/goa`        |
| `frontend/pages/blogs/my-post.html` | `/blogs/my-post`  |

Always reference assets with absolute paths: `/assets/css/style.css`,
`/assets/images/...` — never relative paths.

## Run locally

```bash
conda activate humsafar
pip install -r requirements.txt   # first time only
python server/app.py
# → http://localhost:3000
```

## Deploy to Vercel

```bash
vercel          # preview deployment
vercel --prod   # production
```

No build step — `vercel.json` sets `frontend/` as the output directory and
rewrites every clean URL (e.g. `/about-us`) to its page file
(`/pages/about-us.html`). Real files like `/assets/...` are served directly.
