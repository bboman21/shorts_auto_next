/**
 * Shorts Auto Next - Content Script (Main)
 * 메인 콘텐츠 스크립트 - 모든 모듈 통합 및 실행
 */

(function () {
    'use strict';

    // 중복 실행 방지
    if (window.shortsAutoNextInitialized) {
        console.log('[ShortsAutoNext] Already initialized, skipping');
        return;
    }
    window.shortsAutoNextInitialized = true;

    console.log('[ShortsAutoNext] Content script loaded');

    // 모듈 참조
    const { VideoEndDetector, NextVideoNavigator, VideoObserver } = window.ShortsAutoNext;
    const { FloatingButton, Toast } = window.ShortsAutoNext;

    // 인스턴스 생성
    const endDetector = new VideoEndDetector();
    const navigator = new NextVideoNavigator();
    const videoObserver = new VideoObserver(onVideoFound);
    const floatingButton = new FloatingButton();

    // 현재 설정
    let settings = {
        autoPlayEnabled: true
    };

    /**
     * 초기화
     */
    async function init() {
        console.log('[ShortsAutoNext] Initializing...');

        // 설정 로드
        await loadSettings();

        // 플로팅 버튼 생성
        floatingButton.setEnabled(settings.autoPlayEnabled);
        floatingButton.create();

        // 버튼 토글 콜백 설정
        floatingButton.onToggle = async (enabled) => {
            settings.autoPlayEnabled = enabled;
            await saveSettings();
        };

        // 영상 끝 도달 콜백 설정
        endDetector.onVideoEnd = onVideoEnd;

        // 비디오 감시 시작
        videoObserver.start();

        // URL 변경 감시 (SPA 대응)
        observeUrlChange();

        console.log('[ShortsAutoNext] Initialization complete');
    }

    /**
     * 새 비디오 발견 시 호출
     */
    function onVideoFound(video) {
        console.log('[ShortsAutoNext] Video found, attaching detector');
        endDetector.attach(video);
    }

    /**
     * 영상 끝 도달 시 호출
     */
    async function onVideoEnd() {
        console.log('[ShortsAutoNext] Video ended');

        // 자동재생이 꺼져있으면 무시
        if (!settings.autoPlayEnabled) {
            console.log('[ShortsAutoNext] Autoplay disabled, skipping navigation');
            return;
        }

        // 다음 영상으로 이동
        const success = await navigator.navigate();

        if (success) {
            // 버튼에 펄스 애니메이션
            floatingButton.pulse();

            // 잠시 후 감지기 리셋 (새 영상이 로드되면 VideoObserver가 새로 연결함)
            setTimeout(() => {
                endDetector.reset();
            }, 500);
        } else {
            console.warn('[ShortsAutoNext] Failed to navigate to next video');
        }
    }

    /**
     * 설정 로드
     */
    async function loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
            if (response.success && response.data) {
                settings = response.data;
                console.log('[ShortsAutoNext] Settings loaded:', settings);
            }
        } catch (error) {
            console.error('[ShortsAutoNext] Failed to load settings:', error);
        }
    }

    /**
     * 설정 저장
     */
    async function saveSettings() {
        try {
            await chrome.runtime.sendMessage({
                type: 'SET_SETTINGS',
                payload: settings
            });
            console.log('[ShortsAutoNext] Settings saved');
        } catch (error) {
            console.error('[ShortsAutoNext] Failed to save settings:', error);
        }
    }

    /**
     * URL 변경 감시 (쇼츠 페이지 진입/이탈 처리)
     */
    function observeUrlChange() {
        let lastUrl = location.href;

        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                handleUrlChange();
            }
        });

        observer.observe(document.body, {
            subtree: true,
            childList: true
        });

        // popstate 이벤트도 감시
        window.addEventListener('popstate', handleUrlChange);
    }

    /**
     * URL 변경 처리
     */
    function handleUrlChange() {
        const isShorts = location.pathname.startsWith('/shorts/');

        if (isShorts) {
            console.log('[ShortsAutoNext] Navigated to Shorts page');

            // 버튼이 없으면 다시 생성
            if (!floatingButton.exists()) {
                floatingButton.create();
            }
            floatingButton.show();

            // 비디오 감시 재시작
            videoObserver.start();
        } else {
            console.log('[ShortsAutoNext] Left Shorts page');

            // 쇼츠 페이지가 아니면 UI 숨기기
            floatingButton.hide();

            // 감시 중지
            videoObserver.stop();
            endDetector.detach();
        }
    }

    /**
     * 스토리지 변경 감지 (팝업에서 설정 변경 시)
     */
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.settings) {
            const newSettings = changes.settings.newValue;
            if (newSettings) {
                settings = newSettings;
                floatingButton.setEnabled(settings.autoPlayEnabled);
                console.log('[ShortsAutoNext] Settings updated from storage:', settings);
            }
        }
    });

    /**
     * 정리 (페이지 이탈 시)
     */
    window.addEventListener('beforeunload', () => {
        videoObserver.stop();
        endDetector.detach();
        floatingButton.remove();
    });

    // 초기화 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
