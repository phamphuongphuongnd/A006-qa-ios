# AmountKeypad

The in-app number pad for Quick capture and Entry detail — identical on iOS and Android so the 10-second flow feels the same everywhere.

- Amount in `amount-xl` (56–60px, tabular figures). Typing "1250" shows "£12.50". Empty = "£0.00" in `ink-muted`.
- Operator row `+ − × ÷` above the digits. While an expression is typed it shows small above, and the big line reads "= £16.70". Invalid sum: big number dims and "Check the sum" appears in `error`.
- Keys 46px on `surface`, on a `surface-sunk` tray. Stops accepting digits above 999,999.99.
