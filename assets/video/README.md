# Hero video

Drop two video files here, one per theme:

- `hero-dark.mp4`  — used in **dark mode**
- `hero-light.mp4` — used in **light mode**

The page automatically shows the one matching the active theme.

Recommendations:
- Muted, loopable, 10–20s
- **Under ~5 MB** each (compressed `.mp4`, H.264)
- Dark-mode video: darker palette, brighter accents — video sits at 55% opacity over dark background
- Light-mode video: brighter, softer palette — video sits at 65% opacity over light background

If either file is missing, the site falls back gracefully to a flat background.
You can also provide just one file (e.g. `hero-dark.mp4`); the missing variant simply won't show in its theme.
