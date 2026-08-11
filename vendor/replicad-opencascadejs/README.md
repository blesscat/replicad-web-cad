# Project-owned Replicad OpenCascade runtime

This package keeps the `replicad-opencascadejs` package contract used by Replicad
while adding the `BRepBuilderAPI_GTransform` and `BRepTools_ReShape` bindings
required for non-uniform X/Y CAD transforms and planar-topology normalization.

The generated single-threaded runtime is built from the OpenCascade.js custom
build configuration in this directory. The build image used for the current
artifact is `donalffons/opencascade.js@sha256:3069f4c2e3ab62bb82d81843bad2c0f8552ee92373208f8f655ef9bf71c0524d`.
