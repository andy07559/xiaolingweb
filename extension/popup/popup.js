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
const analysisContainer = document.getElementById('analysisContainer');
const topicResult = document.getElementById('topicResult');
const keywordsResult = document.getElementById('keywordsResult');
const wordCountResult = document.getElementById('wordCountResult');
const readingTimeResult = document.getElementById('readingTimeResult');
const textToTranslate = document.getElementById('textToTranslate');
const pasteBtn = document.getElementById('pasteBtn');
const clearBtn = document.getElementById('clearBtn');
const translateTextBtn = document.getElementById('translateTextBtn');
const urlInput = document.getElementById('urlInput');
const oneClickBtn = document.getElementById('oneClickBtn');

// 状态变量
let currentTab = null;
let extracting = false;
let extractedMedia = null;

// 发送消息到content script
async function sendMessageToContentScript(tabId, message) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 先注入content script
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
      
      // 等待一小段时间确保脚本加载完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 尝试发送消息
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRIES) {
        throw new Error('无法连接到页面，请刷新页面后重试');
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showError('无法获取当前标签页');
      return;
    }
    currentTab = tab;

    // 设置事件监听器
    extractBtn.addEventListener('click', handleExtract);
    copyBtn.addEventListener('click', handleCopy);
    downloadBtn.addEventListener('click', handleDownload);
    summaryBtn.addEventListener('click', handleSummary);
    settingsBtn.addEventListener('click', showSettings);
    closeSettingsBtn.addEventListener('click', hideSettings);
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    testApiKeyBtn.addEventListener('click', testApiKey);
    promptSelect.addEventListener('change', handlePromptChange);
    copySummaryBtn.addEventListener('click', handleCopySummary);
    saveSummaryBtn.addEventListener('click', handleSaveSummary);
    oneClickBtn.addEventListener('click', handleOneClickProcess);
    
    // 文本翻译相关的事件监听器
    pasteBtn.addEventListener('click', handlePaste);
    clearBtn.addEventListener('click', handleClear);
    translateTextBtn.addEventListener('click', handleTranslateText);
    
    // 检查API Key状态
    const apiKey = await chrome.storage.local.get('openaiApiKey');
    updateApiKeyStatus(apiKey.openaiApiKey);
    
    // 设置当前URL
    if (tab.url) {
      urlInput.value = tab.url;
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    showError(getErrorMessage(error));
  }
});

// 一键处理函数
async function handleOneClickProcess() {
  try {
    showProgress('正在提取内容...', 25);
    
    // 获取URL
    const url = urlInput.value.trim() || currentTab.url;
    
    // 1. 提取内容
    const extractResult = await sendMessageToContentScript(currentTab.id, {
      type: 'EXTRACT_CONTENT',
      format: 'text'
    });
    
    if (!extractResult.success) {
      throw new Error(extractResult.error || '提取内容失败');
    }
    
    showProgress('正在生成AI总结...', 50);
    
    // 2. 生成AI总结
    const prompt = await getCurrentPrompt();
    const summaryResult = await chrome.runtime.sendMessage({
      type: 'GENERATE_SUMMARY',
      content: extractResult.content,
      prompt: prompt
    });
    
    if (!summaryResult.success) {
      throw new Error(summaryResult.error || 'AI总结生成失败');
    }
    
    showProgress('正在翻译内容...', 75);
    
    // 3. 检测语言并翻译(如果不是中文)
    const isChineseContent = /[\u4e00-\u9fa5]/.test(extractResult.content);
    let translatedContent = extractResult.content;
    
    if (!isChineseContent) {
      const translationResult = await sendMessageToContentScript(currentTab.id, {
        type: 'TRANSLATE_CONTENT',
        content: extractResult.content,
        targetLang: 'zh'
      });
      
      if (!translationResult.success) {
        throw new Error(translationResult.error || '翻译失败');
      }
      
      translatedContent = translationResult.content;
    }
    
    showProgress('完成处理', 100);
    
    // 显示结果
    showResult(translatedContent);
    showSummary(summaryResult.summary);
    showAnalysis(extractResult.analysis);
    
    // 隐藏进度条
    setTimeout(() => {
      hideProgress();
    }, 1000);
    
  } catch (error) {
    console.error('One-click process failed:', error);
    showError(getErrorMessage(error));
    hideProgress();
  }
}

// 修改现有的handleExtract函数以支持自定义URL
async function handleExtract() {
  try {
    showProgress('正在提取内容...', 50);
    
    // 获取URL
    const url = urlInput.value.trim() || currentTab.url;
    
    const response = await sendMessageToContentScript(currentTab.id, {
      type: 'EXTRACT_CONTENT',
      format: formatSelect.value
    });
    
    if (!response.success) {
      throw new Error(response.error || '提取内容失败');
    }
    
    showResult(response.content);
    if (response.analysis) {
      showAnalysis(response.analysis);
    }
    
    // 保存到缓存
    const cache = await chrome.storage.local.get('extractionCache');
    cache.extractionCache[url] = {
      content: response.content,
      analysis: response.analysis,
      timestamp: Date.now()
    };
    await chrome.storage.local.set(cache);
    
  } catch (error) {
    console.error('Extract failed:', error);
    showError(getErrorMessage(error));
  } finally {
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
  // 清除之前的操作按钮
  const existingButtons = resultContainer.querySelector('.action-buttons');
  if (existingButtons) {
    existingButtons.remove();
  }
  
  // 创建新的操作按钮容器
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';
  
  // 添加翻译按钮
  const translateBtn = document.createElement('button');
  translateBtn.textContent = '翻译内容';
  translateBtn.onclick = handleTranslate;
  actionButtons.appendChild(translateBtn);
  
  // 添加媒体提取按钮
  const mediaBtn = document.createElement('button');
  mediaBtn.textContent = '查看图片/表格';
  mediaBtn.onclick = handleShowMedia;
  actionButtons.appendChild(mediaBtn);
  
  // 先显示内容
  resultContent.textContent = content;
  resultContainer.style.display = 'block';
  
  // 在内容之前插入按钮
  resultContainer.insertBefore(actionButtons, resultContainer.firstChild);
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
    apiKeyInput.value = apiKey;
  } else {
    apiKeyStatus.textContent = '未配置';
    apiKeyStatus.style.color = '#dc3545';
    testApiKeyBtn.style.display = 'none';
    apiKeyInput.value = '';
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

// 显示分析结果
function showAnalysis(analysis) {
  if (!analysis) return;
  
  // 显示主题
  topicResult.textContent = analysis.topic || '未知';
  
  // 显示关键词
  keywordsResult.innerHTML = (analysis.keywords || [])
    .map(keyword => `<span class="keyword">${keyword}</span>`)
    .join('');
  
  // 显示字数
  wordCountResult.textContent = analysis.wordCount ? `${analysis.wordCount} 字` : '0 字';
  
  // 显示阅读时间
  readingTimeResult.textContent = analysis.readingTime ? `约 ${analysis.readingTime} 分钟` : '未知';
  
  // 显示分析容器
  analysisContainer.style.display = 'block';
}

// 处理翻译
async function handleTranslate() {
  try {
    const content = resultContent.textContent;
    if (!content) return;
    
    // 创建语言选择对话框
    const dialog = document.createElement('div');
    dialog.className = 'translate-dialog';
    dialog.innerHTML = `
      <h3>翻译设置</h3>
      <div class="form-group">
        <label for="targetLang">目标语言：</label>
        <select id="targetLang">
          <option value="zh" selected>中文 (Chinese)</option>
          <option value="en">英语 (English)</option>
          <option value="ja">日语 (Japanese)</option>
          <option value="ko">韩语 (Korean)</option>
          <option value="fr">法语 (French)</option>
          <option value="de">德语 (German)</option>
          <option value="es">西班牙语 (Spanish)</option>
          <option value="ru">俄语 (Russian)</option>
          <option value="it">意大利语 (Italian)</option>
          <option value="pt">葡萄牙语 (Portuguese)</option>
          <option value="nl">荷兰语 (Dutch)</option>
          <option value="pl">波兰语 (Polish)</option>
          <option value="tr">土耳其语 (Turkish)</option>
          <option value="ar">阿拉伯语 (Arabic)</option>
          <option value="hi">印地语 (Hindi)</option>
          <option value="th">泰语 (Thai)</option>
          <option value="vi">越南语 (Vietnamese)</option>
        </select>
      </div>
      
      <div class="form-group" id="styleGroup" style="display: none;">
        <label for="translateStyle">翻译风格：</label>
        <select id="translateStyle">
          <option value="formal">正式 (适合商务和学术场合)</option>
          <option value="casual">日常 (适合非正式交流)</option>
          <option value="technical">专业 (适合技术文档)</option>
          <option value="creative">创意 (适合文学创作)</option>
        </select>
      </div>
      
      <div class="dialog-buttons">
        <button id="translateConfirm">翻译</button>
        <button id="translateCancel">取消</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 处理语言选择变化
    const targetLang = document.getElementById('targetLang');
    const styleGroup = document.getElementById('styleGroup');
    const translateStyle = document.getElementById('translateStyle');
    
    targetLang.addEventListener('change', () => {
      // 目前只为英语和日语提供风格选择
      styleGroup.style.display = ['en', 'ja'].includes(targetLang.value) ? 'block' : 'none';
      
      // 更新风格选项
      if (targetLang.value === 'ja') {
        translateStyle.innerHTML = `
          <option value="keigo">敬语 (适合正式场合)</option>
          <option value="casual">普通形式 (适合日常交流)</option>
          <option value="anime">动漫风格</option>
          <option value="technical">专业用语 (适合技术文档)</option>
        `;
      } else {
        translateStyle.innerHTML = `
          <option value="formal">正式 (适合商务和学术场合)</option>
          <option value="casual">日常 (适合非正式交流)</option>
          <option value="technical">专业 (适合技术文档)</option>
          <option value="creative">创意 (适合文学创作)</option>
        `;
      }
    });
    
    // 处理按钮点击
    document.getElementById('translateCancel').onclick = () => dialog.remove();
    document.getElementById('translateConfirm').onclick = async () => {
      const selectedLang = targetLang.value;
      const selectedStyle = translateStyle.value;
      dialog.remove();
      
      showProgress('正在翻译...', 0);
      
      // 获取翻译提示词
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'TRANSLATE_CONTENT',
        content: content,
        targetLang: selectedLang,
        style: selectedStyle
      });
      
      if (!response.success) {
        throw new Error(response.error || '生成翻译提示词失败');
      }
      
      // 使用AI进行翻译
      const translationResponse = await chrome.runtime.sendMessage({
        type: 'GENERATE_SUMMARY',
        content: response.prompt
      });
      
      if (!translationResponse.success) {
        throw new Error(translationResponse.error || '翻译失败');
      }
      
      // 显示翻译结果
      showTranslation(translationResponse.summary);
    };
    
  } catch (error) {
    console.error('Translation failed:', error);
    showError(getErrorMessage(error));
  } finally {
    hideProgress();
  }
}

// 显示翻译结果
function showTranslation(translation) {
  // 移除现有的翻译结果容器（如果存在）
  const existingContainer = document.querySelector('.translation-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  const translationContainer = document.createElement('div');
  translationContainer.className = 'translation-container';
  translationContainer.innerHTML = `
    <h3>翻译结果</h3>
    <pre class="translation-content">${translation}</pre>
    <div class="translation-actions">
      <button onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.textContent)">复制翻译</button>
    </div>
  `;
  
  // 如果是从文本框翻译，将结果插入到文本框后面
  if (document.activeElement === textToTranslate || textToTranslate.value.trim()) {
    textToTranslate.parentElement.insertBefore(translationContainer, textToTranslate.nextSibling);
  } else {
    // 否则添加到结果容器中（用于网页内容翻译）
    resultContainer.appendChild(translationContainer);
  }
}

// 处理媒体内容显示
function handleShowMedia() {
  try {
    const media = extractedMedia; // 从缓存中获取
    if (!media) return;
    
    const mediaContainer = document.createElement('div');
    mediaContainer.className = 'media-container';
    
    // 显示图片
    if (media.images.length > 0) {
      const imagesSection = document.createElement('div');
      imagesSection.className = 'images-section';
      imagesSection.innerHTML = `
        <h3>图片 (${media.images.length})</h3>
        <div class="image-grid">
          ${media.images.map(img => `
            <div class="image-item">
              <img src="${img.src}" alt="${img.alt}" title="${img.title}">
              <div class="image-info">
                <span>${img.dimensions.width}x${img.dimensions.height}</span>
                ${img.alt ? `<span>${img.alt}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
      mediaContainer.appendChild(imagesSection);
    }
    
    // 显示表格
    if (media.tables.length > 0) {
      const tablesSection = document.createElement('div');
      tablesSection.className = 'tables-section';
      tablesSection.innerHTML = `
        <h3>表格 (${media.tables.length})</h3>
        ${media.tables.map((table, index) => `
          <div class="table-item">
            ${table.caption ? `<div class="table-caption">${table.caption}</div>` : ''}
            <table>
              ${table.rows.map(row => `
                <tr>
                  ${row.map(cell => `
                    <${cell.isHeader ? 'th' : 'td'}
                      ${cell.colspan > 1 ? `colspan="${cell.colspan}"` : ''}
                      ${cell.rowspan > 1 ? `rowspan="${cell.rowspan}"` : ''}
                    >${cell.content}</${cell.isHeader ? 'th' : 'td'}>
                  `).join('')}
                </tr>
              `).join('')}
            </table>
          </div>
        `).join('')}
      `;
      mediaContainer.appendChild(tablesSection);
    }
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.onclick = () => mediaContainer.remove();
    mediaContainer.appendChild(closeBtn);
    
    document.body.appendChild(mediaContainer);
    
  } catch (error) {
    console.error('Show media failed:', error);
    showError(getErrorMessage(error));
  }
}

// 处理粘贴
async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    textToTranslate.value = text;
    showMessage('已粘贴内容');
  } catch (error) {
    console.error('Paste failed:', error);
    showError('粘贴失败，请重试');
  }
}

// 处理清空
function handleClear() {
  textToTranslate.value = '';
  showMessage('已清空内容');
}

// 处理文本翻译
async function handleTranslateText() {
  const content = textToTranslate.value.trim();
  if (!content) {
    showError('请输入要翻译的文本');
    return;
  }
  
  try {
    showProgress('正在翻译...', 0);
    
    // 直接使用AI进行翻译
    const translationPrompt = `你是一位专业的翻译专家，请将以下文本翻译成中文。

翻译要求：
1. 使用正式的书面语表达
2. 保持原文的语气和风格
3. 确保专业术语的准确性
4. 保留原文的格式和段落结构
5. 适应中文的表达习惯和文化特点
6. 对于专有名词：
   - 若有官方翻译，使用官方翻译
   - 若无官方翻译，保留原文并在首次出现时用括号标注解释
7. 对于文化特定表达：
   - 优先使用中文中的对应表达
   - 若无对应表达，采用意译并在必要时添加解释
8. 对于缩写和简称：
   - 首次出现时给出完整翻译
   - 后续可使用中文的对应缩写

原文：
${content}

翻译：`;
    
    // 使用AI进行翻译
    const translationResponse = await chrome.runtime.sendMessage({
      type: 'GENERATE_SUMMARY',
      content: translationPrompt
    });
    
    if (!translationResponse.success) {
      throw new Error(translationResponse.error || '翻译失败');
    }
    
    // 显示翻译结果
    showTranslation(translationResponse.summary);
    
    showProgress('翻译完成', 100);
    setTimeout(() => {
      hideProgress();
    }, 1000);
  } catch (error) {
    console.error('Translation failed:', error);
    showError(getErrorMessage(error));
    hideProgress();
  }
}