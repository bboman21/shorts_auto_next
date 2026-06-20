# Shorts Auto Next - 기술 명세서 (Technical Specification)

> **문서 버전**: 1.0  
> **작성일**: 2026-01-11  
> **대상 독자**: 개발자  

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Service Worker  │    │         YouTube Shorts Page       │   │
│  │  (background.js) │    │                                   │   │
│  │                  │    │  ┌─────────────────────────────┐  │   │
│  │  - 설치/업데이트  │◄──►│  │    Content Script           │  │   │
│  │  - 메시지 라우팅  │    │  │    (content.js)             │  │   │
│  │  - 상태 관리     │    │  │                             │  │   │
│  │                  │    │  │  ┌─────────────────────┐    │  │   │
│  └──────────────────┘    │  │  │   Floating UI       │    │  │   │
│           ▲              │  │  │   (ui.js)           │    │  │   │
│           │              │  │  └─────────────────────┘    │  │   │
│           │              │  │                             │  │   │
│           │              │  │  ┌─────────────────────┐    │  │   │
│  ┌────────▼─────────┐    │  │  │   Autoplay Logic    │    │  │   │
│  │     Popup        │    │  │  │   (autoplay.js)     │    │  │   │
│  │  (popup.html/js) │    │  │  └─────────────────────┘    │  │   │
│  │                  │    │  └─────────────────────────────┘  │   │
│  │  - ON/OFF 토글   │    │                                   │   │
│  │  - 설정 표시     │    └──────────────────────────────────┘   │
│  └──────────────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  Chrome Storage  │                                           │
│  │  Sync API        │                                           │
│  │  - settings      │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 컴포넌트 역할

| 컴포넌트 | 파일 | 역할 |
|----------|------|------|
| Service Worker | `background.js` | 확장 프로그램 라이프사이클 관리, 메시지 라우팅 |
| Content Script | `content.js` | 유튜브 쇼츠 페이지에서 실행, 메인 로직 |
| Autoplay Module | `autoplay.js` | 영상 감지, 끝 감지, 다음 영상 이동 |
| UI Module | `ui.js` | 플로팅 버튼 생성 및 관리 |
| Popup | `popup.html/js` | 사용자 설정 UI |
| Storage | Chrome API | 설정 저장/로드 |

---

## 2. Manifest V3 설정

### 2.1 manifest.json

```json
{
  "manifest_version": 3,
  "name": "Shorts Auto Next - YouTube Shorts Auto Play",
  "version": "1.0.0",
  "description": "유튜브 쇼츠 영상이 끝나면 자동으로 다음 영상을 재생합니다",
  
  "permissions": [
    "storage",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://www.youtube.com/*"
  ],
  
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/shorts/*"],
      "js": [
        "src/content/autoplay.js",
        "src/content/ui.js",
        "src/content/content.js"
      ],
      "css": ["src/styles/floating-ui.css"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

### 2.2 권한 설명

| 권한 | 용도 | 사용자 영향 |
|------|------|-------------|
| `storage` | 설정 저장/동기화 | ❌ 민감 정보 없음 |
| `activeTab` | 현재 탭 감지 | ❌ 최소 권한 |
| `host_permissions` | 유튜브 페이지 접근 | ⚠️ 유튜브만 허용 |

---

## 3. 데이터 모델

### 3.1 저장 데이터 스키마

```typescript
interface Settings {
  // 자동재생 활성화 여부
  autoPlayEnabled: boolean;  // 기본값: true
  
  // 다음 영상까지 딜레이 (ms) - Phase 2
  delayMs?: number;  // 기본값: 0
  
  // 마지막 업데이트 시간
  lastUpdated?: number;  // timestamp
}

// 기본 설정
const DEFAULT_SETTINGS: Settings = {
  autoPlayEnabled: true,
  delayMs: 0,
  lastUpdated: Date.now()
};
```

### 3.2 Storage API 사용

```javascript
// 저장
async function saveSettings(settings) {
  await chrome.storage.sync.set({ settings });
}

// 로드
async function loadSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || DEFAULT_SETTINGS;
}

// 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.settings) {
    onSettingsChanged(changes.settings.newValue);
  }
});
```

---

## 4. 핵심 알고리즘

### 4.1 영상 끝 감지 알고리즘

```javascript
class VideoEndDetector {
  constructor() {
    this.video = null;
    this.isTriggered = false;
    this.threshold = 0.5; // 끝나기 0.5초 전
  }

  attach(videoElement) {
    this.video = videoElement;
    this.isTriggered = false;
    
    // 방법 1: timeupdate 이벤트 (주요)
    this.video.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
    
    // 방법 2: ended 이벤트 (백업, 쇼츠는 루프라 안 올 수 있음)
    this.video.addEventListener('ended', this.onEnded.bind(this));
  }

  onTimeUpdate() {
    if (this.isTriggered) return;
    
    const { currentTime, duration } = this.video;
    
    // NaN 체크
    if (!duration || isNaN(duration)) return;
    
    // 끝에 도달했는지 확인
    if (currentTime >= duration - this.threshold) {
      this.trigger();
    }
  }

  onEnded() {
    if (!this.isTriggered) {
      this.trigger();
    }
  }

  trigger() {
    this.isTriggered = true;
    this.onVideoEnd?.();
  }

  reset() {
    this.isTriggered = false;
  }

  detach() {
    if (this.video) {
      this.video.removeEventListener('timeupdate', this.onTimeUpdate);
      this.video.removeEventListener('ended', this.onEnded);
      this.video = null;
    }
  }
}
```

### 4.2 다음 영상 이동 알고리즘

```javascript
class NextVideoNavigator {
  constructor() {
    this.isNavigating = false;
  }

  async navigate() {
    if (this.isNavigating) return;
    this.isNavigating = true;

    try {
      // 방법 1: 네비게이션 버튼 클릭 (가장 안정적)
      const navigated = await this.tryClickNavigationButton();
      if (navigated) return;

      // 방법 2: 키보드 이벤트 (대안)
      const keyPressed = await this.tryKeyboardNavigation();
      if (keyPressed) return;

      // 방법 3: 스크롤 (최후의 수단)
      await this.tryScrollNavigation();
    } finally {
      // 쿨다운
      setTimeout(() => {
        this.isNavigating = false;
      }, 1000);
    }
  }

  async tryClickNavigationButton() {
    // 유튜브 쇼츠의 다음 버튼 선택자
    const selectors = [
      '[aria-label="Next video"]',
      '[aria-label="다음 동영상"]', // 한국어
      '.navigation-button-down',
      '#navigation-button-down button'
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        return true;
      }
    }
    return false;
  }

  async tryKeyboardNavigation() {
    // 아래 화살표 키로 다음 영상
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      code: 'ArrowDown',
      keyCode: 40,
      bubbles: true
    });
    document.dispatchEvent(event);
    return true;
  }

  async tryScrollNavigation() {
    // 쇼츠 컨테이너 스크롤
    const container = document.querySelector('ytd-shorts');
    if (container) {
      container.scrollBy({
        top: window.innerHeight,
        behavior: 'smooth'
      });
      return true;
    }
    return false;
  }
}
```

### 4.3 비디오 요소 감지 (MutationObserver)

```javascript
class VideoObserver {
  constructor(onVideoFound) {
    this.onVideoFound = onVideoFound;
    this.observer = null;
    this.currentVideo = null;
  }

  start() {
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
  }

  checkForVideo() {
    // 쇼츠 플레이어의 비디오 요소 찾기
    const video = document.querySelector(
      'ytd-shorts video, ' +
      '#shorts-player video, ' +
      'ytd-reel-video-renderer video'
    );

    if (video && video !== this.currentVideo) {
      this.currentVideo = video;
      this.onVideoFound(video);
    }
  }

  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.currentVideo = null;
  }
}
```

---

## 5. UI 컴포넌트

### 5.1 플로팅 버튼 구현

```javascript
class FloatingButton {
  constructor() {
    this.container = null;
    this.button = null;
    this.isEnabled = true;
  }

  create() {
    // 기존 버튼 제거
    this.remove();

    // 컨테이너 생성
    this.container = document.createElement('div');
    this.container.id = 'shorts-auto-next-floating-container';
    this.container.innerHTML = `
      <button id="shorts-auto-next-toggle" class="shorts-auto-next-btn ${this.isEnabled ? 'enabled' : 'disabled'}">
        <svg class="shorts-auto-next-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
        </svg>
        <span class="shorts-auto-next-label">${this.isEnabled ? '켜짐' : '꺼짐'}</span>
      </button>
      <div class="shorts-auto-next-tooltip">${this.isEnabled ? '자동재생 켜짐' : '자동재생 꺼짐'}</div>
    `;

    // 이벤트 리스너
    this.button = this.container.querySelector('#shorts-auto-next-toggle');
    this.button.addEventListener('click', () => this.toggle());

    // DOM에 추가
    document.body.appendChild(this.container);
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    this.update();
    this.onToggle?.(this.isEnabled);
  }

  update() {
    if (!this.button) return;
    
    this.button.classList.toggle('enabled', this.isEnabled);
    this.button.classList.toggle('disabled', !this.isEnabled);
    
    const label = this.button.querySelector('.shorts-auto-next-label');
    const tooltip = this.container.querySelector('.shorts-auto-next-tooltip');
    
    label.textContent = this.isEnabled ? '켜짐' : '꺼짐';
    tooltip.textContent = this.isEnabled ? '자동재생 켜짐' : '자동재생 꺼짐';
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.update();
  }

  pulse() {
    this.button?.classList.add('pulse');
    setTimeout(() => {
      this.button?.classList.remove('pulse');
    }, 500);
  }

  remove() {
    this.container?.remove();
    this.container = null;
    this.button = null;
  }
}
```

### 5.2 플로팅 UI 스타일 (CSS)

```css
/* 컨테이너 */
#shorts-auto-next-floating-container {
  position: fixed;
  bottom: 120px;
  right: 20px;
  z-index: 9999;
  font-family: 'Roboto', 'YouTube Sans', sans-serif;
}

/* 버튼 */
.shorts-auto-next-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* 활성화 상태 */
.shorts-auto-next-btn.enabled {
  background: rgba(62, 166, 255, 0.9);
  color: #fff;
}

.shorts-auto-next-btn.enabled:hover {
  background: rgba(62, 166, 255, 1);
  transform: scale(1.05);
}

/* 비활성화 상태 */
.shorts-auto-next-btn.disabled {
  background: rgba(96, 96, 96, 0.9);
  color: #ccc;
}

.shorts-auto-next-btn.disabled:hover {
  background: rgba(96, 96, 96, 1);
  transform: scale(1.05);
}

/* 클릭 효과 */
.shorts-auto-next-btn:active {
  transform: scale(0.95);
}

/* 펄스 애니메이션 (자동 넘김 시) */
.shorts-auto-next-btn.pulse {
  animation: shorts-auto-next-pulse 0.5s ease;
}

@keyframes shorts-auto-next-pulse {
  0% { box-shadow: 0 0 0 0 rgba(62, 166, 255, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(62, 166, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(62, 166, 255, 0); }
}

/* 아이콘 */
.shorts-auto-next-icon {
  flex-shrink: 0;
}

/* 툴팁 */
.shorts-auto-next-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  padding: 6px 12px;
  background: rgba(33, 33, 33, 0.95);
  color: #fff;
  font-size: 12px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease;
}

#shorts-auto-next-floating-container:hover .shorts-auto-next-tooltip {
  opacity: 1;
  visibility: visible;
}

/* 다크모드 최적화 */
@media (prefers-color-scheme: dark) {
  .shorts-auto-next-tooltip {
    background: rgba(50, 50, 50, 0.95);
  }
}
```

---

## 6. 메시지 통신

### 6.1 메시지 타입

```typescript
// 메시지 타입 정의
type MessageType = 
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'TOGGLE_AUTOPLAY'
  | 'GET_STATUS';

interface Message {
  type: MessageType;
  payload?: any;
}

interface Response {
  success: boolean;
  data?: any;
  error?: string;
}
```

### 6.2 Service Worker 메시지 핸들러

```javascript
// src/background/service-worker.js

chrome.runtime.onInstalled.addListener(() => {
  console.log('Shorts Auto Next installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  
  return true; // 비동기 응답
});

async function handleMessage(message) {
  switch (message.type) {
    case 'GET_SETTINGS':
      const settings = await loadSettings();
      return { success: true, data: settings };
    
    case 'SET_SETTINGS':
      await saveSettings(message.payload);
      return { success: true };
    
    case 'TOGGLE_AUTOPLAY':
      const current = await loadSettings();
      current.autoPlayEnabled = !current.autoPlayEnabled;
      await saveSettings(current);
      return { success: true, data: current };
    
    default:
      return { success: false, error: 'Unknown message type' };
  }
}
```

### 6.3 Content Script ↔ Popup 통신

```javascript
// Popup에서 Content Script로 메시지
async function sendToContentScript(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return chrome.tabs.sendMessage(tab.id, message);
}

// Content Script에서 Popup 메시지 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TOGGLE_AUTOPLAY') {
    floatingButton.toggle();
    sendResponse({ success: true, enabled: floatingButton.isEnabled });
  }
  return true;
});
```

---

## 7. 에러 처리

### 7.1 에러 타입

```javascript
class AutoNextError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'AutoNextError';
  }
}

const ErrorCodes = {
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',
  NAVIGATION_FAILED: 'NAVIGATION_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  DOM_CHANGED: 'DOM_CHANGED'
};
```

### 7.2 에러 핸들링 전략

```javascript
async function safeNavigate() {
  try {
    await navigator.navigate();
  } catch (error) {
    console.error('[ShortsAutoNext] Navigation failed:', error);
    
    // 재시도 로직
    if (retryCount < 3) {
      retryCount++;
      setTimeout(safeNavigate, 1000);
    } else {
      // 사용자에게 알림 (비침투적)
      showErrorToast('자동 넘김에 실패했습니다');
    }
  }
}
```

### 7.3 로깅

```javascript
const Logger = {
  prefix: '[ShortsAutoNext]',
  
  info(...args) {
    console.log(this.prefix, ...args);
  },
  
  warn(...args) {
    console.warn(this.prefix, ...args);
  },
  
  error(...args) {
    console.error(this.prefix, ...args);
  },
  
  debug(...args) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.prefix, ...args);
    }
  }
};
```

---

## 8. 테스트 전략

### 8.1 테스트 케이스

| 카테고리 | 테스트 케이스 | 예상 결과 |
|----------|--------------|-----------|
| 기본 기능 | 쇼츠 페이지에서 영상 끝까지 시청 | 자동으로 다음 영상 재생 |
| 토글 | ON/OFF 버튼 클릭 | 상태 변경, UI 업데이트 |
| 설정 저장 | 브라우저 재시작 후 상태 확인 | 이전 설정 유지 |
| 페이지 네비게이션 | 쇼츠 → 일반 영상 → 쇼츠 | 쇼츠에서만 UI 표시 |
| 에러 처리 | 네트워크 끊김 상태 | 에러 처리, 재시도 |

### 8.2 수동 테스트 체크리스트

- [ ] 쇼츠 페이지 진입 시 플로팅 버튼 표시
- [ ] 버튼 클릭 시 ON/OFF 토글
- [ ] 영상 끝나면 자동으로 다음 영상
- [ ] 팝업에서 설정 변경 시 즉시 반영
- [ ] 일반 유튜브 페이지에서는 UI 미표시
- [ ] Edge 브라우저에서도 동작
- [ ] 다양한 쇼츠 영상에서 테스트 (길이, 형태)

---

## 9. 성능 고려사항

### 9.1 최적화 포인트

| 영역 | 최적화 | 이유 |
|------|--------|------|
| Event Listener | throttle/debounce 적용 | CPU 사용 최소화 |
| DOM 조회 | 결과 캐싱 | 반복 조회 방지 |
| MutationObserver | 필요시만 활성화 | 메모리 효율 |
| CSS | transform 사용 | GPU 가속 |

### 9.2 메모리 관리

```javascript
// 페이지 이탈 시 정리
window.addEventListener('beforeunload', () => {
  videoObserver.stop();
  endDetector.detach();
  floatingButton.remove();
});

// SPA 네비게이션 감지
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (!location.pathname.startsWith('/shorts/')) {
      cleanup();
    }
  }
}).observe(document, { subtree: true, childList: true });
```

---

## 10. 배포 가이드

### 10.1 빌드 프로세스

```bash
# 1. 의존성 설치 (필요한 경우)
npm install

# 2. 아이콘 생성
# - icon-16.png (16x16)
# - icon-48.png (48x48)
# - icon-128.png (128x128)

# 3. 압축 파일 생성
zip -r shorts-auto-next-v1.0.0.zip . -x "*.git*" -x "node_modules/*" -x "*.md"
```

### 10.2 Chrome 웹스토어 제출

1. [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) 접속
2. 개발자 계정 등록 ($5 일회성)
3. 새 항목 추가
4. ZIP 파일 업로드
5. 스토어 등록 정보 입력:
   - 이름: Shorts Auto Next - YouTube Shorts Auto Play
   - 설명: 유튜브 쇼츠 자동 재생
   - 카테고리: 생산성
   - 언어: 한국어, English
6. 스크린샷 업로드 (1280x800 또는 640x400)
7. 심사 제출

### 10.3 Edge 애드온 스토어

- 동일한 ZIP 파일 사용 가능
- [Edge Add-ons Developer](https://partner.microsoft.com/en-us/dashboard/microsoftedge) 제출

---

## 부록: 유튜브 쇼츠 DOM 구조 참고

```html
<!-- 쇼츠 플레이어 구조 (2026-01 기준, 변경될 수 있음) -->
<ytd-shorts>
  <ytd-reel-video-renderer>
    <div id="shorts-player">
      <video src="..."></video>
    </div>
    <div id="actions">
      <button id="navigation-button-up">이전</button>
      <button id="navigation-button-down">다음</button>
    </div>
  </ytd-reel-video-renderer>
</ytd-shorts>
```

> ⚠️ **주의**: 유튜브 DOM 구조는 자주 변경됩니다. 정기적인 모니터링과 업데이트가 필요합니다.
