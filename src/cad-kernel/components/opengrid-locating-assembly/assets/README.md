# Detachable corner-seat references

These STEP files preserve the supplied prototype sources and the validated male
target used by the detachable OpenGrid corner-seat fit. Keep their ASCII
filenames stable so the Worker asset URLs remain deterministic.

- `detachable-corner-seat.step`: supplied 3 mm-body male source, SHA-256
  `24e10a7569b97c23d02c163c164e4876103b3abc95230b448fed6c2233ea04a0`.
- `detachable-corner-seat-3.8.step`: supplied 3.8 mm-body male target, SHA-256
  `7a7cf21c405ab0ceca2b204b0b1c1eb1c7d581942ce8e5da65e6c7ce31a78fa7`.
- `detachable-corner-seat-holder.step`: supplied female retaining-tab holder,
  SHA-256
  `281de27af19b776b2baa19f062bb39911eda252fc571360ac71c44f6846b3c8f`.

The supplied male target keeps the Ø4.6-to-Ø5 insertion chamfer, increases the
locating body to 3.8 mm and total height to 5.3 mm, and uses a 1.96 mm keyed
retaining head. Its exposed-bottom lock indicator is included in the v6 solid
as a 0.5 mm-wide by 2 mm radial straight recess with a 0.4 mm depth. The
Pillar generator uses this male solid directly. The female socket's matching
indicator is drawn by the shared Worker geometry from the male indicator
contract; it is not copied from the male STEP. The supplied female retaining
holder remains unchanged on disk; at build time its top planar faces are
extended by 0.25 mm, from 1.5 mm to 1.75 mm effective depth. The extension is
fused into one holder solid. The Organizer Box derives the socket cutter from
the extended Ø7 mm holder while preserving 0.01 mm of radial overlap with the
host body, so the retaining tabs become a manifold part of the exported box
rather than a coincident or separate printable part.
