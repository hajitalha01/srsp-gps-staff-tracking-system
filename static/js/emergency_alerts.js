(function () {
  'use strict';

  var tableBody = document.getElementById('eaTableBody');
  var toastEl = document.getElementById('eaToast');
  var toastMsg = document.getElementById('eaToastMessage');
  var toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;
  var refreshInterval = null;

  /* ---- Toast ---- */
  function showToast(message, type) {
    if (!toast || !toastEl || !toastMsg) return;
    toastEl.className = 'toast align-items-center border-0';
    if (type === 'success') toastEl.classList.add('bg-success', 'text-white');
    else if (type === 'danger') toastEl.classList.add('bg-danger', 'text-white');
    else if (type === 'warning') toastEl.classList.add('bg-warning', 'text-dark');
    else toastEl.classList.add('bg-dark', 'text-white');
    toastMsg.textContent = message;
    toast.show();
  }

  /* ---- CSRF ---- */
  function getCookie(name) {
    var value = null;
    if (document.cookie && document.cookie !== '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var c = cookies[i].trim();
        if (c.substring(0, name.length + 1) === (name + '=')) {
          value = decodeURIComponent(c.substring(name.length + 1));
          break;
        }
      }
    }
    return value;
  }

  /* ---- Escape HTML ---- */
  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  /* ---- Refresh Table ---- */
  function refreshAlerts() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/panel/alerts/json/');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) { return; }
        if (data.success && data.alerts) {
          renderTable(data.alerts);
        }
      }
    };
    xhr.send();
  }

  /* ---- Render Table ---- */
  function renderTable(alerts) {
    if (!tableBody) return;
    if (!alerts || alerts.length === 0) {
      var baseUrl = window.location.pathname + window.location.search;
      if (baseUrl.indexOf('?') > -1 && baseUrl.indexOf('filtered') === -1) {
        baseUrl += '&filtered=1';
      }
      var filterActive = window.location.search.indexOf('q=') > -1 ||
        window.location.search.indexOf('status=') > -1 ||
        window.location.search.indexOf('center=') > -1 ||
        window.location.search.indexOf('district=') > -1 ||
        window.location.search.indexOf('date=') > -1;
      if (filterActive) {
        tableBody.innerHTML =
          '<tr class="empty-row"><td colspan="10" class="text-center py-5 text-muted empty-state-cell">' +
          '<i class="bi bi-funnel fs-1 d-block mb-3"></i>' +
          '<h6 class="fw-semibold mb-1" style="color:var(--gray-600);">No alerts found matching the selected filters.</h6>' +
          '<p class="mb-0" style="color:var(--gray-500);font-size:0.85rem;">Try adjusting your search or filter criteria.</p>' +
          '</td></tr>';
      } else {
        tableBody.innerHTML =
          '<tr class="empty-row"><td colspan="10" class="text-center py-5 text-muted empty-state-cell">' +
          '<i class="bi bi-shield-check fs-1 d-block mb-3" style="color:#22C55E;"></i>' +
          '<h6 class="fw-semibold mb-1" style="color:var(--gray-600);">No Emergency Alerts Found.</h6>' +
          '<p class="mb-0" style="color:var(--gray-500);font-size:0.85rem;max-width:380px;margin:0 auto;">Emergency alerts will appear here whenever a staff member presses the Panic/Emergency button.</p>' +
          '</td></tr>';
      }
      updateStats([]);
      updateFooter(0);
      return;
    }

    var html = '';
    for (var i = 0; i < alerts.length; i++) {
      var a = alerts[i];
      var imgHtml = a.profile_photo_url
        ? '<img src="' + esc(a.profile_photo_url) + '" alt="' + esc(a.staff_name) + '" class="ea-cell-avatar">'
        : '<span class="ea-cell-avatar ea-cell-avatar-text">' + esc(a.initials) + '</span>';
      var statusClass = a.status.toLowerCase().replace(/\s+/g, '-');
      html += '<tr data-id="' + a.id + '">' +
        '<td><span class="cm-id-tag">#' + a.id + '</span></td>' +
        '<td><div class="ea-cell-staff">' + imgHtml + '<span class="ea-cell-name">' + esc(a.staff_name) + '</span></div></td>' +
        '<td class="cm-cell-muted">' + esc(a.employee_id || '--') + '</td>' +
        '<td class="cm-cell-muted">' + esc(a.assigned_center) + '</td>' +
        '<td class="cm-cell-muted">' + esc(a.district) + '</td>' +
        '<td class="cm-cell-muted">' + esc(a.created_time) + '</td>' +
        '<td class="cm-cell-muted">' + esc(a.created_date) + '</td>' +
        '<td><button class="ea-gps-btn" data-action="view-location" data-id="' + a.id + '" title="View location on map"><i class="bi bi-geo-alt-fill"></i></button></td>' +
        '<td><span class="ea-status-badge ea-status-' + statusClass + '">' + esc(a.status) + '</span></td>' +
        '<td class="ea-action-cell">' +
        '<div class="dropdown">' +
        '<button class="ea-action-btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-three-dots-vertical"></i></button>' +
        '<ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 py-1" style="min-width:170px;border-radius:10px;">' +
        '<li><button class="dropdown-item py-2 ea-status-change" data-id="' + a.id + '" data-status="Pending"><span class="ea-dot ea-dot-pending"></span> Pending</button></li>' +
        '<li><button class="dropdown-item py-2 ea-status-change" data-id="' + a.id + '" data-status="In Progress"><span class="ea-dot ea-dot-in-progress"></span> In Progress</button></li>' +
        '<li><button class="dropdown-item py-2 ea-status-change" data-id="' + a.id + '" data-status="Resolved"><span class="ea-dot ea-dot-resolved"></span> Resolved</button></li>' +
        '<li><button class="dropdown-item py-2 ea-status-change" data-id="' + a.id + '" data-status="Cancelled"><span class="ea-dot ea-dot-cancelled"></span> Cancelled</button></li>' +
        '<li><hr class="dropdown-divider my-1"></li>' +
        '<li><button class="dropdown-item py-2 ea-view-detail" data-id="' + a.id + '"><i class="bi bi-eye me-2"></i> View Details</button></li>' +
        '<li><button class="dropdown-item py-2 ea-view-map" data-id="' + a.id + '"><i class="bi bi-map me-2"></i> View Location</button></li>' +
        '<li><hr class="dropdown-divider my-1"></li>' +
        '<li><button class="dropdown-item py-2 text-danger ea-delete-alert" data-id="' + a.id + '"><i class="bi bi-trash me-2"></i> Delete</button></li>' +
        '</ul></div></td></tr>';
    }
    tableBody.innerHTML = html;
    updateStats(alerts);
    updateFooter(alerts.length);
  }

  /* ---- Update Stats ---- */
  function updateStats(alerts) {
    var total = alerts.length;
    var pending = 0, inProgress = 0, resolved = 0, cancelled = 0, today = 0;
    var todayStr = new Date().toISOString().split('T')[0];
    for (var i = 0; i < alerts.length; i++) {
      var s = alerts[i].status;
      if (s === 'Pending') pending++;
      else if (s === 'In Progress') inProgress++;
      else if (s === 'Resolved') resolved++;
      else if (s === 'Cancelled') cancelled++;
      if (alerts[i].created_date === todayStr) today++;
    }
    setText('statTotal', total);
    setText('statPending', pending);
    setText('statInProgress', inProgress);
    setText('statResolved', resolved);
    setText('statCancelled', cancelled);
    setText('statToday', today);
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateFooter(count) {
    var el = document.querySelector('.cm-footer-info');
    if (el) el.textContent = 'Showing ' + count + ' of ' + count + ' alerts';
  }

  /* ---- Status Change ---- */
  function changeAlertStatus(alertId, newStatus, btnEl) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/panel/alerts/' + alertId + '/status/');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) { showToast('Invalid response.', 'danger'); return; }
        if (data.success) {
          showToast('Status updated to ' + newStatus + '.', 'success');
          refreshAlerts();
        } else {
          showToast(data.errors || 'Failed to update status.', 'danger');
        }
      } else {
        showToast('Server error.', 'danger');
      }
    };
    xhr.onerror = function () { showToast('Network error.', 'danger'); };
    xhr.send(JSON.stringify({ status: newStatus }));
  }

  /* ---- Delete Alert ---- */
  function deleteAlert(alertId) {
    var btn = document.getElementById('confirmDeleteAlertBtn');
    var btnText = document.getElementById('deleteAlertBtnText');
    var spinner = document.getElementById('deleteAlertBtnSpinner');
    btn.disabled = true;
    btnText.textContent = 'Deleting...';
    spinner.classList.remove('d-none');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/panel/alerts/' + alertId + '/delete/');
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      btn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('d-none');
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) { showToast('Invalid response.', 'danger'); return; }
        if (data.success) {
          bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
          showToast('Alert deleted.', 'success');
          refreshAlerts();
        } else {
          showToast(data.errors || 'Failed to delete.', 'danger');
        }
      } else {
        showToast('Server error.', 'danger');
      }
    };
    xhr.onerror = function () {
      btn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('d-none');
      showToast('Network error.', 'danger');
    };
    xhr.send();
  }

  /* ---- View Location (Leaflet) ---- */
  var mapInstance = null;
  var locationModalEl = document.getElementById('locationModal');

  function viewLocation(alertId) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/panel/alerts/' + alertId + '/detail/');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) { showToast('Invalid response.', 'danger'); return; }
        if (data.success && data.alert) {
          var a = data.alert;
          document.getElementById('locStaffName').textContent = a.staff_name;
          document.getElementById('locCenter').textContent = a.assigned_center;
          document.getElementById('locDate').textContent = a.created_date;
          document.getElementById('locTime').textContent = a.created_time;
          document.getElementById('locCoords').textContent = a.latitude + ', ' + a.longitude;

          var modal = new bootstrap.Modal(locationModalEl);
          modal.show();

          locationModalEl.addEventListener('shown.bs.modal', function initMap() {
            locationModalEl.removeEventListener('shown.bs.modal', initMap);
            if (mapInstance) {
              mapInstance.remove();
              mapInstance = null;
            }
            var lat = parseFloat(a.latitude);
            var lng = parseFloat(a.longitude);
            mapInstance = L.map('locationMap', {
              center: [lat, lng],
              zoom: 15,
              zoomControl: true,
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap',
            }).addTo(mapInstance);
            L.marker([lat, lng]).addTo(mapInstance)
              .bindPopup('<strong>' + esc(a.staff_name) + '</strong><br>' + esc(a.location_address || a.assigned_center))
              .openPopup();
            setTimeout(function () { mapInstance.invalidateSize(); }, 300);
          }, { once: true });
        } else {
          showToast('Failed to load location data.', 'danger');
        }
      } else {
        showToast('Server error.', 'danger');
      }
    };
    xhr.onerror = function () { showToast('Network error.', 'danger'); };
    xhr.send();
  }

  locationModalEl.addEventListener('hidden.bs.modal', function () {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
  });

  /* ---- View Details ---- */
  function viewDetail(alertId) {
    var loading = document.getElementById('detailLoading');
    var content = document.getElementById('detailContent');
    var avatarImg = document.getElementById('detailAvatarImg');
    var avatarText = document.getElementById('detailAvatarText');
    var avatarWrap = document.getElementById('detailAvatarWrap');

    loading.classList.remove('d-none');
    content.classList.add('d-none');

    var modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/panel/alerts/' + alertId + '/detail/');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      loading.classList.add('d-none');
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) { showToast('Invalid response.', 'danger'); return; }
        if (data.success && data.alert) {
          var a = data.alert;
          if (a.profile_photo_url) {
            avatarImg.src = a.profile_photo_url;
            avatarImg.style.display = '';
            avatarText.style.display = 'none';
          } else {
            avatarImg.style.display = 'none';
            avatarText.style.display = '';
            avatarText.textContent = a.initials;
            avatarWrap.style.background = '#E8F5E9';
            avatarWrap.style.color = '#1F5C40';
          }
          document.getElementById('detailStaffName').textContent = a.staff_name;
          document.getElementById('detailEmpId').textContent = a.employee_id || '--';
          document.getElementById('detailPhone').textContent = a.phone_number || '--';
          document.getElementById('detailCenter').textContent = a.assigned_center;
          document.getElementById('detailDistrict').textContent = a.district;
          document.getElementById('detailDate').textContent = a.created_date;
          document.getElementById('detailTime').textContent = a.created_time;
          document.getElementById('detailLocation').textContent = a.location_address || a.latitude + ', ' + a.longitude;
          document.getElementById('detailMessage').textContent = a.alert_message || '--';

          var statusEl = document.getElementById('detailStatus');
          var sc = a.status.toLowerCase().replace(/\s+/g, '-');
          statusEl.innerHTML = '<span class="ea-status-badge ea-status-' + sc + '">' + esc(a.status) + '</span>';

          content.classList.remove('d-none');
        } else {
          showToast('Failed to load details.', 'danger');
        }
      } else {
        showToast('Server error.', 'danger');
      }
    };
    xhr.onerror = function () {
      loading.classList.add('d-none');
      showToast('Network error.', 'danger');
    };
    xhr.send();
  }

  /* ---- Event Delegation ---- */
  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      var target = e.target.closest('button, .dropdown-item');
      if (!target) return;

      if (target.classList.contains('ea-status-change')) {
        e.preventDefault();
        var id = target.getAttribute('data-id');
        var status = target.getAttribute('data-status');
        if (id && status) changeAlertStatus(id, status, target);
        return;
      }

      if (target.classList.contains('ea-view-detail') || target.classList.contains('ea-view-map')) {
        e.preventDefault();
        var id = target.getAttribute('data-id');
        if (!id) return;
        if (target.classList.contains('ea-view-map')) {
          viewLocation(id);
        } else {
          viewDetail(id);
        }
        return;
      }

      if (target.classList.contains('ea-delete-alert')) {
        e.preventDefault();
        var id = target.getAttribute('data-id');
        if (id) {
          document.getElementById('deleteAlertId').value = id;
          new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
        }
        return;
      }

      if (target.classList.contains('ea-gps-btn')) {
        var id = target.getAttribute('data-id');
        if (id) viewLocation(id);
        return;
      }
    });
  }

  /* ---- Confirm Delete ---- */
  document.getElementById('confirmDeleteAlertBtn').addEventListener('click', function () {
    var id = document.getElementById('deleteAlertId').value;
    if (id) deleteAlert(id);
  });

  /* ---- Status Filter in Header ---- */
  var statusFilter = document.getElementById('eaStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function () {
      var url = new URL(window.location.href);
      if (this.value) {
        url.searchParams.set('status', this.value);
      } else {
        url.searchParams.delete('status');
      }
      window.location.href = url.toString();
    });
  }

  /* ---- Refresh Now Button ---- */
  var refreshBtn = document.getElementById('eaRefreshNow');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      refreshAlerts();
      showToast('Alerts refreshed.', 'success');
    });
  }

  /* ---- Auto Refresh ---- */
  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshAlerts, 30000);
  }

  startAutoRefresh();

})();
