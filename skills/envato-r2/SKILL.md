---
name: envato-r2
description: Use when the user asks to search Envato, download licensed Envato assets with their own login, capture an Envato browser session, or upload Envato downloads and license metadata to Cloudflare R2.
metadata:
  short-description: Envato asset search/download to R2
---

# Envato to R2

Use this skill for Envato asset workflows that should end in Cloudflare R2.

## Operating Rules

- Use the user's own Envato account session. Do not ask for or store the Envato password.
- Do not bypass Envato rate limits, CAPTCHA, account restrictions, license gates, or payment/subscription checks.
- Require a project name for downloads unless the user has set `ENVATO_DEFAULT_PROJECT`.
- Treat downloaded assets as private licensed files. Upload to private R2 storage unless the user explicitly configured a public base URL.
- Preserve traceability by storing the source URL, project name, item id, checksum, and download time in the uploaded metadata manifest.
- If Envato changes the UI or asks for manual confirmation, stop and ask the user to complete the visible browser step instead of trying to work around it.
- Use `envato_r2_check_session` only when the user asks to diagnose their saved session. It is local-only and returns no cookie, local-storage, or session-storage values.
- Do not claim that AWS S3 object annotations are supported by Cloudflare R2. This plugin uses only documented compatible object fields and ordinary metadata.

## Setup

1. Install dependencies in the plugin folder:

```bash
cd .
npm install --ignore-scripts
```

2. Export R2 credentials:

```bash
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET="..."
export R2_PREFIX="envato"
```

3. Capture the Envato login session:

```bash
cd .
npm run login
```

This opens Chrome. The user logs into `app.envato.com` normally. The plugin saves only browser cookies/storage state to `~/.envato-r2/storage-state.json`.

## MCP Tools

- `envato_r2_check_setup`: checks Chrome, Envato storage state, and R2 env vars.
- `envato_r2_check_session`: opt-in, local-only summary of the captured Playwright state. It reports active Envato-cookie presence, cookie counts/domains, and local-storage key counts; it does not contact Envato or expose names, values, or tokens. Cookie presence is not proof of authentication.
- `envato_r2_capture_login`: opens a headed browser and saves the Envato session.
- `envato_r2_search`: searches `app.envato.com` and returns structured asset names, preview URLs, font preview keys, author/meta, and result URLs from React Router loader data.
- `envato_r2_discover_api`: explains and optionally observes the Envato data calls for search, previews, load-more, font signing, related items, and license downloads.
- `envato_r2_download`: downloads one Envato item and uploads asset/license metadata to R2.
- `envato_r2_search_download`: searches, downloads the first matching result or a small batch, and uploads to R2.

## Typical Requests

For setup:

```text
Use Envato to R2 to check my setup.
```

For search:

```text
Use Envato to R2 to search photos for "modern restaurant interior", limit 10.
```

For a licensed download:

```text
Use Envato to R2 to download https://app.envato.com/photos/... for project "Client Website".
```

For search plus download:

```text
Use Envato to R2 to find a cinematic food stock photo and save the best match to R2 for project "Restaurant Launch".
```

## CLI Fallback

Use the CLI when MCP tools are not loaded yet:

```bash
cd .
npm run check-setup
node ./src/cli.mjs check-session
npm run search -- --query "cinematic food" --item-type photos --limit 10
npm run discover-api -- --item-type fonts --live false
npm run download -- --url "https://app.envato.com/photos/..." --project "Client Website"
```

## Envato Data Calls

The current Envato app is a React Router single-fetch app. Prefer structured loader data over DOM scraping:

- `GET /search.data?itemType=<type>&term=<term>&sort=<sort>` returns initial structured search state, including `searchResults.cards`.
- `POST /search` with form fields `actionType=loadMore`, `itemType`, `term`, and `page` loads additional pages.
- `POST /font-preview-urls` with JSON `{ "s3Keys": [...] }` signs font preview keys from `fontPreviewVariants`.
- `POST /related-items` with `item_uuid`, `item_type`, optional `portfolio`, and `featured_song_uuids` gets similar result cards.
- `GET /license-certificate/:licenseId/download` downloads a generated license certificate.

Do not replay pasted browser cookies manually. Use the saved Playwright storage state from `npm run login`.

## R2 Object Layout

Objects are written as:

```text
<R2_PREFIX>/<category>/<item-id>/assets/<downloaded-file>
<R2_PREFIX>/<category>/<item-id>/licenses/<license-file>
<R2_PREFIX>/<category>/<item-id>/metadata/<downloaded-file>.envato-r2.json
```

The manifest records the Envato source URL, project name, asset details, R2 key, byte size, SHA-256 hash, and license certificate key when available.

## R2 Compatibility

Use ordinary S3-compatible upload fields only: object body, content type, and standard metadata. Do not add AWS S3 object annotations or tell users they are supported by R2. See [the compatibility reference](references/r2-s3-compatibility.md).
