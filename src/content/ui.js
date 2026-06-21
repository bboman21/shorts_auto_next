/**
 * Shorts Auto Next - UI Module
 * 플로팅 버튼 및 사용자 인터페이스
 */

/**
 * 플로팅 버튼 클래스
 */
class FloatingButton {
    constructor() {
        this.container = null;
        this.button = null;
        this.isEnabled = true;
        this.onToggle = null;

        // SVG 아이콘 정의
        this.icons = {
            autoplay: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
      </svg>`,
            pause: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>`
        };
    }

    /**
     * 플로팅 버튼 생성
     */
    create() {
        // 기존 버튼 제거
        this.remove();

        // 컨테이너 생성
        this.container = document.createElement('div');
        this.container.id = 'shorts-auto-next-floating-container';
        this.container.innerHTML = this.getTemplate();

        // 버튼 참조 저장
        this.button = this.container.querySelector('#shorts-auto-next-toggle');

        // 이벤트 리스너 등록
        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // 키보드 접근성
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
        });

        // DOM에 추가
        document.body.appendChild(this.container);

        console.log('[ShortsAutoNext] Floating button created');

        return this;
    }

    /**
     * 버튼 HTML 템플릿
     */
    getTemplate() {
        const icon = this.isEnabled ? this.icons.autoplay : this.icons.pause;
        const label = this.isEnabled ? '켜짐' : '꺼짐';
        const statusClass = this.isEnabled ? 'enabled' : 'disabled';
        const tooltip = this.isEnabled ? '자동재생 켜짐' : '자동재생 꺼짐';

        return `
      <button 
        id="shorts-auto-next-toggle" 
        class="shorts-auto-next-btn ${statusClass}"
        aria-label="${tooltip}"
        title="${tooltip}"
      >
        <span class="shorts-auto-next-icon">${icon}</span>
        <span class="shorts-auto-next-label">${label}</span>
      </button>
      <div class="shorts-auto-next-tooltip">${tooltip}</div>
    `;
    }

    /**
     * 상태 토글
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.update();

        // 콜백 호출
        if (typeof this.onToggle === 'function') {
            this.onToggle(this.isEnabled);
        }

        console.log('[ShortsAutoNext] Autoplay toggled:', this.isEnabled);
    }

    /**
     * UI 업데이트
     */
    update() {
        if (!this.button || !this.container) return;

        const icon = this.isEnabled ? this.icons.autoplay : this.icons.pause;
        const label = this.isEnabled ? '켜짐' : '꺼짐';
        const tooltip = this.isEnabled ? '자동재생 켜짐' : '자동재생 꺼짐';

        // 클래스 업데이트
        this.button.classList.toggle('enabled', this.isEnabled);
        this.button.classList.toggle('disabled', !this.isEnabled);

        // 콘텐츠 업데이트
        const iconEl = this.button.querySelector('.shorts-auto-next-icon');
        const labelEl = this.button.querySelector('.shorts-auto-next-label');
        const tooltipEl = this.container.querySelector('.shorts-auto-next-tooltip');

        if (iconEl) iconEl.innerHTML = icon;
        if (labelEl) labelEl.textContent = label;
        if (tooltipEl) tooltipEl.textContent = tooltip;

        // 접근성 속성 업데이트
        this.button.setAttribute('aria-label', tooltip);
        this.button.setAttribute('title', tooltip);
    }

    /**
     * 상태 설정 (외부에서 호출)
     */
    setEnabled(enabled) {
        if (this.isEnabled !== enabled) {
            this.isEnabled = enabled;
            this.update();
        }
    }

    /**
     * 펄스 애니메이션 (자동 넘김 시 피드백)
     */
    pulse() {
        if (!this.button) return;

        this.button.classList.add('pulse');
        setTimeout(() => {
            this.button?.classList.remove('pulse');
        }, 600);
    }

    /**
     * 버튼 표시
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * 버튼 숨기기
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * 버튼 제거
     */
    remove() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.button = null;
            console.log('[ShortsAutoNext] Floating button removed');
        }
    }

    /**
     * 버튼이 존재하는지 확인
     */
    exists() {
        return this.container !== null && document.body.contains(this.container);
    }
}

// 전역으로 내보내기
window.ShortsAutoNext = window.ShortsAutoNext || {};
window.ShortsAutoNext.FloatingButton = FloatingButton;
