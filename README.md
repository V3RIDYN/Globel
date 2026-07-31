# Globel v1.4 — Past Puzzles

This version adds a playable archive using the existing Google Sheets puzzle schedule.

## New features

- Past Puzzles button
- Archive grouped by month
- Puzzle date and puzzle number shown without exposing the answer
- Completed and In progress labels based on browser-saved progress
- Separate saved game for every puzzle date
- Support for both Ready and Published spreadsheet rows
- Today’s Puzzle button when viewing an archive or preview
- Archive, current, and preview labels
- Result-popup messaging appropriate to the puzzle date

## Spreadsheet workflow

Keep old puzzle rows in the Google Sheet.

Playable statuses are:

- Ready
- Published

Use Draft for future puzzles that should not yet be playable. Retired rows are hidden from the game and archive.

## Upload to GitHub

Replace or add these files in the repository root:

- index.html
- style.css
- config.js
- script.js
- valid-words.js

Then commit the changes and hard-refresh the GitHub Pages site.

The footer should show v1.4.

## Direct archive links

A past puzzle can still be opened directly:

?date=2026-07-30
