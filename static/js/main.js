/* ============================================================
   SRSP Staff Tracking System — Global UI Behaviors
   ============================================================ */

(function() {
  'use strict';

  // ----- Bootstrap Tooltips -----
  document.addEventListener('DOMContentLoaded', function() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function(el) {
      new bootstrap.Tooltip(el);
    });
  });

  // ----- Sidebar Toggle (mobile) -----
  document.addEventListener('DOMContentLoaded', function() {
    var toggleBtn = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('show');
        var backdrop = document.querySelector('.sidebar-backdrop');
        if (sidebar.classList.contains('show')) {
          if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            backdrop.addEventListener('click', function() {
              sidebar.classList.remove('show');
              this.remove();
            });
            document.body.appendChild(backdrop);
          }
        } else {
          var bd = document.querySelector('.sidebar-backdrop');
          if (bd) bd.remove();
        }
      });
    }
  });

  // ----- Toast Notification Helper -----
  window.showToast = function(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;max-width:360px';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'alert alert-' + type + ' d-flex align-items-center gap-2 shadow-md';
    toast.style.cssText = 'animation: slideIn 0.3s ease; margin:0';
    var iconMap = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = '<i class="fas ' + (iconMap[type] || 'fa-bell') + '"></i> ' + message;
    container.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(function() { toast.remove(); }, 300); }, 4000);
  };

  // ----- Loading Spinner -----
  window.showSpinner = function() {
    var overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    overlay.id = 'globalSpinner';
    var spinner = document.createElement('div');
    spinner.className = 'spinner-custom';
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  };
  window.hideSpinner = function() {
    var overlay = document.getElementById('globalSpinner');
    if (overlay) overlay.remove();
  };

  // ----- Active Nav Highlighting -----
  document.addEventListener('DOMContentLoaded', function() {
    var currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && currentPath.startsWith(href) && href !== '/') {
        link.classList.add('active');
      }
    });
  });

  // ----- Keyboard shortcut: Escape closes modals -----
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var openModal = document.querySelector('.modal.show');
      if (openModal) {
        var modal = bootstrap.Modal.getInstance(openModal);
        if (modal) modal.hide();
      }
    }
  });
