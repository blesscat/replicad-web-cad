# OpenGrid Snap reference assets

These STEP files are repository-local copies of the supplied zero-offset
reference assemblies used by the OpenGrid Snap component:

| Variant | Repository asset               | Supplied source filename            |
| ------- | ------------------------------ | ----------------------------------- |
| Full    | `opengrid-hole-snap-full.step` | `openGrid hole Snap.step`           |
| Lite    | `opengrid-bare-lite-snap.step` | `openGrid Bare Lite Snap hold.step` |

The source files were provided in `/Users/blesscat/Desktop` during local
development. They are Autodesk/HOOPS Exchange STEP exports in millimetres.
The files are kept as imported assemblies; runtime code must use the bundled
module-relative URLs and must not read the Desktop path. Confirm ownership and
permission before publishing these assets outside the local repository.
