# Globel — Google Sheets version

This version reads the daily puzzle from your published Google Sheet:

https://docs.google.com/spreadsheets/d/e/2PACX-1vSevqoDAZpCznoy2rAoyLQ9CDbVWjeGo8dmtLkHe947Q_ff09ZGTOR6NALeB9F4sg/pub?gid=796509207&single=true&output=csv

## Upload to GitHub

Upload these files to the root of your Globel repository:

- index.html
- style.css
- config.js
- script.js

Choose **Commit changes**. GitHub Pages will rebuild automatically.

## Spreadsheet requirements

The game looks for these headers:

- Date
- Answer
- Status
- Puzzle #

For a puzzle to appear:

1. Date must match the current date in America/Chicago.
2. Answer must contain exactly five letters.
3. Status must be `Ready`.

The matching is not case-sensitive for the status.

## Important current condition

At the time this package was created, the published sheet contained blank answers and all rows were Draft. Add an answer and change that date's status to Ready before testing.

## Test a future date

Add `?date=YYYY-MM-DD` to the game address. Example:

https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/?date=2026-08-01

This lets editors test a scheduled puzzle before that date.

## Saved progress

Progress is stored in the player's browser with localStorage and is separate for each puzzle date.
