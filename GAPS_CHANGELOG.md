# Gap4456's Onionskyn Changes

This fork is an experimental extension of [Onionskyn](https://github.com/papptimus/Onionskyn). Thanks to the original author, papptimus, for creating and maintaining the editor.

The changes below describe the modifications made to this fork's browser-based version. They are intended to make frame-by-frame and tween animation workflows more convenient.

## Changes

1. **Movable rotation pivot**
   - Added a visible, movable orange pivot for objects.
   - Rotation and motion tween interpolation respect the custom pivot.
   - `Ctrl + double-click` resets the pivot.
   - Custom pivot information is retained in tested frame-copying and reversing workflows.

2. **Frame insertion (`+Frame`)**
   - Inserting a frame advances the timeline playhead to the next frame.

3. **Keyframe workflow (`+Key`)**
   - On a regular frame, converts the current frame into a keyframe.
   - When already on a keyframe, creates a keyframe at the next position and advances the playhead, without silently overwriting an occupied position or exceeding the timeline.

4. **Blank keyframe workflow (`+Blank`)**
   - On a regular frame, converts the current frame into a blank keyframe.
   - When already on a keyframe or blank keyframe, creates a blank keyframe at the next position and advances the playhead, with safeguards against overwriting and going beyond the timeline.

5. **Duplicate in place (`Ctrl + D`)**
   - Removed the automatic 12-pixel positional offset when duplicating an object.
   - Duplicated objects are placed at the same coordinates, with new object IDs.

6. **Copy Frames / Paste Frames**
   - Added frame copying and pasting through the timeline's right-click context menu.
   - Supports a single frame or a selected frame range.
   - Pasting **overwrites** the destination frames; it does not insert frames or shift later frames.
   - Preserves frame types, objects, tween data, and custom pivots.
   - Refuses pastes that would extend beyond the timeline.
   - Copy/paste operations were tested with undo/redo, motion and shape tweens, and reverse.
   - This is separate from the existing object `Ctrl + C` / `Ctrl + V` shortcuts.

7. **UI terminology**
   - Renamed the **Motion** button to **Tween** for clarity.
   - The underlying `data-fr="motion"` action and motion tween behavior remain unchanged.

## Known limitation

- The existing **Reverse** operation may collapse gaps between keyframes rather than preserving their original spacing. This behavior has **not** been changed in this fork.

## Where to find the browser version

- `source/onionskyn.html` — ready-to-open browser build containing these changes.
- `source/src/` — editable source files for the modifications.
- `source/build.sh` — assembles the browser build from the source files.

The Electron/Windows EXE experiment is **not** part of this published fork.

## Notes

These changes were developed and tested iteratively with AI-assisted coding. This document describes observed behavior, not a claim that every possible edge case has been tested.

Original project and license: [papptimus/Onionskyn](https://github.com/papptimus/Onionskyn) (MIT).
