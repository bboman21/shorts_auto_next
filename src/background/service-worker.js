/**
 * Shorts Auto Next - Service Worker (Background Script)
 * 확장 프로그램 라이프사이클 관리 및 설정 저장/로드
 */

// 기본 설정값
const DEFAULT_SETTINGS = {
  autoPlayEnabled: true,
  delayMs: 0,
  lastUpdated: Date.now()
};

// 확장 프로그램 설치/업데이트 시
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ShortsAutoNext] Extension installed:', details.reason);
  
  // 최초 설치 시 기본 설정 저장
  if (details.reason === 'install') {
    saveSettings(DEFAULT_SETTINGS);
  }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('[ShortsAutoNext] Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // 비동기 응답을 위해 true 반환
});

/**
 * 메시지 핸들러
 */
async function handleMessage(message, sender) {
  console.log('[ShortsAutoNext] Received message:', message.type);
  
  switch (message.type) {
    case 'GET_SETTINGS':
      const settings = await loadSettings();
      return { success: true, data: settings };
    
    case 'SET_SETTINGS':
      await saveSettings(message.payload);
      return { success: true };
    
    case 'TOGGLE_AUTOPLAY':
      const currentSettings = await loadSettings();
      currentSettings.autoPlayEnabled = !currentSettings.autoPlayEnabled;
      currentSettings.lastUpdated = Date.now();
      await saveSettings(currentSettings);
      return { success: true, data: currentSettings };
    
    case 'GET_STATUS':
      return { 
        success: true, 
        data: { 
          version: chrome.runtime.getManifest().version,
          settings: await loadSettings()
        }
      };
    
    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * 설정 저장
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set({ settings });
    console.log('[ShortsAutoNext] Settings saved:', settings);
  } catch (error) {
    console.error('[ShortsAutoNext] Failed to save settings:', error);
    throw error;
  }
}

/**
 * 설정 로드
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get('settings');
    return result.settings || DEFAULT_SETTINGS;
  } catch (error) {
    console.error('[ShortsAutoNext] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// 설정 변경 감지
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.settings) {
    console.log('[ShortsAutoNext] Settings changed:', changes.settings.newValue);
  }
});
