(function () {
  'use strict';

  // --- live date/time in header ---
  function updateDateTime() {
    var el = document.getElementById('rpCurrentDateTime');
    if (!el) return;
    var now = new Date();
    var opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    el.textContent = now.toLocaleDateString('en-US', opts);
  }
  updateDateTime();
  setInterval(updateDateTime, 30000);

  // --- Charts ---
  function initCharts() {
    var el = document.getElementById('chartData');
    if (!el) return;
    var data;
    try { data = JSON.parse(el.textContent); } catch (e) { return; }

    var colors = {
      green: '#22C55E',
      red: '#EF4444',
      blue: '#3B82F6',
      orange: '#F97316',
      purple: '#8B5CF6',
      gray: '#6B7280',
      lightGreen: '#DCFCE7',
      lightRed: '#FEE2E2',
      lightBlue: '#DBEAFE',
    };

    // 1. Monthly Attendance Trend (Line)
    var ctx1 = document.getElementById('chartMonthlyTrend');
    if (ctx1 && data.monthly && data.monthly.length) {
      new Chart(ctx1, {
        type: 'line',
        data: {
          labels: data.monthly.map(function (m) { return m.month; }),
          datasets: [
            { label: 'Present', data: data.monthly.map(function (m) { return m.present; }), borderColor: colors.green, backgroundColor: colors.green + '33', tension: 0.3, fill: true },
            { label: 'Absent', data: data.monthly.map(function (m) { return m.absent; }), borderColor: colors.red, backgroundColor: colors.red + '33', tension: 0.3, fill: true },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, grid: { color: '#F3F4F6' } }, x: { grid: { display: false } } } },
      });
    }

    // 2. Present vs Absent (Pie)
    var ctx2 = document.getElementById('chartPie');
    if (ctx2) {
      new Chart(ctx2, {
        type: 'pie',
        data: {
          labels: ['Present', 'Absent'],
          datasets: [{ data: [data.piePresent, data.pieAbsent], backgroundColor: [colors.green, colors.red], borderWidth: 0 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } },
      });
    }

    // 3. Center-wise Staff Distribution (Bar)
    var ctx3 = document.getElementById('chartCenterStaff');
    if (ctx3 && data.centerStaff && data.centerStaff.length) {
      new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: data.centerStaff.map(function (c) { return c.center; }),
          datasets: [{ label: 'Staff', data: data.centerStaff.map(function (c) { return c.count; }), backgroundColor: colors.green + '99', borderColor: colors.green, borderWidth: 1, borderRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F3F4F6' } }, x: { grid: { display: false } } } },
      });
    }

    // 4. District-wise Staff (Bar)
    var ctx4 = document.getElementById('chartDistrictStaff');
    if (ctx4 && data.districtStaff && data.districtStaff.length) {
      new Chart(ctx4, {
        type: 'bar',
        data: {
          labels: data.districtStaff.map(function (d) { return d.district; }),
          datasets: [{ label: 'Staff', data: data.districtStaff.map(function (d) { return d.count; }), backgroundColor: colors.blue + '99', borderColor: colors.blue, borderWidth: 1, borderRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F3F4F6' } }, x: { grid: { display: false } } } },
      });
    }

    // 5. Emergency Alerts Trend (Line)
    var ctx5 = document.getElementById('chartEmgTrend');
    if (ctx5 && data.emgTrend && data.emgTrend.length) {
      new Chart(ctx5, {
        type: 'line',
        data: {
          labels: data.emgTrend.map(function (e) { return e.date; }),
          datasets: [{ label: 'Alerts', data: data.emgTrend.map(function (e) { return e.count; }), borderColor: colors.red, backgroundColor: colors.red + '33', tension: 0.3, fill: true, pointBackgroundColor: colors.red }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#F3F4F6' } }, x: { grid: { display: false } } } },
      });
    }

    // 6. Attendance % by Center (Horizontal Bar)
    var ctx6 = document.getElementById('chartAttByCenter');
    if (ctx6 && data.attByCenter && data.attByCenter.length) {
      new Chart(ctx6, {
        type: 'bar',
        data: {
          labels: data.attByCenter.map(function (a) { return a.center; }),
          datasets: [{ label: 'Attendance %', data: data.attByCenter.map(function (a) { return a.pct; }), backgroundColor: colors.purple + '99', borderColor: colors.purple, borderWidth: 1, borderRadius: 4 }],
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100, grid: { color: '#F3F4F6' } }, y: { grid: { display: false } } } },
      });
    }
  }

  initCharts();

  // --- Search via filter form ---
  var searchInput = document.getElementById('reportSearch');
  var filterForm = document.getElementById('reportFilterForm');
  var filterSearchInput = document.getElementById('filterSearchInput');
  if (searchInput && filterForm && filterSearchInput) {
    var searchTimeout;
    searchInput.addEventListener('input', function () {
      filterSearchInput.value = searchInput.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        filterForm.submit();
      }, 500);
    });
  }

  // --- Row highlight on click ---
  var table = document.getElementById('reportsTable');
  if (table) {
    table.querySelectorAll('tbody tr').forEach(function (row) {
      row.addEventListener('click', function () {
        table.querySelectorAll('tbody tr').forEach(function (r) { r.style.background = ''; });
        row.style.background = '#F0FDF4';
      });
    });
  }

})();
