(function () {
  'use strict';

  const DETECTORS = [
    { type: 'API_KEY', label: 'API key', placeholder: '[API_KEY]',
      description: 'Long random-looking words (20+ characters) that mix letters and numbers.' },
    { type: 'SECRET', label: 'Password-like word', placeholder: '[SECRET]',
      description: 'Shorter random-looking words like Xk9#mP2q that mix capitals, numbers and symbols.' },
    { type: 'EMAIL', label: 'Email address', placeholder: '[EMAIL]',
      description: 'A word with an @ and a dot after it, like name@example.com.' },
    { type: 'SSN', label: 'Social Security number', placeholder: '[SSN]',
      description: 'Numbers with 9 digits, like 123-45-6789.' },
    { type: 'CREDIT_CARD', label: 'Credit card number', placeholder: '[CARD]',
      description: 'Numbers with 13 to 19 digits, like 4111 1111 1111 1111.' },
    { type: 'PHONE', label: 'Phone number', placeholder: '[PHONE]',
      description: 'Numbers with 10 or 11 digits, like (415) 555-0132 or +1 415 555 0132.' },
    { type: 'NUMBERS', label: 'Long number', placeholder: '[NUMBER]',
      description: 'Other numbers with 7 or more digits (account numbers, IDs). Dates are skipped.' },
    { type: 'ADDRESS', label: 'Street address', placeholder: '[ADDRESS]',
      description: 'A house number followed by a street word like St, Ave or Road.' },
    { type: 'NAME', label: 'Name', placeholder: '[NAME]',
      description: 'Words that look like names: in the names list, capitalized mid-sentence, after "Hi" or "Mr", etc.' },
    { type: 'CONTEXT', label: 'Personal detail', placeholder: '[PRIVATE]',
      description: 'The word after "password", "pin" or "ssn", and the words after "address is", "diagnosed with", and so on.' },
    { type: 'AGE', label: 'Age', placeholder: '[AGE]',
      description: 'A number from 1 to 120 after "I am", "I\'m" or "age", or before "years old".' },
    { type: 'KEYWORD', label: 'Sensitive word', placeholder: '[REDACTED]',
      description: 'Words like password, address or number, which often come right before personal info.' },
  ];

  const SECRET_POINTS_NEEDED = 5;
  const NAME_POINTS_NEEDED = 2;

  const NAME_CLUE_WORDS = [
    'hi', 'hello', 'hey', 'dear', 'mr', 'mrs', 'ms', 'dr', 'prof', 'professor',
    'ask', 'tell', 'named', "i'm", 'im',
  ];

  const NOT_NAME_CLUE_WORDS = ['the', 'a', 'an'];

  const AGE_CLUE_WORDS = ["i'm", 'i’m', 'im', 'age', 'aged'];
  const AGE_ENDING_WORDS = ['and', 'but', 'so', 'now', 'today', 'this', 'next'];
  const YEARS_WORDS = ['years', 'year', 'yrs', 'yr'];

  const STREET_WORDS = [
    'Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Drive', 'Lane', 'Ln',
    'Boulevard', 'Blvd', 'Court', 'Ct', 'Way', 'Place', 'Pl', 'Terrace', 'Circle',
  ];

  const SECRET_WORDS = [
    'password', 'passcode', 'passwd', 'pin', 'ssn', 'username', 'login',
  ];

  const FILLER_WORDS = ['is', 'was', '=', ':', '-'];

  const SENSITIVE_WORDS = [
    'password', 'passcode', 'pin', 'ssn', 'address', 'number', 'phone', 'email',
    'username', 'login', 'birthday', 'bank', 'account', 'diagnosis', 'diagnosed', 'medication',
  ];

  const SIGN_OFF_WORDS = [
    'sincerely', 'regards', 'respectfully', 'cheers', 'thanks', 'best', 'love',
    'truly', 'warmly', 'yours', 'from',
  ];

  const CONTEXT_PHRASES = [
    { phrase: 'account number is', wordsToFlag: 1 },
    { phrase: 'my name is', wordsToFlag: 2 },
    { phrase: 'address is', wordsToFlag: 5 },
    { phrase: 'i live at', wordsToFlag: 5 },
    { phrase: 'i live in', wordsToFlag: 3 },
    { phrase: 'born on', wordsToFlag: 3 },
    { phrase: 'diagnosed with', wordsToFlag: 5 },
  ];

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

  const LAST_NAMES = [
    'smith', 'johnson', 'williams', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez', 'hernandez',
    'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas', 'taylor', 'moore', 'jackson', 'martin', 'lee',
    'perez', 'thompson', 'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker', 'allen',
    'nguyen', 'wright', 'torres', 'flores', 'rivera', 'mitchell', 'roberts', 'gomez', 'phillips', 'evans',
    'patel', 'kumar', 'singh', 'sharma', 'chen', 'wang', 'kim', 'reddy', 'gupta', 'khan',
  ];

  const STREET_SET = new Set(STREET_WORDS);
  const SECRET_SET = new Set(SECRET_WORDS);
  const FILLER_SET = new Set(FILLER_WORDS);
  const SENSITIVE_SET = new Set(SENSITIVE_WORDS);
  const SIGN_OFF_SET = new Set(SIGN_OFF_WORDS);
  const FIRST_NAME_SET = new Set(FIRST_NAMES);
  const LAST_NAME_SET = new Set(LAST_NAMES);
  const NAME_CLUE_SET = new Set(NAME_CLUE_WORDS);
  const NOT_NAME_CLUE_SET = new Set(NOT_NAME_CLUE_WORDS);
  const AGE_CLUE_SET = new Set(AGE_CLUE_WORDS);
  const AGE_ENDING_SET = new Set(AGE_ENDING_WORDS);
  const YEARS_SET = new Set(YEARS_WORDS);

  for (const rule of CONTEXT_PHRASES) {
    rule.words = rule.phrase.split(' ');
  }

  function isAllDigits(s) {
    if (s.length === 0) return false;
    for (const ch of s) {
      if (!isDigit(ch)) return false;
    }
    return true;
  }

  function isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  function isLowerLetter(ch) {
    return ch >= 'a' && ch <= 'z';
  }

  function isUpperLetter(ch) {
    return ch >= 'A' && ch <= 'Z';
  }

  function isAllCaps(s) {
    if (s.length < 2) return false;
    for (const ch of s) {
      if (!isUpperLetter(ch)) return false;
    }
    return true;
  }

  function onlyDigits(s) {
    let result = '';
    for (const ch of s) {
      if (isDigit(ch)) result += ch;
    }
    return result;
  }

  function isNumberWord(s) {
    for (const ch of s) {
      if (!isDigit(ch) && ch !== '-' && ch !== '.' && ch !== '+') return false;
    }
    return onlyDigits(s).length > 0;
  }

  function toLowercase(s) {
    let result = '';
    for (const ch of s) {
      if (isUpperLetter(ch)) {
        result += String.fromCharCode(ch.charCodeAt(0) + 32);
      } else {
        result += ch;
      }
    }
    return result;
  }

  function isCapitalized(s) {
    return isUpperLetter(s[0]);
  }

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
        if (ch ==='\n' && words.length > 0) words[words.length - 1].endsLine = true;
      } else {
        if (current === '') start = i;
        current += ch;
      }
    }
    return words;
  }

  function trimPunctuation(word, start) {
    const punctuation = '.,!?;:()"\'';
    let end = start + word.length;
    let endsSentence = false;
    let endsWithColon = false;
    let endsWithComma = false;

    while (word.length > 0 && punctuation.includes(word[0])) {
      word = word.slice(1);
      start++;
    }
    while (word.length > 0 && punctuation.includes(word[word.length - 1])) {
      const last = word[word.length - 1];
      if (last === '.' || last === '!' || last === '?') endsSentence = true;
      if (last === ':') endsWithColon = true;
      if (last === ',') endsWithComma = true;
      word = word.slice(0, -1);
      end--;
    }
    return {
      text: word,
      lower: toLowercase(word),
      start: start,
      end: end,
      endsSentence: endsSentence,
      endsWithColon: endsWithColon,
      endsWithComma: endsWithComma,
      endsLine: false,
    };
  }

  function secretPoints(word) {
    if (word.length < 8) return 0;
    if (word.includes('://') || word.startsWith('www.')) return 0;

    let hasLower = false;
    let hasUpper = false;
    let hasDigit = false;
    let hasSymbol = false;
    let jumps = 0;
    let lastKind = '';

    for (const ch of word) {
      let kind;
      if (isDigit(ch)) {
        hasDigit = true;
        kind = 'digit';
      } else if (isLowerLetter(ch)) {
        hasLower = true;
        kind = 'letter';
      } else if (isUpperLetter(ch)) {
        hasUpper = true;
        kind = 'letter';
      } else {
        if (ch !== '.' && ch !== '-') hasSymbol = true;
        continue;
      }
      if (lastKind !== '' && kind !== lastKind) jumps++;
      lastKind = kind;
    }

    let points = 0;
    if (hasLower) points++;
    if (hasUpper) points++;
    if (hasDigit) points++;
    if (hasSymbol) points++;
    if (jumps >= 2) points++;
    if (jumps >= 4) points++;
    if (word.length >= 12) points++;
    if (word.length >= 20) points++;
    return points;
  }

  function classifyNumber(digits) {
    const count = digits.length;
    if (count < 7) return null;
    if (count === 8 && looksLikeDate(digits)) return null;
    if (count === 9) return 'SSN';
    if (count === 10 || count === 11) return 'PHONE';
    if (count >= 13 && count <= 19) return 'CREDIT_CARD';
    return 'NUMBERS';
  }

  function looksLikeDate(digits) {
    const firstTwo = digits.slice(0, 2);
    const fifthAndSixth = digits.slice(4, 6);
    return firstTwo === '19' || firstTwo === '20' ||
      fifthAndSixth === '19' || fifthAndSixth === '20';
  }

  function couldBeName(word) {
    if (word.length < 2 || !isCapitalized(word) || isAllCaps(word)) return false;
    for (let i = 1; i < word.length; i++) {
      const ch = word[i];
      if (!isLowerLetter(ch) && ch !== "'" && ch !== '-') return false;
    }
    return true;
  }

  function nameRunLength(words, i) {
    let first = i;
    while (first > 0 && couldBeName(words[first - 1].text) && nextIsPartOfName(words, first - 1)) {
      first--;
    }
    let last = i;
    while (nextIsPartOfName(words, last)) last++;
    return last - first + 1;
  }

  function nextIsPartOfName(words, i) {
    const next = words[i + 1];
    if (!next) return false;
    if (words[i].endsSentence || words[i].endsLine || words[i].endsWithComma) return false;
    return couldBeName(next.text);
  }

  function namePoints(words, i) {
    const word = words[i];
    const before = words[i - 1];
    let points = 0;

    if (FIRST_NAME_SET.has(word.lower) || LAST_NAME_SET.has(word.lower)) points += 2;

    const startsSentence =
      !before || before.endsSentence || before.endsLine || before.text === '';
    if (before && NAME_CLUE_SET.has(before.lower)) points += 2;
    else if (!startsSentence) points += 1;

    if (nextIsPartOfName(words, i)) points += 1;
    if (nameRunLength(words, i) >= 3) points -= 1;
    if (before && NOT_NAME_CLUE_SET.has(before.lower)) points -= 1;

    return points;
  }

  function ageEnd(words, i) {
    const word = words[i];
    if (word.lower.endsWith('-year-old') || word.lower.endsWith('-years-old')) {
      const number = word.lower.split('-')[0];
      if (isAllDigits(number) && Number(number) >= 1 && Number(number) <= 120) return i;
      return -1;
    }

    if (!isAllDigits(word.text)) return -1;
    const age = Number(word.text);
    if (age < 1 || age > 120) return -1;

    const next = words[i + 1];
    const afterNext = words[i + 2];
    if (next && YEARS_SET.has(next.lower)) {
      if (afterNext && afterNext.lower === 'old') return i + 2;
      return i + 1;
    }
    if (next && (next.lower === 'yo' || next.lower === 'y/o')) return i + 1;

    const before = words[i - 1];
    const twoBefore = words[i - 2];
    const afterIAm = before && before.lower === 'am' && twoBefore && twoBefore.lower === 'i';
    const afterClue = before && AGE_CLUE_SET.has(before.lower);
    if (!afterIAm && !afterClue) return -1;

    const endsHere = !next || word.endsSentence || word.endsWithComma || word.endsLine;
    if (endsHere || AGE_ENDING_SET.has(next.lower)) return i;
    return -1;
  }

  function checkWord(word) {
    const at = word.indexOf('@');
    if (at > 0 && word.indexOf('.', at) > at + 1) return 'EMAIL';

    if (secretPoints(word) >= SECRET_POINTS_NEEDED) {
      if (word.length >= 20) return 'API_KEY';
      return 'SECRET';
    }

    return null;
  }

  function scanText(text, enabled = {}) {
    const words = splitIntoWords(text);
    const findings = [];
    const alreadyFlagged = new Array(words.length).fill(false);

    function flag(type, first, last) {
      if (enabled[type] === false) return;
      for (let i = first; i <= last; i++) {
        if (alreadyFlagged[i]) return;
      }
      for (let i = first; i <= last; i++) {
        alreadyFlagged[i] = true;
      }

      let start = words[first].start;
      const end = words[last].end;
      if (text[start - 1] === '(' && text.slice(start, end).includes(')')) start--;

      findings.push({ type: type, start: start, end: end, text: text.slice(start, end) });
    }

    for (let i = 0; i < words.length; i++) {
      if (!SIGN_OFF_SET.has(words[i].lower)) continue;
      if (!words[i].endsWithComma && !words[i].endsLine) continue;

      let last = i;
      while (
        last - i < 3 &&
        last + 1 < words.length &&
        words[last + 1].text.length > 0 &&
        isCapitalized(words[last + 1].text) &&
        (last === i || !words[last].endsLine)
      ) {
        last++;
      }
      if (last > i) flag('NAME', i + 1, last);
    }

    for (let i = 0; i < words.length; i++) {
      const word = words[i].text;
      if (word === '') continue;

      if (isNumberWord(word)) {
        let last = i;
        let digits = onlyDigits(word);
        while (last + 1 < words.length && isNumberWord(words[last + 1].text)) {
          last++;
          digits += onlyDigits(words[last].text);
        }
        const type = classifyNumber(digits);
        if (type !== null) {
          flag(type, i, last);
          i = last;
          continue;
        }
      }

      const ageLast = ageEnd(words, i);
      if (ageLast !== -1) {
        flag('AGE', i, ageLast);
        i = ageLast;
        continue;
      }

      if (isAllDigits(word) && word.length <= 5) {
        for (let j = i + 1; j <= i + 4 && j < words.length; j++) {
          if (STREET_SET.has(words[j].text)) {
            flag('ADDRESS', i, j);
            break;
          }
        }
      }

      if (couldBeName(word) && !NAME_CLUE_SET.has(words[i].lower)) {
        const points = namePoints(words, i);
        if (points >= NAME_POINTS_NEEDED) {
          if (nextIsPartOfName(words, i)) {
            flag('NAME', i, i + 1);
            i++;
          } else {
            flag('NAME', i, i);
          }
          continue;
        }
      }

      const type = checkWord(word);
      if (type !== null) flag(type, i, i);
    }

    for (let i = 0; i < words.length; i++) {
      if (!SECRET_SET.has(words[i].lower)) continue;

      let j = i + 1;
      let sawFiller = words[i].endsWithColon;
      while (j < words.length && (words[j].text === '' || FILLER_SET.has(words[j].lower))) {
        sawFiller = true;
        j++;
      }
      if (sawFiller && j < words.length && words[j].text !== '') {
        flag('CONTEXT', j, j);
      }
    }

    for (let i = 0; i < words.length; i++) {
      for (const rule of CONTEXT_PHRASES) {
        if (words[i].lower !== rule.words[0]) continue;

        let matches = true;
        for (let p = 1; p < rule.words.length; p++) {
          const w = words[i + p];
          if (!w || w.lower !== rule.words[p]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;

        const first = i + rule.words.length;
        if (first >= words.length) continue;
        let last = first;
        while (
          last - first + 1 < rule.wordsToFlag &&
          last + 1 < words.length &&
          !words[last].endsSentence &&
          !words[last].endsLine
        ) {
          last++;
        }
        flag('CONTEXT', first, last);
      }
    }

    for (let i = 0; i < words.length; i++) {
      const lower = words[i].lower;
      const withoutS = lower.endsWith('s') ? lower.slice(0, -1) : lower;
      if (SENSITIVE_SET.has(lower) || SENSITIVE_SET.has(withoutS)) {
        flag('KEYWORD', i, i);
      }
    }

    findings.sort((a, b) => a.start - b.start);
    return findings;
  }

  function getDetector(type) {
    return DETECTORS.find((d) => d.type === type);
  }

  function redactText(text, finding) {
    const placeholder = getDetector(finding.type).placeholder;
    return text.slice(0, finding.start) + placeholder + text.slice(finding.end);
  }

  const api = { DETECTORS, scanText, getDetector, redactText };

  globalThis.PromptGuardDetectors = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
