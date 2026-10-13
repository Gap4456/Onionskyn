# Troubleshooting and known limits

- **F8 does nothing.** Some laptops need **Fn+F8**. You can also click **Convert selection to symbol** in the Object tab. Make sure something is selected.
- **My work vanished.** Autosave lives in your browser, and private windows or cleared site data erase it. Save a `.onionskyn.json` file with Ctrl+S regularly.
- **Scripts or sound do nothing in the editor.** They only run in **▶ Preview** and in the exported HTML.
- **Video export is disabled or fails.** It needs a browser that can record the canvas. Use a recent Chrome, Edge or Firefox, or export a GIF or image sequence instead. Safari has not been tested.
- **Text looks different on another computer.** The viewer's machine needs the same font. Use common fonts for files you share.
- **A shape tween jumps instead of morphing.** The two shapes are too different. Simplify them or give them the same number of points, or use a motion tween on separate objects.
- **Position fields are greyed out.** They are disabled when several objects are selected. Select one object or use the Align tab.
- **Frame count won't go lower.** It cannot go below the last keyframe; clear or move that keyframe first.

**Something else broken?** Choose **File → Report a problem…** to describe the problem, then **Email report** to send it, with technical details attached, to onionskyn.support@gmail.com. If no email app opens, use **Copy report** and paste it into an email yourself.
