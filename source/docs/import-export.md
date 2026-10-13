# Importing and exporting

## Opening Adobe .fla files

Use **File → Open project or .fla…**, or drop a `.fla` or `.xfl` file on the window. Onionskyn brings across layers, keyframes, tweens, symbols, gradients, text, masks, bitmaps, sounds and frame scripts. A report appears afterwards listing what was imported and anything that could not be. Frame scripts that depend on advanced CreateJS features, or that load outside files, may report errors in Preview. Always keep your original `.fla`; the import is a best-effort conversion.

## Exporting

Open the **Export** menu, or choose **Export settings…** to see all formats in one dialog. Each dialog shows the output size and duration and warns before you start something too large.

| Format | What you get | Notes |
| --- | --- | --- |
| Video | `.webm`, or `.mp4` where your browser supports it | Recorded in real time, so it takes as long as the animation lasts. Quality from 2 to 20 Mbps, optional frame range and repeat count. Needs a browser with video recording; if it is missing, the button is disabled. |
| Animated GIF | `.gif` | Set size, frame rate, range and looping (forever, once, or a number of times). |
| Image (this frame) | PNG, JPEG or SVG | PNG and SVG can have a transparent background. |
| Image sequence | `.zip` of numbered images | PNG or JPEG, one per frame in the chosen range. |
| HTML5 player | One `.html` file | Plays the animation with scripts and sound, with no other files needed. Background options: stage colour on a dark page, stage colour filling the page, or transparent. |

To send someone a working animation, the HTML5 player is the most faithful option, and the project file (`.onionskyn.json`) is the one to send if they want to edit it.
