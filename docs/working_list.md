# Shorts Auto Next 작업 기록 (Working List)

> **최종 업데이트**: 2026-01-11 18:45  
> **프로젝트**: Shorts Auto Next - YouTube Shorts 자동재생 Chrome Extension

---

## 📋 프로젝트 요약

**Shorts Auto Next**는 유튜브 쇼츠 영상이 끝나면 자동으로 다음 영상을 재생해주는 Chrome 확장 프로그램입니다.

| 항목 | 내용 |
|------|------|
| 버전 | v1.0.0 |
| 플랫폼 | Chrome Extension (Manifest V3) |
| 지원 브라우저 | Chrome, Edge (Chromium 기반) |

---

## ✅ 완료된 작업 목록

### Phase 1: 기획 (완료)

| 작업 | 상태 | 산출물 |
|------|------|--------|
| 제품 요구사항 정의 | ✅ | `docs/PRD.md` |
| 기술 아키텍처 설계 | ✅ | `docs/TECHNICAL_SPEC.md` |
| 타겟 사용자 정의 | ✅ | PRD 내 포함 |
| 기능 우선순위 정리 | ✅ | PRD 내 포함 |
| UI/UX 명세 작성 | ✅ | PRD 내 포함 |

---

### Phase 2: 개발 (완료)

#### 2.1 프로젝트 구조 설정
| 작업 | 상태 | 산출물 |
|------|------|--------|
| 프로젝트 폴더 구조 생성 | ✅ | `shorts_auto_next/` |
| manifest.json 작성 | ✅ | `manifest.json` |
| README 작성 | ✅ | `README.md` |

#### 2.2 핵심 기능 구현
| 작업 | 상태 | 산출물 |
|------|------|--------|
| 콘텐츠 스크립트 메인 | ✅ | `src/content/content.js` |
| 자동재생 로직 | ✅ | `src/content/autoplay.js` |
| 영상 끝 감지 (timeupdate) | ✅ | autoplay.js 내 구현 |
| 다음 영상 이동 (키보드 이벤트) | ✅ | autoplay.js 내 구현 |
| MutationObserver (SPA 대응) | ✅ | content.js 내 구현 |

#### 2.3 UI 구현
| 작업 | 상태 | 산출물 |
|------|------|--------|
| 플로팅 UI 버튼 | ✅ | `src/content/ui.js` |
| 플로팅 UI 스타일 | ✅ | `src/styles/floating-ui.css` |
| 팝업 HTML | ✅ | `src/popup/popup.html` |
| 팝업 CSS | ✅ | `src/popup/popup.css` |
| 팝업 JavaScript | ✅ | `src/popup/popup.js` |
| ON/OFF 토글 기능 | ✅ | ui.js, popup.js |
| 다크모드 UI | ✅ | CSS 내 구현 |

#### 2.4 백그라운드 및 저장소
| 작업 | 상태 | 산출물 |
|------|------|--------|
| 서비스 워커 | ✅ | `src/background/service-worker.js` |
| Chrome Storage API 연동 | ✅ | 설정 저장/로드 구현 |
| 팝업-콘텐츠 간 메시지 통신 | ✅ | chrome.runtime.sendMessage |

---

### Phase 3: 에셋 제작 (완료)

| 작업 | 상태 | 산출물 |
|------|------|--------|
| 아이콘 16x16 | ✅ | `assets/icons/icon-16.png` |
| 아이콘 48x48 | ✅ | `assets/icons/icon-48.png` |
| 아이콘 128x128 | ✅ | `assets/icons/icon-128.png` |
| 스크린샷 1280x800 | ✅ | `assets/store/screenshot_1280x800.png` |
| 프로모션 타일 440x280 | ✅ | `assets/store/promo_tile_440x280.png` |

---

### Phase 4: 배포 준비 (완료)

| 작업 | 상태 | 산출물 |
|------|------|--------|
| 개인정보처리방침 (한/영) | ✅ | `docs/PRIVACY_POLICY.md` |
| 스토어 등록 정보 | ✅ | `docs/STORE_LISTING.md` |
| ZIP 패키징 스크립트 | ✅ | `scripts/package.sh` |
| 배포용 ZIP 생성 | ✅ | `shorts-auto-next-v1.0.0.zip` (324KB) |

---

## ⏳ 남은 작업 (배포)

| 작업 | 상태 | 비고 |
|------|------|------|
| Chrome 개발자 계정 등록 | ⏳ | $5 결제 필요 |
| 웹 스토어에 ZIP 업로드 | ⏳ | |
| 스토어 정보 입력 | ⏳ | STORE_LISTING.md 참고 |
| 개인정보처리방침 URL 등록 | ⏳ | GitHub 업로드 후 URL 사용 |
| 심사 제출 | ⏳ | 1~3일 소요 예상 |

---

## 🗂️ 파일 구조

```
shorts_auto_next/
├── manifest.json
├── README.md
├── shorts-auto-next-v1.0.0.zip  # 스토어 업로드용
│
├── src/
│   ├── background/
│   │   └── service-worker.js
│   ├── content/
│   │   ├── content.js
│   │   ├── autoplay.js
│   │   └── ui.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── styles/
│       └── floating-ui.css
│
├── assets/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── store/
│       ├── screenshot_1280x800.png
│       └── promo_tile_440x280.png
│
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL_SPEC.md
│   ├── PRIVACY_POLICY.md
│   ├── STORE_LISTING.md
│   └── working_list.md        # 본 문서
│
└── scripts/
    └── package.sh
```

---

## 🔧 개발 환경 & 명령어

### 로컬 테스트
1. Chrome에서 `chrome://extensions` 접속
2. 개발자 모드 ON
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `/Users/chris/Dev/Project/shorts_auto_next` 폴더 선택

### 패키징
```bash
cd /Users/chris/Dev/Project/shorts_auto_next
./scripts/package.sh
```

### 코드 수정 후 리로드
- `chrome://extensions`에서 해당 확장 프로그램의 🔄 버튼 클릭

---

## 📝 참고 문서

- [Chrome Extension 개발 가이드](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 문서](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome 웹 스토어 개발자 대시보드](https://chrome.google.com/webstore/devconsole)

---

## 📅 작업 일지

### 2026-01-11
- 프로젝트 기획 및 PRD 작성
- MVP 기능 전체 구현 완료
- UI/UX 구현 (플로팅 버튼, 팝업)
- Chrome 웹 스토어 배포 준비 완료
  - 개인정보처리방침 작성
  - 스토어 등록 정보 작성
  - 프로모션 이미지 생성
  - ZIP 패키징 완료
