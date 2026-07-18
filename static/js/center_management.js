(function () {
  'use strict';

  var searchInput = document.getElementById('centerSearch');
  var tableBody = document.querySelector('#centerTable tbody');
  var originalRows = [];

  if (tableBody) {
    originalRows = Array.from(tableBody.querySelectorAll('tr'));
  }

  function filterTable() {
    if (!tableBody) return;
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    originalRows.forEach(function (row) {
      var id = (row.children[0]?.textContent || '').toLowerCase();
      var name = (row.children[1]?.textContent || '').toLowerCase();
      var district = (row.children[2]?.textContent || '').toLowerCase();
      var teacher = (row.children[3]?.textContent || '').toLowerCase();

      var matches = id.includes(query) || name.includes(query) || district.includes(query) || teacher.includes(query);

      row.style.display = matches ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterTable);

  document.querySelectorAll('.cm-btn-view').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var row = this.closest('tr');
      var name = row ? row.children[1]?.textContent?.trim() || 'Center' : 'Center';
      if (window.showToast) window.showToast('Viewing details for ' + name, 'info');
    });
  });

  var addBtn = document.querySelector('[data-action="add-center"]');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (window.showToast) window.showToast('Add New Center feature (UI placeholder)', 'info');
    });
  }

  var filterBtn = document.querySelector('.cm-btn-filter');
  if (filterBtn) {
    filterBtn.addEventListener('click', function () {
      if (window.showToast) window.showToast('Filter feature (UI placeholder)', 'info');
    });
  }
})();
