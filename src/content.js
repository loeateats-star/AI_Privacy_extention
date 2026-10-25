const detectors = globalThis.PromptGuardDetectors;

const CHAT_BOX_SELECTORS = [
  '#prompt-textarea',
  'div.ProseMirror[contenteditable="true"]',
  '.ql-editor[contenteditable="true"]',
];

let lastText = '';
let enabled = {};
let dismissed = [];
let currentFindings = [];
let counted = [];

chrome.storage.sync.get({ enabledDetectors: {} }, function (result) {
  enabled = result.enabledDetectors;
});

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.enabledDetectors) {
    enabled = changes.enabledDetectors.newValue || {};
    lastText = '';
  }
});

function findChatBox() {
  for (const selector of CHAT_BOX_SELECTORS) {
    const boxes = document.querySelectorAll(selector);
    for (const box of boxes) {
      if (box.offsetHeight > 0) return box;
    }
  }
  return null;
}

function getText(box) {
  if (box.tagName === 'TEXTAREA') return box.value;
  return box.innerText;
}

setInterval(checkChatBox, 1000);

function checkChatBox() {
  const box = findChatBox();
  if (box === null) {
    hideWarning();
    return;
  }

  const text = getText(box);

  if (text === lastText) {
    countFindings(currentFindings);
    return;
  }
  lastText = text;

  if (text.trim() === '') counted = [];

  let findings = detectors.scanText(text, enabled);
  currentFindings = findings;

  findings = findings.filter(function (finding) {
    return !dismissed.includes(finding.type + ':' + finding.text);
  });

  if (findings.length === 0) {
    hideWarning();
  } else {
    showWarning(box, findings);
  }
}

function countFindings(findings) {
  const newFindings = [];
  for (const finding of findings) {
    const key = finding.type + ':' + finding.text;
    if (!counted.includes(key)) {
      counted.push(key);
      newFindings.push(finding);
    }
  }
  if (newFindings.length === 0) return;

  chrome.storage.local.get({ counts: {} }, function (result) {
    const counts = result.counts;
    for (const finding of newFindings) {
      let count = counts[finding.type];
      if (count === undefined) count = 0;
      count = count + 1;
      counts[finding.type] = count;
    }
    chrome.storage.local.set({ counts: counts });
  });
}

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
  warningBox.innerHTML = '';

  const title = document.createElement('b');
  title.textContent = 'Careful! This looks like personal info:';
  warningBox.appendChild(title);

  for (const finding of findings) {
    const row = document.createElement('div');
    row.style.marginTop = '8px';

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
      lastText = '';
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

function redact(box, finding) {
  const placeholder = detectors.getDetector(finding.type).placeholder;

  if (box.tagName === 'TEXTAREA') {
    box.value = box.value.replace(finding.text, placeholder);
    box.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
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

    document.execCommand('insertText', false, placeholder);
  }

  lastText = '';
  checkChatBox();
}

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
