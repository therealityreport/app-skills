import { existsSync } from "node:fs";
import { join } from "node:path";

export type FrameworkAdapter = {
  name: "next" | "vite" | "remix" | "astro" | "sveltekit" | "unknown";
  evidence: string[];
  routeHints: string[];
  logHints: string[];
};

export function detectFramework(root: string): FrameworkAdapter {
  const evidence: string[] = [];
  const packageJson = join(root, "package.json");
  const files = {
    next: ["next.config.js", "next.config.mjs", "next.config.ts"],
    vite: ["vite.config.js", "vite.config.mjs", "vite.config.ts"],
    remix: ["remix.config.js", "remix.config.ts"],
    astro: ["astro.config.mjs", "astro.config.ts"],
    sveltekit: ["svelte.config.js", "svelte.config.ts"]
  } as const;

  for (const [name, candidates] of Object.entries(files)) {
    const matched = candidates.find((file) => existsSync(join(root, file)));
    if (matched) {
      evidence.push(matched);
      return adapterFor(name as FrameworkAdapter["name"], evidence);
    }
  }

  if (existsSync(packageJson)) evidence.push("package.json");
  return adapterFor("unknown", evidence);
}

function adapterFor(name: FrameworkAdapter["name"], evidence: string[]): FrameworkAdapter {
  const routeHints: Record<FrameworkAdapter["name"], string[]> = {
    next: ["app/**/page.*", "app/**/route.*", "pages/**"],
    vite: ["src/**", "index.html"],
    remix: ["app/routes/**", "app/root.*"],
    astro: ["src/pages/**", "src/components/**"],
    sveltekit: ["src/routes/**", "src/lib/**"],
    unknown: ["src/**"]
  };
  return {
    name,
    evidence,
    routeHints: routeHints[name],
    logHints: ["dev server stderr/stdout", "browser console", "build output"]
  };
}
