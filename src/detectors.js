/*
 * detectors.js: finds personal information in a string.
 *
 * How it works:
 *   1. Split the text into words wherever there is a space or a new line.
 *   2. Look at each word on its own:
 *        has an @ and a dot after it          -> email
 *        has 2 dashes or dots: 415-555-0132   -> phone number
 *        has 2 dashes, like 123-45-6789       -> social security number
 *        a long run of digits                 -> credit card
 *        numbers in a row: 415 555 0132       -> phone or long number
 *        a number followed by "St" or "Ave"   -> street address
 *        a name from our names list           -> name
 *   3. Look for words like "password" and phrases like "diagnosed with" and
 *      flag the words that come right after them.
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

  // The kinds of things we look for. The options page and the warning box
  // both read this list.
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
      description: 'Numbers like 415-555-0132, 415.555.0132, (415) 555 0132 or 4155550132.' },
    { type: 'NUMBERS', label: 'Long number', placeholder: '[NUMBER]',
      description: 'Numbers with 7 or more digits, or several numbers in a row (account numbers, IDs).' },
    { type: 'ADDRESS', label: 'Street address', placeholder: '[ADDRESS]',
      description: 'A house number followed by a street word like St, Ave or Road.' },
    { type: 'NAME', label: 'Name', placeholder: '[NAME]',
      description: 'Common first and last names, like "Emily Johnson".' },
    { type: 'CONTEXT', label: 'Personal detail', placeholder: '[PRIVATE]',
      description: 'The word after "password", "pin" or "ssn", and the words after "address is", "diagnosed with", and so on.' },
  ];

  // Words that start an API key.
  const API_KEY_STARTS = ['sk-', 'AKIA', 'ghp_'];

  // Street words. These are capitalised on purpose: "742 Evergreen Terrace"
  // is an address but "3 dogs on the way" is not.
  const STREET_WORDS = [
    'Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Drive', 'Lane', 'Ln',
    'Boulevard', 'Blvd', 'Court', 'Ct', 'Way', 'Place', 'Pl', 'Terrace', 'Circle',
  ];

  // Secret words. The word AFTER these gets flagged, as long as it comes after
  // "is", ":" or "=". So "my password is hunter2" and "password: hunter2" are
  // flagged, but "a good password manager" is not.
  const SECRET_WORDS = [
    'password', 'passcode', 'passwd', 'pin', 'ssn', 'username', 'login',
  ];
  // Little words that can sit between the secret word and the secret.
  const FILLER_WORDS = ['is', 'was', '=', ':', '-'];

  // Context phrases. When we see the phrase, we flag up to `wordsToFlag`
  // words after it (stopping early at the end of a sentence).
  const CONTEXT_PHRASES = [
    { phrase: 'account number is', wordsToFlag: 1 },
    { phrase: 'my name is', wordsToFlag: 2 },
    { phrase: 'address is', wordsToFlag: 5 },
    { phrase: 'i live at', wordsToFlag: 5 },
    { phrase: 'i live in', wordsToFlag: 3 },
    { phrase: 'born on', wordsToFlag: 3 },
    { phrase: 'diagnosed with', wordsToFlag: 5 },
  ];

  // 100 common first names. Names that are also normal English words or
  // coding words (Will, May, Grace, Ruby, Julia...) are left out on purpose,
  // so they don't get flagged all the time. Write them in lowercase.
  const FIRST_NAMES = [
    'james', 'john', 'robert', 'michael', 'david', 'william', 'richard', 'joseph', 'thomas', 'charles',
    'christopher', 'daniel', 'matthew', 'anthony', 'steven', 'paul', 'andrew', 'joshua', 'kevin', 'brian',
    'george', 'timothy', 'ronald', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
    'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon', 'benjamin', 'samuel', 'gregory', 'alexander',
    'patrick', 'tyler', 'aaron', 'ethan', 'noah', 'liam', 'lucas', 'logan', 'mason', 'elijah',
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'nancy', 'lisa', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle',
    'dorothy', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia',
    'emma', 'olivia', 'sophia', 'isabella', 'mia', 'abigail', 'madison', 'chloe', 'hannah', 'natalie',
    'priya', 'rahul', 'arjun', 'aisha', 'mohammed', 'wei', 'jose', 'maria', 'carlos', 'ananya',
  ];

  // 50 common last names (again, no normal English words like Brown or White).
  const LAST_NAMES = [
    'smith', 'johnson', 'williams', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez', 'hernandez',
    'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee',
    'perez', 'thompson', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker', 'allen',
    'nguyen', 'wright', 'torres', 'flores', 'rivera', 'mitchell', 'roberts', 'gomez', 'phillips', 'evans',
    'patel', 'kumar', 'singh', 'sharma', 'chen', 'wang', 'kim', 'reddy', 'gupta', 'khan',
  ];

  // SPEED: looking something up in an array means checking every item one by
  // one. A Set is like an array that can answer "is this in here?" instantly,
  // even with thousands of names. So we turn each array into a Set once, here
  // at the start, instead of searching the array for every word we scan.
  const STREET_SET = new Set(STREET_WORDS);
  const SECRET_SET = new Set(SECRET_WORDS);
  const FILLER_SET = new Set(FILLER_WORDS);
  const FIRST_NAME_SET = new Set(FIRST_NAMES);
  const LAST_NAME_SET = new Set(LAST_NAMES);

  // SPEED: split each phrase into words once, not every time we scan.
  for (const rule of CONTEXT_PHRASES) {
    rule.words = rule.phrase.split(' ');
  }

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

  /** Counts the digits 0-9 in `s`. */
  function countDigits(s) {
    let count = 0;
    for (const ch of s) {
      if (ch >= '0' && ch <= '9') count++;
    }
    return count;
  }

  /**
   * True if the word is only digits and number symbols, like 555-0132,
   * 415.555 or +1, and has at least one digit.
   */
  function isNumberWord(s) {
    for (const ch of s) {
      const isDigit = ch >= '0' && ch <= '9';
      if (!isDigit && ch !== '-' && ch !== '.' && ch !== '+') return false;
    }
    return countDigits(s) > 0;
  }

  /**
   * Turns capital letters A-Z into lowercase a-z, so "PassWord" becomes "password".
   * Every letter has a number (its char code). Capitals A-Z are 65-90 and
   * lowercase a-z are 97-122, so adding 32 turns a capital into lowercase.
   */
  function toLowercase(s) {
    let result = '';
    for (const ch of s) {
      if (ch >= 'A' && ch <= 'Z') {
        result += String.fromCharCode(ch.charCodeAt(0) + 32);
      } else {
        result += ch;
      }
    }
    return result;
  }

  /** True if the word starts with a capital letter. */
  function isCapitalized(s) {
    return s[0] >= 'A' && s[0] <= 'Z';
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
    let endsWithColon = false;

    while (word.length > 0 && punctuation.includes(word[0])) {
      word = word.slice(1);
      start++;
    }
    while (word.length > 0 && punctuation.includes(word[word.length - 1])) {
      const last = word[word.length - 1];
      if (last === '.' || last === '!' || last === '?') endsSentence = true;
      if (last === ':') endsWithColon = true;
      word = word.slice(0, -1);
      end--;
    }
    return {
      text: word,
      lower: toLowercase(word), // saved once so we don't redo it in every check
      start: start,
      end: end,
      endsSentence: endsSentence,
      endsWithColon: endsWithColon,
    };
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

    // Two dashes (or two dots) and only digits in between: phone or SSN.
    // We turn dots into dashes first so 415.555.0132 works the same way.
    const dashed = word.split('.').join('-');
    if (countChar(dashed, '-') === 2) {
      const parts = dashed.split('-');
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

    // One long number with no spaces.
    if (isAllDigits(word)) {
      if (word.length >= 13 && word.length <= 19) return 'CREDIT_CARD'; // 4111111111111111
      if (word.length === 10) return 'PHONE'; // 4155550132
      if (word.length >= 7) return 'NUMBERS'; // 1234567
    }

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

    // alreadyFlagged[i] is true once word i is part of a finding.
    // SPEED: this lets us check for overlaps instantly, instead of comparing
    // against every finding we've made so far.
    const alreadyFlagged = new Array(words.length).fill(false);

    // Adds a finding from words[first] to words[last], unless that check is
    // turned off or the words were already flagged by something else.
    function flag(type, first, last) {
      if (enabled[type] === false) return;
      for (let i = first; i <= last; i++) {
        if (alreadyFlagged[i]) return; // overlaps, skip it
      }
      for (let i = first; i <= last; i++) {
        alreadyFlagged[i] = true;
      }

      let start = words[first].start;
      const end = words[last].end;
      // Keep brackets together: "(415) 555-0132", not "415) 555-0132".
      if (text[start - 1] === '(' && text.slice(start, end).includes(')')) start--;

      findings.push({ type: type, start: start, end: end, text: text.slice(start, end) });
    }

    // Step 1: check every word.
    for (let i = 0; i < words.length; i++) {
      const word = words[i].text;
      if (word === '') continue; // the word was only punctuation, like "-"

      // Card number split into 4 words: 4111 1111 1111 1111
      if (i + 3 < words.length) {
        const nextFour = [words[i], words[i + 1], words[i + 2], words[i + 3]];
        if (nextFour.every((w) => w.text.length === 4 && isAllDigits(w.text))) {
          flag('CREDIT_CARD', i, i + 3);
          i += 3;
          continue;
        }
      }

      // Numbers in a row: 415 555 0132, (415) 555-0132, +1 415 555 0132
      if (isNumberWord(word)) {
        let last = i;
        let digits = countDigits(word);
        while (last + 1 < words.length && isNumberWord(words[last + 1].text)) {
          last++;
          digits += countDigits(words[last].text);
        }
        // Only counts if there are 2+ numbers with 7+ digits in total,
        // so "3 4" or "2024 10" are left alone.
        if (last > i && digits >= 7) {
          // 10 digits (or 11 with a +1 in front) looks like a phone number.
          const type = digits === 10 || digits === 11 ? 'PHONE' : 'NUMBERS';
          flag(type, i, last);
          i = last;
          continue;
        }
      }

      // Street address: a number, then a street word within the next 4 words.
      if (isAllDigits(word) && word.length <= 5) {
        for (let j = i + 1; j <= i + 4 && j < words.length; j++) {
          if (STREET_SET.has(words[j].text)) {
            flag('ADDRESS', i, j);
            break;
          }
        }
      }

      // Names: a capitalized word that is in our names lists.
      // If a first name is followed by another capitalized word, that is
      // probably their last name, so we flag both: "Emily Johnson".
      if (isCapitalized(word)) {
        if (FIRST_NAME_SET.has(words[i].lower)) {
          const next = words[i + 1];
          // (length > 1 so "Tell Emily I said hi" doesn't flag the "I")
          if (next && !words[i].endsSentence && next.text.length > 1 && isCapitalized(next.text)) {
            flag('NAME', i, i + 1);
            i++;
          } else {
            flag('NAME', i, i);
          }
          continue;
        }
        if (LAST_NAME_SET.has(words[i].lower)) {
          flag('NAME', i, i);
          continue;
        }
      }

      const type = checkWord(word);
      if (type !== null) flag(type, i, i);
    }

    // Step 2: secret words like "password". Flag the word after it, but only
    // if there is an "is", ":" or "=" in between.
    for (let i = 0; i < words.length; i++) {
      if (!SECRET_SET.has(words[i].lower)) continue;

      let j = i + 1;
      let sawFiller = words[i].endsWithColon; // "password: hunter2"
      // (A word like ":" is empty after we trim punctuation, so it counts too.)
      while (j < words.length && (words[j].text === '' || FILLER_SET.has(words[j].lower))) {
        sawFiller = true;
        j++;
      }
      if (sawFiller && j < words.length && words[j].text !== '') {
        flag('CONTEXT', j, j);
      }
    }

    // Step 3: look for context phrases and flag the words after them.
    for (let i = 0; i < words.length; i++) {
      for (const rule of CONTEXT_PHRASES) {
        // SPEED: if the first word doesn't match, skip the rest of the check.
        if (words[i].lower !== rule.words[0]) continue;

        // Does the text at word i match every word of the phrase?
        let matches = true;
        for (let p = 1; p < rule.words.length; p++) {
          const w = words[i + p];
          if (!w || w.lower !== rule.words[p]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        // Flag the words after the phrase, stopping at the end of a sentence.
        const first = i + rule.words.length;
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
