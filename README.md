# Globel v1.3

This update fixes both requested issues.

## Changes

1. Only recognized five-letter words are accepted.
   - Invalid entries display: `Not in the word list.`
   - Invalid entries do not consume a guess.
   - The dictionary is stored locally in `valid-words.js`, so no external dictionary service is required.

2. The result popup opens immediately after the winning guess or sixth failed guess.
   - It no longer depends on reloading or pressing Clear saved game.
   - It opens after the final colored tiles have rendered.

## Upload to GitHub

Replace or add these files in the repository root:

- `index.html`
- `style.css`
- `config.js`
- `script.js`
- `valid-words.js`  ← new and required

Commit the changes, wait for GitHub Pages to redeploy, and hard-refresh.

The footer should show `v1.3`.

## Google Sheet feed

https://docs.google.com/spreadsheets/d/e/2PACX-1vSevqoDAZpCznoy2rAoyLQ9CDbVWjeGo8dmtLkHe947Q_ff09ZGTOR6NALeB9F4sg/pub?gid=796509207&single=true&output=csv
