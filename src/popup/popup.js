/**
 * Shorts Auto Next - Popup Script
 * 팝업 UI 로직
 */

document.addEventListener('DOMContentLoaded', init);

// DOM 요소
let statusIndicator;
let statusText;
let autoPlayToggle;
let versionElement;

// 현재 설정
let settings = {
    autoPlayEnabled: true
};

/**
 * 초기화
 */
async function init() {
    // DOM 요소 참조
    statusIndicator = document.getElementById('statusIndicator');
    statusText = document.getElementById('statusText');
    autoPlayToggle = document.getElementById('autoPlayToggle');
    versionElement = document.getElementById('version');

    // 버전 표시
    displayVersion();

    // 설정 로드
    await loadSettings();

    // UI 업데이트
    updateUI();

    // 이벤트 리스너 등록
    autoPlayToggle.addEventListener('change', handleToggleChange);

    console.log('[ShortsAutoNext Popup] Initialized');
}

/**
 * 버전 표시
 */
function displayVersion() {
    try {
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
    } catch (error) {
        versionElement.textContent = 'v1.0.0';
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
            console.log('[ShortsAutoNext Popup] Settings loaded:', settings);
        }
    } catch (error) {
        console.error('[ShortsAutoNext Popup] Failed to load settings:', error);
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
        console.log('[ShortsAutoNext Popup] Settings saved');
    } catch (error) {
        console.error('[ShortsAutoNext Popup] Failed to save settings:', error);
    }
}

/**
 * 토글 변경 핸들러
 */
async function handleToggleChange() {
    settings.autoPlayEnabled = autoPlayToggle.checked;
    settings.lastUpdated = Date.now();

    updateUI();
    await saveSettings();

    // 현재 탭에 메시지 전송 (Content Script에 알림)
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('youtube.com/shorts')) {
            await chrome.tabs.sendMessage(tab.id, {
                type: 'SETTINGS_UPDATED',
                payload: settings
            });
        }
    } catch (error) {
        // Content Script가 없는 페이지일 수 있음, 무시
    }
}

/**
 * UI 업데이트
 */
function updateUI() {
    const isEnabled = settings.autoPlayEnabled;

    // 토글 상태
    autoPlayToggle.checked = isEnabled;

    // 상태 인디케이터
    statusIndicator.classList.toggle('enabled', isEnabled);
    statusIndicator.classList.toggle('disabled', !isEnabled);

    // 상태 텍스트
    statusText.textContent = isEnabled ? '자동재생 켜짐' : '자동재생 꺼짐';
}

/**
 * 스토리지 변경 감지
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.settings) {
        const newSettings = changes.settings.newValue;
        if (newSettings) {
            settings = newSettings;
            updateUI();
        }
    }
});
