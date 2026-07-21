(function () {
  'use strict';

  const searchInput = document.getElementById('attendanceSearch');
  const filterForm = document.getElementById('attendanceFilterForm');
  const dateRangeInput = document.getElementById('dateRangeInput');
  const customDateRow = document.getElementById('customDateRow');
  const tableBody = document.querySelector('#attendanceTable tbody');
  const refreshIndicator = document.getElementById('refreshIndicator');

  let refreshInterval = null;

  // --- Date chips ---
  document.querySelectorAll('.am-chip[data-date]').forEach(chip => {
    chip.addEventListener('click', function () {
      const date = this.getAttribute('data-date');
      dateRangeInput.value = date;
      if (date === 'custom') {
        if (customDateRow) customDateRow.style.display = 'flex';
      } else {
        if (customDateRow) customDateRow.style.display = 'none';
        filterForm.submit();
      }
    });
  });

  // --- Custom range inputs trigger auto-submit if both filled ---
  if (customDateRow) {
    customDateRow.querySelectorAll('input[type="date"]').forEach(input => {
      input.addEventListener('change', function () {
        const from = customDateRow.querySelector('input[name="date_from"]').value;
        const to = customDateRow.querySelector('input[name="date_to"]').value;
        if (from && to) filterForm.submit();
      });
    });
  }

  // --- View Detail modal ---
  const detailModal = new bootstrap.Modal(document.getElementById('attendanceDetailModal'));

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.view-detail-btn');
    if (!btn) return;
    const profileId = btn.getAttribute('data-profile-id');
    if (!profileId) return;

    const body = document.getElementById('detailModalBody');
    body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div><p class="mt-2 text-muted">Loading details...</p></div>`;
    detailModal.show();

    fetch(`/panel/attendance/${profileId}/detail/`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          body.innerHTML = `<div class="alert alert-danger m-3">${data.error}</div>`;
          return;
        }
        body.innerHTML = buildDetailHTML(data);
      })
      .catch(() => {
        body.innerHTML = `<div class="alert alert-danger m-3">Failed to load details.</div>`;
      });
  });

  function buildDetailHTML(d) {
    const p = d.profile;
    const a = d.attendance;
    const eCount = d.emergency_alerts_today || 0;
    const hasEmergency = eCount > 0;

    let photoHtml = '';
    if (p.profile_photo) {
      photoHtml = `<img src="${p.profile_photo}" alt="Photo" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--green-200);">`;
    } else {
      const initial = (p.full_name || p.username || '?')[0].toUpperCase();
      photoHtml = `<div style="width:90px;height:90px;border-radius:50%;background:#E3F3EC;color:#1F5C40;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:600;border:3px solid var(--green-200);">${initial}</div>`;
    }

    let statusBadge = '';
    let statusIcon = '';
    let statusColor = '';
    if (a && a.status === 'Present') {
      statusBadge = 'Present';
      statusIcon = 'bi-check-circle-fill';
      statusColor = '#22C55E';
    } else if (a && a.status === 'Late') {
      statusBadge = 'Late';
      statusIcon = 'bi-clock-fill';
      statusColor = '#F97316';
    } else if (a && a.status === 'Leave') {
      statusBadge = 'Leave';
      statusIcon = 'bi-file-text';
      statusColor = '#6B7280';
    } else {
      statusBadge = 'Absent';
      statusIcon = 'bi-x-circle-fill';
      statusColor = '#EF4444';
    }

    const checkIn = a && a.check_in_time ? a.check_in_time : '--:-- --';
    const checkOut = a && a.check_out_time ? a.check_out_time : '--:-- --';
    const hours = a && a.working_hours ? a.working_hours : '--';

    const gpsVerified = a && a.gps_verified;
    const phone = p.phone || '--';
    const cnic = p.cnic || '--';
    const centerName = p.center || '--';
    const districtName = p.district || '--';
    const dob = p.dob || '--';
    const gender = p.gender || '--';
    const employeeId = p.employee_id || '--';

    return `
      <div class="row g-4">
        <div class="col-md-4 text-center">
          ${photoHtml}
          <h5 class="mt-3 mb-1 fw-semibold">${p.full_name || p.username}</h5>
          <p class="text-muted small mb-2">${p.email || ''}</p>
          <span class="am-badge am-badge-${a && a.status === 'Present' ? 'green' : a && a.status === 'Late' ? 'orange' : 'red'}" style="font-size:0.85rem;">
            <i class="bi ${statusIcon} me-1"></i>${statusBadge}
          </span>
          ${hasEmergency ? `<span class="am-badge am-badge-red ms-1" style="font-size:0.85rem;"><i class="bi bi-exclamation-triangle-fill me-1"></i>${eCount} Alert${eCount > 1 ? 's' : ''}</span>` : ''}
        </div>
        <div class="col-md-8">
          <div class="row g-3">
            <div class="col-6"><label class="text-muted small mb-1">Employee ID</label><div class="fw-medium">${employeeId}</div></div>
            <div class="col-6"><label class="text-muted small mb-1">CNIC</label><div class="fw-medium">${cnic}</div></div>
            <div class="col-6"><label class="text-muted small mb-1">Phone</label><div class="fw-medium">${phone}</div></div>
            <div class="col-6"><label class="text-muted small mb-1">Gender / DOB</label><div class="fw-medium">${gender} / ${dob}</div></div>
            <div class="col-6"><label class="text-muted small mb-1">Education Center</label><div class="fw-medium">${centerName}</div></div>
            <div class="col-6"><label class="text-muted small mb-1">District</label><div class="fw-medium">${districtName}</div></div>
            <div class="col-12"><hr class="my-2"></div>
            <div class="col-4"><label class="text-muted small mb-1">Check-in Time</label><div class="fw-medium">${checkIn}</div></div>
            <div class="col-4"><label class="text-muted small mb-1">Check-out Time</label><div class="fw-medium">${checkOut}</div></div>
            <div class="col-4"><label class="text-muted small mb-1">Working Hours</label><div class="fw-medium">${hours}</div></div>
            <div class="col-6"><label class="text-muted small mb-1">GPS Verified</label><div class="fw-medium">${gpsVerified ? '<span class="am-gps-badge am-gps-verified"><i class="bi bi-check-circle-fill"></i> Verified</span>' : '<span class="am-gps-badge am-gps-unverified"><i class="bi bi-x-circle-fill"></i> Not Verified</span>'}</div></div>
            ${hasEmergency ? `<div class="col-6"><label class="text-muted small mb-1">Today's Emergencies</label><div class="fw-medium"><a href="#" onclick="event.preventDefault();document.getElementById('attendanceDetailModal').querySelector('.btn-close').click();setTimeout(function(){var m=new bootstrap.Modal(document.getElementById('emergencyAlertsModal'));m.show();fetch('/panel/alerts/json/?staff_id=${p.id}&date=today').then(r=>r.json()).then(d=>{var b=document.getElementById('emergencyAlertsBody');if(d.error){b.innerHTML='<div class=\\\\'alert alert-danger m-3\\\\'>'+d.error+'</div>';return;}b.innerHTML=buildEmergencyList(d);}).catch(()=>{document.getElementById('emergencyAlertsBody').innerHTML='<div class=\\\\'alert alert-danger m-3\\\\'>Failed to load.</div>';});},300);" style="color:var(--red-500);text-decoration:none;"><i class="bi bi-exclamation-triangle-fill me-1"></i>View ${eCount} Alert${eCount > 1 ? 's' : ''}</a></div></div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  window.buildEmergencyList = function (data) {
    if (!data.alerts || data.alerts.length === 0) {
      return '<div class="text-center py-5 text-muted"><i class="bi bi-check-circle fs-1 d-block mb-3"></i><h6>No emergency alerts today.</h6></div>';
    }
    let html = '<div class="table-responsive"><table class="am-table"><thead><tr><th>Time</th><th>Type</th><th>Message</th><th>Status</th></tr></thead><tbody>';
    data.alerts.forEach(function (alert) {
      const statusClass = alert.status === 'Resolved' ? 'am-badge-green' : alert.status === 'In Progress' ? 'am-badge-orange' : 'am-badge-red';
      html += '<tr><td>' + (alert.created_at || '') + '</td><td>' + (alert.alert_type || 'Emergency') + '</td><td>' + (alert.alert_message || '') + '</td><td><span class="am-badge ' + statusClass + '">' + (alert.status || 'Pending') + '</span></td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  };

  // --- Auto-refresh ---
  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(function () {
      const params = new URLSearchParams(window.location.search);
      fetch(`/panel/attendance/json/?${params.toString()}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) return;
          updateStats(data);
          updateTable(data);
        })
        .catch(() => {});
    }, 30000);
  }

  function updateStats(data) {
    const stats = data.stats || {};
    const statEls = document.querySelectorAll('.stat-value');
    if (statEls.length >= 4) {
      statEls[0].textContent = stats.total_staff || '0';
      statEls[1].textContent = stats.present_today || '0';
      statEls[2].textContent = stats.absent_today || '0';
      statEls[3].textContent = stats.emergency_count || '0';
    }
    const subEls = document.querySelectorAll('.stat-subtitle');
    if (subEls.length >= 2) {
      subEls[0].textContent = (stats.attendance_rate || '--') + ' attendance rate';
      subEls[1].textContent = (stats.absent_rate || '--') + ' absent rate';
    }
  }

  function updateTable(data) {
    if (!tableBody) return;
    const rows = data.rows || [];
    if (rows.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="12" class="text-center py-5 text-muted empty-state-cell">' +
        '<i class="bi bi-calendar-check fs-1 d-block mb-3"></i>' +
        '<h6 class="fw-semibold mb-1" style="color:var(--gray-600);">No attendance records found.</h6>' +
        '<p class="mb-0" style="color:var(--gray-500);font-size:0.85rem;">Attendance records will appear here once staff members check in.</p></td></tr>';
      return;
    }
    let html = '';
    rows.forEach(function (row) {
      const p = row.profile;
      const a = row.attendance;
      const s = row.status;

      let photo = '';
      if (p.profile_photo) {
        photo = `<img src="${p.profile_photo}" alt="Photo">`;
      } else {
        const initial = (p.full_name || p.username || '?')[0].toUpperCase();
        photo = `<div class="am-avatar-placeholder">${initial}</div>`;
      }

      const checkIn = a && a.check_in_time ? a.check_in_time : '--:-- --';
      const checkOut = a && a.check_out_time ? a.check_out_time : '--:-- --';
      const hours = a && a.working_hours ? a.working_hours : '--';

      let statusBadge = '';
      if (s === 'Present') statusBadge = '<span class="am-badge am-badge-green"><i class="bi bi-check-circle-fill me-1"></i>Present</span>';
      else if (s === 'Late') statusBadge = '<span class="am-badge am-badge-orange"><i class="bi bi-clock-fill me-1"></i>Late</span>';
      else if (s === 'Leave') statusBadge = '<span class="am-badge am-badge-gray"><i class="bi bi-file-text me-1"></i>Leave</span>';
      else statusBadge = '<span class="am-badge am-badge-red"><i class="bi bi-x-circle-fill me-1"></i>Absent</span>';

      const gpsVerified = a && a.gps_verified;
      const gpsHtml = gpsVerified
        ? '<span class="am-gps-badge am-gps-verified" title="GPS Verified"><i class="bi bi-geo-alt-fill"></i></span>'
        : '<span class="am-gps-badge am-gps-unverified" title="GPS Not Verified"><i class="bi bi-geo-alt-fill"></i></span>';

      const v = a ? a.verification_status : '--';
      let verHtml = '';
      if (v === 'Verified') {
        verHtml = '<span class="am-gps-badge am-gps-verified" title="Face Verified"><i class="bi bi-shield-fill-check" style="color:#22C55E"></i></span>';
      } else if (v === 'Failed') {
        verHtml = '<span class="am-gps-badge am-gps-unverified" title="Verification Failed"><i class="bi bi-shield-fill-x" style="color:#EF4444"></i></span>';
      } else {
        verHtml = '<span class="am-gps-badge am-gps-unverified" title="Not Verified"><i class="bi bi-shield" style="color:#9CA3AF"></i></span>';
      }

      const centerName = p.center || '-';
      const districtName = p.district || '-';

      html += `<tr class="attendance-row" data-profile-id="${p.id}">
        <td><div class="am-avatar">${photo}</div></td>
        <td><span class="am-teacher-name">${p.full_name || p.username}</span></td>
        <td><span class="am-empid">${p.employee_id || ''}</span></td>
        <td>${centerName}</td>
        <td>${districtName}</td>
        <td><span class="am-time">${checkIn}</span></td>
        <td><span class="am-time">${checkOut}</span></td>
        <td><span class="am-hours">${hours}</span></td>
        <td>${statusBadge}</td>
        <td>${gpsHtml}</td>
        <td>${verHtml}</td>
        <td><button type="button" class="am-btn-icon view-detail-btn" data-profile-id="${p.id}" title="View Details"><i class="bi bi-eye-fill"></i></button></td>
      </tr>`;
    });
    tableBody.innerHTML = html;
  }

  startAutoRefresh();

})();
