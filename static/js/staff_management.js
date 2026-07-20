(function () {
  'use strict';

  var searchInput = document.getElementById('staffSearch');
  var centerFilter = document.getElementById('centerFilter');
  var tableBody = document.querySelector('#staffTable tbody');
  var editingStaffId = null;

  /* ---- Toast ---- */
  var toastEl = document.getElementById('liveToast');
  var toastMsg = document.getElementById('toastMessage');
  var toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 3000 }) : null;

  function showToast(message, type) {
    if (!toast || !toastEl || !toastMsg) return;
    toastEl.className = 'toast align-items-center border-0';
    if (type === 'success') {
      toastEl.classList.add('bg-success', 'text-white');
    } else if (type === 'danger') {
      toastEl.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
      toastEl.classList.add('bg-warning', 'text-dark');
    } else {
      toastEl.classList.add('bg-dark', 'text-white');
    }
    toastMsg.textContent = message;
    toast.show();
  }

  window.showToast = showToast;

  /* ---- Table filter ---- */
  function filterTable() {
    if (!tableBody) return;
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var center = centerFilter ? centerFilter.value : '';
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function (row) {
      if (row.classList.contains('empty-row')) return;
      var name = (row.children[1]?.textContent || '').toLowerCase();
      var username = (row.children[2]?.textContent || '').toLowerCase();
      var email = (row.children[3]?.textContent || '').toLowerCase();
      var phone = (row.children[4]?.textContent || '').toLowerCase();
      var rowCenter = row.children[5]?.textContent?.trim() || '';
      var matchesSearch = name.includes(query) || email.includes(query) || phone.includes(query) || username.includes(query);
      var matchesCenter = !center || rowCenter === center;
      row.style.display = matchesSearch && matchesCenter ? '' : 'none';
    });
  }

  if (searchInput) searchInput.addEventListener('input', filterTable);
  if (centerFilter) centerFilter.addEventListener('change', filterTable);

  /* ---- Table action buttons (edit/delete) ---- */
  if (tableBody) {
    tableBody.addEventListener('click', function (e) {
      var btn = e.target.closest('.sm-action-btn');
      if (!btn) return;
      e.stopPropagation();
      var action = btn.getAttribute('data-action');
      var row = btn.closest('tr');
      var staffId = row ? row.getAttribute('data-id') : null;
      var name = row ? (row.children[1]?.textContent?.trim() || 'Staff') : 'Staff';

      if (action === 'edit') {
        if (staffId) editStaff(staffId);
      } else if (action === 'delete') {
        if (staffId) showDeleteConfirm(staffId, name);
      }
    });
  }

  /* ---- Modal instances ---- */
  var addStaffModalEl = document.getElementById('addStaffModal');
  var successModalEl = document.getElementById('staffSuccessModal');
  var deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
  if (!addStaffModalEl || !successModalEl || !deleteConfirmModalEl) return;
  var addStaffModal = new bootstrap.Modal(addStaffModalEl);
  var successModal = new bootstrap.Modal(successModalEl);
  var deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalEl);

  /* ---- "Add Staff" trigger ---- */
  var addBtn = document.querySelector('[data-action="add-staff"]');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      resetForm();
      setFormMode('add');
      addStaffModal.show();
    });
  }

  /* ---- Photo upload ---- */
  var photoCard = document.getElementById('photoCard');
  var photoInput = document.getElementById('id_profile_picture');
  var photoPreview = document.getElementById('photoPreview');

  if (photoCard) {
    photoCard.addEventListener('click', function () {
      photoInput.click();
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        showToast('Only JPG and PNG images are allowed.', 'warning');
        photoInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image must not exceed 2 MB.', 'warning');
        photoInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        photoPreview.innerHTML = '<img src="' + ev.target.result + '" alt="Preview">';
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---- Age auto-calculate ---- */
  var dobInput = document.getElementById('id_date_of_birth');
  var ageValue = document.getElementById('ageValue');
  var ageHidden = document.getElementById('id_age');

  if (dobInput && ageValue) {
    dobInput.addEventListener('change', calculateAge);
    dobInput.addEventListener('input', calculateAge);
  }

  function calculateAge() {
    if (!dobInput || !ageValue) return;
    var dobVal = dobInput.value;
    if (!dobVal) {
      ageValue.textContent = '--';
      if (ageHidden) ageHidden.value = '';
      return;
    }
    var parts = dobVal.split('-');
    if (parts.length !== 3) {
      ageValue.textContent = '--';
      if (ageHidden) ageHidden.value = '';
      return;
    }
    var birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(birthDate.getTime())) {
      ageValue.textContent = '--';
      if (ageHidden) ageHidden.value = '';
      return;
    }
    var today = new Date();
    var age = today.getFullYear() - birthDate.getFullYear();
    var monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    var displayAge = age >= 0 ? age : 0;
    ageValue.textContent = displayAge + ' Years';
    if (ageHidden) ageHidden.value = displayAge;
  }

  /* ---- Clear button ---- */
  var clearBtn = document.getElementById('clearFormBtn');
  if (clearBtn) clearBtn.addEventListener('click', resetForm);

  function resetForm() {
    var form = document.getElementById('addStaffForm');
    if (form) form.reset();
    photoPreview.innerHTML = '<i class="bi bi-cloud-arrow-up as-photo-icon"></i><span class="as-photo-text">JPG / PNG</span><span class="as-photo-limit">Maximum 2 MB</span>';
    if (ageValue) ageValue.textContent = '--';
    if (ageHidden) ageHidden.value = '';
    document.getElementById('id_staff_id').value = '';
    clearFieldErrors();
    var errorsDiv = document.getElementById('formErrors');
    if (errorsDiv) {
      errorsDiv.classList.add('d-none');
      errorsDiv.textContent = '';
    }
    editingStaffId = null;
  }

  /* ---- Set form mode (add vs edit) ---- */
  function setFormMode(mode) {
    var label = document.getElementById('addStaffModalLabel');
    var icon = document.querySelector('.as-modal-icon i');
    var btn = document.getElementById('submitStaffBtn');
    var btnText = document.getElementById('submitBtnText');

    if (mode === 'edit') {
      if (label) label.textContent = 'Edit Staff';
      if (icon) icon.className = 'bi bi-pencil-square';
      if (btn) btn.className = 'as-btn as-btn-save';
      if (btnText) btnText.textContent = 'Update Staff';
    } else {
      if (label) label.textContent = 'Add Staff';
      if (icon) icon.className = 'bi bi-person-plus-fill';
      if (btn) btn.className = 'as-btn as-btn-save';
      if (btnText) btnText.textContent = 'Save Staff';
    }
  }

  /* ---- Edit Staff ---- */
  function editStaff(staffId) {
    resetForm();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/panel/staff/' + staffId + '/edit/');
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
          fillEditForm(data.staff);
        } else {
          showToast(data.errors || 'Failed to load staff data.', 'danger');
        }
      } else {
        showToast('Server error. Could not load staff data.', 'danger');
      }
    };

    xhr.onerror = function () {
      showToast('Network error. Could not load staff data.', 'danger');
    };

    xhr.send();
  }

  function fillEditForm(staff) {
    document.getElementById('id_staff_id').value = staff.id;
    document.getElementById('id_full_name').value = staff.full_name || '';
    document.getElementById('id_email').value = staff.email || '';
    document.getElementById('id_phone_number').value = staff.phone || '';
    document.getElementById('id_cnic').value = staff.cnic || '';
    if (staff.date_of_birth) {
      document.getElementById('id_date_of_birth').value = staff.date_of_birth;
      calculateAge();
    }
    var genderSelect = document.getElementById('id_gender');
    if (genderSelect && staff.gender) {
      genderSelect.value = staff.gender;
    }
    document.getElementById('id_address').value = staff.address || '';
    var centerSelect = document.getElementById('id_assigned_center');
    if (centerSelect && staff.center) {
      centerSelect.value = staff.center;
    }
    if (staff.age) {
      if (ageValue) ageValue.textContent = staff.age + ' Years';
      if (ageHidden) ageHidden.value = staff.age;
    }
    if (staff.profile_photo_url) {
      photoPreview.innerHTML = '<img src="' + staff.profile_photo_url + '" alt="Existing Photo">';
    }

    editingStaffId = staff.id;
    setFormMode('edit');
    addStaffModal.show();
  }

  /* ---- Delete Staff ---- */
  function showDeleteConfirm(staffId, name) {
    document.getElementById('deleteStaffId').value = staffId;
    document.getElementById('deleteStaffName').textContent = name;
    deleteConfirmModal.show();
  }

  document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    var staffId = document.getElementById('deleteStaffId').value;
    if (!staffId) return;

    var btn = this;
    var btnText = document.getElementById('deleteBtnText');
    var spinner = document.getElementById('deleteBtnSpinner');

    btn.disabled = true;
    btnText.textContent = 'Deleting...';
    spinner.classList.remove('d-none');

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/panel/staff/' + staffId + '/delete/');
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onload = function () {
      btn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('d-none');

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) {
          showToast('Invalid server response.', 'danger');
          return;
        }
        if (data.success) {
          deleteConfirmModal.hide();
          removeStaffRow(staffId);
          updateStaffCount(-1);
          showToast('Staff deleted successfully.', 'success');
        } else {
          showToast(data.errors || 'Failed to delete staff.', 'danger');
        }
      } else {
        showToast('Server error. Could not delete staff.', 'danger');
      }
    };

    xhr.onerror = function () {
      btn.disabled = false;
      btnText.textContent = 'Delete';
      spinner.classList.add('d-none');
      showToast('Network error. Could not delete staff.', 'danger');
    };

    xhr.send();
  });

  function removeStaffRow(staffId) {
    if (!tableBody) return;
    var row = tableBody.querySelector('tr[data-id="' + staffId + '"]');
    if (row) row.remove();
    var remaining = tableBody.querySelectorAll('tr:not(.empty-row)');
    if (remaining.length === 0) {
      tableBody.innerHTML =
        '<tr class="empty-row"><td colspan="8" class="text-center py-5 text-muted empty-state-cell">' +
        '<i class="bi bi-people fs-1 d-block mb-3"></i>' +
        '<h6 class="fw-semibold mb-1" style="color:var(--gray-600);">No staff members found.</h6>' +
        '<p class="mb-0" style="color:var(--gray-500);font-size:0.85rem;">Click \'Add Staff\' to create the first staff member.</p>' +
        '</td></tr>';
    }
  }

  /* ---- Utility functions ---- */
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

  function clearFieldErrors() {
    document.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
    document.querySelectorAll('.invalid-feedback').forEach(function (el) {
      el.textContent = '';
    });
  }

  /* ---- Submit (handles both Add and Edit) ---- */
  document.getElementById('submitStaffBtn').addEventListener('click', function () {
    calculateAge();

    var form = document.getElementById('addStaffForm');
    var formData = new FormData(form);
    var staffId = document.getElementById('id_staff_id').value;
    var isEdit = staffId && staffId !== '';

    var btn = this;
    var btnText = document.getElementById('submitBtnText');
    var spinner = document.getElementById('submitBtnSpinner');
    var errorsDiv = document.getElementById('formErrors');

    clearFieldErrors();
    errorsDiv.classList.add('d-none');
    errorsDiv.textContent = '';

    btn.disabled = true;
    var originalText = isEdit ? 'Update Staff' : 'Save Staff';
    btnText.textContent = isEdit ? 'Updating...' : 'Saving...';
    spinner.classList.remove('d-none');

    var url = isEdit ? '/panel/staff/' + staffId + '/edit/' : '/panel/staff/add/';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    if (isEdit) {
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    }

    xhr.onload = function () {
      btn.disabled = false;
      btnText.textContent = originalText;
      spinner.classList.add('d-none');

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
        } catch (e) {
          showToast('Invalid server response.', 'danger');
          return;
        }

        if (data.success) {
          if (isEdit) {
            addStaffModal.hide();
            updateStaffRow(staffId, data.staff);
            showToast('Staff updated successfully.', 'success');
          } else {
            addStaffModal.hide();
            document.getElementById('credUsername').textContent = data.username;
            document.getElementById('credPassword').textContent = data.password;
            document.getElementById('successModalTitle').textContent = 'Staff Added Successfully';
            successModal.show();
            appendStaffRow(data.staff);
            updateStaffCount(1);
          }
        } else {
          if (typeof data.errors === 'string') {
            errorsDiv.textContent = data.errors;
            errorsDiv.classList.remove('d-none');
          } else if (typeof data.errors === 'object') {
            var fields = {
              full_name: 'id_full_name',
              email: 'id_email',
              phone_number: 'id_phone_number',
              cnic: 'id_cnic',
              date_of_birth: 'id_date_of_birth',
              gender: 'id_gender',
              address: 'id_address',
              assigned_center: 'id_assigned_center',
              profile_picture: 'id_profile_picture',
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
            if (errorsDiv.textContent.trim()) {
              errorsDiv.classList.remove('d-none');
            }
            if (firstError) firstError.focus();
          }
        }
      } else {
        showToast('Server error. Please try again.', 'danger');
      }
    };

    xhr.onerror = function () {
      btn.disabled = false;
      btnText.textContent = originalText;
      spinner.classList.add('d-none');
      showToast('Network error. Please try again.', 'danger');
    };

    xhr.send(formData);
  });

  /* ---- Append row to table (after add) ---- */
  function appendStaffRow(staff) {
    if (!tableBody) return;
    var emptyRow = tableBody.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();

    var tr = document.createElement('tr');
    tr.setAttribute('data-id', staff.id);

    var initials = (staff.full_name || 'S').charAt(0).toUpperCase();

    tr.innerHTML =
      '<td><div class="sm-name-cell">' +
      (staff.profile_photo_url
        ? '<img src="' + staff.profile_photo_url + '" alt="' + staff.full_name + '" class="sm-avatar-img" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'
        : '<span class="sm-avatar" style="background:#E3F3EC;color:#1F5C40;">' + initials + '</span>') +
      '</div></td>' +
      '<td><span class="sm-name">' + escapeHtml(staff.full_name) + '</span></td>' +
      '<td class="sm-cell-muted">' + escapeHtml(staff.username) + '</td>' +
      '<td class="sm-cell-muted">' + escapeHtml(staff.email) + '</td>' +
      '<td class="sm-cell-muted">' + escapeHtml(staff.phone) + '</td>' +
      '<td><span class="sm-center-tag">' + escapeHtml(staff.center) + '</span></td>' +
      '<td><span class="sm-badge sm-badge-active"><i class="bi bi-circle-fill"></i> Active</span></td>' +
      '<td class="sm-actions-cell">' +
      '<button class="sm-action-btn sm-action-edit" data-action="edit" title="Edit" aria-label="Edit ' + escapeHtml(staff.full_name) + '"><i class="bi bi-pencil"></i></button>' +
      '<button class="sm-action-btn sm-action-delete" data-action="delete" title="Delete" aria-label="Delete ' + escapeHtml(staff.full_name) + '"><i class="bi bi-trash"></i></button>' +
      '</td>';

    tableBody.appendChild(tr);
  }

  /* ---- Update existing row (after edit) ---- */
  function updateStaffRow(staffId, staff) {
    if (!tableBody) return;
    var row = tableBody.querySelector('tr[data-id="' + staffId + '"]');
    if (!row) return;

    var initials = (staff.full_name || 'S').charAt(0).toUpperCase();
    var photoHtml = staff.profile_photo_url
      ? '<img src="' + staff.profile_photo_url + '" alt="' + staff.full_name + '" class="sm-avatar-img" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'
      : '<span class="sm-avatar" style="background:#E3F3EC;color:#1F5C40;">' + initials + '</span>';

    row.children[0].innerHTML = '<div class="sm-name-cell">' + photoHtml + '</div>';
    row.children[1].innerHTML = '<span class="sm-name">' + escapeHtml(staff.full_name) + '</span>';
    row.children[2].textContent = staff.username || '';
    row.children[3].textContent = staff.email || '';
    row.children[4].textContent = staff.phone || '';
    row.children[5].innerHTML = '<span class="sm-center-tag">' + escapeHtml(staff.center) + '</span>';
    row.children[7].querySelector('[data-action="edit"]').setAttribute('aria-label', 'Edit ' + staff.full_name);
    row.children[7].querySelector('[data-action="delete"]').setAttribute('aria-label', 'Delete ' + staff.full_name);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function updateStaffCount(delta) {
    var countEl = document.querySelector('.sm-footer-info');
    if (!countEl) return;
    var match = countEl.textContent.match(/of (\d+) staff/);
    var current = match ? parseInt(match[1], 10) : 0;
    var newTotal = current + delta;
    countEl.textContent = 'Showing ' + newTotal + ' of ' + newTotal + ' staff members';
  }

  /* ---- Copy credentials ---- */
  document.getElementById('copyCredBtn').addEventListener('click', function () {
    var username = document.getElementById('credUsername').textContent;
    var password = document.getElementById('credPassword').textContent;
    var copyText = 'Username: ' + username + '\nPassword: ' + password;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).then(function () {
        showToast('Credentials copied to clipboard.', 'success');
      }).catch(function () {
        fallbackCopy(copyText);
      });
    } else {
      fallbackCopy(copyText);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Credentials copied to clipboard.', 'success');
    } catch (e) {
      showToast('Failed to copy credentials.', 'danger');
    }
    document.body.removeChild(ta);
  }

  /* ---- Reset on modal close ---- */
  addStaffModalEl.addEventListener('hidden.bs.modal', function () {
    resetForm();
  });

  /* ---- Reset delete modal on close ---- */
  deleteConfirmModalEl.addEventListener('hidden.bs.modal', function () {
    document.getElementById('deleteStaffId').value = '';
    document.getElementById('deleteStaffName').textContent = 'this staff member';
    document.getElementById('confirmDeleteBtn').disabled = false;
    document.getElementById('deleteBtnText').textContent = 'Delete';
    document.getElementById('deleteBtnSpinner').classList.add('d-none');
  });

})();
