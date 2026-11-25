/**
 * Room Service Complaint Reporter - Interactive Frontend Logic
 * File: web-input-laporan-komplain-kamar.js
 * Integrated with Google Apps Script Web App & Offline Chrome file:// support
 */

(function () {
  'use strict';

  // Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoWIVq9IEfJwdzL87Lb3-UBKPxg_mzPeqynzPrUDaUOvkT-zX6OQVwDBvvffbQE6fqrw/exec';

  // Fallback Rooms Dataset (Ensures 100% functionality on Chrome file:/// protocol)
  const DEFAULT_ROOMS = [
    { number: 1, floor: 1, label: "Kamar 01" },
    { number: 2, floor: 1, label: "Kamar 02" },
    { number: 3, floor: 1, label: "Kamar 03" },
    { number: 4, floor: 1, label: "Kamar 04" },
    { number: 5, floor: 1, label: "Kamar 05" },
    { number: 6, floor: 1, label: "Kamar 06" },
    { number: 7, floor: 1, label: "Kamar 07" },
    { number: 8, floor: 1, label: "Kamar 08" },
    { number: 9, floor: 1, label: "Kamar 09" },
    { number: 10, floor: 2, label: "Kamar 10" },
    { number: 11, floor: 2, label: "Kamar 11" },
    { number: 12, floor: 2, label: "Kamar 12" },
    { number: 13, floor: 2, label: "Kamar 13" },
    { number: 14, floor: 2, label: "Kamar 14" },
    { number: 15, floor: 2, label: "Kamar 15" },
    { number: 16, floor: 2, label: "Kamar 16" },
    { number: 17, floor: 2, label: "Kamar 17" },
    { number: 18, floor: 2, label: "Kamar 18" }
  ];

  // Application State
  const state = {
    currentRoom: 12,
    tempSelectedRoom: 12,
    selectedIssues: new Set(['lampu_mati', 'ac_panas']),
    config: null,
    roomsData: DEFAULT_ROOMS
  };

  // DOM Elements Cache (populated after DOM is ready)
  let elements = {};

  function initElements() {
    elements = {
      activeRoomText: document.getElementById('active-room-text'),
      pillRoomText: document.getElementById('pill-room-text'),
      summaryIndicatorText: document.getElementById('summary-indicator-text'),
      selectedCounterBadge: document.getElementById('selected-counter-badge'),
      btnChangeRoom: document.getElementById('btn-change-room'),
      roomModal: document.getElementById('room-modal'),
      modalBackdrop: document.getElementById('modal-backdrop'),
      btnCloseModal: document.getElementById('btn-close-modal'),
      btnConfirmRoom: document.getElementById('btn-confirm-room'),
      roomMatrix: document.getElementById('room-matrix'),
      btnSubmit: document.getElementById('btn-submit-report'),
      btnSubmitLabel: document.getElementById('btn-submit-label'),
      btnSubmitIcon: document.getElementById('btn-submit-icon'),
      toast: document.getElementById('toast-notification'),
      toastMessage: document.getElementById('toast-message'),
      tabAll: document.getElementById('tab-all'),
      tabF1: document.getElementById('tab-f1'),
      tabF2: document.getElementById('tab-f2'),
      issuesGrid: document.getElementById('issues-grid')
    };
  }

  /**
   * Load JSON Configuration safely (works both on http:// and file:///)
   */
  async function loadConfig() {
    // Only attempt fetch if running over http/https to avoid Chrome file:// CORS errors
    if (window.location.protocol.startsWith('http')) {
      try {
        const response = await fetch('./web-input-laporan-komplain-kamar.json');
        if (response.ok) {
          state.config = await response.json();
          if (state.config.rooms && state.config.rooms.length > 0) {
            state.roomsData = state.config.rooms;
          }
        }
      } catch (err) {
        // Fallback to DEFAULT_ROOMS quietly
      }
    }
    renderRoomMatrix('all');
  }

  /**
   * Parse URL Query Parameter: ?room=X
   */
  function parseRoomParam() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const rParam = urlParams.get('room');
      if (rParam) {
        const num = parseInt(rParam, 10);
        if (!isNaN(num) && num >= 1 && num <= 18) {
          state.currentRoom = num;
          state.tempSelectedRoom = num;
        }
      }
    } catch (err) {
      console.error('URL parse error:', err);
    }
  }

  /**
   * Render Room Grid Matrix (Room 01 - 18)
   */
  function renderRoomMatrix(filter = 'all') {
    if (!elements.roomMatrix) return;
    elements.roomMatrix.innerHTML = '';

    const filteredRooms = state.roomsData.filter(room => {
      if (filter === 'f1') return room.floor === 1;
      if (filter === 'f2') return room.floor === 2;
      return true;
    });

    filteredRooms.forEach(room => {
      const isCurrent = room.number === state.tempSelectedRoom;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-room-num', room.number);
      btn.className = `py-3 px-2 rounded-xl font-label-md text-label-md font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
        isCurrent
          ? 'bg-primary text-on-primary shadow-sm scale-100 ring-2 ring-primary ring-offset-2'
          : 'bg-surface-container text-on-surface hover:bg-surface-variant'
      }`;

      btn.innerHTML = `
        <span class="text-xs uppercase tracking-wider ${isCurrent ? 'opacity-80' : 'text-on-surface-variant'}">Kamar</span>
        <span class="text-base font-bold">${room.number < 10 ? '0' + room.number : room.number}</span>
      `;

      btn.addEventListener('click', () => {
        state.tempSelectedRoom = room.number;
        renderRoomMatrix(filter);
      });

      elements.roomMatrix.appendChild(btn);
    });
  }

  /**
   * Update Room Header UI
   */
  function updateRoomUI() {
    const roomFormatted = `Room ${state.currentRoom}`;
    if (elements.activeRoomText) {
      elements.activeRoomText.textContent = `Kamar aktif saat ini: ${roomFormatted}`;
    }
    if (elements.pillRoomText) {
      elements.pillRoomText.textContent = roomFormatted;
    }
    updateSummaryUI();
  }

  /**
   * Update Dynamic Reactive Counter & Indicator Text
   */
  function updateSummaryUI() {
    const count = state.selectedIssues.size;

    if (elements.selectedCounterBadge) {
      elements.selectedCounterBadge.textContent = `${count} Dipilih`;
      if (count === 0) {
        elements.selectedCounterBadge.className = 'bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-medium transition-all duration-200';
      } else {
        elements.selectedCounterBadge.className = 'bg-secondary text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-medium transition-all duration-200';
      }
    }

    if (elements.summaryIndicatorText) {
      elements.summaryIndicatorText.textContent = `${count} kendala dipilih untuk Room ${state.currentRoom}`;
    }
  }

  /**
   * Visual Card State Modifier
   */
  function setCardVisualState(card, isSelected) {
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    const iconBox = card.querySelector('.icon-box');
    const checkBox = card.querySelector('.check-box');
    const checkIcon = checkBox ? checkBox.querySelector('.material-symbols-outlined') : null;

    if (isSelected) {
      card.className = card.className.replace('bg-surface-container-lowest', 'bg-surface-container');
      if (iconBox) {
        iconBox.className = 'icon-box w-10 h-10 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm flex items-center justify-center transition-colors shrink-0';
      }
      if (checkBox) {
        checkBox.className = 'check-box w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center transition-colors shadow-sm shrink-0 ml-2';
      }
      if (checkIcon) {
        checkIcon.classList.remove('hidden');
      }
    } else {
      card.className = card.className.replace('bg-surface-container', 'bg-surface-container-lowest');
      if (iconBox) {
        iconBox.className = 'icon-box w-10 h-10 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center transition-colors shrink-0';
      }
      if (checkBox) {
        checkBox.className = 'check-box w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors shrink-0 ml-2';
      }
      if (checkIcon) {
        checkIcon.classList.add('hidden');
      }
    }
  }

  /**
   * Bind Click & Keyboard Handlers on Issue Cards
   */
  function setupIssueCards() {
    const cards = document.querySelectorAll('.issue-card');
    cards.forEach(card => {
      const issueId = card.getAttribute('data-issue-id');

      card.addEventListener('click', () => {
        const isSelected = state.selectedIssues.has(issueId);
        if (isSelected) {
          state.selectedIssues.delete(issueId);
          setCardVisualState(card, false);
        } else {
          state.selectedIssues.add(issueId);
          setCardVisualState(card, true);
        }
        updateSummaryUI();
      });

      // Accessibility: Keyboard Toggle
      card.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          card.click();
        }
      });
    });
  }

  /**
   * Modal Dialog Controls
   */
  function openModal() {
    state.tempSelectedRoom = state.currentRoom;
    renderRoomMatrix('all');
    if (elements.roomModal) {
      elements.roomModal.classList.remove('hidden');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (elements.roomModal) {
      elements.roomModal.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  function setTabStyles(activeTab) {
    [elements.tabAll, elements.tabF1, elements.tabF2].forEach(tab => {
      if (!tab) return;
      if (tab === activeTab) {
        tab.className = 'px-3 py-1 rounded-full text-label-sm font-semibold bg-primary text-on-primary';
      } else {
        tab.className = 'px-3 py-1 rounded-full text-label-sm font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-variant';
      }
    });
  }

  /**
   * Toast Notification Controller
   */
  let toastTimeout;
  function showToast(message) {
    if (!elements.toast || !elements.toastMessage) return;

    clearTimeout(toastTimeout);
    elements.toastMessage.textContent = message;
    elements.toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
    elements.toast.classList.add('opacity-100', 'translate-y-0');

    toastTimeout = setTimeout(() => {
      elements.toast.classList.remove('opacity-100', 'translate-y-0');
      elements.toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
    }, 3500);
  }

  /**
   * Send Data to Google Apps Script Web App
   */
  async function sendToGoogleAppsScript(payload) {
    try {
      // 1. Send via POST (text/plain to prevent CORS preflight blocking)
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      console.log('Data dispatched to Google Apps Script (POST mode: no-cors).');
    } catch (e) {
      console.warn('POST to Google Apps Script note:', e);
    }

    // 2. Also send via GET query parameters as fallback in case script only uses doGet
    try {
      const qParams = new URLSearchParams({
        ticket: payload.ticketCode || '',
        room: payload.room || '',
        issues: payload.issues || '',
        urgency: payload.urgency || '',
        timestamp: payload.timestamp || ''
      });
      await fetch(`${GOOGLE_SCRIPT_URL}?${qParams.toString()}`, {
        method: 'GET',
        mode: 'no-cors'
      });
      console.log('Data dispatched to Google Apps Script (GET fallback).');
    } catch (e) {
      console.warn('GET to Google Apps Script note:', e);
    }
  }

  /**
   * Submit Report Action
   */
  async function submitReport() {
    if (state.selectedIssues.size === 0) {
      showToast('⚠️ Pilih minimal 1 kendala untuk dilaporkan.');
      return;
    }

    // Button loading animation
    if (elements.btnSubmit) {
      elements.btnSubmit.disabled = true;
      if (elements.btnSubmitLabel) elements.btnSubmitLabel.textContent = 'Mengirim Laporan...';
      if (elements.btnSubmitIcon) {
        elements.btnSubmitIcon.textContent = 'progress_activity';
        elements.btnSubmitIcon.classList.add('animate-spin');
      }
    }

    const issuesArray = Array.from(state.selectedIssues);
    const issueNames = issuesArray.map(id => {
      const card = document.querySelector(`[data-issue-id="${id}"]`);
      return card ? card.getAttribute('data-issue-name') : id;
    });

    const now = new Date();
    const ticketCode = `GS-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const reportPayload = {
      ticketCode: ticketCode,
      room: String(state.currentRoom),
      category: issueNames.join(', '),
      issues: issueNames.join(', '),
      type: 'complaint',
      description: `Laporan Kamar ${state.currentRoom}: ${issueNames.join(', ')}`,
      urgency: issuesArray.includes('ac_panas') ? 'Mendesak' : 'Normal',
      preferredTime: 'Segera',
      status: 'Baru',
      timestamp: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    };

    // 1. Send to Google Apps Script (User's Spreadsheet)
    sendToGoogleAppsScript(reportPayload);

    // 2. Send to local Node.js backend if reachable
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload)
        });
      } catch (apiErr) {
        // Backend offline or local static mode
      }
    }

    // 3. Persist to localStorage
    try {
      const logs = JSON.parse(localStorage.getItem('room_service_complaints') || '[]');
      logs.push(reportPayload);
      localStorage.setItem('room_service_complaints', JSON.stringify(logs));
      localStorage.setItem('grandstay_last_ticket', ticketCode);
    } catch (storageErr) {
      console.warn('Storage note:', storageErr);
    }

    // Reset button state and show success notification
    setTimeout(() => {
      if (elements.btnSubmit) {
        elements.btnSubmit.disabled = false;
        if (elements.btnSubmitLabel) elements.btnSubmitLabel.textContent = 'Kirim Laporan Sekarang';
        if (elements.btnSubmitIcon) {
          elements.btnSubmitIcon.textContent = 'send';
          elements.btnSubmitIcon.classList.remove('animate-spin');
        }
      }

      showToast(`✓ Laporan Kamar ${state.currentRoom} (${ticketCode}) terkirim ke Google Sheets & Staf!`);
    }, 750);
  }

  /**
   * Event Listeners Registration
   */
  function registerEvents() {
    if (elements.btnChangeRoom) {
      elements.btnChangeRoom.addEventListener('click', openModal);
    }

    if (elements.btnCloseModal) {
      elements.btnCloseModal.addEventListener('click', closeModal);
    }

    if (elements.modalBackdrop) {
      elements.modalBackdrop.addEventListener('click', closeModal);
    }

    if (elements.btnConfirmRoom) {
      elements.btnConfirmRoom.addEventListener('click', () => {
        state.currentRoom = state.tempSelectedRoom;
        updateRoomUI();
        closeModal();
        showToast(`Kamar aktif diubah ke Room ${state.currentRoom}`);
      });
    }

    if (elements.tabAll) {
      elements.tabAll.addEventListener('click', () => {
        setTabStyles(elements.tabAll);
        renderRoomMatrix('all');
      });
    }

    if (elements.tabF1) {
      elements.tabF1.addEventListener('click', () => {
        setTabStyles(elements.tabF1);
        renderRoomMatrix('f1');
      });
    }

    if (elements.tabF2) {
      elements.tabF2.addEventListener('click', () => {
        setTabStyles(elements.tabF2);
        renderRoomMatrix('f2');
      });
    }

    if (elements.btnSubmit) {
      elements.btnSubmit.addEventListener('click', submitReport);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.roomModal && !elements.roomModal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  /**
   * Initialize Application
   */
  function init() {
    initElements();
    parseRoomParam();
    updateRoomUI();
    setupIssueCards();
    registerEvents();
    loadConfig();
  }

  // Execute on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose global controller
  window.RoomServiceComplaintApp = {
    state,
    submitReport,
    setRoom: (num) => {
      state.currentRoom = num;
      state.tempSelectedRoom = num;
      updateRoomUI();
    }
  };
})();
