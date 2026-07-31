# Globel popup fix — v1.2

Upload and replace these files in the ROOT of the GitHub repository:

- index.html
- style.css
- config.js
- script.js

After committing, wait about one minute and hard-refresh the GitHub Pages game.

You should see `v1.2` in small text beside the footer. If you do not see it, GitHub Pages or the browser is still serving the old files.

The popup now:
- uses a visible CSS class rather than the HTML hidden attribute
- opens after a short delay so the final tile result appears first
- reappears when a completed daily game is reopened
