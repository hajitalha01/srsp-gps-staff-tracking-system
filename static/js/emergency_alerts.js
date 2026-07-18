/**
 * Emergency Alerts — JavaScript
 */

(function () {
  'use strict';

  /* ---------- status filter ---------- */
  const filterSelect = document.getElementById('statusFilter');
  const alertsGrid = document.getElementById('alertsGrid');

  if (filterSelect && alertsGrid) {
    filterSelect.addEventListener('change', function () {
      const value = this.value;
      const cards = alertsGrid.querySelectorAll('.ea-card');
      let visible = 0;

      cards.forEach(function (card) {
        const status = card.getAttribute('data-status');
        if (value === 'all' || status === value) {
          card.style.display = '';
          visible++;
        } else {
          card.style.display = 'none';
        }
      });

      /* toggle empty state */
      let emptyEl = alertsGrid.querySelector('.ea-empty');
      if (visible === 0) {
        if (!emptyEl) {
          emptyEl = document.createElement('div');
          emptyEl.className = 'ea-empty';
          emptyEl.innerHTML = '<i class="bi bi-check-circle"></i><h5>No alerts found</h5><p>No emergency alerts match the selected filter.</p>';
          alertsGrid.appendChild(emptyEl);
        }
        emptyEl.style.display = '';
      } else {
        if (emptyEl) {
          emptyEl.style.display = 'none';
        }
      }
    });
  }

  /* ---------- View on Map buttons ---------- */
  document.querySelectorAll('.ea-btn-map').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const card = this.closest('.ea-card');
      const name = card ? card.querySelector('.ea-name').textContent : 'Staff';
      showToast('Opening map location for ' + name);
    });
  });

  /* ---------- toast helper ---------- */
  function showToast(msg) {
    const existing = document.querySelector('.ea-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'ea-toast';
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

})();
