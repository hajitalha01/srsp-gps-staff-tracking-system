/**
 * Profile & Settings — JavaScript
 */

(function () {
  'use strict';

  /* ---------- Update Profile ---------- */
  const updateProfileBtn = document.querySelector('.pf-btn-primary');
  if (updateProfileBtn) {
    updateProfileBtn.addEventListener('click', function () {
      showToast('Profile updated successfully', '#52B788');
    });
  }

  /* ---------- Update Password ---------- */
  const updatePasswordBtn = document.querySelector('.pf-btn-blue');
  if (updatePasswordBtn) {
    updatePasswordBtn.addEventListener('click', function () {
      const inputs = document.querySelectorAll('.pf-form-col input[type="password"]');
      let allFilled = true;
      inputs.forEach(function (inp) {
        if (!inp.value.trim()) allFilled = false;
      });
      if (!allFilled) {
        showToast('Please fill in all password fields', '#EF4444');
        return;
      }
      if (inputs[1].value !== inputs[2].value) {
        showToast('New passwords do not match', '#EF4444');
        return;
      }
      showToast('Password updated successfully', '#3B82F6');
    });
  }

  /* ---------- Change Photo ---------- */
  const changePhotoBtn = document.querySelector('.pf-btn-outline');
  const cameraOverlay = document.querySelector('.pf-camera-overlay');

  function triggerPhotoUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 2 * 1024 * 1024) {
          showToast('File too large. Max 2MB allowed.', '#EF4444');
          return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
          const avatar = document.querySelector('.pf-avatar');
          if (avatar) {
            avatar.innerHTML = '<img src="' + e.target.result + '" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
          }
          showToast('Profile photo updated', '#52B788');
        };
        reader.readAsDataURL(file);
      }
    });
    input.click();
  }

  if (changePhotoBtn) {
    changePhotoBtn.addEventListener('click', triggerPhotoUpload);
  }
  if (cameraOverlay) {
    cameraOverlay.addEventListener('click', triggerPhotoUpload);
  }

  /* ---------- toast helper ---------- */
  function showToast(msg, color) {
    const existing = document.querySelector('.pf-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'pf-toast';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: color || '#1F2937',
      color: '#fff',
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
