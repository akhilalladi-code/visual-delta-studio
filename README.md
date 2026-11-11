# VisualDelta Studio

A local-first visual comparison studio for detecting, inspecting, and reporting pixel-level differences between images and UI screenshots.

## Features

- Compare PNG, JPEG, and WebP images locally in your browser.
- Inspect results with side-by-side, opacity overlay, draggable wipe, and difference heatmap views.
- Adjust sensitivity and difference amplification.
- Review changed-pixel count, percentage, bounding box, and image dimensions.
- Export the difference image and a portable HTML comparison report.
- No account, backend, or image upload required.

## Development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run test
npm run build
```

## Privacy

Images are processed in the browser. VisualDelta does not send comparison images to a server.

## License

MIT. Copyright (c) 2026 Akhil Alladi.
