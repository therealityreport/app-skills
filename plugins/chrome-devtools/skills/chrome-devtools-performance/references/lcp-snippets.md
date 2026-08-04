# LCP Snippets

Use these snippets with gated upstream `evaluate_script` after trace evidence shows an LCP issue.

## Identify LCP Element

```js
async () =>
  await new Promise((resolve) => {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      resolve({
        element: last.element?.tagName,
        id: last.element?.id,
        className: last.element?.className,
        url: last.url,
        startTime: last.startTime,
        renderTime: last.renderTime,
        loadTime: last.loadTime,
        size: last.size
      });
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
```

## Audit Common DOM Issues

```js
() => {
  const issues = [];
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      issues.push({ issue: "lazy-loaded image in viewport", element: img.outerHTML.slice(0, 200) });
    }
  });
  document.querySelectorAll("img:not([fetchpriority])").forEach((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.width * rect.height > 50000) {
      issues.push({ issue: "large viewport image without fetchpriority", element: img.outerHTML.slice(0, 200) });
    }
  });
  document.querySelectorAll('head script:not([async]):not([defer]):not([type="module"])').forEach((script) => {
    if (script.src) issues.push({ issue: "render-blocking script in head", element: script.outerHTML.slice(0, 200) });
  });
  return { issueCount: issues.length, issues };
}
```
