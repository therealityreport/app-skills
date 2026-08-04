# Accessibility Snippets

Use these snippets with gated upstream `evaluate_script`. Prefer snapshots and Lighthouse before snippets.

## Find Orphaned Form Inputs

```js
() =>
  Array.from(document.querySelectorAll("input, select, textarea"))
    .filter((input) => {
      const hasForLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
      const hasAria = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
      return !hasForLabel && !hasAria && !input.closest("label");
    })
    .map((input) => ({
      tag: input.tagName,
      id: input.id,
      name: input.name,
      placeholder: input.placeholder
    }));
```

## Measure Tap Target

Pass the element `uid` from `take_snapshot` as the script argument.

```js
(element) => {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}
```

## Approximate Color Contrast

Use this only as a bounded check. It does not fully handle gradients, images, or transparency.

```js
(element) => {
  const rgb = (value) => {
    const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [255, 255, 255];
  };
  const luminance = ([r, g, b]) => {
    const parts = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return parts[0] * 0.2126 + parts[1] * 0.7152 + parts[2] * 0.0722;
  };
  const style = window.getComputedStyle(element);
  const fg = luminance(rgb(style.color));
  const bg = luminance(rgb(style.backgroundColor));
  const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  return { color: style.color, backgroundColor: style.backgroundColor, contrastRatio: ratio.toFixed(2) };
}
```

## Global Page Checks

```js
() => ({
  lang: document.documentElement.lang || "missing",
  title: document.title || "missing",
  viewport: document.querySelector('meta[name="viewport"]')?.content || "missing",
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
});
```
