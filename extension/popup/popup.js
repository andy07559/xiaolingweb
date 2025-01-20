// DOM元素
const formatSelect = document.getElementById('formatSelect');
const extractBtn = document.getElementById('extractBtn');
const errorMessage = document.getElementById('errorMessage');
const resultContainer = document.getElementById('resultContainer');
const resultContent = document.getElementById('resultContent');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressMessage = document.getElementById('progressMessage');
const summaryBtn = document.getElementById('summaryBtn');
const summaryContainer = document.getElementById('summaryContainer');
const summaryContent = document.getElementById('summaryContent');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const mainContent = document.getElementById('mainContent');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const testApiKeyBtn = document.getElementById('testApiKeyBtn');
const promptSelect = document.getElementById('promptSelect');
const customPromptGroup = document.getElementById('customPromptGroup');
const customPromptInput = document.getElementById('customPromptInput');
const copySummaryBtn = document.getElementById('copySummaryBtn');
const saveSummaryBtn = document.getElementById('saveSummaryBtn');

// 状态变量
let currentTab = null;
let extracting = false;

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

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 获取当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tabs[0];

    // 检查缓存
    const cache = await chrome.storage.local.get('extractionCache');
    const cachedData = cache.extractionCache[currentTab.url];
    
    if (cachedData) {
      showResult(cachedData.content);
    }

    // 检查API Key状态
    const apiKey = await chrome.storage.local.get('openaiApiKey');
    updateApiKeyStatus(apiKey.openaiApiKey);

    // 检查提示词设置
    const prompt = await chrome.storage.local.get(['promptType', 'customPrompt']);
    if (prompt.promptType) {
      promptSelect.value = prompt.promptType;
      if (prompt.promptType === 'custom') {
        customPromptGroup.style.display = 'block';
        customPromptInput.value = prompt.customPrompt || '';
      }
    }

    // 绑定事件
    extractBtn.addEventListener('click', handleExtract);
    copyBtn.addEventListener('click', handleCopy);
    downloadBtn.addEventListener('click', handleDownload);
    summaryBtn.addEventListener('click', handleSummary);
    settingsBtn.addEventListener('click', showSettings);
    closeSettingsBtn.addEventListener('click', hideSettings);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    testApiKeyBtn.addEventListener('click', testApiKey);
    promptSelect.addEventListener('change', handlePromptChange);
    customPromptInput.addEventListener('change', saveCustomPrompt);
    copySummaryBtn.addEventListener('click', handleCopySummary);
    saveSummaryBtn.addEventListener('click', handleSaveSummary);
  } catch (error) {
    console.error('Initialization failed:', error);
    showError('初始化失败，请重试');
  }
});

// 处理提取
async function handleExtract() {
  if (extracting || !currentTab?.id) return;
  
  try {
    extracting = true;
    extractBtn.disabled = true;
    showProgress('开始提取...', 0);
    hideError();
    hideResult();

    // 发送消息给content script
    const response = await sendMessageToContentScript(currentTab.id, {
      type: 'EXTRACT_CONTENT',
      format: formatSelect.value
    });

    if (!response.success) {
      throw new Error(response.error || '提取失败');
    }

    showResult(response.content);
    
    // 缓存结果
    const cache = await chrome.storage.local.get('extractionCache');
    cache.extractionCache[currentTab.url] = {
      content: response.content,
      timestamp: Date.now()
    };
    await chrome.storage.local.set(cache);

  } catch (error) {
    console.error('Extraction failed:', error);
    showError(getErrorMessage(error));
  } finally {
    extracting = false;
    extractBtn.disabled = false;
    hideProgress();
  }
}

// 处理复制
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(resultContent.textContent);
    showMessage('复制成功!');
  } catch (error) {
    console.error('Copy failed:', error);
    showError('复制失败，请重试');
  }
}

// 处理下载
function handleDownload() {
  try {
    const content = resultContent.textContent;
    const format = formatSelect.value;
    const filename = `extracted_content.${format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt'}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    showMessage('下载成功!');
  } catch (error) {
    console.error('Download failed:', error);
    showError('下载失败，请重试');
  }
}

// 处理提示词类型变化
async function handlePromptChange() {
  const promptType = promptSelect.value;
  if (promptType === 'custom') {
    customPromptGroup.style.display = 'block';
  } else {
    customPromptGroup.style.display = 'none';
  }
  
  await chrome.storage.local.set({ promptType });
}

// 保存自定义提示词
async function saveCustomPrompt() {
  const customPrompt = customPromptInput.value.trim();
  await chrome.storage.local.set({ customPrompt });
}

// 获取当前提示词
async function getCurrentPrompt() {
  const { promptType, customPrompt } = await chrome.storage.local.get(['promptType', 'customPrompt']);
  
  switch (promptType) {
    case 'concise':
      return '请对文本进行简短精炼的总结，突出最核心的内容，使用简洁的语言，总结字数控制在200字以内。';
    case 'detailed':
      return '请对文本进行详细的分析总结，包括以下方面：\n1. 主要内容概述\n2. 关键论点分析\n3. 重要细节说明\n4. 逻辑关系梳理\n5. 总体评价';
    case 'creative':
      return '请以创新的视角解读文本内容，可以：\n1. 提供独特的见解\n2. 联系实际应用\n3. 探讨潜在影响\n4. 提出创新建议';
    case 'academic':
      return '请以学术的视角分析文本：\n1. 研究方法评估\n2. 论据可靠性分析\n3. 理论框架讨论\n4. 研究贡献点\n5. 局限性分析';
    case 'custom':
      return customPrompt || '请总结文本的主要内容，突出重点。';
    default:
      return '你是一个专业的文本总结助手。请对提供的文本进行简洁的总结，突出重点内容。总结要求：\n1. 提炼核心观点\n2. 保持客观准确\n3. 语言简洁清晰\n4. 突出重要信息\n5. 结构清晰有序';
  }
}

// 处理AI总结
async function handleSummary() {
  if (!resultContent.textContent) return;
  
  try {
    summaryBtn.disabled = true;
    showProgress('正在生成AI总结...', 0);
    
    // 获取当前提示词
    const prompt = await getCurrentPrompt();
    
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_SUMMARY',
      content: resultContent.textContent,
      prompt: prompt
    });
    
    if (!response.success) {
      throw new Error(response.error || 'AI总结生成失败');
    }
    
    showSummary(response.summary);
  } catch (error) {
    console.error('Summary generation failed:', error);
    showError(getErrorMessage(error));
  } finally {
    summaryBtn.disabled = false;
    hideProgress();
  }
}

// 显示错误
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// 隐藏错误
function hideError() {
  errorMessage.style.display = 'none';
}

// 显示结果
function showResult(content) {
  resultContent.textContent = content;
  resultContainer.style.display = 'block';
}

// 隐藏结果
function hideResult() {
  resultContainer.style.display = 'none';
}

// 显示进度
function showProgress(message, percent) {
  progressMessage.textContent = message;
  progressBar.style.setProperty('--progress', `${percent}%`);
  progressContainer.style.display = 'block';
}

// 隐藏进度
function hideProgress() {
  progressContainer.style.display = 'none';
}

// 错误消息处理
function getErrorMessage(error) {
  if (error.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '发生未知错误，请重试';
}

// 显示临时消息
function showMessage(message, duration = 2000) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message';
  messageElement.textContent = message;
  document.body.appendChild(messageElement);
  
  setTimeout(() => {
    messageElement.remove();
  }, duration);
}

// 显示总结
function showSummary(summary) {
  summaryContent.textContent = summary;
  summaryContainer.style.display = 'block';
}

// 隐藏总结
function hideSummary() {
  summaryContainer.style.display = 'none';
}

// 显示设置面板
function showSettings() {
  mainContent.style.display = 'none';
  settingsPanel.style.display = 'block';
}

// 隐藏设置面板
function hideSettings() {
  settingsPanel.style.display = 'none';
  mainContent.style.display = 'block';
}

// 保存API Key
async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showError('请输入API Key');
    return;
  }

  try {
    await chrome.storage.local.set({ openaiApiKey: apiKey });
    updateApiKeyStatus(apiKey);
    showMessage('API Key保存成功！');
    hideSettings();
  } catch (error) {
    console.error('Failed to save API key:', error);
    showError('保存API Key失败');
  }
}

// 更新API Key状态显示
function updateApiKeyStatus(apiKey) {
  if (apiKey) {
    apiKeyStatus.textContent = '已配置';
    apiKeyStatus.style.color = '#28a745';
    testApiKeyBtn.style.display = 'inline-block';
    // 在输入框中显示部分隐藏的API Key
    apiKeyInput.value = apiKey;
  } else {
    apiKeyStatus.textContent = '未配置';
    apiKeyStatus.style.color = '#dc3545';
    testApiKeyBtn.style.display = 'none';
  }
}

// 测试API Key
async function testApiKey() {
  try {
    testApiKeyBtn.disabled = true;
    showProgress('正在测试API连接...', 0);

    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_SUMMARY',
      content: '测试API连接'
    });

    if (response.success) {
      showMessage('API连接测试成功！');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('API test failed:', error);
    showError('API连接测试失败：' + getErrorMessage(error));
  } finally {
    testApiKeyBtn.disabled = false;
    hideProgress();
  }
}

// 处理复制总结
async function handleCopySummary() {
  try {
    await navigator.clipboard.writeText(summaryContent.textContent);
    showMessage('总结已复制到剪贴板！');
  } catch (error) {
    console.error('Copy summary failed:', error);
    showError('复制总结失败，请重试');
  }
}

// 处理保存总结
function handleSaveSummary() {
  try {
    const content = summaryContent.textContent;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ai-summary-${timestamp}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    showMessage('总结已保存！');
  } catch (error) {
    console.error('Save summary failed:', error);
    showError('保存总结失败，请重试');
  }
} 