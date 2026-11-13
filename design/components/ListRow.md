# ListRow

64px rows in a `list` card, divider inset to the text.

- Left: 40px icon bubble — expense = `expense-soft`/`expense-text`, income = `income-*`, unsorted = `sunday-soft` with "?" or the note icon, trips = `work-soft`.
- Title `body-strong`, meta `label` in `ink-muted`: "Fuel · Work · 07:42", paperclip (+ "×2") when receipts exist, then small badges (Auto, Recurring, Personal, Edited).
- Amount right-aligned, `amount-row`, tabular. Expenses "−£", income "+£" in `income-text`.
- Swipe left = Delete (Entries) or Personal (Miles); swipe right = Work. Always followed by an Undo snackbar.
