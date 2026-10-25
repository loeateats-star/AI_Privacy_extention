const detectorList = globalThis.PromptGuardDetectors.DETECTORS;
const table = document.getElementById('counts');
const totalText = document.getElementById('total');
const resetButton = document.getElementById('reset');

function showCounts() {
  chrome.storage.local.get({ counts: {} }, function (result) {
    const counts = result.counts;
    let total = 0;

    table.innerHTML = '';

    for (const detector of detectorList) {
      let count = counts[detector.type];
      if (count === undefined) count = 0;
      total = total + count;

      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = detector.label;
      row.appendChild(nameCell);

      const countCell = document.createElement('td');
      countCell.className = 'count';
      countCell.textContent = count;
      row.appendChild(countCell);

      table.appendChild(row);
    }

    totalText.textContent = 'Total flagged: ' + total;
  });
}

resetButton.onclick = function () {
  chrome.storage.local.set({ counts: {} });
};

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.counts) showCounts();
});

showCounts();
