# 💌 Dear Me

Dear Me is a time-capsule app where you write a letter to your future self, choose an unlock date, and the letter stays sealed until that day arrives. It runs entirely in your browser, with no server and no account.

## Getting started

1. Put these files in the same folder:
   - `index.html`
   - `style.css`
   - `script.js`
2. Open `index.html` in your browser.
3. Tap the envelope, write a letter, pick an open date, and press **Lock my letter**.

No installation or build step is needed.

## Features

**Writing**
- Title, message, mood and category for every letter
- Date presets: Tomorrow, 1 week, 1 month, 6 months, 1 year
- Tags, with a live word and character counter
- Writing prompts, built-in templates and your own saved templates
- Draft autosave, so an unfinished letter is still there when you come back
- Photo attachments, resized and saved as compressed JPEGs
- Voice dictation (in browsers that support speech recognition)
- Writing timer that shows time, words written and words per minute
- Focus mode, which hides everything except the writing box

**Locking and privacy**
- Letters stay sealed until their unlock date, and locked messages are never searchable
- Optional password protection per letter, using AES-GCM encryption with a key made from your password (PBKDF2)
- Optional PIN lock screen
- Recurring letters: repeat weekly, monthly or yearly, up to 52 letters in a numbered series

**Reading and organizing**
- Search, filters (All, Favorites, Locked, Unlocked), category and mood filters, and sorting
- Favorites, bulk select, and delete with Undo
- Month calendar with dots on unlock days
- Reply to your past self and record how you feel reading a letter now
- Banner showing the next letter to open and “On this day” reminders
- Insights: moods, categories, letters per month, word counts and your writing streak
- “Surprise me”, which opens a random past letter

**Sharing and backups**
- Backup and restore as a JSON file
- Export all letters as CSV (locked messages are left out)
- Download a letter as a `.txt` file or share it as a PNG image
- Print-friendly layout

**Personalization**
- Light and dark themes
- Five accent colours, compact list view, and three letter fonts
- Optional notifications when letters unlock (the tab must be open)

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Search letters |
| `n` | Start a new letter |
| `c` | Open the calendar |
| `Ctrl/Cmd + Enter` | Lock the letter you’re writing |
| `Esc` | Cancel editing |

## How your data is stored

- Letters are saved in your browser’s `localStorage`, on your device only.
- **Clearing your browser data deletes your letters.** Use **Back up letters** regularly.
- Letters are not synced between browsers or devices. Use backup and restore to move them.
- Photos take up space, so check the storage meter in Settings if you add many.

## Security notes

- **Password-protected letters** are encrypted before they are saved. If you forget the password, the letter **cannot be recovered**.
- Encrypted letters can’t be edited, and photos can’t be added to them.
- The **PIN lock** is a privacy screen, not encryption. Anyone with access to your browser’s storage could get around it.
- Letter titles, moods, categories, tags and dates are not encrypted, even on protected letters.

## Browser support

Dear Me works in current versions of Chrome, Edge, Firefox and Safari. A few features depend on the browser:

- Encryption needs the Web Crypto API, which is only available on secure pages (https, localhost, or a local file in most browsers).
- Voice dictation works in browsers with speech recognition, mainly Chrome and Edge.
- Notifications need your permission and only fire while the tab is open.

## Project structure

```
dear-me/
├── index.html   # page structure, dialogs and forms
├── style.css    # styling, themes, layout and animations
├── script.js    # all app logic (storage, encryption, rendering, features)
└── README.md
```

## Tech

Plain HTML, CSS and JavaScript, with no frameworks or build tools. The only external resource is the Poppins and Caveat fonts from Google Fonts, and the app falls back to system fonts if they can’t load.

## Ideas for the future

- Share a letter with someone else on its unlock date
- Optional cloud backup
- Installable app with offline support
- Automated tests for the date and encryption code

## License

Add your preferred license here (for example MIT).
