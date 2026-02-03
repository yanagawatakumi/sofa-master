// Step2: おすすめ提案
(() => {
    const state = {
        results: [],
        filters: {},
        onSelect: null,
        onBack: null,
        getAnswers: null,
        getSelectedRoom: null,
    };

    function initRecommend({ getAnswers, getSelectedRoom, onSelect, onBack } = {}) {
        state.getAnswers = getAnswers || null;
        state.getSelectedRoom = getSelectedRoom || null;
        state.onSelect = onSelect || null;
        state.onBack = onBack || null;

        const backBtn = document.getElementById('recommend-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (typeof state.onBack === 'function') state.onBack();
            });
        }

        document.addEventListener('app:step', event => {
            if (event.detail.step === 2) {
                refreshRecommend();
            }
        });
    }

    async function fetchRecommend(payload) {
        if (window.debugMode) {
            return fetchRecommendFromLocal(payload);
        }
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'おすすめ取得に失敗しました');
        }
        const data = await response.json();
        state.results = data.results || [];
        return data;
    }

    async function fetchRecommendFromLocal(payload) {
        const response = await fetch('data/sofas.json');
        if (!response.ok) {
            throw new Error('ローカルソファデータの取得に失敗しました');
        }
        const data = await response.json();
        const sofas = data.sofas || [];
        const results = sofas.slice(0, 5).map((sofa, index) => ({
            ...sofa,
            matchScore: 90 - index * 7,
        }));
        return { results, relaxed: false };
    }

    async function refreshRecommend() {
        const answers = typeof state.getAnswers === 'function' ? state.getAnswers() : {};
        const messageEl = document.getElementById('recommend-message');
        const emptyEl = document.getElementById('recommend-empty');

        try {
            const data = await fetchRecommend(answers);
            state.results = data.results || [];
            renderRecommendList(state.results);
            if (messageEl) {
                messageEl.textContent = data.relaxed ? (data.message || '近い条件の商品も表示しています') : 'おすすめソファをご覧ください。';
            }
            if (emptyEl) {
                emptyEl.style.display = state.results.length === 0 ? 'block' : 'none';
            }
        } catch (error) {
            if (messageEl) messageEl.textContent = `おすすめ取得に失敗しました: ${error.message}`;
            if (emptyEl) emptyEl.style.display = 'block';
            const listEl = document.getElementById('recommend-list');
            if (listEl) {
                listEl.innerHTML = `<div class="notice">ネットワークまたはサーバーを確認してください。</div>`;
            }
        }
    }

    function renderRecommendList(items) {
        const listEl = document.getElementById('recommend-list');
        if (!listEl) return;
        listEl.innerHTML = '';
        items.forEach(item => {
            listEl.appendChild(renderSofaCard(item));
        });
    }

    const FALLBACK_IMAGES = [
        '/images/sofas/スクリーンショット 2026-02-03 14.40.49.png',
        '/images/sofas/スクリーンショット 2026-02-03 14.41.11.png',
        '/images/sofas/スクリーンショット 2026-02-03 14.41.33.png',
    ];

    function getFallbackImage(sofa) {
        const id = sofa.id || '';
        let sum = 0;
        for (let i = 0; i < id.length; i += 1) {
            sum += id.charCodeAt(i);
        }
        const index = sum % FALLBACK_IMAGES.length;
        return FALLBACK_IMAGES[index];
    }

    function resolveComposeSofaPath(sofa, fallbackImage, mainImage) {
        let path = sofa.composition_image || mainImage || '';
        if (!path) return fallbackImage;
        if (path.startsWith('data:')) return fallbackImage;
        if (path.includes('/images/sofas/catalog/')) return fallbackImage;
        return path;
    }

    function setImageWithFallback(imgEl, src, fallback, title) {
        imgEl.onerror = () => {
            imgEl.onerror = null;
            imgEl.src = fallback || buildPlaceholderImage(title);
        };
        imgEl.src = src || fallback || buildPlaceholderImage(title);
    }

    function renderSofaCard(sofa) {
        const card = document.createElement('div');
        card.className = 'recommend-card';

        const mainImage = document.createElement('img');
        const defaultColor = sofa.colors?.[sofa.default_color_index || 0];
        mainImage.alt = sofa.name;
        const fallbackImage = getFallbackImage(sofa);
        setImageWithFallback(
            mainImage,
            defaultColor?.image_path || sofa.composition_image || '',
            fallbackImage,
            sofa.name,
        );

        const meta = document.createElement('div');
        meta.className = 'recommend-meta';

        const title = document.createElement('div');
        title.className = 'recommend-title';
        title.textContent = sofa.name;

        const sub = document.createElement('div');
        sub.className = 'recommend-sub';
        sub.textContent = `${sofa.maker} / ¥${sofa.price.toLocaleString()}`;

        const score = document.createElement('div');
        score.className = 'recommend-score';
        score.textContent = `マッチ度 ${sofa.matchScore ?? 0}%`;

        const swatches = document.createElement('div');
        swatches.className = 'swatches';
        bindColorSwatches(swatches, mainImage, sofa, fallbackImage);

        const actions = document.createElement('div');
        actions.className = 'recommend-actions-row';

        const detailBtn = document.createElement('button');
        detailBtn.className = 'secondary-btn';
        detailBtn.textContent = '詳細を見る';
        detailBtn.addEventListener('click', () => openDetailModal(sofa));

        const selectBtn = document.createElement('button');
        selectBtn.className = 'primary-btn';
        selectBtn.textContent = 'このソファで合成';
        selectBtn.addEventListener('click', () => selectSofaForCompose(sofa));

        actions.append(detailBtn, selectBtn);
        meta.append(title, sub, score, swatches, actions);
        card.append(mainImage, meta);
        return card;
    }

    function bindColorSwatches(container, mainImage, sofa, fallbackImage) {
        const colors = sofa.colors || [];
        colors.forEach((color, index) => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'swatch';
            swatch.style.background = color.hex || '#ddd';
            if (index === (sofa.default_color_index || 0)) {
                swatch.classList.add('is-active');
            }
            swatch.addEventListener('click', () => {
                setImageWithFallback(mainImage, color.image_path, fallbackImage, sofa.name);
                container.querySelectorAll('.swatch').forEach(s => s.classList.remove('is-active'));
                swatch.classList.add('is-active');
            });
            container.appendChild(swatch);
        });
    }

    function buildPlaceholderImage(title) {
        const safeTitle = (title || 'Sofa').slice(0, 18);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
                <defs>
                    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stop-color="#f1e7da"/>
                        <stop offset="100%" stop-color="#e3d2c0"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#g)"/>
                <rect x="24" y="24" width="592" height="372" fill="none" stroke="#d0bca7" stroke-width="2" rx="18"/>
                <text x="50%" y="50%" font-size="24" fill="#7b6755" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">
                    ${safeTitle}
                </text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function openDetailModal(sofa) {
        const modal = document.getElementById('sofa-modal');
        const body = document.getElementById('sofa-modal-body');
        const closeBtn = document.getElementById('sofa-modal-close');
        const backdrop = document.getElementById('sofa-modal-backdrop');
        if (!modal || !body) return;

        const angles = sofa.images?.angles || [];
        const fallbackImage = getFallbackImage(sofa);
        const mainImage = angles[0] || sofa.composition_image || sofa.colors?.[sofa.default_color_index || 0]?.image_path || fallbackImage;
        const selectedRoom = typeof state.getSelectedRoom === 'function' ? state.getSelectedRoom() : null;
        const roomImagePath = selectedRoom?.path || buildPlaceholderImage('部屋画像未選択');
        const composeSofaPath = resolveComposeSofaPath(sofa, fallbackImage, mainImage);

        body.innerHTML = `
            <h3 id="sofa-modal-title">${sofa.name}</h3>
            <div class="modal-gallery">
                <img class="modal-main-image" src="${mainImage}" alt="${sofa.name}">
                <div class="modal-thumbs">
                    ${angles.map((src, index) => `
                        <img class="modal-thumb ${index === 0 ? 'is-active' : ''}" src="${src}" data-src="${src}" alt="${sofa.name} angle">
                    `).join('')}
                </div>
            </div>
            <p>${sofa.description || ''}</p>
            <p>メーカー: ${sofa.maker}</p>
            <p>価格: ¥${sofa.price.toLocaleString()}</p>
            <p>サイズ: 幅${sofa.size?.width}cm × 奥行${sofa.size?.depth}cm × 高さ${sofa.size?.height}cm</p>
            <div class="modal-compose">
                <h4>合成プレビュー</h4>
                <p class="modal-compose-sub">Step1で選択した部屋画像を使用します。</p>
                <div class="modal-compose-room">
                    <img src="${roomImagePath}" alt="選択した部屋画像">
                </div>
                <div class="modal-compose-actions">
                    <button class="primary-btn" id="modal-compose-btn" ${roomImagePath ? '' : 'disabled'}>この部屋で合成</button>
                    <button class="secondary-btn" id="modal-download-btn" disabled>ダウンロード</button>
                </div>
                <p class="modal-compose-note" id="modal-compose-note"></p>
                <div class="modal-compose-result" id="modal-compose-result">
                    <img id="modal-compose-image" alt="合成結果">
                    <div class="modal-compose-loading" id="modal-compose-loading">
                        <div class="spinner"></div>
                        <p>AIが画像を生成中です...</p>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');

        const close = () => {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        };

        closeBtn?.addEventListener('click', close, { once: true });
        backdrop?.addEventListener('click', close, { once: true });

        const mainImageEl = body.querySelector('.modal-main-image');
        const thumbs = body.querySelectorAll('.modal-thumb');
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbs.forEach(t => t.classList.remove('is-active'));
                thumb.classList.add('is-active');
                if (mainImageEl) mainImageEl.src = thumb.dataset.src;
            });
        });

        const composeBtn = body.querySelector('#modal-compose-btn');
        const downloadBtn = body.querySelector('#modal-download-btn');
        const resultImg = body.querySelector('#modal-compose-image');
        const loadingEl = body.querySelector('#modal-compose-loading');
        const noteEl = body.querySelector('#modal-compose-note');
        let latestImageData = '';

        if (composeBtn) {
            composeBtn.addEventListener('click', async () => {
                if (!selectedRoom?.path) {
                    alert('部屋画像が選択されていません');
                    return;
                }
                try {
                    if (loadingEl) loadingEl.style.display = 'grid';
                    if (resultImg) resultImg.style.display = 'none';
                    if (noteEl) noteEl.textContent = '';
                    if (window.debugMode) {
                        latestImageData = buildPlaceholderImage('合成デモ');
                    } else {
                        const roomImagePath = selectedRoom.path.replace(/^\//, '');
                        const sofaImagePath = composeSofaPath.replace(/^\//, '');
                        const response = await fetch('/api/compose', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ roomImagePath, sofaImagePath }),
                        });
                        const data = await response.json();
                        if (!response.ok) {
                            throw new Error(data.detail || data.error || '合成に失敗しました');
                        }
                        if (!data.image) {
                            throw new Error('画像が生成されませんでした');
                        }
                        latestImageData = `data:${data.image.mimeType};base64,${data.image.data}`;
                    }
                    if (resultImg) {
                        resultImg.src = latestImageData;
                        resultImg.style.display = 'block';
                    }
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                        downloadBtn.onclick = () => {
                            if (!latestImageData) return;
                            const link = document.createElement('a');
                            link.download = 'sofa-composition.png';
                            link.href = latestImageData;
                            link.click();
                        };
                    }
                } catch (error) {
                    if (noteEl) noteEl.textContent = `合成に失敗しました: ${error.message}`;
                    alert(`合成に失敗しました: ${error.message}`);
                } finally {
                    if (loadingEl) loadingEl.style.display = 'none';
                }
            });
        }
    }

    function selectSofaForCompose(sofa) {
        if (typeof state.onSelect === 'function') {
            state.onSelect(sofa);
        }
    }

    function renderFallbackList() {}

    window.initRecommend = initRecommend;
    window.recommend = {
        fetchRecommend,
        renderRecommendList,
        renderSofaCard,
        bindColorSwatches,
        openDetailModal,
        selectSofaForCompose,
        renderFallbackList,
    };
})();
