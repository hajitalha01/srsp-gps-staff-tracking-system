(function () {
  'use strict';

  var searchInput = document.getElementById('staffSearch');
  var centerFilter = document.getElementById('centerFilter');
  var tableBody = document.querySelector('#staffTable tbody');
  var originalRows = [];

  if (tableBody) {
    originalRows = Array.from(tableBody.querySelectorAll('tr'));
  }

  function filterTable() {
    if (!tableBody) return;
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var center = centerFilter ? centerFilter.value : '';

    originalRows.forEach(function (row) {
      var name = (row.children[0]?.textContent || '').toLowerCase();
      var email = (row.children[1]?.textContent || '').toLowerCase();
      var phone = (row.children[2]?.textContent || '').toLowerCase();
      var rowCenter = row.children[3]?.textContent || '';

      var matchesSearch = name.includes(query) || email.includes(query) || phone.includes(query);
      var matchesCenter = !center || rowCenter === center;

      row.style.display = matchesSearch && matchesCenter ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterTable);
  if (centerFilter) centerFilter.addEventListener('change', filterTable);

  document.querySelectorAll('.sm-action-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var action = this.getAttribute('data-action') || 'edit';
      var row = this.closest('tr');
      var name = row ? row.children[0]?.textContent?.trim() || 'Staff' : 'Staff';
      var msg = action === 'edit' ? 'Edit ' + name : 'Delete ' + name;

      if (action === 'delete') {
        if (confirm('Are you sure you want to delete ' + name + '?')) {
          if (window.showToast) window.showToast(name + ' has been deleted.', 'danger');
        }
      } else {
        if (window.showToast) window.showToast(msg, 'info');
      }
    });
  });

  var addBtn = document.querySelector('[data-action="add-staff"]');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      if (window.showToast) window.showToast('Add Staff feature (UI placeholder)', 'info');
    });
  }
})();
