# App Skills

Application-focused skills for [skills.sh](https://skills.sh) and complete
packages for the Codex Plugins marketplace.

## Install skills

```sh
npx skills add therealityreport/app-skills
npx skills add therealityreport/app-skills --skill <skill-name>
```

Browse the collection at <https://skills.sh/therealityreport/app-skills>.

## Add the Codex marketplace

```sh
codex plugin marketplace add therealityreport/app-skills
codex plugin add modal@app-skills
```

The marketplace contains seven cards: Modal, Supabase Fullstack, Context7,
Chrome DevTools, Decodo, Envato to R2, and VINTONE Studio. See `catalog.json`
for the 35 standalone skills and their source families.

## Repository layout

- `skills/<skill-name>/` is the flat skills.sh-compatible collection.
- `plugins/<app-family>/` contains complete Codex plugin packages.
- `.agents/plugins/marketplace.json` defines the App Skills marketplace.
- `source-receipt.json` records the canonical source revision and file hashes.

Private and machine-specific adapters are intentionally excluded. Generated
files are validated with `npm test`.
