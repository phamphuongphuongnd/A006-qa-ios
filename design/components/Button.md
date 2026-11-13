# Button

Pill buttons, 56px tall (`tap-main`), radius `radius-pill`, label in `body-strong` at 17px.

- **Primary** (`primary` fill, `on-primary` text): the one action a screen exists for — Save, Sort now, Continue, Export. One per screen.
- **Secondary** (1.5px `line-strong` outline): the alternative next to a primary — Add manually, Not now, Personal stop.
- **Sunday** (`sunday` fill, `on-sunday` text): only for "Try Pro free for 7 days". Never for anything else, so Pro never looks like the default.
- **Text** (`work-text`; `primary` in dark): low-weight links — See all, Review, Change, Later. Still 48px tall.
- **Disabled**: `surface-sunk` fill, `ink-muted` text. Save stays disabled while the amount is 0 and on Entry detail until something changes.
- `sm` = 48px (`tap-min`) for buttons inside cards.

Consumer provides: label (verb first, sentence case, from product.md word for word), optional leading 18–20px icon. Put primary buttons in the bottom half of the screen.
