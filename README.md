# PromptGuard

A Chrome extension that warns you before you send personal info to an AI chatbot
(ChatGPT, Claude, Gemini). Everything runs in your browser, nothing gets sent anywhere.

When you type something like a phone number, email, password or someone's name, a
warning pops up in the corner. You can redact it (swap it for something like `[PHONE]`)
or dismiss it. Clicking the extension icon shows how many times each type got flagged.

## What it catches

- Emails, phone numbers, SSNs, credit cards and other long numbers
- Passwords and API keys (random-looking words)
- Names
- Street addresses
- Ages, like "I am 19", "I'm 17" or "7 years old"
- The words after things like "my password is", "I live at", "diagnosed with"
- Sensitive words like password, address, number, diagnosed
- Names after email sign-offs like "Sincerely,"

## How it works

The text gets split into words and each word gets checked with a few rules:

- **Numbers:** numbers next to each other get joined and only the digits are counted.
  9 = SSN, 10-11 = phone, 13-19 = card, other 7+ = long number. Dates are skipped.
- **Passwords/keys:** a word gets points for having lowercase, capitals, digits and
  symbols, for switching between letters and digits, and for being long. 5+ points
  gets flagged.
- **Names:** a word gets points for being in the names list, being capitalized in the
  middle of a sentence, being next to another name, or coming after "Hi", "Dear", "Mr".
  2+ points gets flagged.

You can change `SECRET_POINTS_NEEDED` and `NAME_POINTS_NEEDED` in `src/detectors.js`
to make it stricter or looser.

## Files

```
manifest.json
src/detectors.js     finds the personal info
src/content.js       watches the chat box, shows the warning, counts findings
options/             settings page to turn checks on/off
popup/               shows the counts
tests/               tests for detectors.js
```

## Install

1. Go to `chrome://extensions`
2. Turn on Developer mode
3. Click Load unpacked and pick this folder
4. Open ChatGPT, Claude or Gemini and type `my email is test@example.com`

After changing code, hit reload on the extension and refresh the chat tab.

## Tests

```
node tests/detectors.test.js
```

## Limitations

- It only warns you, it doesn't stop you from sending.
- It checks once a second, so if you type and hit enter really fast it might miss it.
- Some false alarms, like "Machine Learning" looking like a name.
- If a chat site changes its layout, the selectors in `content.js` need updating.
