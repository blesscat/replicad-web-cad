# OpenGrid OpenConnect Shelf reference asset

`openconnect-slot-negative-lock.step` is the locked OpenConnect receptacle
negative supplied for this component. It was provided as
`openConnect_slot_negative_lock.step` and is stored byte-for-byte without
unit conversion, scaling, mirroring, healing, or recentering.

- SHA-256: `6c982975a7d3ee8007cf108553b2d67bfdd10202ae52a6f9babf34d7be346dab`
- Size: 63,446 bytes
- Units: millimetres
- Authored bounds: `[-13, -13.2, 0]` to `[8.6, 9, 2.7]` mm
- Authored volume: approximately `1010.6805154 mm³`
- Topology: one valid STEP solid

Runtime placement preserves the authored dimensions and first applies the same
180° Y-axis assembly rotation used by the OpenGrid Snap OpenConnect head. It
then stands the slot upright with a +90° X rotation. The installed transform
maps source `[x, y, z]` to
`[-x + columnCenterX, z - 2.7 + rearThickness, y + 14]`. One copy is cut at
every 28 mm column center; every copy contains the supplied lock geometry and
accepts the Snap head in its assembled direction.

## Upstream attribution

The accompanying OpenConnect SCAD source declares Creative Commons Attribution
4.0 International and credits:

- OpenConnect creator: [mitufy](https://github.com/mitufy)
- OpenConnect project: [OpenConnect — OpenGrid's own connector system](https://www.printables.com/model/1559478-openconnect-opengrids-own-connector-system)
- OpenGrid design: [David D](https://www.printables.com/model/1214361-opengrid-walldesk-mounting-framework-and-ecosystem)

The SCAD source documents the default 0.1 mm side/depth clearances, 2.7 mm
negative depth, 28 mm tile pitch, and locked-slot generation used by this STEP.
Public UI attribution is maintained with the component.

## Excluded reference

The supplied `openconnect_gridfinity_shelf_online.stl` was inspected only for
proportions and orientation. It is a non-manifold 42 mm Gridfinity reference,
is not copied into the repository, is not loaded at runtime, and is not an
authoritative or golden geometry asset for this 28 mm OpenGrid component.
