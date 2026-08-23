# OpenGrid Snap reference assets

These STEP files are repository-local copies of the supplied zero-offset
reference assemblies used by the OpenGrid Snap component:

| Profile + variant | Repository asset                           | Supplied source filename                      |
| ----------------- | ------------------------------------------ | --------------------------------------------- |
| Standard Full     | `opengrid-bare-standard-full-snap.step`    | `openGrid Bare Snap.step`                     |
| Standard Lite     | `opengrid-bare-standard-lite-snap.step`    | `openGrid Bare Lite Snap.step`                |
| Directional Full  | `opengrid-bare-directional-full-snap.step` | `openGrid Bare Directional Snap v2.1.step`    |
| Directional Lite  | `opengrid-bare-directional-lite-snap.step` | `openGrid Bare Directional Lite Snap v2.step` |
| OpenConnect head  | `openconnect-head.step`                    | `openConnect_head.step`                       |

The source files were provided in `/Users/blesscat/Downloads/Snap+modeling+files`
during local development. They are Autodesk/HOOPS Exchange STEP exports in
millimetres. Runtime code must use the bundled module-relative URLs and must
not read the Downloads path. Confirm ownership and permission before publishing
these assets outside the local repository.

`openconnect-head.step` is the repository-owned OpenConnect interface source.
The supplied `openConnect_Snap_Directional_Lite(1).stl`,
`openConnect_Snap_Directional_Standard(1).stl`, and
`openConnect_Snap_Symmetric_Standard.stl` are placement/topology references
only and are not loaded by the runtime. The full-footprint builder always
composes the STEP head directly on the selected Snap top. Before composition,
the builder cuts an approximate 5 mm-wide negative-Y underside notch from the
Snap assembly. The notch dimensions are inferred from the supplied STL
references because no matching STEP/CAD source is available; the runtime does
not add an interface layer or increase the selected Snap height.

## Upstream attribution and derived downloads

The OpenGrid Snap source reference is the pinned upstream file at commit
`61231295ea08c302eff32051769113c48cbda255`:

https://github.com/AndyLevesque/QuackWorks/blob/61231295ea08c302eff32051769113c48cbda255/openGrid/opengrid-snap.scad

The upstream notice credits David D for the design and metasyntactic for the
OpenSCAD implementation. It identifies the source code as CC BY-NC-SA 4.0 and
derived/generated parts as CC BY 4.0. The project’s `snap-half` and
`snap-quarter` downloads are modified derivatives of the original Snap design;
their public attribution is maintained on the localized Snap generator page.

The repository-local STEP files above remain subject to the ownership and
permission review noted above before external publication.
