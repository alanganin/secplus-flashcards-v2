Security+ Flashcards — User Tutorial
1) What this app is

A lightweight, offline-friendly flashcard app for CompTIA Security+ (SY0-701).
Features: search & filters, example scenarios on every card, edit/add/delete, progress tracking, export/import, and installable mobile PWA.

2) Getting started
Run it locally (Windows/macOS/Linux)

Put these three files in the same folder: index.html, app.js, cards.json.

Open a terminal in that folder.

Start a tiny web server:

Windows: py -m http.server 5500 (or python -m http.server 5500)

macOS/Linux: python3 -m http.server 5500

Open: http://localhost:5500/index.html

Don’t double-click index.html (that loads file:// and breaks the JSON fetch).

Run it on GitHub Pages

New GitHub repo → upload index.html, app.js, cards.json.

Repo Settings → Pages → “Deploy from a branch” → main / (root) → Save.

Open the Pages URL it shows (e.g., https://username.github.io/repo/).

3) Studying cards

Card layout

Front: the question (“term”).

Back: the answer (“definition”).

Example: a practical scenario (toggle with 💡 Example).

Flip a card: click Flip or press F.

Next/Prev: buttons or → / ← keys.

Mark knowledge

Know (✅ / S)

Unsure (❓ / D)

Don’t know (❌ / A)

Shuffle: emphasizes cards you struggle with (weighted).

Progress ring: estimates mastery (✅ counts full, ❓ partial).

4) Search & filter

Search: type keywords in the sidebar and press Enter.

Filter by objective:

Objective Title (e.g., “Compare and contrast concepts and strategies to protect data”)

Objective Code (e.g., 3.3)

Filter by bucket: All, Unseen, Don’t know, Unsure, Know.

5) Examples (the 💡 button)

Every card now has an example scenario.

Flip to the back of the card, ensure 💡 Example is toggled on.

You can edit these examples (see next section).

6) Adding & editing cards

Add a card: top-bar ➕ Add (or press N).

Edit the current card: ✏️ Edit (or E).

Delete: 🗑 Delete (removes it from your local overlay).

What happens to changes?
Your edits/additions are stored in your browser’s localStorage as an overlay (non-destructive). The original cards.json stays intact. You can export a merged deck anytime.

7) Keyboard shortcuts (cheat sheet)

/ focus search

← / → previous / next

F flip card

S / D / A know / unsure / don’t know

E edit current card

N add new card

8) Privacy note

Your study progress and edits are saved only in your browser (localStorage). The app does not send data to a server.
