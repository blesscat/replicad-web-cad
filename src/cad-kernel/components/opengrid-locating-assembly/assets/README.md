# Detachable corner-seat references

These STEP files preserve the supplied prototype sources and the validated male
target used by the detachable OpenGrid corner-seat fit. Keep their ASCII
filenames stable so the Worker asset URLs remain deterministic.

- `detachable-corner-seat.step`: supplied 3 mm-body male source, SHA-256
  `24e10a7569b97c23d02c163c164e4876103b3abc95230b448fed6c2233ea04a0`.
- `detachable-corner-seat-3.8.step`: derived 3.8 mm-body male target, SHA-256
  `cc873fad85f8c97b49eb212b56b2cd15669eb636433711dd1d256c0bbf282f06`.
- `detachable-corner-seat-holder.step`: supplied female retaining-tab holder,
  SHA-256
  `281de27af19b776b2baa19f062bb39911eda252fc571360ac71c44f6846b3c8f`.

The derived male moves the stations above the 0.2 mm lead-in upward by 0.8 mm.
It therefore keeps the supplied Ø4.6-to-Ø5 insertion chamfer and 0.15 mm raised
wear surface while increasing the locating body to 3.8 mm and total height to
5.3 mm. The supplied female remains unchanged on disk; at build time its top
planar faces are extended by 0.25 mm, from 1.5 mm to 1.75 mm effective depth.
The Organizer Box subtracts `Ø7 × 1.75 mm envelope - extended holder` so the
retaining tabs remain part of the exported box solid rather than becoming a
separate printable part.
