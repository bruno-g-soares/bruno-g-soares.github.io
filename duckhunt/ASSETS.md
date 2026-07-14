# Temporary Duck Hunt assets

The hard-edged sprite strips and scenery in `assets/pixel/` are temporary prototype
derivatives of the original-resolution assets from
[grosbouddha/duckhunt](https://github.com/grosbouddha/duckhunt) at commit
`c59196653f8243504c0f915362af1bb9e4210678`. The source project's two-times sprite
exports were reduced with nearest-neighbour sampling to recover their native pixel grid.
The resulting PNGs contain only fully opaque or fully transparent pixels—no softened
alpha edges.

`scene-desktop.png` and `scene-mobile.png` arrange the original scenery on dedicated
320×180 and 195×350 monochrome playfields. `foreground-desktop.png` and
`foreground-mobile.png` contain matching transparent grass and ground layers so the dog
rises through individual pixels without a rectangular cutoff. Desktop renders the
320×180 scene at an exact 2× or 3× scale; the 390×700 mobile target is an exact 2× scale.
The 195×325 `scene-mobile-compact.png` pair removes only empty sky for short mobile
browser viewports, filling their width without stretching pixels or leaving side bars.

The sound files are also temporary prototype assets copied from
[grosbouddha/duckhunt](https://github.com/grosbouddha/duckhunt) at commit
`c59196653f8243504c0f915362af1bb9e4210678`.

Duck Hunt artwork and sounds remain associated with their respective rights holders and
are intended to be replaced with original assets.

All game-specific code and assets are contained in `duckhunt/`. The only hook in
the existing page is the `duckhunt` command branch in `index.html`.
