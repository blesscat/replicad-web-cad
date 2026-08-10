# OpenGrid Snap reference assets

These STEP files are repository-local copies of the supplied zero-offset
reference assemblies used by the OpenGrid Snap component:

| Profile + variant | Repository asset                                  | Supplied source filename                         |
| ----------------- | ------------------------------------------------- | ------------------------------------------------ |
| Standard Full     | `opengrid-bare-standard-full-snap.step`          | `openGrid Bare Snap.step`                        |
| Standard Lite     | `opengrid-bare-standard-lite-snap.step`          | `openGrid Bare Lite Snap.step`                   |
| Directional Full  | `opengrid-bare-directional-full-snap.step`       | `openGrid Bare Directional Snap v2.1.step`       |
| Directional Lite  | `opengrid-bare-directional-lite-snap.step`       | `openGrid Bare Directional Lite Snap v2.step`    |

The source files were provided in `/Users/blesscat/Downloads/Snap+modeling+files`
during local development. They are Autodesk/HOOPS Exchange STEP exports in
millimetres. Runtime code must use the bundled module-relative URLs and must
not read the Downloads path. Confirm ownership and permission before publishing
these assets outside the local repository.
