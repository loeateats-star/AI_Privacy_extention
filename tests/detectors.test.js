'use strict';

const assert = require('node:assert');
const { scanText, redactText } = require('../src/detectors.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok    ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}

function expectFound(text, type, expected) {
  const matches = scanText(text).filter((m) => m.type === type);
  const texts = matches.map((m) => m.text);
  assert.ok(
    texts.includes(expected),
    `expected ${type} "${expected}" in "${text}", got ${JSON.stringify(texts)}`
  );

  for (const m of matches) assert.strictEqual(text.slice(m.start, m.end), m.text);
}

function expectNone(text, type) {
  const matches = scanText(text).filter((m) => m.type === type);
  assert.strictEqual(
    matches.length,
    0,
    `expected no ${type} in "${text}", got ${JSON.stringify(matches.map((m) => m.text))}`
  );
}

console.log('EMAIL');
test('plain address', () => expectFound('reach me at jane.doe@example.com today', 'EMAIL', 'jane.doe@example.com'));
test('plus addressing', () => expectFound('a+filter@mail.co.uk', 'EMAIL', 'a+filter@mail.co.uk'));
test('social handle is not an email', () => expectNone('follow @jane_doe on X', 'EMAIL'));
test('no top-level domain', () => expectNone('ssh root@localhost', 'EMAIL'));

console.log('PHONE');
test('dashes', () => expectFound('call 415-555-0132', 'PHONE', '415-555-0132'));
test('date is not a phone', () => expectNone('due 2024-01-15', 'PHONE'));
test('longer dashed id', () => expectNone('part 415-555-0132-77', 'PHONE'));
test('phone at end of sentence', () => expectFound('My number is 415-555-0132.', 'PHONE', '415-555-0132'));

console.log('SSN');
test('standard format', () => expectFound('my ssn 123-45-6789', 'SSN', '123-45-6789'));
test('longer serial', () => expectNone('Order 123-45-67890', 'SSN'));

console.log('CREDIT_CARD');
test('Visa with spaces', () => expectFound('card 4111 1111 1111 1111 exp 12/29', 'CREDIT_CARD', '4111 1111 1111 1111'));
test('Mastercard with dashes', () => expectFound('5555-5555-5555-4444', 'CREDIT_CARD', '5555-5555-5555-4444'));
test('Amex, 15 digits', () => expectFound('amex 378282246310005', 'CREDIT_CARD', '378282246310005'));
test('12 digits is too short', () => expectNone('tracking 411111111111', 'CREDIT_CARD'));

console.log('API_KEY');
test('OpenAI project key', () =>
  expectFound('key: sk-proj-Ab3dEf6hIj9kLm2nOp5qRs8t', 'API_KEY', 'sk-proj-Ab3dEf6hIj9kLm2nOp5qRs8t'));
test('AWS access key id', () => expectFound('AKIAIOSFODNN7EXAMPLE', 'API_KEY', 'AKIAIOSFODNN7EXAMPLE'));
test('GitHub token', () => {
  const token = 'ghp_' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8';
  expectFound(`my token is ${token}`, 'API_KEY', token);
});
test('short sk- string', () => expectNone('use sk-short here', 'API_KEY'));

console.log('ADDRESS');
test('Terrace', () => expectFound('I live at 742 Evergreen Terrace now', 'ADDRESS', '742 Evergreen Terrace'));
test('Avenue, two words', () =>
  expectFound('1600 Pennsylvania Avenue NW', 'ADDRESS', '1600 Pennsylvania Avenue'));
test('abbreviation', () => expectFound('ship to 221 Baker St, London', 'ADDRESS', '221 Baker St'));
test('ordinal street', () => expectFound('500 W 5th Ave', 'ADDRESS', '500 W 5th Ave'));
test('lowercase sentence ending in "way"', () => expectNone('I have 3 dogs on the way', 'ADDRESS'));
test('number without a street', () => expectNone('Route 66 was fun', 'ADDRESS'));

console.log('CONTEXT');
test('password', () => expectFound('my password is hunter2!', 'CONTEXT', 'hunter2'));
test('capitalised phrase', () => expectFound('My PIN is 4821.', 'CONTEXT', '4821'));
test('diagnosis', () =>
  expectFound('I was diagnosed with type 2 diabetes. What should I eat?', 'CONTEXT', 'type 2 diabetes'));
test('curly apostrophe', () => expectFound('I’ve been diagnosed with ADHD', 'CONTEXT', 'ADHD'));
test('question about passwords', () => expectNone('what is a good password manager?', 'CONTEXT'));
test('address phrase', () => expectFound('my address is 12 maple grove, springfield', 'CONTEXT', '12 maple grove, springfield'));
test('stops at end of sentence', () => expectFound('My PIN is 4821. Thanks', 'CONTEXT', '4821'));

console.log('PASSWORD WORDS');
test('password with a colon', () => expectFound('my password: hunter2', 'CONTEXT', 'hunter2'));
test('password with an equals sign', () => expectFound('Password = hunter2', 'CONTEXT', 'hunter2'));
test('pin is', () => expectFound('my pin is 4821.', 'CONTEXT', '4821'));
test('password manager is not a password', () => expectNone('which password manager is best?', 'CONTEXT'));

console.log('NUMBERS IN A ROW');
test('phone with dots', () => expectFound('text me 415.555.0132', 'PHONE', '415.555.0132'));
test('phone with brackets', () => expectFound('call (415) 555-0132', 'PHONE', '(415) 555-0132'));
test('phone with spaces', () => expectFound('call +1 415 555 0132', 'PHONE', '+1 415 555 0132'));
test('phone with no spaces', () => expectFound('call 4155550132', 'PHONE', '4155550132'));
test('account number in pieces', () => expectFound('acct 12 3456 78', 'NUMBERS', '12 3456 78'));
test('small numbers are fine', () => expectNone('I have 3 dogs and 2 cats', 'NUMBERS'));

console.log('NAME');
test('first and last name', () => expectFound('Ask Sarah Johnson about it', 'NAME', 'Sarah Johnson'));
test('first name only', () => expectFound('Tell Emily I said hi', 'NAME', 'Emily'));
test('last name only', () => expectFound('Meeting with Mr Patel', 'NAME', 'Patel'));
test('lowercase is not a name', () => expectNone('the james webb telescope', 'NAME'));

console.log('SENSITIVE WORDS');
test('password', () => expectFound('what is a good password manager?', 'KEYWORD', 'password'));
test('address', () => expectFound('Send it to my address', 'KEYWORD', 'address'));
test('number', () => expectFound('what is your phone number', 'KEYWORD', 'number'));
test('plural', () => expectFound('Here are my passwords', 'KEYWORD', 'passwords'));
test('capitalized', () => expectFound('Password reset', 'KEYWORD', 'Password'));

console.log('EMAIL SIGN-OFFS');
test('Sincerely, full name', () => expectFound('Sincerely, Lohit Kumar', 'NAME', 'Lohit Kumar'));
test('sign-off on its own line', () => expectFound('Best regards,\nLohit\nPS see attached', 'NAME', 'Lohit'));
test('Thanks with a name', () => expectFound('Thanks,\nPriya Sharma', 'NAME', 'Priya Sharma'));
test('thanks in a normal sentence', () => expectNone('Thanks, that helped a lot!', 'NAME'));
test('best in a normal sentence', () => expectNone('I think this is the best way', 'NAME'));

console.log('HEURISTICS: numbers');
test('9 digits written any way is an SSN', () => expectFound('id 123 45 6789', 'SSN', '123 45 6789'));
test('date with dashes is skipped', () => expectNone('Meeting on 2024-01-15', 'NUMBERS'));
test('US date is skipped', () => expectNone('due 01-15-2024', 'NUMBERS'));
test('card with dashes', () => expectFound('5555-5555-5555-4444', 'CREDIT_CARD', '5555-5555-5555-4444'));

console.log('HEURISTICS: passwords and keys');
test('random password', () => expectFound('use Xk9#mP2q for wifi', 'SECRET', 'Xk9#mP2q'));
test('password with symbols', () => expectFound('try MyP@ssw0rd', 'SECRET', 'MyP@ssw0rd'));
test('unknown API key format', () =>
  expectFound('token a8F3kL9qZ2mX7vB4nR6tY1wE', 'API_KEY', 'a8F3kL9qZ2mX7vB4nR6tY1wE'));
test('normal long word', () => expectNone('internationalization is hard', 'SECRET'));
test('version number', () => expectNone('install Python3.12 today', 'SECRET'));
test('COVID-19', () => expectNone('COVID-19 rules', 'SECRET'));

console.log('HEURISTICS: names');
test('name not in the list, after Hi', () => expectFound('Hi Lohit, how are you?', 'NAME', 'Lohit'));
test('two capitalized words mid-sentence', () => expectFound('I met Kavya Iyer yesterday', 'NAME', 'Kavya Iyer'));
test('coding words are not names', () => expectNone('I use Python and React at work', 'NAME'));
test('acronyms are not names', () => expectNone('the REST API returns JSON', 'NAME'));
test('three capitalized words is a product', () => expectNone('I opened Visual Studio Code', 'NAME'));
test('after "the"', () => expectNone('I visited the White House', 'NAME'));

console.log('scanText behaviour');
test('overlapping matches: the specific detector wins', () => {
  const matches = scanText('my address is 742 Evergreen Terrace');
  assert.deepStrictEqual(matches.map((m) => m.type), ['KEYWORD', 'ADDRESS']);
});
test('results are sorted by position', () => {
  const matches = scanText('415-555-0132 then jane@example.com');
  assert.deepStrictEqual(matches.map((m) => m.type), ['PHONE', 'EMAIL']);
});
test('disabled detectors are skipped', () => {
  const matches = scanText('jane@example.com', { EMAIL: false });
  assert.strictEqual(matches.length, 0);
});
test('clean text has no findings', () => {
  assert.deepStrictEqual(scanText('Explain how a hash map works in Python.'), []);
});
test('redactText swaps in the placeholder', () => {
  const text = 'mail jane@example.com please';
  const [match] = scanText(text);
  assert.strictEqual(redactText(text, match), 'mail [EMAIL] please');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
