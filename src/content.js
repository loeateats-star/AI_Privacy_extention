/*
  content.js: runs on ChatGPT, Claude and Gemini.
 
  Every second we:
    1. find the chat box
    2. read the text in it
    3. if the text changed, scan it with scanText() from detectors.js
    4. show a warning box if anything was found
 
 */

const detectors = globalThis.PromptGuardDetectors;

// Where the chat box is on each site. If the extension stops working on a
// site, right click the chat box, click Inspect, and update this list.
const CHAT_BOX_SELECTORS = [
  '#prompt-textarea', // ChatGPT
  'div.ProseMirror[contenteditable="true"]', // Claude
  '.ql-editor[contenteditable="true"]', // Gemini
];

let lastText = ''; // the text we scanned last time
let enabled = {}; // which checks are turned on, from the options page
let dismissed = []; // things the user clicked "Dismiss" on


// Settings

chrome.storage.sync.get({ enabledDetectors: {} }, function (result) {
  enabled = result.enabledDetectors;
});

// If the user changes a setting, use the new settings right away.
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.enabledDetectors) {
    enabled = changes.enabledDetectors.newValue || {};
    lastText = ''; // forces a rescan
  }
});

// The chat box

function findChatBox() {
  for (const selector of CHAT_BOX_SELECTORS) {
    const boxes = document.querySelectorAll(selector);
    for (const box of boxes) {
      // Skip hidden boxes (offsetHeight is 0 when you can't see it).
      if (box.offsetHeight > 0) return box;
    }
  }
  return null;
}

function getText(box) {
  // A <textarea> keeps its text in .value, other boxes use .innerText
  if (box.tagName === 'TEXTAREA') return box.value;
  return box.innerText;
}

// ---------------------------------------------------------------------------
// Checking every second
// ---------------------------------------------------------------------------

setInterval(checkChatBox, 1000);

function checkChatBox() {
  const box = findChatBox();
  if (box === null) {
    hideWarning();
    return;
  }

  const text = getText(box);
  if (text === lastText) return; // nothing changed, no need to scan again
  lastText = text;

  let findings = detectors.scanText(text, enabled);

  // Take out anything the user already dismissed.
  findings = findings.filter(function (finding) {
    return !dismissed.includes(finding.type + ':' + finding.text);
  });

  if (findings.length === 0) {
    hideWarning();
  } else {
    showWarning(box, findings);
  }
}

// ---------------------------------------------------------------------------
// The warning box
// ---------------------------------------------------------------------------

const warningBox = document.createElement('div');
warningBox.style.position = 'fixed';
warningBox.style.bottom = '130px';
warningBox.style.right = '20px';
warningBox.style.zIndex = '999999';
warningBox.style.maxWidth = '350px';
warningBox.style.padding = '10px';
warningBox.style.background = '#fff3b0';
warningBox.style.color = 'black';
warningBox.style.border = '2px solid #e0a800';
warningBox.style.borderRadius = '8px';
warningBox.style.fontFamily = 'Arial, sans-serif';
warningBox.style.fontSize = '14px';
warningBox.style.display = 'none';
document.body.appendChild(warningBox);

function showWarning(box, findings) {
  warningBox.innerHTML = ''; // clear the old warning

  const title = document.createElement('b');
  title.textContent = 'Careful! This looks like personal info:';
  warningBox.appendChild(title);

  for (const finding of findings) {
    const row = document.createElement('div');
    row.style.marginTop = '8px';

    // Use textContent (not innerHTML) so the typed text can't add HTML.
    const label = document.createElement('div');
    label.textContent = detectors.getDetector(finding.type).label + ': ' + finding.text;
    row.appendChild(label);

    const redactButton = document.createElement('button');
    redactButton.textContent = 'Redact';
    redactButton.onclick = function () {
      redact(box, finding);
    };
    row.appendChild(redactButton);

    const dismissButton = document.createElement('button');
    dismissButton.textContent = 'Dismiss';
    dismissButton.style.marginLeft = '5px';
    dismissButton.onclick = function () {
      dismissed.push(finding.type + ':' + finding.text);
      lastText = ''; // forces a rescan
      checkChatBox();
    };
    row.appendChild(dismissButton);

    warningBox.appendChild(row);
  }

  warningBox.style.display = 'block';
}

function hideWarning() {
  warningBox.style.display = 'none';
}

// ---------------------------------------------------------------------------
// Redacting (swapping the private text for something like [EMAIL])
// ---------------------------------------------------------------------------

function redact(box, finding) {
  const placeholder = detectors.getDetector(finding.type).placeholder;

  if (box.tagName === 'TEXTAREA') {
    box.value = box.value.replace(finding.text, placeholder);
    // Tell the website the text changed.
    box.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // The chat sites use fancy editors made of lots of little pieces of text.
    // Find the piece that has our text in it and select just that part.
    const textNode = findTextNode(box, finding.text);
    if (textNode === null) {
      alert('PromptGuard could not redact that. Please delete it yourself.');
      return;
    }
    const start = textNode.data.indexOf(finding.text);

    box.focus();
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, start + finding.text.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // This "types" the placeholder over the selected text, so the website
    // notices the change the same way it would if you typed it.
    document.execCommand('insertText', false, placeholder);
  }

  lastText = ''; // forces a rescan
  checkChatBox();
}

// Looks through the box (and everything inside it) for a piece of text
// that contains searchText. Returns null if it can't find one.
function findTextNode(node, searchText) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.data.includes(searchText)) return node;
    return null;
  }
  for (const child of node.childNodes) {
    const found = findTextNode(child, searchText);
    if (found !== null) return found;
  }
  return null;
}
