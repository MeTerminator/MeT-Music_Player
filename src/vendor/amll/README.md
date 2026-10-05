# Local AMLL lyric component fork

Source: https://github.com/amll-dev/applemusic-like-lyrics
Upstream commit: `86200dead453bb067e554e989110cbadca8d4756` (core 0.6.0).
Copied lyric-player sources and their required styles/utilities. Original authorship and AGPL-3.0-only license are preserved in LICENSE.

The React adapter imports this local fork. Background rendering uses the upstream npm package independently. Package import aliases were resolved to relative paths. Row hover/active backgrounds were removed, rows centered, and vertical padding removed for tight contact.

FocusLyricPlayer.ts renders one current row plus a timed incoming row. The incoming row docks with zero gap, then its top edge constrains the outgoing row's bottom edge and pushes it upward. The preceding row fades and blurs in proportion to this displacement. A current row remains through the intro, interludes and outro until playback stops. Its display end is extended to the next row's start; original word/highlight timestamps remain unchanged.

Motion parameters live in focus-motion.ts. Enter uses mass 1, stiffness 210, damping 22; promotion uses mass 1, stiffness 280, damping 24. The solver computes settling times using a 1% displacement threshold (456 ms and 400 ms respectively). Entry compensates its settling time at the 85% landmark (15% remaining) of the extended display interval. The actual entry start, including compensation, is capped at three seconds before the next lyric starts; promotion starts one settling time before the next lyric starts. Short rows compress the animation clock. Position is sampled from media time, so seeking and frame stalls reconstruct the same layout. Reduced motion removes spring movement.

Typography: each row independently searches for the largest font that fits measured glyph width and half the usable lyric viewport height. The other half is reserved for the incoming row, including when it has not yet entered. Sizing uses actual AMLL wrapping/mask geometry; content-visibility placeholders are disabled for visible rows. Font changes reflow word masks at the original audio time. Sizes are cached by row and viewport dimensions, invalidated on font loading, and recomputed on resize.

The settled active row is anchored to the exact page center, independent of the song information panel height. The render layer spans the full viewport while typography budgets use the central 62% lyric window. Incoming/outgoing rows can pass beyond that window; a symmetric multi-stop alpha mask softens the top and bottom edges instead of clipping at the window boundary.
