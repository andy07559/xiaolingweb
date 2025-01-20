// 初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('Content Extractor extension installed');
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'extractContent',
    title: '小灵内容提取',
    contexts: ['page', 'selection']
  });
  
  // 初始化缓存
  chrome.storage.local.set({ extractionCache: {} });
});

// 发送消息到content script
async function sendMessageToContentScript(tabId, message) {
  try {
    // 先注入content script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content/content.js']
    });
    
    // 然后发送消息
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab.id) return;

  if (info.menuItemId === 'extract-content') {
    try {
      const response = await sendMessageToContentScript(tab.id, {
        type: 'EXTRACT_CONTENT',
        format: 'text' // 默认使用文本格式
      });
      
      // 处理提取结果
      if (response.success) {
        // 保存到缓存
        const cache = await chrome.storage.local.get('extractionCache');
        cache.extractionCache[tab.url] = {
          content: response.content,
          timestamp: Date.now()
        };
        await chrome.storage.local.set(cache);
      }
    } catch (error) {
      console.error('Failed to extract content:', error);
    }
  } else if (info.menuItemId === 'extract-selection' && info.selectionText) {
    try {
      await sendMessageToContentScript(tab.id, {
        type: 'EXTRACT_SELECTION',
        selection: info.selectionText,
        format: 'text'
      });
    } catch (error) {
      console.error('Failed to extract selection:', error);
    }
  }
});

// 监听快捷键
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'extract-content') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await sendMessageToContentScript(tab.id, {
          type: 'EXTRACT_CONTENT',
          format: 'text'
        });
      }
    } catch (error) {
      console.error('Failed to handle command:', error);
    }
  }
});

// 缓存管理
async function cleanupCache() {
  try {
    const data = await chrome.storage.local.get('extractionCache');
    const cache = data.extractionCache || {};
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    
    // 清理过期缓存
    let hasChanges = false;
    Object.entries(cache).forEach(([key, value]) => {
      if (now - value.timestamp > maxAge) {
        delete cache[key];
        hasChanges = true;
      }
    });
    
    // 只有在有变化时才更新存储
    if (hasChanges) {
      await chrome.storage.local.set({ extractionCache: cache });
    }
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  }
}

// 每小时清理一次缓存
const CACHE_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1小时
setInterval(cleanupCache, CACHE_CLEANUP_INTERVAL);

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GENERATE_SUMMARY') {
    generateSummary(message.content, message.prompt)
      .then(summary => {
        sendResponse({ success: true, summary });
      })
      .catch(error => {
        console.error('Summary generation failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 表示会异步发送响应
  }
});

// 生成AI总结
async function generateSummary(content, prompt) {
  try {
    // 使用 DeepSeek API 生成总结
    const API_KEY = await chrome.storage.local.get('openaiApiKey');
    if (!API_KEY.openaiApiKey) {
      throw new Error('请先配置DeepSeek API Key');
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: prompt || '你是一个专业的文本总结助手。请对提供的文本进行简洁的总结，突出重点内容。'
          },
          {
            role: 'user',
            content: `请总结以下内容：\n${content}`
          }
        ],
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const result = await response.json();
    return result.choices[0].message.content.trim();
  } catch (error) {
    console.error('Failed to generate summary:', error);
    throw new Error('生成总结失败：' + error.message);
  }
} 