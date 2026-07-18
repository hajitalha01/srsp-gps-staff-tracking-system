(function () {
  'use strict';

  // ----- Date chip toggle -----
  document.querySelectorAll('.am-chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('.am-chip').forEach(function (c) {
        c.classList.remove('active');
      });
      this.classList.add('active');
    });
  });

  // ----- Action buttons (View / Download) -----
  document.querySelectorAll('.am-action-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isView = this.querySelector('.bi-eye') !== null;
      var row = this.closest('tr');
      var name = row ? row.children[1]?.textContent?.trim() || 'Teacher' : 'Teacher';
      var msg = isView ? 'Viewing details for ' + name : 'Downloading record for ' + name;
      if (window.showToast) window.showToast(msg, 'info');
    });
  });

  // ----- Profile action buttons -----
  var profileActions = document.querySelector('.am-profile-actions');
  if (profileActions) {
    profileActions.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var text = btn.textContent.trim();
      if (window.showToast) window.showToast(text + ' (UI placeholder)', 'info');
    });
  }

  // ----- Row click -> update profile panel -----
  document.querySelectorAll('#attendanceTable tbody tr').forEach(function (row) {
    row.addEventListener('click', function () {
      var cells = this.querySelectorAll('td');
      if (cells.length < 11) return;

      var name = cells[1]?.textContent?.trim() || 'Ali Hassan';
      var empId = cells[2]?.textContent?.trim() || 'SRSP-T001';
      var center = cells[3]?.textContent?.trim() || 'Center A';
      var district = cells[4]?.textContent?.trim() || 'Peshawar';
      var checkin = cells[5]?.textContent?.trim() || '9:00 AM';
      var checkout = cells[6]?.textContent?.trim() || '5:00 PM';
      var hours = cells[7]?.textContent?.trim() || '8h 00m';
      var status = cells[8]?.textContent?.trim() || 'Present';
      var gps = cells[9]?.textContent?.trim() || 'Verified';

      var avatarEl = cells[0]?.querySelector('.am-avatar');
      var bg = avatarEl ? avatarEl.style.background : '#E3F3EC';
      var color = avatarEl ? avatarEl.style.color : '#1F5C40';
      var initials = avatarEl ? avatarEl.textContent : 'AH';

      var profileAvatar = document.querySelector('.am-profile-avatar');
      var profileName = document.querySelector('.am-profile-name');
      var profileRole = document.querySelector('.am-profile-role');
      var detailValues = document.querySelectorAll('.am-detail-value');

      if (profileAvatar) {
        profileAvatar.textContent = initials;
        profileAvatar.style.background = bg;
        profileAvatar.style.color = color;
      }
      if (profileName) profileName.textContent = name;
      if (profileRole) profileRole.textContent = 'Teacher';

      if (detailValues.length >= 11) {
        detailValues[0].textContent = empId;
        detailValues[1].textContent = '0300-1234567';
        detailValues[2].textContent = '17301-1234567-1';
        detailValues[3].textContent = center;
        detailValues[4].textContent = district;
        detailValues[5].textContent = 'Jan 15, 2024';
        detailValues[6].textContent = checkin;
        detailValues[7].textContent = checkout;
        detailValues[8].textContent = hours;
        detailValues[9].textContent = '95%';

        var gpsEl = detailValues[10];
        if (gpsEl) {
          var isVerified = gps === 'Verified';
          gpsEl.innerHTML = '<span class="am-gps ' + (isVerified ? 'am-gps-verified' : 'am-gps-not-verified') + '"><i class="bi ' + (isVerified ? 'bi-check-circle-fill' : 'bi-x-circle-fill') + '"></i> ' + gps + '</span>';
        }
      }

      row.closest('tbody')?.querySelectorAll('tr').forEach(function (r) {
        r.style.background = '';
      });
      this.style.background = '#E8F5E9';
    });
  });

  // ----- Search filtering -----
  var searchInput = document.getElementById('attendanceSearch');
  var tableBody = document.querySelector('#attendanceTable tbody');
  var originalRows = [];

  if (tableBody) {
    originalRows = Array.from(tableBody.querySelectorAll('tr'));
  }

  function filterTable() {
    if (!tableBody) return;
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    originalRows.forEach(function (row) {
      var text = '';
      for (var i = 0; i < row.children.length; i++) {
        text += (row.children[i]?.textContent || '') + ' ';
      }
      text = text.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterTable);
})();
