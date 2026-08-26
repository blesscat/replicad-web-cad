# Detachable corner-seat references

These STEP files preserve the supplied prototype sources and the validated male
target used by the detachable OpenGrid corner-seat fit. Keep their ASCII
filenames stable so the Worker asset URLs remain deterministic.

- `detachable-corner-seat.step`: supplied 3 mm-body male source, SHA-256
  `24e10a7569b97c23d02c163c164e4876103b3abc95230b448fed6c2233ea04a0`.
- `detachable-corner-seat-3.8.step`: supplied 3.8 mm-body male target, SHA-256
  `04cccccbc1836f4580cc3b5f0b9c0d410140e7b48fdb638a748e78d697370153`.
- `detachable-corner-seat-holder.step`: supplied female retaining-tab holder,
  SHA-256
  `281de27af19b776b2baa19f062bb39911eda252fc571360ac71c44f6846b3c8f`.

The supplied male target keeps the Ø4.6-to-Ø5 insertion chamfer, increases the
locating body to 3.8 mm and total height to 5.3 mm, and uses a 1.94 mm keyed
retaining head. Its exposed-bottom lock indicator is generated as a 0.4 mm-wide
by 2 mm radial straight slot with a 0.2 mm recess depth. The supplied female
remains unchanged on disk; at build time its top planar faces are extended by
0.25 mm, from 1.5 mm to 1.75 mm effective depth. The extension is fused into
one holder solid. The Organizer Box derives the socket cutter from the extended
Ø7 mm holder while preserving 0.01 mm of radial overlap with the host body, so
the retaining tabs become a manifold part of the exported box rather than a
coincident or separate printable part.
