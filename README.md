# Ultra Custom Newtab Studio

Ultra Custom Newtab Studio is a customizable start page for Chromium-based browsers. It supports live site cards, sandboxed custom HTML, notes, digital and analog clocks, custom colors/backgrounds/CSS, card sizing, scaling, drag reorder, import/export, and up to 100 cards.

## Opera GX support

Opera GX blocks the `chrome_url_overrides.newtab` manifest key, so the default `manifest.json` is Opera-compatible and does **not** declare that key. Load this folder unpacked in `opera://extensions`, then click the extension toolbar button or open the extension options page to launch `newtab.html`.

Opera GX does not currently allow a normal extension to fully replace the built-in Speed Dial/new-tab page. If you want the studio to open from a new-tab helper extension or startup URL, use the extension page URL shown in Opera after loading it unpacked:

```text
chrome-extension://<your-extension-id>/newtab.html
```

## Chrome / Chromium new-tab override build

For Chrome-compatible browsers that allow new-tab overrides, use `manifest.chrome.json` as the packaged manifest. It keeps the `chrome_url_overrides` entry that points new tabs at `newtab.html`.

## Local preview

`newtab.js` uses `chrome.storage.local` inside the extension and falls back to `localStorage` when opened directly as a local preview page.
