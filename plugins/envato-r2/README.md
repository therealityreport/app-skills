# Envato to R2

Local Codex plugin for searching Envato with your own browser login, downloading licensed assets through the normal Envato UI, and saving the asset package, license certificate when available, and metadata manifest to Cloudflare R2.

## What It Does

- Opens Chrome for a one-time Envato login capture.
- Searches `https://app.envato.com` with that saved session.
- Reads structured React Router search metadata so agents can evaluate names, preview URLs, authors, item ids, font preview keys, and download formats before deciding what to download.
- Downloads assets through the visible Envato download/license flow.
- Requires a project name for license traceability.
- Uploads files to R2 through Cloudflare's S3-compatible endpoint.
- Writes an `.envato-r2.json` manifest beside each uploaded asset.
- Offers an explicit local-only saved-session diagnostic: it reports Envato-cookie presence plus cookie and storage-key counts, never names, values, or tokens. Cookie presence is not authentication proof.

The plugin does not ask for your Envato password and does not bypass CAPTCHA, subscription checks, download gates, or license prompts.

## Install

```bash
cd .
npm install --ignore-scripts
```

Set R2 environment variables:

```bash
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."
export R2_BUCKET="..."
export R2_PREFIX="envato"
```

Optional:

```bash
export R2_PUBLIC_BASE_URL="https://assets.example.com"
export ENVATO_DEFAULT_PROJECT="Client Website"
export CHROME_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

## Capture Envato Login

```bash
npm run login
```

Chrome opens to `app.envato.com`. Log in normally. The plugin saves browser storage state at `~/.envato-r2/storage-state.json`.

## CLI Usage

```bash
npm run check-setup
node ./src/cli.mjs check-session
npm run search -- --query "cinematic food" --item-type photos --limit 10
npm run discover-api -- --item-type fonts --live false
npm run download -- --url "https://app.envato.com/photos/..." --project "Restaurant Launch"
node ./src/cli.mjs search-download --query "logo mockup" --item-type graphics --project "Brand Refresh"
```

## MCP Tools

- `envato_r2_check_setup`
- `envato_r2_check_session` (opt-in, local-only; no browser launch or network request)
- `envato_r2_capture_login`
- `envato_r2_search`
- `envato_r2_discover_api`
- `envato_r2_download`
- `envato_r2_search_download`

## Envato Data Calls

The current app exposes useful structured data through React Router single-fetch routes:

- `GET /search.data?itemType=<type>&term=<term>&sort=<sort>` returns initial `searchResults.cards`.
- `POST /search` with `actionType=loadMore`, `itemType`, `term`, and `page` returns more result cards.
- `POST /font-preview-urls` signs font preview S3 keys from font result metadata.
- `POST /related-items` returns similar or author-related item cards.
- `GET /license-certificate/:licenseId/download` retrieves the license certificate PDF after licensing.

The plugin uses the browser session captured by Playwright. Do not paste or replay raw browser cookies into scripts.

## Session Diagnostic

`envato_r2_check_session` and `node ./src/cli.mjs check-session` inspect the existing Playwright storage-state file only. They do not open a browser, contact Envato, or validate a live login. The result contains Envato-cookie domain/expiry counts and local-storage key counts only; cookie and storage names and values are never included. Active cookie presence is only local evidence, not proof of authentication. If no active Envato cookies are present, or Envato later requires a login, deliberately recapture with `npm run login`.

## R2 Compatibility Guard

This plugin uses Cloudflare R2's documented S3-compatible `PutObject` fields: body, content type, and ordinary object metadata. It does **not** set AWS S3 object annotations or advertise them as an R2 capability. See [the compatibility reference](references/r2-s3-compatibility.md).

## Storage Layout

```text
<R2_PREFIX>/<category>/<item-id>/assets/<downloaded-file>
<R2_PREFIX>/<category>/<item-id>/licenses/<license-file>
<R2_PREFIX>/<category>/<item-id>/metadata/<downloaded-file>.envato-r2.json
```

## Notes

- Envato's own support docs describe license certificates as downloadable from item pages and My downloads / Projects.
- Envato's license terms tie most assets to a specific project use, so this plugin requires a project name.
- Cloudflare R2 exposes an S3-compatible endpoint at `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
