(function () {
  'use strict';

  var searchInput = document.getElementById('centerSearch');
  var tableBody = document.querySelector('#centerTable tbody');
  var editingCenterId = null;

  /* ---- Toast ---- */
  var toastEl = document.getElementById('centerToast');
  var toastMsg = document.getElementById('centerToastMessage');
  var toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;

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
  window.showToast = showToast;

  /* ---- Filter form ---- */
  var filterForm = document.getElementById('centerFilterForm');
  var clearFilterBtn = document.getElementById('clearFilterBtn');
  var headerFilterBtn = document.querySelector('.cm-btn-filter[aria-label="Filter centers"]');

  if (headerFilterBtn && filterForm) {
    headerFilterBtn.addEventListener('click', function (e) {
      e.preventDefault();
      document.getElementById('filterCity').focus();
    });
  }

  if (clearFilterBtn && filterForm) {
    clearFilterBtn.addEventListener('click', function () {
      document.getElementById('filterCity').value = '';
      document.getElementById('filterDistrict').value = '';
      var filteredInput = filterForm.querySelector('input[name="filtered"]');
      if (filteredInput) filteredInput.value = '0';
      filterForm.submit();
    });
  }

  /* ---- Client-side search ---- */
  function filterTable() {
    if (!tableBody) return;
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function (row) {
      if (row.classList.contains('empty-row')) return;
      var name = (row.children[0]?.textContent || '').toLowerCase();
      var city = (row.children[1]?.textContent || '').toLowerCase();
      var district = (row.children[2]?.textContent || '').toLowerCase();
      var teacher = (row.children[3]?.textContent || '').toLowerCase();
      var matches = name.includes(query) || city.includes(query) || district.includes(query) || teacher.includes(query);
      row.style.display = matches ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterTable);

  /* ---- Table action buttons ---- */
  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      var btn = e.target.closest('.cm-action-btn');
      if (!btn) return;
      e.stopPropagation();
      var action = btn.getAttribute('data-action');
      var row = btn.closest('tr');
      var centerId = row ? row.getAttribute('data-id') : null;
      var name = row ? (row.children[0]?.textContent?.trim() || 'Center') : 'Center';
      if (action === 'edit') {
        if (centerId) editCenter(centerId);
      } else if (action === 'delete') {
        if (centerId) showDeleteConfirm(centerId, name);
      }
    });
  }

  /* ---- Modal instances ---- */
  var centerModalEl = document.getElementById('centerModal');
  var deleteModalEl = document.getElementById('deleteCenterModal');
  var mapModalEl = document.getElementById('mapModal');
  if (!centerModalEl || !deleteModalEl) return;
  var centerModal = new bootstrap.Modal(centerModalEl);
  var deleteModal = new bootstrap.Modal(deleteModalEl);
  var mapModal = mapModalEl ? new bootstrap.Modal(mapModalEl) : null;

  /* ---- Map state ---- */
  var mapInstance = null;
  var mapMarker = null;
  var selectedLat = null;
  var selectedLng = null;

  /* ---- Add trigger ---- */
  var addBtn = document.querySelector('[data-action="add-center"]');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      resetCenterForm();
      setCenterFormMode('add');
      centerModal.show();
    });
  }

  /* ---- Clear button ---- */
  document.getElementById('clearCenterBtn').addEventListener('click', resetCenterForm);

  function resetCenterForm() {
    var form = document.getElementById('centerForm');
    if (form) form.reset();
    document.getElementById('id_center_id').value = '';
    document.getElementById('id_latitude').value = '';
    document.getElementById('id_longitude').value = '';
    document.getElementById('locationDisplay').textContent = 'No location selected';
    clearFieldErrors();
    var errorsDiv = document.getElementById('centerFormErrors');
    if (errorsDiv) {
      errorsDiv.classList.add('d-none');
      errorsDiv.textContent = '';
    }
    editingCenterId = null;
    selectedLat = null;
    selectedLng = null;
  }

  function setCenterFormMode(mode) {
    var label = document.getElementById('centerModalLabel');
    var icon = document.querySelector('.cm-modal-icon i');
    var btn = document.getElementById('saveCenterBtn');
    var btnText = document.getElementById('saveCenterBtnText');
    if (mode === 'edit') {
      if (label) label.textContent = 'Edit Center';
      if (icon) icon.className = 'bi bi-pencil-square';
      if (btnText) btnText.textContent = 'Update Center';
    } else {
      if (label) label.textContent = 'Add New Center';
      if (icon) icon.className = 'bi bi-building-add';
      if (btnText) btnText.textContent = 'Save Center';
    }
  }

  /* ---- Edit ---- */
  function editCenter(centerId) {
    resetCenterForm();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/panel/centers/' + centerId + '/edit/');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) {
          showToast('Invalid server response.', 'danger');
          return;
        }
        if (data.success) {
          fillCenterForm(data.center);
        } else {
          showToast(data.errors || 'Failed to load center data.', 'danger');
        }
      } else {
        showToast('Server error.', 'danger');
      }
    };
    xhr.onerror = function () { showToast('Network error.', 'danger'); };
    xhr.send();
  }

  function fillCenterForm(center) {
    document.getElementById('id_center_id').value = center.id;
    document.getElementById('id_center_name').value = center.center_name || '';
    document.getElementById('id_city').value = center.city || '';
    document.getElementById('id_complete_address').value = center.complete_address || '';
    document.getElementById('id_district').value = center.district || '';
    document.getElementById('id_latitude').value = center.latitude || '';
    document.getElementById('id_longitude').value = center.longitude || '';
    if (center.latitude && center.longitude) {
      document.getElementById('locationDisplay').textContent =
        'Lat: ' + center.latitude + ', Lng: ' + center.longitude;
      selectedLat = center.latitude;
      selectedLng = center.longitude;
    }
    var radiusSelect = document.getElementById('id_allowed_radius');
    if (radiusSelect && center.allowed_radius) {
      radiusSelect.value = center.allowed_radius;
    }
    var teacherSelect = document.getElementById('id_assigned_teacher');
    if (teacherSelect && center.assigned_teacher) {
      teacherSelect.value = center.assigned_teacher;
    }
    editingCenterId = center.id;
    setCenterFormMode('edit');
    centerModal.show();
  }

  /* ---- Map Picker ---- */
  var pickLocationBtn = document.getElementById('pickLocationBtn');

  if (pickLocationBtn && mapModal) {
    pickLocationBtn.addEventListener('click', function () {
      mapModal.show();
      setTimeout(function () {
        initMap();
      }, 300);
    });
  }

  function initMap() {
    var container = document.getElementById('mapContainer');
    if (!container) return;

    if (mapInstance) {
      mapInstance.invalidateSize();
      if (selectedLat && selectedLng) {
        mapInstance.setView([selectedLat, selectedLng], 15);
      }
      return;
    }

    var defaultLat = selectedLat || 33.6844;
    var defaultLng = selectedLng || 73.0479;

    mapInstance = L.map('mapContainer').setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance);

    if (selectedLat && selectedLng) {
      mapMarker = L.marker([selectedLat, selectedLng], { draggable: true }).addTo(mapInstance);
      updateMapDisplay(selectedLat, selectedLng);
    }

    mapInstance.on('click', function (e) {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    if (mapMarker) {
      mapMarker.on('dragend', function (e) {
        var pos = e.target.getLatLng();
        updateMapDisplay(pos.lat, pos.lng);
      });
    }
  }

  function placeMarker(lat, lng) {
    if (mapMarker) {
      mapMarker.setLatLng([lat, lng]);
    } else {
      mapMarker = L.marker([lat, lng], { draggable: true }).addTo(mapInstance);
      mapMarker.on('dragend', function (e) {
        var pos = e.target.getLatLng();
        updateMapDisplay(pos.lat, pos.lng);
      });
    }
    updateMapDisplay(lat, lng);
  }

  function updateMapDisplay(lat, lng) {
    var roundedLat = parseFloat(lat).toFixed(6);
    var roundedLng = parseFloat(lng).toFixed(6);
    document.getElementById('mapLatDisplay').textContent = roundedLat;
    document.getElementById('mapLngDisplay').textContent = roundedLng;
    document.getElementById('confirmLocationBtn').disabled = false;
    selectedLat = roundedLat;
    selectedLng = roundedLng;
  }

  /* ---- Professional Map Search (Geoapify Autocomplete) ---- */
  var mapSearchInput = document.getElementById('mapSearchInput');
  var mapSuggestions = document.getElementById('mapSuggestions');
  var mapSearchSpinner = document.getElementById('mapSearchSpinner');
  var searchDebounceTimer = null;
  var searchAbortController = null;
  var GEOAPIFY_KEY = mapSearchInput ? mapSearchInput.getAttribute('data-geoapify-key') : '';

  function doGeocode(query) {
    if (searchAbortController) {
      searchAbortController.abort();
    }
    searchAbortController = new AbortController();
    var signal = searchAbortController.signal;

    if (!navigator.onLine) {
      return Promise.reject(new Error('offline'));
    }

    var url = 'https://api.geoapify.com/v1/geocode/autocomplete?text=' + encodeURIComponent(query) + '&limit=8&apiKey=' + encodeURIComponent(GEOAPIFY_KEY) + '&lang=en&filter=countrycode:pk&bias=proximity:73.0479,33.6844';

    return fetch(url, { signal: signal })
      .then(function (resp) {
        if (!resp.ok) throw new Error('Geoapify failed');
        return resp.json();
      })
      .then(function (data) {
        if (data && data.results && data.results.length > 0) {
          return data.results.map(function (item) {
            return {
              label: item.formatted || item.address_line1 || '',
              name: item.name || item.address_line1 || '',
              city: item.city || item.town || item.village || '',
              state: item.state || '',
              country: item.country || 'Pakistan',
              type: item.result_type || item.category || 'place',
              lat: item.lat,
              lng: item.lon
            };
          });
        }
        return [];
      });
  }

  function renderSuggestions(results) {
    mapSuggestions.innerHTML = '';
    mapSuggestions.classList.remove('d-none');

    var list = document.createElement('div');
    list.className = 'map-suggestions-list';

    results.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'map-suggestion-item';
      el.setAttribute('data-lat', item.lat);
      el.setAttribute('data-lng', item.lng);

      var typeLabel = item.type ? item.type.replace(/_/g, ' ') : 'location';
      var icon = getTypeIcon(item.type);

      el.innerHTML =
        '<div class="suggestion-icon"><i class="bi ' + icon + '"></i></div>' +
        '<div class="suggestion-info">' +
          '<div class="suggestion-name">' + escapeHtml(item.label) + '</div>' +
          '<div class="suggestion-type">' + escapeHtml(typeLabel) + '</div>' +
        '</div>';

      el.addEventListener('click', function () {
        selectSuggestion(item);
      });

      list.appendChild(el);
    });

    mapSuggestions.appendChild(list);
  }

  function showNoResults() {
    mapSuggestions.innerHTML = '';
    mapSuggestions.classList.remove('d-none');
    mapSuggestions.innerHTML = '<div class="map-suggestions-empty"><i class="bi bi-search"></i> No locations found.</div>';
  }

  function showSearchError(offline) {
    mapSuggestions.innerHTML = '';
    mapSuggestions.classList.remove('d-none');
    if (offline) {
      mapSuggestions.innerHTML = '<div class="map-suggestions-empty map-suggestions-error"><i class="bi bi-wifi-off"></i> Unable to search locations. Please check your internet connection.</div>';
    } else {
      mapSuggestions.innerHTML = '<div class="map-suggestions-empty map-suggestions-error"><i class="bi bi-exclamation-circle"></i> Unable to search location. Please try again.</div>';
    }
  }

  function getTypeIcon(type) {
    if (!type) return 'bi-geo-alt';
    var t = type.toLowerCase();
    if (t.indexOf('school') !== -1 || t.indexOf('university') !== -1 || t.indexOf('college') !== -1) return 'bi-mortarboard-fill';
    if (t.indexOf('hospital') !== -1 || t.indexOf('clinic') !== -1) return 'bi-hospital';
    if (t.indexOf('office') !== -1 || t.indexOf('government') !== -1) return 'bi-building';
    if (t.indexOf('park') !== -1 || t.indexOf('landmark') !== -1) return 'bi-signpost-2';
    if (t.indexOf('street') !== -1 || t.indexOf('road') !== -1) return 'bi-signpost';
    if (t.indexOf('village') !== -1 || t.indexOf('suburb') !== -1) return 'bi-house-door';
    if (t.indexOf('city') !== -1 || t.indexOf('town') !== -1) return 'bi-building';
    if (t.indexOf('district') !== -1 || t.indexOf('county') !== -1) return 'bi-map';
    if (t.indexOf('shop') !== -1 || t.indexOf('commercial') !== -1 || t.indexOf('business') !== -1) return 'bi-shop';
    if (t.indexOf('company') !== -1 || t.indexOf('amenity') !== -1) return 'bi-briefcase';
    return 'bi-geo-alt';
  }

  function selectSuggestion(item) {
    mapSuggestions.classList.add('d-none');
    mapSearchInput.value = item.label;
    if (item.lat && item.lng && mapInstance) {
      mapInstance.setView([item.lat, item.lng], 17);
      placeMarker(item.lat, item.lng);
    }
  }

  if (mapSearchInput) {
    mapSearchInput.addEventListener('input', function () {
      clearTimeout(searchDebounceTimer);
      var query = mapSearchInput.value.trim();
      if (query.length < 3) {
        mapSuggestions.classList.add('d-none');
        return;
      }
      searchDebounceTimer = setTimeout(function () {
        mapSearchSpinner.classList.remove('d-none');
        doGeocode(query)
          .then(function (results) {
            mapSearchSpinner.classList.add('d-none');
            if (results && results.length > 0) {
              renderSuggestions(results);
            } else {
              showNoResults();
            }
          })
          .catch(function (err) {
            mapSearchSpinner.classList.add('d-none');
            if (err.name === 'AbortError') return;
            showSearchError(err.message === 'offline');
          });
      }, 300);
    });

    mapSearchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        var activeItem = mapSuggestions.querySelector('.suggestion-highlighted');
        if (activeItem) {
          activeItem.click();
          return;
        }
        mapSuggestions.classList.add('d-none');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSuggestions(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSuggestions(-1);
      }
      if (e.key === 'Escape') {
        mapSuggestions.classList.add('d-none');
      }
    });

    mapSearchInput.addEventListener('blur', function () {
      setTimeout(function () { mapSuggestions.classList.add('d-none'); }, 200);
    });

    mapSearchInput.addEventListener('focus', function () {
      if (mapSuggestions.children.length > 0) {
        mapSuggestions.classList.remove('d-none');
      }
    });
  }

  function navigateSuggestions(dir) {
    var items = mapSuggestions.querySelectorAll('.map-suggestion-item');
    if (!items.length) return;
    var current = mapSuggestions.querySelector('.suggestion-highlighted');
    var idx = -1;
    if (current) {
      current.classList.remove('suggestion-highlighted');
      idx = Array.prototype.indexOf.call(items, current);
    }
    idx += dir;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    items[idx].classList.add('suggestion-highlighted');
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  /* ---- Confirm Location ---- */
  var confirmLocationBtn = document.getElementById('confirmLocationBtn');
  if (confirmLocationBtn) {
    confirmLocationBtn.addEventListener('click', function () {
      if (selectedLat && selectedLng) {
        document.getElementById('id_latitude').value = selectedLat;
        document.getElementById('id_longitude').value = selectedLng;
        document.getElementById('locationDisplay').textContent =
          'Lat: ' + selectedLat + ', Lng: ' + selectedLng;
        mapModal.hide();
      }
    });
  }

  /* ---- Clean up map on modal hide ---- */
  if (mapModalEl) {
    mapModalEl.addEventListener('hidden.bs.modal', function () {
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
        mapMarker = null;
      }
    });
  }

  /* ---- Delete ---- */
  function showDeleteConfirm(centerId, name) {
    document.getElementById('deleteCenterId').value = centerId;
    document.getElementById('deleteCenterName').textContent = name;
    deleteModal.show();
  }

  document.getElementById('confirmDeleteCenterBtn').addEventListener('click', function () {
    var centerId = document.getElementById('deleteCenterId').value;
    if (!centerId) return;
    var btn = this;
    var btnText = document.getElementById('deleteCenterBtnText');
    var spinner = document.getElementById('deleteCenterBtnSpinner');
    btn.disabled = true;
    btnText.textContent = 'Deleting...';
    spinner.classList.remove('d-none');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/panel/centers/' + centerId + '/delete/');
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onload = function () {
      btn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('d-none');
      if (xhr.status >= 200 && xhr.status < 300) {
        try { var data = JSON.parse(xhr.responseText); } catch (e) { showToast('Invalid response.', 'danger'); return; }
        if (data.success) {
          deleteModal.hide();
          removeCenterRow(centerId);
          updateCenterCount(-1);
          showToast('Center deleted successfully.', 'success');
        } else {
          showToast(data.errors || 'Failed to delete center.', 'danger');
        }
      } else { showToast('Server error.', 'danger'); }
    };
    xhr.onerror = function () {
      btn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('d-none');
      showToast('Network error.', 'danger');
    };
    xhr.send();
  });

  /* ---- Utility ---- */
  function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  function clearFieldErrors() {
    document.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
    document.querySelectorAll('.invalid-feedback').forEach(function (el) { el.textContent = ''; });
  }

  function showFieldError(fieldId, message) {
    var field = document.getElementById(fieldId);
    if (!field) return;
    field.classList.add('is-invalid');
    var feedback = field.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
  }

  /* ---- Save / Update ---- */
  document.getElementById('saveCenterBtn').addEventListener('click', function () {
    var form = document.getElementById('centerForm');
    var formData = new FormData(form);
    var centerId = document.getElementById('id_center_id').value;
    var isEdit = centerId && centerId !== '';
    var btn = this;
    var btnText = document.getElementById('saveCenterBtnText');
    var spinner = document.getElementById('saveCenterBtnSpinner');
    var errorsDiv = document.getElementById('centerFormErrors');

    // Lat/Lng are optional - teacher can configure via GPS later

    clearFieldErrors();
    errorsDiv.classList.add('d-none');
    errorsDiv.textContent = '';

    btn.disabled = true;
    var origText = isEdit ? 'Update Center' : 'Save Center';
    btnText.textContent = isEdit ? 'Updating...' : 'Saving...';
    spinner.classList.remove('d-none');

    var url = isEdit ? '/panel/centers/' + centerId + '/edit/' : '/panel/centers/add/';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    if (isEdit) xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onload = function () {
      btn.disabled = false;
      btnText.textContent = origText;
      spinner.classList.add('d-none');
      if (xhr.status >= 200 && xhr.status < 300) {
        try { var data = JSON.parse(xhr.responseText); } catch (e) { showToast('Invalid response.', 'danger'); return; }
        if (data.success) {
          centerModal.hide();
          if (isEdit) {
            updateCenterRow(centerId, data.center);
            showToast('Center updated successfully.', 'success');
          } else {
            appendCenterRow(data.center);
            updateCenterCount(1);
            showToast('Center added successfully.', 'success');
          }
        } else {
          if (typeof data.errors === 'string') {
            errorsDiv.textContent = data.errors;
            errorsDiv.classList.remove('d-none');
          } else if (typeof data.errors === 'object') {
            var fields = {
              center_name: 'id_center_name',
              complete_address: 'id_complete_address',
              city: 'id_city',
              district: 'id_district',
              assigned_teacher: 'id_assigned_teacher',
              latitude: 'id_latitude',
              longitude: 'id_longitude',
              allowed_radius: 'id_allowed_radius',
            };
            var firstError = null;
            Object.keys(data.errors).forEach(function (key) {
              var fieldId = fields[key];
              if (fieldId) {
                showFieldError(fieldId, data.errors[key]);
                if (!firstError) firstError = document.getElementById(fieldId);
              } else {
                errorsDiv.textContent += data.errors[key] + ' ';
              }
            });
            if (errorsDiv.textContent.trim()) errorsDiv.classList.remove('d-none');
            if (firstError) firstError.focus();
          }
        }
      } else { showToast('Server error.', 'danger'); }
    };
    xhr.onerror = function () {
      btn.disabled = false;
      btnText.textContent = origText;
      spinner.classList.add('d-none');
      showToast('Network error.', 'danger');
    };
    xhr.send(formData);
  });

  /* ---- Table manipulation ---- */
  function buildCenterRow(center) {
    var initials = center.assigned_teacher_name
      ? (center.assigned_teacher_name.charAt(0) || 'T').toUpperCase()
      : 'T';
    var photoHtml = '';
    if (center.assigned_teacher_name) {
      photoHtml = '<div class="cm-teacher-cell">' +
        '<span class="cm-avatar" style="background:#E3F3EC;color:#1F5C40;">' + initials + '</span>' +
        '<span>' + escapeHtml(center.assigned_teacher_name) + '</span></div>';
    } else {
      photoHtml = '<span class="cm-cell-muted">Pending</span>';
    }
    var isConfigured = center.configuration_status === 'CONFIGURED';
    var configHtml = isConfigured
      ? '<span class="cm-badge" style="background:#D1FAE5;color:#065F46;"><i class="bi bi-check-circle-fill"></i> Configured</span>'
      : '<span class="cm-badge" style="background:#FEE2E2;color:#991B1B;"><i class="bi bi-exclamation-circle-fill"></i> Not Configured</span>';
    var statusLower = (center.status || 'pending').toLowerCase();
    var tr = document.createElement('tr');
    tr.setAttribute('data-id', center.id);
    tr.innerHTML =
      '<td><span class="cm-name">' + escapeHtml(center.center_name) + '</span></td>' +
      '<td class="cm-cell-muted">' + escapeHtml(center.city || '--') + '</td>' +
      '<td class="cm-cell-muted">' + escapeHtml(center.district) + '</td>' +
      '<td>' + photoHtml + '</td>' +
      '<td>' + configHtml + '</td>' +
      '<td><span class="cm-badge cm-badge-' + statusLower + '"><i class="bi bi-circle-fill"></i> ' + escapeHtml(center.status) + '</span></td>' +
      '<td class="cm-action-cell">' +
      '<button class="cm-action-btn cm-action-edit" data-action="edit" title="Edit" aria-label="Edit ' + escapeHtml(center.center_name) + '"><i class="bi bi-pencil"></i></button>' +
      '<button class="cm-action-btn cm-action-delete" data-action="delete" title="Delete" aria-label="Delete ' + escapeHtml(center.center_name) + '"><i class="bi bi-trash"></i></button>' +
      '</td>';
    return tr;
  }

  function appendCenterRow(center) {
    if (!tableBody) return;
    var emptyRow = tableBody.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();
    tableBody.appendChild(buildCenterRow(center));
  }

  function updateCenterRow(centerId, center) {
    if (!tableBody) return;
    var row = tableBody.querySelector('tr[data-id="' + centerId + '"]');
    if (!row) return;
    var newRow = buildCenterRow(center);
    row.parentNode.replaceChild(newRow, row);
  }

  function removeCenterRow(centerId) {
    if (!tableBody) return;
    var row = tableBody.querySelector('tr[data-id="' + centerId + '"]');
    if (row) row.remove();
    var remaining = tableBody.querySelectorAll('tr:not(.empty-row)');
    if (remaining.length === 0) {
      tableBody.innerHTML =
        '<tr class="empty-row"><td colspan="6" class="text-center py-5 text-muted empty-state-cell">' +
        '<i class="bi bi-building fs-1 d-block mb-3"></i>' +
        '<h6 class="fw-semibold mb-1" style="color:var(--gray-600);">No education centers found.</h6>' +
        '<p class="mb-0" style="color:var(--gray-500);font-size:0.85rem;">Click \'Add Center\' to create the first education center.</p>' +
        '</td></tr>';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function updateCenterCount(delta) {
    var countEl = document.querySelector('.cm-footer-info');
    if (!countEl) return;
    var match = countEl.textContent.match(/of (\d+) centers/);
    var current = match ? parseInt(match[1], 10) : 0;
    var newTotal = current + delta;
    countEl.textContent = 'Showing ' + newTotal + ' of ' + newTotal + ' centers';
  }

  /* ---- Modal reset on close ---- */
  centerModalEl.addEventListener('hidden.bs.modal', function () {
    resetCenterForm();
  });

  deleteModalEl.addEventListener('hidden.bs.modal', function () {
    document.getElementById('deleteCenterId').value = '';
    document.getElementById('deleteCenterName').textContent = 'this center';
    document.getElementById('confirmDeleteCenterBtn').disabled = false;
    document.getElementById('deleteCenterBtnText').textContent = 'Delete';
    document.getElementById('deleteCenterBtnSpinner').classList.add('d-none');
  });

})();
