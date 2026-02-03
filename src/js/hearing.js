// Step1: ヒアリング
(() => {
    const state = {
        questions: [],
        answers: {},
        currentIndex: 0,
        onComplete: null,
        greeting: '',
        summaryMessage: '',
        pendingSelections: new Set(),
        selectedRoom: null,
    };

    const chatEl = document.getElementById('hearing-chat');
    const choicesEl = document.getElementById('hearing-choices');
    const nextBtn = document.getElementById('hearing-next-btn');
    const roomGallery = document.getElementById('room-gallery');
    const roomUpload = document.getElementById('room-upload');
    const submitBtn = document.getElementById('hearing-submit-btn');

    const ROOM_IMAGES = [
        { id: 'room1', path: '/images/rooms/スクリーンショット 2026-02-03 14.40.07.png', name: 'リビングルーム 1' },
        { id: 'room2', path: '/images/rooms/スクリーンショット 2026-02-03 14.40.18.png', name: 'リビングルーム 2' },
        { id: 'room3', path: '/images/rooms/スクリーンショット 2026-02-03 14.40.25.png', name: 'リビングルーム 3' }
    ];

    function initHearing({ onComplete } = {}) {
        state.onComplete = onComplete || null;
        resetState();
        fetchQuestions()
            .then(() => {
                if (state.greeting) {
                    renderBotMessage(state.greeting);
                }
                renderQuestion();
            })
            .catch(err => {
                renderBotMessage(`質問データの取得に失敗しました: ${err.message}`);
                const notice = document.createElement('div');
                notice.className = 'notice';
                notice.textContent = 'サーバーが起動しているか確認してください。';
                chatEl.appendChild(notice);
            });

        nextBtn.addEventListener('click', () => {
            commitMultiAnswer();
        });

        submitBtn.addEventListener('click', () => {
            if (typeof state.onComplete === 'function') {
                state.onComplete({ ...state.answers }, state.selectedRoom);
            }
        });

        if (roomGallery) {
            const roomSection = roomGallery.closest('.room-selection');
            if (roomSection) roomSection.classList.remove('is-visible');
        }
    }

    function resetState() {
        state.currentIndex = 0;
        state.answers = {};
        state.pendingSelections = new Set();
        state.selectedRoom = null;
        chatEl.innerHTML = '';
        choicesEl.innerHTML = '';
        nextBtn.disabled = true;
        submitBtn.disabled = true;
    }

    async function fetchQuestions() {
        if (window.debugMode) {
            throw new Error('デバッグモード: 質問取得エラー');
        }
        const response = await fetch('/api/hearing/questions');
        if (!response.ok) {
            throw new Error('質問データの取得に失敗しました');
        }
        const data = await response.json();
        state.questions = data.questions || [];
        state.greeting = data.greeting || '';
        state.summaryMessage = data.summary_message || '';
        return state.questions;
    }

    function renderBotMessage(text) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble bot';
        bubble.textContent = text;
        chatEl.appendChild(bubble);
        chatEl.scrollTop = chatEl.scrollHeight;
    }

    function renderUserMessage(text) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble user';
        bubble.textContent = text;
        chatEl.appendChild(bubble);
        chatEl.scrollTop = chatEl.scrollHeight;
    }

    function renderQuestion() {
        const question = state.questions[state.currentIndex];
        if (!question) {
            renderSummary();
            return;
        }
        renderBotMessage(question.text);
        renderChoices(question);
    }

    function renderChoices(question) {
        choicesEl.innerHTML = '';
        nextBtn.disabled = true;
        state.pendingSelections = new Set();

        question.options.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'choice-btn';
            button.textContent = option.label;
            button.addEventListener('click', () => {
                handleAnswer(question, option, button);
            });
            choicesEl.appendChild(button);
        });

        if (question.type === 'multi_select') {
            nextBtn.disabled = true;
        } else {
            nextBtn.disabled = true;
        }
    }

    function handleAnswer(question, option, button) {
        if (question.type === 'single_select') {
            state.answers[question.id] = option.value;
            renderUserMessage(option.label);
            nextQuestion();
            return;
        }

        // multi_select
        if (state.pendingSelections.has(option.value)) {
            state.pendingSelections.delete(option.value);
            button.classList.remove('is-selected');
        } else {
            const max = question.max_selections ?? question.max ?? null;
            if (max && state.pendingSelections.size >= max) return;
            state.pendingSelections.add(option.value);
            button.classList.add('is-selected');
        }
        nextBtn.disabled = state.pendingSelections.size === 0;
    }

    function commitMultiAnswer() {
        const question = state.questions[state.currentIndex];
        if (!question || question.type !== 'multi_select') return;

        const selected = Array.from(state.pendingSelections);
        if (selected.length === 0) return;

        const labels = question.options
            .filter(opt => selected.includes(opt.value))
            .map(opt => opt.label);
        state.answers[question.id] = selected;
        renderUserMessage(labels.join(' / '));
        nextQuestion();
    }

    function nextQuestion() {
        choicesEl.innerHTML = '';
        nextBtn.disabled = true;
        state.currentIndex += 1;
        renderQuestion();
    }

    function renderSummary() {
        if (state.summaryMessage) {
            renderBotMessage(state.summaryMessage);
        }
        renderRoomSelection();
        updateSubmitButton();
    }

    function renderRoomSelection() {
        if (!roomGallery || !roomUpload) return;
        const roomSection = roomGallery.closest('.room-selection');
        if (roomSection) roomSection.classList.add('is-visible');
        roomUpload.innerHTML = '';
        roomGallery.innerHTML = '';
        roomUpload.appendChild(createUploadCard());
        ROOM_IMAGES.forEach(room => {
            const item = createGalleryItem(room);
            roomGallery.appendChild(item);
        });
    }

    function createUploadCard() {
        const div = document.createElement('div');
        div.className = 'gallery-item upload-card';

        const label = document.createElement('div');
        label.className = 'upload-label';
        label.innerHTML = '<span class="upload-icon">+</span><span>部屋の写真を<br>アップロード</span>';

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp';
        input.style.display = 'none';

        div.appendChild(label);
        div.appendChild(input);

        div.addEventListener('click', () => input.click());
        input.addEventListener('change', (e) => {
            handleRoomUpload(e.target.files[0]);
            input.value = '';
        });

        return div;
    }

    async function handleRoomUpload(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('roomImage', file);

        try {
            if (window.debugMode) {
                throw new Error('デバッグモード: アップロードエラー');
            }
            const response = await fetch('/api/upload-room', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'アップロードに失敗しました');
            }

            const imageData = await response.json();
            const existingPreview = roomGallery.querySelector('[data-id="uploaded-preview"]');
            const previewItem = existingPreview || createGalleryItem({
                ...imageData,
                id: 'uploaded-preview',
                name: 'アップロード画像',
            });
            previewItem.dataset.id = 'uploaded-preview';
            if (!existingPreview) {
                roomGallery.prepend(previewItem);
            }
            selectRoom(imageData, previewItem);
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert(`アップロードに失敗しました: ${error.message}`);
            const notice = document.createElement('div');
            notice.className = 'notice';
            notice.textContent = 'アップロードに失敗しました。別の画像をお試しください。';
            roomGallery.prepend(notice);
        }
    }

    function createGalleryItem(imageData) {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.dataset.id = imageData.id;

        const img = document.createElement('img');
        img.src = imageData.path;
        img.alt = imageData.name;

        img.onerror = () => {
            img.src = `https://via.placeholder.com/200x200?text=${encodeURIComponent(imageData.name)}`;
        };

        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = imageData.name;

        div.appendChild(img);
        div.appendChild(label);

        div.addEventListener('click', () => selectRoom(imageData, div));

        return div;
    }

    function selectRoom(imageData, element) {
        roomGallery.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('selected');
        });
        roomUpload.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('selected');
        });
        if (element) {
            element.classList.add('selected');
        }
        state.selectedRoom = imageData;
        updateSubmitButton();
    }

    function updateSubmitButton() {
        submitBtn.disabled = !(isHearingComplete() && state.selectedRoom);
    }

    function isHearingComplete() {
        return state.currentIndex >= state.questions.length;
    }

    window.initHearing = initHearing;
})();
