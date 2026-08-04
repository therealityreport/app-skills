# LCP Debugging

Largest Contentful Paint measures when the largest image or text block in the viewport renders. Good LCP is 2.5 seconds or less.

## Breakdown

| Subpart | Target Share | Meaning |
|---|---:|---|
| TTFB | about 40% | Navigation start to first byte of HTML. |
| Resource load delay | under 10% | HTML first byte to browser starting the LCP resource. |
| Resource load duration | about 40% | LCP resource download time. |
| Element render delay | under 10% | Resource finished to element rendered. |

## Workflow

1. Capture a gated performance trace with reload.
2. Analyze `LCPBreakdown`, `DocumentLatency`, `RenderBlocking`, and `LCPDiscovery` insights when present.
3. Read `lcp-snippets.md` only when you need DOM evidence for the LCP element or common DOM issues.
4. Check the network request for the LCP resource when it has a URL.
5. Recommend the smallest fix that matches the slowest subpart.

## Fix Map

- Resource load delay: make the LCP resource discoverable in initial HTML, remove lazy loading, add preload or `fetchpriority="high"`.
- Element render delay: inline critical CSS, defer non-critical CSS/JS, break long tasks, server-render the initial element.
- Resource load duration: resize/compress, use AVIF/WebP, cache, CDN, reduce bandwidth contention.
- TTFB: remove redirects, cache HTML at the edge, move slow dynamic work away from initial response.
