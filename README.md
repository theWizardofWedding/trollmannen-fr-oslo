# Verzaubertes Wedding — Norwegian Arcade Edition

## Launch package
This is a complete, dependency-free static app. All interface text is Norwegian Bokmal.
No npm installation, API key, paid database, image download, sound download or build step is needed.
The original brand name remains unchanged. The hero background is now generated with CSS, so the old assets folder is optional.

Files to upload to the root of the GitHub repository:
- index.html
- app.js
- styles.css
- icon.svg
- vercel.json

IMPORTANT: Replace the original THREE app files together. Do not mix the new app.js with the older HTML/CSS.
Do not upload the ZIP itself expecting Vercel to unpack it. Unzip first and upload its contents.
If uploading the enclosing directory instead, select that directory as Vercel's Root Directory.
Documentation can be uploaded too, but is not required by the app.

## First deployment on Vercel
1. Back up your current repository (GitHub Code > Download ZIP) or keep its previous commit.
2. In GitHub, open your repository, choose Add file > Upload files, upload the five app files above, and commit to main.
3. Sign up at https://vercel.com/signup with GitHub. Choose personal use / Hobby rather than a paid Pro trial.
4. In the dashboard, choose Add New > Project and import your repository. Grant access to that repository if prompted.
5. Framework Preset: Other.
6. Root Directory: the directory containing index.html (normally the repository root).
7. Build Command: turn Override on and leave the command EMPTY.
8. Output Directory: . (a single dot).
9. No environment variables are required. Click Deploy.
10. Open the generated production URL. Test it in an incognito window to check whether friends can open it without a Vercel login.
If login is required, inspect Deployment Protection for the production deployment before sharing.

The Hobby plan is free for personal, non-commercial projects, with usage quotas.
In most cases, exceeding a Hobby quota means waiting until it resets rather than automatic paid overages.
Do not upgrade to Pro or buy a custom domain unless you want paid services.
Official sources:
https://vercel.com/docs/plans/hobby
https://vercel.com/docs/builds/configure-a-build

## Play
Add 3 to 6 players. Each round has one more card per player, as in the original app.
Use sliders or the minus/plus controls to enter predicted and won tricks.
The total bid cannot equal the number of cards. Won tricks must total that number.
Exact prediction: 20 + 10 per predicted trick. Missed prediction: -10 per trick of difference.
Maximum rounds: floor(60 / number of players).

After saving, a recap opens with player results and exact predictions. Close it with Next round or Escape.
Turn sound on using Lyd av; it is OFF by default. Sounds are synthesized locally.
Effekter toggles particle celebrations and transitions. Reduced-motion preferences suppress animation automatically.
The finish button confirms finalization and presents winners, including ties.
Undo and finish ask for confirmation to reduce accidental changes.

## Efficiency and reliability changes
- Player statistics are accumulated in one pass over each round's results.
- Charts are rendered only when opening the statistics tab.
- Sound/effect failures do not prevent round scoring or persistence.
- Particle counts, duration and pixel density are bounded.
- Failed local-storage writes roll back game creation, saving, undo and completion.
- Unreadable stored history is not silently overwritten: writes are blocked and export preserves raw data when accessible.
- Backup imports validate player IDs, round counts, tricks, bids and scores; no HTML from imported names is executed.
- Existing IDs are skipped on import; imports do not overwrite newer existing games.

## Backups and saved-game migration
Games remain stored locally in each browser, under the original key:
verzaubertes-wedding-games

This is NOT a multiplayer synchronized service or a shared online database.
The same URL on another phone has separate saved games. A new domain has separate browser storage.
Use Eksporter to download JSON and Importer on the new site/device to transfer games.
Backup files include player names, so share them thoughtfully.

If the old app has no export button, one option is to first deploy this version to the SAME existing GitHub Pages address,
open it in the original browser, and use Eksporter there. Then import that downloaded file on Vercel.
Do not clear browser storage or remove your old site until the migration is complete.

If stored data cannot be read, the app intentionally blocks new writes on that origin. Export the original data,
keep it safe, and use a different browser to play until the data is repaired. Do not clear it without a backup.

## Local preview (optional)
From the folder containing index.html, if Python is installed:
python -m http.server 8000
Then open http://localhost:8000
The Python server is only for preview; Vercel does not require Python.

## Before your first real game
Create a test game with 3 players. In round 1 use bids 0/0/0 and tricks 1/0/0.
Expected points: -10/20/20. Inspect statistics, undo, replay, reload, export and import.
Try the sound toggle and effects on the actual phone(s) you will use.

## Testing limits
Automated tests ran in headless Chromium, including mobile-sized viewports, not on physical phones.
Safari/WebKit and Firefox binaries were unavailable. No live Vercel deployment was performed.
Audio API calls were exercised, but sound was not subjectively listened to.
No software can honestly be promised flawless on every device; perform the short device check above.
