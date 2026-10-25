const detectorList = globalThis.PromptGuardDetectors.DETECTORS;
const container = document.getElementById('detectors');
const status = document.getElementById('status');

chrome.storage.sync.get({ enabledDetectors: {} }, function (result) {
  const enabledDetectors = result.enabledDetectors;

  for (const detector of detectorList) {
    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = enabledDetectors[detector.type] !== false;

    checkbox.onchange = function () {
      enabledDetectors[detector.type] = checkbox.checked;
      chrome.storage.sync.set({ enabledDetectors: enabledDetectors });
      status.textContent = 'Saved!';
    };

    const name = document.createElement('b');
    name.textContent = detector.label;
    const description = document.createElement('p');
    description.textContent = detector.description;

    label.appendChild(checkbox);
    label.appendChild(name);
    label.appendChild(description);
    container.appendChild(label);
  }
});
