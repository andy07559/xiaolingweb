# Web内容提取Chrome插件实现方案

## 1. 插件结构设计

```
extension/
├── manifest.json           # 插件配置文件
├── popup/                 # 弹出窗口界面
│   ├── popup.html
│   ├── popup.css
│   └── popup.tsx
├── background/           # 后台脚本
│   └── background.ts
├── content/             # 内容脚本
│   └── content.ts
└── assets/             # 资源文件
    └── icons/
```

## 2. 核心功能实现

### 2.1 manifest.json 配置

```json
{
  "manifest_version": 3,
  "name": "网页内容提取工具",
  "version": "1.0",
  "description": "智能提取网页核心内容，支持多种输出格式",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "contextMenus"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"]
    }
  ],
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

### 2.2 弹出窗口界面 (popup.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { ExtractResult, OutputFormat } from '../types';

const Popup: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [format, setFormat] = useState<OutputFormat>('text');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取当前标签页URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setUrl(tabs[0].url);
      }
    });
  }, []);

  const handleExtract = async () => {
    setLoading(true);
    setError(null);

    try {
      // 发送消息给content script执行提取
      const response = await chrome.tabs.sendMessage(
        tabs[0].id!,
        { type: 'EXTRACT_CONTENT', format }
      );
      setResult(response);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-container">
      <header>
        <h1>网页内容提取</h1>
      </header>

      <main>
        <div className="format-selector">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as OutputFormat)}
          >
            <option value="text">纯文本</option>
            <option value="html">HTML</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>

        <button 
          onClick={handleExtract}
          disabled={loading}
        >
          {loading ? '提取中...' : '提取内容'}
        </button>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {result && (
          <div className="result-container">
            <div className="result-actions">
              <button onClick={() => copyToClipboard(result.content)}>
                复制内容
              </button>
              <button onClick={() => downloadContent(result)}>
                下载文件
              </button>
            </div>
            <pre className="result-content">
              {result.content}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
};

export default Popup;
```

### 2.3 内容脚本 (content.ts)

```typescript
import { cleanContent, convertFormat } from './utils';

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    const content = extractPageContent();
    const formattedContent = convertFormat(content, request.format);
    sendResponse({ content: formattedContent });
  }
});

// 提取页面内容
function extractPageContent(): string {
  const article = document.querySelector('article') || document.body;
  let content = article.cloneNode(true) as HTMLElement;
  
  // 清理内容
  content = cleanContent(content);
  
  // 根据不同类型的页面采用不同的提取策略
  if (isNewsArticle()) {
    return extractNewsContent(content);
  } else if (isBlogPost()) {
    return extractBlogContent(content);
  } else {
    return extractGeneralContent(content);
  }
}

// 清理内容
function cleanContent(element: HTMLElement): HTMLElement {
  // 移除广告
  element.querySelectorAll('[class*="ad"], [id*="ad"]').forEach(el => el.remove());
  
  // 移除导航、页脚等
  element.querySelectorAll('nav, footer, header').forEach(el => el.remove());
  
  // 移除脚本和样式
  element.querySelectorAll('script, style').forEach(el => el.remove());
  
  // 移除空白节点
  element.querySelectorAll('*').forEach(el => {
    if (!el.textContent?.trim()) {
      el.remove();
    }
  });
  
  return element;
}

// 转换格式
function convertFormat(content: string, format: string): string {
  switch (format) {
    case 'text':
      return content.textContent || '';
    case 'html':
      return content.innerHTML;
    case 'markdown':
      return convertToMarkdown(content);
    default:
      return content.textContent || '';
  }
}
```

### 2.4 后台脚本 (background.ts)

```typescript
// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'extract-content',
    title: '提取页面内容',
    contexts: ['page']
  });
  
  chrome.contextMenus.create({
    id: 'extract-selection',
    title: '提取选中内容',
    contexts: ['selection']
  });
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'extract-content') {
    chrome.tabs.sendMessage(tab.id!, { type: 'EXTRACT_CONTENT' });
  } else if (info.menuItemId === 'extract-selection') {
    chrome.tabs.sendMessage(tab.id!, { 
      type: 'EXTRACT_SELECTION',
      selection: info.selectionText
    });
  }
});

// 监听快捷键
chrome.commands.onCommand.addListener((command) => {
  if (command === 'extract-content') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id!, { type: 'EXTRACT_CONTENT' });
    });
  }
});
```

## 3. 优化功能

### 3.1 离线支持

```typescript
// 在background.ts中添加缓存支持
chrome.runtime.onInstalled.addListener(() => {
  // 初始化缓存
  chrome.storage.local.set({ extractionCache: {} });
});

// 缓存提取结果
async function cacheExtraction(url: string, content: string) {
  const cache = await chrome.storage.local.get('extractionCache');
  cache.extractionCache[url] = {
    content,
    timestamp: Date.now()
  };
  await chrome.storage.local.set(cache);
}

// 获取缓存内容
async function getCachedExtraction(url: string) {
  const cache = await chrome.storage.local.get('extractionCache');
  const cached = cache.extractionCache[url];
  
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.content;
  }
  return null;
}
```

### 3.2 智能提取

```typescript
// 在content.ts中添加智能提取逻辑
function detectPageType(): string {
  const metaTags = document.getElementsByTagName('meta');
  const ogType = Array.from(metaTags).find(tag => tag.getAttribute('property') === 'og:type');
  
  if (ogType) {
    return ogType.getAttribute('content') || 'article';
  }
  
  // 基于DOM结构判断
  if (document.querySelector('article')) {
    return 'article';
  }
  
  if (document.querySelector('.blog-post, .post-content')) {
    return 'blog';
  }
  
  return 'general';
}

function extractByType(type: string): string {
  switch (type) {
    case 'article':
      return extractArticle();
    case 'blog':
      return extractBlog();
    default:
      return extractGeneral();
  }
}
```

### 3.3 批量提取

```typescript
// 在background.ts中添加批量提取支持
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'BATCH_EXTRACT') {
    const urls = request.urls;
    const results = [];
    
    Promise.all(urls.map(async (url) => {
      try {
        const tab = await chrome.tabs.create({ url, active: false });
        const result = await chrome.tabs.sendMessage(tab.id!, { 
          type: 'EXTRACT_CONTENT' 
        });
        results.push({ url, content: result });
        chrome.tabs.remove(tab.id!);
      } catch (error) {
        results.push({ url, error: error.message });
      }
    })).then(() => {
      sendResponse(results);
    });
  }
});
```

## 4. 用户体验优化

### 4.1 提取进度显示

```typescript
// 在popup.tsx中添加进度显示
interface ExtractionProgress {
  status: 'idle' | 'extracting' | 'processing' | 'complete';
  progress: number;
  message: string;
}

const [progress, setProgress] = useState<ExtractionProgress>({
  status: 'idle',
  progress: 0,
  message: ''
});

// 更新进度
function updateProgress(status: string, percent: number) {
  setProgress({
    status,
    progress: percent,
    message: getProgressMessage(status)
  });
}

// 进度条组件
const ProgressBar: React.FC<{progress: ExtractionProgress}> = ({ progress }) => (
  <div className="progress-container">
    <div 
      className="progress-bar"
      style={{ width: `${progress.progress}%` }}
    />
    <div className="progress-message">{progress.message}</div>
  </div>
);
```

### 4.2 快捷键支持

```json
// 在manifest.json中添加快捷键配置
{
  "commands": {
    "extract-content": {
      "suggested_key": {
        "default": "Ctrl+Shift+E",
        "mac": "Command+Shift+E"
      },
      "description": "提取页面内容"
    },
    "extract-selection": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "提取选中内容"
    }
  }
}
```

## 5. 安全性考虑

### 5.1 内容安全策略

```json
// 在manifest.json中添加CSP配置
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-forms allow-popups allow-modals"
  }
}
```

### 5.2 权限控制

```typescript
// 在background.ts中添加权限检查
async function checkPermissions(url: string): Promise<boolean> {
  try {
    await chrome.permissions.contains({
      permissions: ['activeTab'],
      origins: [url]
    });
    return true;
  } catch {
    return false;
  }
}

// 请求额外权限
async function requestPermissions(url: string): Promise<boolean> {
  try {
    return await chrome.permissions.request({
      permissions: ['activeTab'],
      origins: [url]
    });
  } catch {
    return false;
  }
}
```

## 6. 发布准备

### 6.1 打包配置

```json
// package.json
{
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "watch": "webpack --config webpack.config.js --watch",
    "package": "node scripts/package.js"
  }
}
```

### 6.2 发布检查清单

1. manifest.json 配置完整性检查
2. 权限使用最小化原则
3. 图标资源完整性
4. 本地化支持
5. 性能测试
6. 安全性测试
7. 跨浏览器兼容性测试

## 7. 后续优化方向

1. 支持更多输出格式
2. 添加自定义提取规则
3. 优化提取算法
4. 添加数据同步功能
5. 支持更多浏览器 