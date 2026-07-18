/* ============================================================
   Admin Dashboard JS — NGO Staff Tracking System
   ============================================================ */

(function () {
  'use strict';

  // ----- 1. Display current date in the date picker -----
  function updateDate() {
    var el = document.getElementById('currentDate');
    if (!el) return;

    var now = new Date();
    var options = { year: 'numeric', month: 'short', day: 'numeric' };
    el.textContent = now.toLocaleDateString('en-US', options);
  }

  // ----- 2. Sidebar toggle (mobile/tablet) -----
  function initSidebarToggle() {
    var toggleBtn = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');

    if (!toggleBtn || !sidebar || !overlay) return;

    function openSidebar() {
      sidebar.classList.add('show');
      overlay.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (sidebar.classList.contains('show')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    overlay.addEventListener('click', closeSidebar);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('show')) {
        closeSidebar();
      }
    });

    // Close sidebar when a nav link is clicked (mobile)
    var navLinks = sidebar.querySelectorAll('.nav-link');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth < 992) {
          closeSidebar();
        }
      });
    });
  }

  // ----- 3. Initialize on DOM ready -----
  document.addEventListener('DOMContentLoaded', function () {
    updateDate();
    initSidebarToggle();
  });
})();
