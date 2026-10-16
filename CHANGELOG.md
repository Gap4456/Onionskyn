# Changelog

All notable changes to Onionskyn are listed here, newest first.

## 0.12.1-beta

### Added
- **Frame ranges.** Shift+click in the timeline selects a range of frames on a layer (Shift+click the frame numbers to take every unlocked layer). Drag inside the range to slide its keyframes together.
- **Reverse frames.** Flips the order of the selected frames, tweens included.
- **Pasteboard colour.** The area around the stage can be any colour (Doc tab); it is remembered in the browser.
- The onion-skin boxes are now labelled **Before** and **After**.

## 0.12.0-beta

### Added
- **Scenes.** Files with several scenes now import completely. The scenes are joined into one timeline, as Flash does when it publishes, with each scene's first keyframe marked **S**. The Doc tab lists the scenes so you can jump to one, and `gotoAndPlay("Scene name", 1)`, `nextScene()` and `prevScene()` work.
- **Scripts on clips and buttons.** Movie clips and buttons have a Script box in the Object tab, and symbol instances import their scripts from `.fla` files that have them. There is a new **Button** symbol type (Up, Over, Down and Hit frames).
- **ActionScript 1/2 layer.** A new **Scripts** setting in the Doc tab runs old Flash code directly: `on (release)` and the other button events, `onClipEvent`, assigned handlers (`mc.onRelease = ...`), `_root` / `_parent` / `_x` / `_alpha` and friends, `gotoAndPlay`/`gotoAndStop` with 1-based frames and scene names, `tellTarget`, `with`, `getURL`, `trace`, `random`, `getTimer`, `Key`, `new Sound`, and timeline-level `var` and `function`. AS2 type annotations are ignored. The `.fla` importer turns the setting on when a file's scripts look like ActionScript 1/2. See the new "ActionScript 1/2 and scenes" doc page. Unsupported commands (`attachMovie`, `duplicateMovieClip`, `loadMovie` and similar) are reported once and skipped.
- The legacy-file message now explains that recent Animate versions drop button handlers when they convert old files to ActionScript 3.

### Tests
- Added the `as1` suite.

## 0.11.0-beta

### Added
- **Eraser** (key `E`): drag to cut away fills and trim lines on the active layer. It works on curves, rotated and scaled shapes, gradients and shapes with holes. A whole drag is one undo step, and **[** and **]** change the size. A shape with both a fill and an outline is split into a fill object and an outline object so each can be cut cleanly. Groups, symbols, text and images are not affected.

### Changed
- Added the MIT-licensed [polygon-clipping](https://github.com/mfogel/polygon-clipping) library (about 29 KB) for the eraser. It is credited in `THIRD-PARTY.md`.

### Tests
- Added the `eraser` suite.

## 0.10.3-beta

### Security
- The project background colour is now validated when a file is opened and again when the HTML player is exported. A crafted project file could previously inject script into an exported player.

### Tests
- The `xss` suite covers a crafted background colour end to end (save, edit, reopen, export).
- The `undotext` suite now uses exact undo counts and also covers the document name and number-field arrow keys.

## 0.10.2-beta

### Fixed
- Typing in a text field (frame script, frame label, document name) is now one undo step instead of one per keystroke. Reported by a contributor.

### Tests
- Added the `undotext` suite.

## 0.10.1-beta

### Added
- **Fluid Brush** (key `F`): pressure- and speed-sensitive strokes with stabilizer, smoothing, taper, roundness and angle. Settings live in a Brush tab that only appears while the tool is active, with saveable presets.
- **Region fill:** the Paint bucket now fills empty space enclosed by lines, not just existing shapes. The fill sits behind the lines and reaches sharp corners.
- **Gap size** option for the bucket: close no gaps, or small, medium or large ones.
- **All layers** option for the bucket: treat lines on every layer as walls.
- **Gradients:**
  - Multi-stop editing, with colour, position and opacity for each stop, plus add and remove.
  - On-canvas handles: drag the end points of a linear gradient, or the centre, radius and ellipse handles of a radial one. Drag stop markers, click the line to add a stop, and Alt-click a marker to remove it.
  - The Paint bucket can fill with the chosen gradient.
- **Merge strokes** for the Brush and Fluid Brush: consecutive same-colour strokes join into one shape. This can be turned off.

### Changed
- Brush strokes no longer stay selected after you draw them, so you can keep drawing without converting each stroke.
- Recolouring a gradient shape with a solid bucket fill now clears the gradient.
- "Report a problem" now opens an email to the support address.

### Docs
- Added the user guide, tutorials, reference, and the README, LICENSE and THIRD-PARTY files for GitHub.
- Added the source files, build script and regression tests to the repository, with a "Building from source" guide.
