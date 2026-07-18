/**
 * Notifications — JavaScript
 */

(function () {
  'use strict';

  /* ---------- row click shows toast ---------- */
  document.querySelectorAll('.nt-row').forEach(function (row) {
    row.addEventListener('click', function () {
      const type = this.querySelector('.nt-type').textContent;
      const msg = this.querySelector('.nt-message').textContent;
      showToast(type + ': ' + msg);
    });
  });

  /* ---------- toast helper ---------- */
  function showToast(msg) {
    const existing = document.querySelector('.nt-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'nt-toast';
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
      maxWidth: '360px',
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
