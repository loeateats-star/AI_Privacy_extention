/*
 * detectors.js: finds personal information in a string.
 *
 * How it works:
 *   1. Split the text into words wherever there is a space or a new line.
 *   2. Look at each word on its own:
 *        has an @ and a dot after it          -> email
 *        has 2 dashes, like 415-555-0132      -> phone number
 *        has 2 dashes, like 123-45-6789       -> social security number
 *        a long run of digits                 -> credit card
 *        a number followed by "St" or "Ave"   -> street address
 *   3. Look for phrases like "password is" or "diagnosed with" and flag the
 *      words that come right after them.
 *
 
 * This file runs in the browser AND in Node (for tests/detectors.test.js).
 * The (function () { ... })() wrapper keeps our variable names from clashing
 * with the other files.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Lists you can edit
  // ---------------------------------------------------------------------------

  // The kinds of things we look for. The options page and the banner both
  // read this list.
  const DETECTORS = [
    { type: 'API_KEY', label: 'API key', placeholder: '[API_KEY]',
      description: 'Words that start with sk-, AKIA or ghp_ (OpenAI, AWS, GitHub keys).' },
    { type: 'EMAIL', label: 'Email address', placeholder: '[EMAIL]',
      description: 'A word with an @ and a dot after it, like name@example.com.' },
    { type: 'SSN', label: 'Social Security number', placeholder: '[SSN]',
      description: 'Numbers like 123-45-6789.' },
    { type: 'CREDIT_CARD', label: 'Credit card number', placeholder: '[CARD]',
      description: 'Long numbers (13 to 19 digits) or four groups of 4 digits.' },
    { type: 'PHONE', label: 'Phone number', placeholder: '[PHONE]',
      description: 'Numbers like 415-555-0132.' },
    { type: 'ADDRESS', label: 'Street address', placeholder: '[ADDRESS]',
      description: 'A house number followed by a street word like St, Ave or Road.' },
    { type: 'CONTEXT', label: 'Personal detail', placeholder: '[PRIVATE]',
      description: 'The words after "password is", "address is", "diagnosed with", and so on.' },
  ];

  // Words that start an API key.
  const API_KEY_STARTS = ['sk-', 'AKIA', 'ghp_'];

  // Street words. These are capitalised on purpose: "742 Evergreen Terrace"
  // is an address but "3 dogs on the way" is not.
  const STREET_WORDS = [
    'Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Drive', 'Dr', 'Lane', 'Ln',
    'Boulevard', 'Blvd', 'Court', 'Ct', 'Way', 'Place', 'Pl', 'Terrace', 'Circle',
  ];

  // Context phrases. When we see the phrase, we flag up to `wordsToFlag`
  // words after it (stopping early at the end of a sentence).
  const CONTEXT_PHRASES = [
    { phrase: 'password is', wordsToFlag: 1 },
    { phrase: 'passcode is', wordsToFlag: 1 },
    { phrase: 'pin is', wordsToFlag: 1 },
    { phrase: 'ssn is', wordsToFlag: 1 },
    { phrase: 'account number is', wordsToFlag: 1 },
    { phrase: 'address is', wordsToFlag: 5 },
    { phrase: 'i live at', wordsToFlag: 5 },
    { phrase: 'born on', wordsToFlag: 3 },
    { phrase: 'diagnosed with', wordsToFlag: 5 },
  ];

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  /** True if every character in `s` is 0-9. */
  function isAllDigits(s) {
    if (s.length === 0) return false;
    for (const ch of s) {
      if (ch < '0' || ch > '9') return false;
    }
    return true;
  }

  /** Counts how many times `ch` appears in `s`. */
  function countChar(s, ch) {
    let count = 0;
    for (const c of s) {
      if (c === ch) count++;
    }
    return count;
  }

  /**
   * Splits text into words at spaces, tabs and new lines.
   * Each word remembers where it starts and ends in the original text.
   * Punctuation at the edges is removed, so "hunter2!" becomes "hunter2".
   */
  function splitIntoWords(text) {
    const words = [];
    let current = '';
    let start = 0;

    for (let i = 0; i <= text.length; i++) {
      const ch = text[i];
      const isSpace = ch === ' ' || ch === '\n' || ch === '\t' || ch === undefined;

      if (isSpace) {
        if (current !== '') words.push(trimPunctuation(current, start));
        current = '';
      } else {
        if (current === '') start = i;
        current += ch;
      }
    }
    return words;
  }

  /** Removes punctuation from the start and end of a word. */
  function trimPunctuation(word, start) {
    const punctuation = '.,!?;:()"\'';
    let end = start + word.length;
    let endsSentence = false;

    while (word.length > 0 && punctuation.includes(word[0])) {
      word = word.slice(1);
      start++;
    }
    while (word.length > 0 && punctuation.includes(word[word.length - 1])) {
      if ('.!?'.includes(word[word.length - 1])) endsSentence = true;
      word = word.slice(0, -1);
      end--;
    }
    return { text: word, start: start, end: end, endsSentence: endsSentence };
  }

  // ---------------------------------------------------------------------------
  // Checking one word
  // ---------------------------------------------------------------------------

  /** Returns a type like 'EMAIL' if this word looks private, or null. */
  function checkWord(word) {
    // API key: starts with a known prefix and is long.
    for (const prefix of API_KEY_STARTS) {
      if (word.startsWith(prefix) && word.length >= 20) return 'API_KEY';
    }

    // Email: has an @ (not at the very start) and a dot after the @.
    const at = word.indexOf('@');
    if (at > 0 && word.indexOf('.', at) > at + 1) return 'EMAIL';

    // Two dashes and only digits in between: a phone number or an SSN.
    if (countChar(word, '-') === 2) {
      const parts = word.split('-');
      if (isAllDigits(parts[0]) && isAllDigits(parts[1]) && isAllDigits(parts[2])) {
        // 123-45-6789
        if (parts[0].length === 3 && parts[1].length === 2 && parts[2].length === 4) return 'SSN';
        // 415-555-0132
        if (parts[0].length === 3 && parts[1].length === 3 && parts[2].length === 4) return 'PHONE';
      }
    }

    // Three dashes and four groups of 4 digits: 5555-5555-5555-4444
    if (countChar(word, '-') === 3) {
      const parts = word.split('-');
      if (parts.every((part) => part.length === 4 && isAllDigits(part))) return 'CREDIT_CARD';
    }

    // A long number with no spaces: 4111111111111111
    if (isAllDigits(word) && word.length >= 13 && word.length <= 19) return 'CREDIT_CARD';

    return null;
  }

  // ---------------------------------------------------------------------------
  // The main scan
  // ---------------------------------------------------------------------------

  /**
   * Looks through `text` and returns a list of findings.
   *
   * enabled: optional object like { EMAIL: false } to turn a check off.
   */
  function scanText(text, enabled = {}) {
    const words = splitIntoWords(text);
    const findings = [];

    // Adds a finding from words[first] to words[last], unless that check is
    // turned off or the words were already flagged by something else.
    function flag(type, first, last) {
      if (enabled[type] === false) return;
      const start = words[first].start;
      const end = words[last].end;
      for (const f of findings) {
        if (start < f.end && f.start < end) return; // overlaps, skip it
      }
      findings.push({ type: type, start: start, end: end, text: text.slice(start, end) });
    }

    // Step 1: check every word.
    for (let i = 0; i < words.length; i++) {
      const word = words[i].text;

      // Card number split into 4 words: 4111 1111 1111 1111
      if (i + 3 < words.length) {
        const nextFour = [words[i], words[i + 1], words[i + 2], words[i + 3]];
        if (nextFour.every((w) => w.text.length === 4 && isAllDigits(w.text))) {
          flag('CREDIT_CARD', i, i + 3);
          i += 3;
          continue;
        }
      }

      // Street address: a number, then a street word within the next 4 words.
      if (isAllDigits(word) && word.length <= 5) {
        for (let j = i + 1; j <= i + 4 && j < words.length; j++) {
          if (STREET_WORDS.includes(words[j].text)) {
            flag('ADDRESS', i, j);
            break;
          }
        }
      }

      const type = checkWord(word);
      if (type !== null) flag(type, i, i);
    }

    // Step 2: look for context phrases and flag the words after them.
    for (let i = 0; i < words.length; i++) {
      for (const rule of CONTEXT_PHRASES) {
        const phraseWords = rule.phrase.split(' ');

        // Does the text at word i match every word of the phrase?
        let matches = true;
        for (let p = 0; p < phraseWords.length; p++) {
          const w = words[i + p];
          if (!w || w.text.toLowerCase() !== phraseWords[p]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        // Flag the words after the phrase, stopping at the end of a sentence.
        const first = i + phraseWords.length;
        if (first >= words.length) continue;
        let last = first;
        while (
          last - first + 1 < rule.wordsToFlag &&
          last + 1 < words.length &&
          !words[last].endsSentence
        ) {
          last++;
        }
        flag('CONTEXT', first, last);
      }
    }

    // Sort findings by where they appear in the text.
    findings.sort((a, b) => a.start - b.start);
    return findings;
  }

  /** Looks up a detector by its type, e.g. getDetector('EMAIL'). */
  function getDetector(type) {
    return DETECTORS.find((d) => d.type === type);
  }

  /** Returns `text` with one finding replaced by its placeholder. */
  function redactText(text, finding) {
    const placeholder = getDetector(finding.type).placeholder;
    return text.slice(0, finding.start) + placeholder + text.slice(finding.end);
  }

  const api = { DETECTORS, scanText, getDetector, redactText };

  // In the browser, other files use globalThis.PromptGuardDetectors.
  // In Node, the tests use require('../src/detectors.js').
  globalThis.PromptGuardDetectors = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
