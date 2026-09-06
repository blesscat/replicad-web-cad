# Detachable corner-seat references

These STEP files preserve the supplied prototype sources used by the
detachable OpenGrid corner-seat fit. Keep their ASCII filenames stable so the
Worker asset URLs remain deterministic.

- `detachable-corner-seat-v13.step`: supplied v13 leaf-head male, SHA-256
  `11b2da95b2b6f4607f8f9d5423dcc69869b2ecd4dc25c6b4c76c91cc4d01e82f`.
- `detachable-corner-seat-holder-11.step`: supplied Ø11 mm flat-base female
  holder, SHA-256
  `0ae3412d67041e533fb054cd8af714e625407665c3cfb129fa99a26b8bfa5b36`.

The supplied v13 male keeps the Ø4.6-to-Ø5 insertion chamfer, the 3.8 mm
locating body, the 5.3 mm total height, and the 1.96 mm key thickness, and
replaces the retaining head with a leaf head that flares from 4.24 mm to a
6.64 mm maximum length that stays inside the Ø7 mm circle. Its exposed-bottom
lock indicator is included in the v13 solid as a 0.5 mm-wide by 3 mm radial
straight recess with a 0.4 mm depth. The Pillar generator uses this male solid
directly; hosts cut no indicator marks beside sockets. The supplied Ø11 mm
female holder is used exactly as supplied: a Ø11 mm by 1.5 mm plate spanning
Z=3.8 through Z=5.3 with a head-shaped twist-lock rotation pocket and a 45-degree funnel
lead-in, with no build-time extension. Consumers derive the socket cutter from the
Ø11 mm holder within a Ø11−0.01 mm envelope while preserving 0.01 mm of radial
overlap with the host body, so the retained base material becomes a manifold
part of the exported host rather than a coincident or separate printable part.
