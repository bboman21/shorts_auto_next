/**
 * Shorts Auto Next - Autoplay Module
 * 영상 끝 감지 및 다음 영상 이동 로직
 */

/**
 * 영상 끝 감지 클래스
 */
class VideoEndDetector {
    constructor() {
        this.video = null;
        this.isTriggered = false;
        this.threshold = 0.5; // 끝나기 0.5초 전에 감지
        this.onVideoEnd = null;

        // 바인딩
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handleEnded = this.handleEnded.bind(this);
        this.handleSeeked = this.handleSeeked.bind(this);
    }

    /**
     * 비디오 요소에 리스너 연결
     */
    attach(videoElement) {
        if (this.video === videoElement) return;

        // 기존 연결 해제
        this.detach();

        this.video = videoElement;
        this.isTriggered = false;

        // 이벤트 리스너 등록
        this.video.addEventListener('timeupdate', this.handleTimeUpdate);
        this.video.addEventListener('ended', this.handleEnded);
        this.video.addEventListener('seeked', this.handleSeeked);

        console.log('[ShortsAutoNext] VideoEndDetector attached');
    }

    /**
     * timeupdate 이벤트 핸들러
     */
    handleTimeUpdate() {
        if (this.isTriggered || !this.video) return;

        const { currentTime, duration } = this.video;

        // duration이 유효한지 확인
        if (!duration || isNaN(duration) || duration === 0) return;

        // 영상 끝에 도달했는지 확인
        if (currentTime >= duration - this.threshold) {
            this.trigger();
        }
    }

    /**
     * ended 이벤트 핸들러 (쇼츠는 루프라 잘 안 옴)
     */
    handleEnded() {
        if (!this.isTriggered) {
            console.log('[ShortsAutoNext] Video ended event received');
            this.trigger();
        }
    }

    /**
     * seeked 이벤트 핸들러 (사용자가 직접 조작 시 리셋)
     */
    handleSeeked() {
        // 영상 초반으로 돌아갔다면 플래그 리셋
        if (this.video && this.video.currentTime < 1) {
            this.isTriggered = false;
        }
    }

    /**
     * 영상 끝 도달 트리거
     */
    trigger() {
        if (this.isTriggered) return;

        this.isTriggered = true;
        console.log('[ShortsAutoNext] Video end triggered');

        if (typeof this.onVideoEnd === 'function') {
            this.onVideoEnd();
        }
    }

    /**
     * 상태 리셋
     */
    reset() {
        this.isTriggered = false;
    }

    /**
     * 리스너 해제
     */
    detach() {
        if (this.video) {
            this.video.removeEventListener('timeupdate', this.handleTimeUpdate);
            this.video.removeEventListener('ended', this.handleEnded);
            this.video.removeEventListener('seeked', this.handleSeeked);
            this.video = null;
        }
        this.isTriggered = false;
        console.log('[ShortsAutoNext] VideoEndDetector detached');
    }
}

/**
 * 다음 영상 네비게이션 클래스
 */
class NextVideoNavigator {
    constructor() {
        this.isNavigating = false;
        this.cooldownMs = 1500; // 중복 실행 방지 쿨다운
    }

    /**
     * 다음 영상으로 이동
     */
    async navigate() {
        if (this.isNavigating) {
            console.log('[ShortsAutoNext] Navigation already in progress, skipping');
            return false;
        }

        this.isNavigating = true;
        console.log('[ShortsAutoNext] Navigating to next video...');

        try {
            // 방법 1: 다음 버튼 클릭 시도
            if (await this.tryClickNavigationButton()) {
                console.log('[ShortsAutoNext] Navigation via button click');
                return true;
            }

            // 방법 2: 키보드 이벤트 시도
            if (await this.tryKeyboardNavigation()) {
                console.log('[ShortsAutoNext] Navigation via keyboard');
                return true;
            }

            // 방법 3: 스크롤 시도
            if (await this.tryScrollNavigation()) {
                console.log('[ShortsAutoNext] Navigation via scroll');
                return true;
            }

            console.warn('[ShortsAutoNext] All navigation methods failed');
            return false;
        } finally {
            // 쿨다운 후 플래그 해제
            setTimeout(() => {
                this.isNavigating = false;
            }, this.cooldownMs);
        }
    }

    /**
     * 방법 1: 유튜브 네비게이션 버튼 클릭
     */
    async tryClickNavigationButton() {
        // 다양한 선택자 시도 (유튜브 DOM 구조는 변경될 수 있음)
        const selectors = [
            // 영어
            '[aria-label="Next video"]',
            'button[aria-label="Next video"]',
            // 한국어
            '[aria-label="다음 동영상"]',
            'button[aria-label="다음 동영상"]',
            // 클래스 기반
            '#navigation-button-down button',
            '.navigation-button-down',
            // 데이터 속성 기반
            '[data-action="navigate-down"]',
            // 제너릭
            'ytd-shorts [id*="navigation"] button:last-child'
        ];

        for (const selector of selectors) {
            try {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) { // 화면에 보이는지 확인
                    button.click();
                    return true;
                }
            } catch (e) {
                // 선택자 오류 무시
            }
        }

        return false;
    }

    /**
     * 방법 2: 키보드 이벤트 시뮬레이션
     */
    async tryKeyboardNavigation() {
        try {
            // 아래 화살표 키 이벤트
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                which: 40,
                bubbles: true,
                cancelable: true
            });

            // 다양한 요소에 이벤트 전달 시도
            const targets = [
                document.activeElement,
                document.querySelector('ytd-shorts'),
                document.querySelector('#shorts-container'),
                document.body
            ];

            for (const target of targets) {
                if (target) {
                    target.dispatchEvent(event);
                }
            }

            // 약간의 딜레이 후 확인
            await this.delay(300);
            return true;
        } catch (error) {
            console.error('[ShortsAutoNext] Keyboard navigation error:', error);
            return false;
        }
    }

    /**
     * 방법 3: 스크롤 네비게이션
     */
    async tryScrollNavigation() {
        try {
            // 쇼츠 컨테이너 찾기
            const containers = [
                document.querySelector('ytd-shorts'),
                document.querySelector('#shorts-container'),
                document.querySelector('ytd-reel-video-renderer')?.parentElement
            ];

            for (const container of containers) {
                if (container) {
                    container.scrollBy({
                        top: window.innerHeight,
                        behavior: 'smooth'
                    });
                    return true;
                }
            }

            // 컨테이너를 찾지 못하면 윈도우 스크롤
            window.scrollBy({
                top: window.innerHeight,
                behavior: 'smooth'
            });

            return true;
        } catch (error) {
            console.error('[ShortsAutoNext] Scroll navigation error:', error);
            return false;
        }
    }

    /**
     * 유틸리티: 딜레이
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 비디오 요소 감시 클래스
 */
class VideoObserver {
    constructor(onVideoFound) {
        this.onVideoFound = onVideoFound;
        this.observer = null;
        this.currentVideo = null;
        this.checkInterval = null;
    }

    /**
     * 감시 시작
     */
    start() {
        console.log('[ShortsAutoNext] VideoObserver started');

        // 즉시 체크
        this.checkForVideo();

        // DOM 변경 감시
        this.observer = new MutationObserver(() => {
            this.checkForVideo();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 폴링 백업 (일부 SPA 환경에서 MutationObserver가 놓칠 수 있음)
        this.checkInterval = setInterval(() => {
            this.checkForVideo();
        }, 2000);
    }

    /**
     * 비디오 요소 찾기
     */
    checkForVideo() {
        // 쇼츠 플레이어의 비디오 요소 찾기
        const selectors = [
            'ytd-shorts video',
            '#shorts-player video',
            'ytd-reel-video-renderer video',
            '#shorts-container video'
        ];

        let video = null;

        for (const selector of selectors) {
            video = document.querySelector(selector);
            if (video) break;
        }

        // 새로운 비디오가 발견되었을 때만 콜백 호출
        if (video && video !== this.currentVideo) {
            console.log('[ShortsAutoNext] New video element found');
            this.currentVideo = video;

            if (typeof this.onVideoFound === 'function') {
                this.onVideoFound(video);
            }
        }
    }

    /**
     * 감시 중지
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        this.currentVideo = null;
        console.log('[ShortsAutoNext] VideoObserver stopped');
    }
}

// 전역으로 내보내기
window.ShortsAutoNext = window.ShortsAutoNext || {};
window.ShortsAutoNext.VideoEndDetector = VideoEndDetector;
window.ShortsAutoNext.NextVideoNavigator = NextVideoNavigator;
window.ShortsAutoNext.VideoObserver = VideoObserver;
