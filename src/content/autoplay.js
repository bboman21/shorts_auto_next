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
     *
     * 유튜브 쇼츠 DOM은 자주 바뀌므로 "구조 기반 → 다국어 aria-label → 제너릭"
     * 순서로 폴백을 시도한다. 가장 안정적인(언어 무관) 선택자를 먼저 둔다.
     */
    async tryClickNavigationButton() {
        const selectors = [
            // 1순위: 구조/ID 기반 (언어와 무관해 가장 안정적)
            '#navigation-button-down button',
            '#navigation-button-down ytd-button-renderer',
            'ytd-shorts #navigation-button-down button',
            '.navigation-button-down button',
            '.navigation-button-down',
            // 2순위: aria-label 부분 매칭 (대소문자 무시 → 다국어/표현 변화 대응)
            'button[aria-label*="다음" i]',
            'button[aria-label*="next" i]',
            '[aria-label*="다음 동영상"]',
            '[aria-label*="Next video" i]',
            // 3순위: 데이터 속성 / 제너릭 폴백
            '[data-action="navigate-down"]',
            'ytd-shorts [id*="navigation-button-down"] button',
            'ytd-shorts [id*="navigation"] button:last-child'
        ];

        for (const selector of selectors) {
            try {
                const el = document.querySelector(selector);
                if (!el) continue;

                // 선택자가 컨테이너를 가리킬 수 있으므로 실제 클릭 가능한 button을 추출
                const button = el.tagName === 'BUTTON' ? el : (el.querySelector('button') || el);

                if (button && this.isClickable(button)) {
                    button.click();
                    return true;
                }
            } catch (e) {
                // 잘못된 선택자/접근 오류는 무시하고 다음 폴백으로
            }
        }

        return false;
    }

    /**
     * 요소가 실제로 화면에 보이고 클릭 가능한지 확인
     */
    isClickable(el) {
        if (!el || el.disabled) return false;
        if (el.offsetParent === null) return false; // display:none 등 숨김 처리
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
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
     *
     * 쇼츠는 여러 개의 reel 슬라이드를 DOM에 유지하므로 단순히 첫 번째 video를
     * 잡으면 이전/다음 슬라이드의 비디오에 잘못 연결될 수 있다.
     * → "활성 슬라이드 → 화면에 보이는 재생 중 비디오" 순으로 현재 영상을 찾는다.
     */
    checkForVideo() {
        const video = this.findActiveVideo();

        // 새로운(현재 활성) 비디오가 발견되었을 때만 콜백 호출
        if (video && video !== this.currentVideo) {
            console.log('[ShortsAutoNext] New video element found');
            this.currentVideo = video;

            if (typeof this.onVideoFound === 'function') {
                this.onVideoFound(video);
            }
        }
    }

    /**
     * 현재 활성(화면에 보이는) 쇼츠 비디오를 반환
     */
    findActiveVideo() {
        // 1순위: 유튜브가 활성 슬라이드에 부여하는 [is-active] 속성 기반
        const activeSelectors = [
            'ytd-reel-video-renderer[is-active] video',
            'ytd-shorts [is-active] video',
            '#shorts-player video'
        ];
        for (const selector of activeSelectors) {
            const v = document.querySelector(selector);
            if (v && this.isVisible(v)) return v;
        }

        // 2순위: 화면에 보이는 비디오 중 재생 중인 것을 우선 선택
        const candidates = document.querySelectorAll(
            'ytd-shorts video, #shorts-container video, ytd-reel-video-renderer video'
        );
        let fallback = null;
        for (const v of candidates) {
            if (!this.isVisible(v)) continue;
            if (!v.paused && !v.ended) return v; // 재생 중인 비디오가 가장 확실
            fallback = fallback || v;             // 없으면 보이는 첫 비디오
        }
        return fallback;
    }

    /**
     * 요소가 뷰포트 안에 실제로 보이는지 확인
     */
    isVisible(el) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        // 요소의 세로 중심이 뷰포트 안에 있으면 활성 슬라이드로 간주
        const centerY = rect.top + rect.height / 2;
        return centerY > 0 && centerY < window.innerHeight;
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
