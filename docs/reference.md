# Reference

## Tools

| Tool | Key | Notes |
| --- | --- | --- |
| Selection | V | Click, shift-click or drag a marquee to select; drag to move. |
| Node edit | A | Edit the points and curves of a path. |
| Pen | P | Click for corners, drag for curves, **Enter** to finish. |
| Pencil | Y | Freehand line. |
| Brush | B | Paints a filled shape. **[** and **]** change size; the options bar sets size, shape, angle and colour. A pen or stylus adds pressure. |
| Line | L | Hold **Shift** for 45° steps. |
| Rectangle / Ellipse | R / O | **Shift** = square or circle, **Alt** = from the centre. Rectangle has a Corner radius option. |
| Text | T | Click to type, double-click existing text to edit. **Esc** or clicking away finishes. |
| Paint bucket | K | Fills a shape; hold **Alt** to set the stroke instead. |
| Eyedropper | I | Copies a colour; hold **Alt** for the stroke. |
| Hand | H | Pans the stage; holding **Space** does the same. |

## Properties panel

- **Object:** fill (solid, linear or radial gradient), stroke, width, cap and join, opacity, position and size, rotation, and for symbol instances the type, playback mode and instance name. The **Convert to symbol** button is here.
- **Text:** font, size, bold, italic and alignment.
- **Align:** align or distribute the selection, or align to the stage.
- **Frame:** tween type and easing, frame label, sound, and frame script.
- **Library:** symbols, images and sounds in the document.
- **Doc:** name, stage size, frames per second, number of frames, stage colour and onion-skin settings.

## Timeline, frames and layers

- **F5** adds a frame (holds the previous content longer). **F6** adds a keyframe copying the previous one. **F7** adds a blank keyframe. **Shift+F5** removes a frame and **Shift+F6** clears a keyframe. The same actions are in the **+ Frame, + Key, + Blank** buttons and the right-click menu.
- **,** and **.** step back and forward one frame. **Shift+,** and **Shift+.** jump to the first and last frame.
- Drag a keyframe sideways in the timeline to move it. Frames cannot be shortened below the last keyframe.
- The layers toolbar adds, duplicates, reorders, deletes and masks layers. Each layer can be hidden or locked.
- **Onion** shows faint copies of the neighbouring frames so you can judge motion; the Doc tab sets how many. **Loop** makes playback repeat.
- Group objects with **Ctrl+G** and ungroup with **Ctrl+Shift+G**.

## Tweens and easing

- **Motion tween:** moves, scales, rotates and fades matching objects between two keyframes, including colour and gradients.
- **Shape tween:** morphs one path into another. The two shapes must have compatible structure; if they do not, Onionskyn warns you and switches at the end of the span instead of morphing.
- **Easing:** Linear, Ease in, Ease out, Ease in-out, Bounce, Elastic, or **Custom curve**. Custom curve opens a Bézier editor: drag its handles or type x1, y1, x2, y2, or pick a preset.

## Text and images

- Text keeps its font, size, weight and alignment through export. Fonts must exist on the machine that plays the file, so stick to common fonts when sharing.
- **File → Import image…** adds PNG, JPG, GIF, WebP or SVG files. You can also drag a file onto the stage or paste an image from the clipboard. Images are stored in the Library and saved inside the project file.

## Sound

- Add MP3, WAV or OGG files from the Library tab.
- In the **Frame** tab, give a keyframe a sound and a Sync mode: **Event** plays once, **Start** plays unless already playing, **Stream** follows the timeline, **Stop** stops it.
- The editor timeline is silent. Sounds play in **▶ Preview** and in the HTML export. The ▶ button in the Library auditions a sound.

## Scripting

- Select a keyframe, open the Frame tab and type in the script box (for example `this.stop();`), or press **F9** for a larger editor.
- Scripts run only in **▶ Preview** and in exported HTML, never in the editor itself. Preview runs in a sandbox, and errors appear next to the Preview title.
- Scripts use a CreateJS-style API: `this.stop()`, `this.play()`, `this.gotoAndStop(frame)`, `this.gotoAndPlay(frame)`, named instances such as `this.btn_next`, mouse events, `createjs.Sound.play("id")` and `createjs.Ticker`.
- A keyframe with a script shows a small **a** on the timeline; one with a sound shows ♪.
