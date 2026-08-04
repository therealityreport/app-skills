# Privacy

This local plugin runs on your machine.

It may read:

- Envato browser storage state from `~/.envato-r2/storage-state.json`.
- Downloaded asset files in `~/.envato-r2/downloads`.
- Cloudflare R2 credentials from environment variables.

It writes:

- Downloaded Envato files to the local download folder.
- Asset files, license certificates when available, and JSON metadata manifests to the configured R2 bucket.

It does not ask for, store, print, or upload your Envato password. R2 credentials should stay in your shell, `.env` tooling, or password manager and should not be committed.

The opt-in session diagnostic reads the local storage-state file without opening a browser or making a network request. It reports only Envato-cookie presence, cookie domain/expiry counts, and local-storage key counts. It never prints cookie/storage names or values, and cookie presence is not proof of authentication.
