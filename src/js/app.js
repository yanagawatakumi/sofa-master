// アプリ全体のステップ管理
(() => {
    const state = {
        step: 1,
        hearingAnswers: {},
        selectedRoom: null,
    };

    const stepSections = Array.from(document.querySelectorAll('[data-step]'));
    const progressBar = document.getElementById('progress-bar');
    const progressLabel = document.getElementById('progress-label');

    function showStep(step) {
        state.step = step;
        stepSections.forEach(section => {
            section.classList.toggle('is-active', Number(section.dataset.step) === step);
        });
        updateProgress(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.dispatchEvent(new CustomEvent('app:step', { detail: { step } }));
    }

    function updateProgress(step) {
        const percent = Math.round((step / 2) * 100);
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressLabel) progressLabel.textContent = `Step ${step} / 2`;
    }

    function setHearingAnswers(answers) {
        state.hearingAnswers = { ...answers };
    }

    function setSelectedRoom(room) {
        state.selectedRoom = room;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const debugToggle = document.getElementById('debug-toggle');
        const storedDebug = localStorage.getItem('debugMode') === 'true';
        if (debugToggle) {
            debugToggle.checked = storedDebug;
            window.debugMode = storedDebug;
            debugToggle.addEventListener('change', () => {
                window.debugMode = debugToggle.checked;
                localStorage.setItem('debugMode', String(window.debugMode));
                document.dispatchEvent(new CustomEvent('app:debug', { detail: { enabled: window.debugMode } }));
            });
        }

        if (typeof window.initHearing === 'function') {
            window.initHearing({
                onComplete: (answers, room) => {
                    setHearingAnswers(answers);
                    setSelectedRoom(room);
                    showStep(2);
                },
            });
        }
        if (typeof window.initRecommend === 'function') {
            window.initRecommend({
                getAnswers: () => ({ ...state.hearingAnswers }),
                getSelectedRoom: () => state.selectedRoom,
                onBack: () => showStep(1),
            });
        }
        showStep(1);
    });

    window.app = {
        showStep,
        setHearingAnswers,
        setSelectedRoom,
    };
})();
