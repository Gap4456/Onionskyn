# Reference

## Tools

| Tool | Key | Notes |
| --- | --- | --- |
| Selection | V | Click, shift-click or drag a marquee to select; drag to move. |
| Node edit | A | Edit the points and curves of a path. |
| Pen | P | Click for corners, drag for curves, **Enter** to finish. |
| Pencil | Y | Freehand line. |
| Brush | B | Paints a filled shape. **[** and **]** change size; the options bar sets size, shape, angle and colour. A pen or stylus adds pressure. |
| Fluid brush | F | Smooth, tapered, variable-width strokes. Settings live in the **Brush** tab (see below). **[** and **]** change size. |
| Eraser | E | Cuts away fills and trims lines on the **active layer** as you drag (a whole drag is one undo step). **[** and **]** change size. A shape with both fill and outline is split into a fill object and an outline object. Groups, symbols, text and images are not affected; use Selection and Delete for those. Locked or hidden layers are skipped. |
| Line | L | Hold **Shift** for 45° steps. |
| Rectangle / Ellipse | R / O | **Shift** = square or circle, **Alt** = from the centre. Rectangle has a Corner radius option. |
| Text | T | Click to type, double-click existing text to edit. **Esc** or clicking away finishes. |
| Paint bucket | K | Click a shape to recolour its fill (hold **Alt** for the stroke). Click empty space enclosed by lines to fill that region. **Gap size** closes small breaks in the outline; **All layers** treats lines on every layer as walls. If **Fill type** is Linear or Radial, the bucket applies a gradient. |
| Eyedropper | I | Copies a colour; hold **Alt** for the stroke. |
| Hand | H | Pans the stage; holding **Space** does the same. |

## Fluid brush

Press **F** to pick the Fluid brush; the **Brush** tab opens with its settings. It paints a smooth filled shape (a normal path you can edit with Node edit, recolour or tween). Brush strokes are not left selected, so you can keep drawing without handles in the way. Settings:

| Setting | What it does |
| --- | --- |
| Fill colour / Fill opacity | Colour and transparency of the stroke. |
| Size | Brush width, 1 to 200. |
| Stabilizer | Makes the brush follow your pointer on a "rope", so shaky hands give smooth lines. Higher = more lag and smoother. |
| Curve smoothing | Relaxes the finished path. Higher = smoother, rounder curves. |
| Roundness | 100 is a round tip; lower values make a flat, calligraphy-style tip. |
| Angle | Rotates the flat tip (only visible when Roundness is below 100). |
| Taper | Thins the start and end of each stroke to a point. 100 makes a whole stroke a spindle. |
| Velocity | Positive: faster strokes get thinner. Negative: faster strokes get thicker. |
| Pressure | How much pen pressure changes the width. Has no effect with a mouse. |
| Zoom size with stage | On: the size is in stage units and scales with zoom. Off: the brush stays the same size on screen at any zoom. |
| Merge strokes into one shape | When on (the default), strokes of the same colour drawn one after another join into a single shape, so a drawing isn't a pile of separate pieces. A different colour, or drawing something else in between, starts a new shape. Turn it off to keep every stroke separate. The classic Brush has the same **Merge strokes** checkbox in its options bar. |

**Presets.** Type a name and click **Save as preset** to keep the current settings. Click a preset to use it, **Save changes** to overwrite the selected one, and ✕ to delete it. Presets are stored in your browser, not in the project file.

## Properties panel

- **Object:** fill (solid, linear or radial gradient: see *Gradients* below), stroke, width, cap and join, opacity, position and size, rotation, and for symbol instances the type, playback mode and instance name. The **Convert to symbol** button is here.
- **Text:** font, size, bold, italic and alignment.
- **Brush:** the Fluid brush settings and presets.
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


## Gradients

Select a shape and set **Fill type** to **Linear** or **Radial** in the Object tab.

- **Stops:** each colour stop has a colour, a position (0 to 100%) and an opacity. **+ Stop** adds one in the widest gap and **×** removes one (a gradient keeps at least two).
- **On canvas:** with **On canvas** ticked, the selected gradient shows handles on the stage instead of the usual resize box. Drag the end points to set the direction and length of a linear gradient. A radial gradient has a centre handle, a radius handle and a second handle for squashing it into an ellipse. Drag a square stop marker to move that stop, click on the gradient line to add a stop, and **Alt**-click a stop marker to remove it. Untick **On canvas** to get the resize box back.
- **Paint bucket:** with a gradient Fill type chosen, the bucket fills regions and recolours shapes with that gradient.
- **Tweens:** gradients animate between keyframes when both have the same type and number of stops.
