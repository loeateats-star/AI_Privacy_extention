# PromptGuard

A Chrome extension (Manifest V3) that warns you before you paste personal
information into an AI chatbot. It works on **chatgpt.com**, **claude.ai** and
**gemini.google.com**.

When you type something like an email address, phone number, card number or
API key, a yellow warning box pops up in the corner. For each finding you can
**Redact** it (replace it with a placeholder like `[EMAIL]`) or **Dismiss** it.

**Privacy:** everything runs locally in your browser. The extension makes no
network requests. The only permission it asks for is `storage`, which saves
your detector on/off settings.

## File structure

```
manifest.json              Extension settings: which sites, which scripts, options page
src/
  detectors.js             Splits the text into words and checks each one
  content.js               Finds the chat box every second, scans it, shows the warning
options/
  options.html, options.js Settings page: turn each check on or off
tests/
  detectors.test.js        Tests for detectors.js (run with Node)
```

## Load the extension in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose this folder (the one with `manifest.json`).
4. Open chatgpt.com, claude.ai or gemini.google.com and type
   `my email is test@example.com`. The warning box should pop up within a second.

After you edit any file, click the reload icon on the PromptGuard card in
`chrome://extensions`, then refresh the chat tab.

To open the settings, click **Details** on the PromptGuard card, then
**Extension options**.

**Debugging:** content script errors show up in the chat page's DevTools
console (F12). Errors in the options page show up in that page's own DevTools.

## Run the tests

You only need Node (version 18 or newer):

```
node tests/detectors.test.js
```

## How detection works

`scanText()` in `src/detectors.js` splits the text into words at every space,
then checks each word with simple `if` statements:

- has an `@` with a dot after it: email
- has 2 dashes, like `415-555-0132`: phone (`123-45-6789` is an SSN)
- 13 to 19 digits, or four groups of 4 digits: credit card
- a number followed by `St`, `Ave`, `Road`...: street address

Then it looks for context phrases like "password is" or "diagnosed with" and
flags the words right after them. To add a phrase, add a line to
`CONTEXT_PHRASES`. To add a new check, add an `if` to `checkWord()` and an
entry to `DETECTORS` (the options page and warning box read from that list).

## Add a new site

1. Right-click the site's chat box, choose **Inspect**, and find the element
   with `contenteditable="true"` (or a `<textarea>`).
2. Add a selector for it to `CHAT_BOX_SELECTORS` at the top of `src/content.js`.
3. Add the site's URL (like `"https://www.perplexity.ai/*"`) to `matches` in
   `manifest.json`.
4. Reload the extension.

## Known limitations

- Detection uses simple word checks, so it will miss some things and flag
  some harmless ones. Phone numbers must use dashes (`(415) 555-0132` is
  missed), and street addresses must use a capitalised street word.
- It does not stop you from sending. It only warns you.
- Chat sites change their HTML often. If the warning stops appearing on a site,
  update `CHAT_BOX_SELECTORS` in `content.js`.
- Redact can fail if the private text is split across bold/italic formatting.
  You'll get a popup asking you to delete it yourself.
