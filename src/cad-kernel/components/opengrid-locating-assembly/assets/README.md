# Detachable corner-seat references

These fixed STEP references are the canonical prototype geometry supplied for
the detachable OpenGrid corner-seat fit. Keep their ASCII filenames stable so
the Worker asset URLs remain deterministic.

- `detachable-corner-seat.step`: male seat, SHA-256
  `24e10a7569b97c23d02c163c164e4876103b3abc95230b448fed6c2233ea04a0`.
- `detachable-corner-seat-holder.step`: female retaining-tab holder, SHA-256
  `281de27af19b776b2baa19f062bb39911eda252fc571360ac71c44f6846b3c8f`.

The male includes the 0.2 mm Ø4.6-to-Ø5 lead-in and the 0.15 mm raised wear
surface. The female holder is used as material geometry: the Organizer Box
subtracts `Ø7 × 1.5 mm envelope - holder` so the retaining tabs remain part of
the exported box solid rather than becoming a separate printable part.
