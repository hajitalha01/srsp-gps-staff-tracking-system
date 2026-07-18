/**
 * Reports & Analytics — JavaScript
 */

(function () {
  'use strict';

  /* ---------- live date/time in header ---------- */
  function updateDateTime() {
    const el = document.getElementById('rpCurrentDateTime');
    if (!el) return;
    const now = new Date();
    const opts = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    el.textContent = now.toLocaleDateString('en-US', opts);
  }
  updateDateTime();
  setInterval(updateDateTime, 30000);

  /* ---------- teacher search (filter table) ---------- */
  let searchTimeout = null;
  const searchInput = document.querySelector('.rp-search-input');
  const table = document.getElementById('reportsTable');

  if (searchInput && table) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        const query = searchInput.value.toLowerCase().trim();
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(function (row) {
          const cells = row.querySelectorAll('td');
          let match = false;
          for (let i = 0; i < cells.length; i++) {
            if (cells[i].textContent.toLowerCase().includes(query)) {
              match = true;
              break;
            }
          }
          row.style.display = match ? '' : 'none';
        });
      }, 300);
    });
  }

  /* ---------- report action buttons (toast feedback) ---------- */
  function showToast(msg) {
    const existing = document.querySelector('.rp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'rp-toast';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: '#1F2937',
      color: '#F9FAFB',
      padding: '10px 20px',
      borderRadius: '10px',
      fontSize: '0.85rem',
      fontWeight: '500',
      boxShadow: '0 4px 16px rgba(0,0,0,.15)',
      zIndex: '9999',
      opacity: '0',
      transform: 'translateY(12px)',
      transition: 'opacity .3s ease, transform .3s ease',
    });
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(function () { toast.remove(); }, 350);
    }, 2500);
  }

  document.querySelectorAll('.rp-btn-pdf, .rp-btn-excel, .rp-btn-print').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.classList.contains('rp-btn-pdf')) {
        showToast('PDF report downloaded');
      } else if (btn.classList.contains('rp-btn-excel')) {
        showToast('Excel export started');
      } else if (btn.classList.contains('rp-btn-print')) {
        window.print();
      }
    });
  });

  /* ---------- row highlight on click ---------- */
  if (table) {
    table.querySelectorAll('tbody tr').forEach(function (row) {
      row.addEventListener('click', function () {
        table.querySelectorAll('tbody tr').forEach(function (r) {
          r.style.background = '';
        });
        row.style.background = '#F0FDF4';
      });
    });
  }

})();
