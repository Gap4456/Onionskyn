# Changelog

All notable changes to Onionskyn are listed here, newest first.

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
