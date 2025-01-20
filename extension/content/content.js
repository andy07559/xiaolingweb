// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    try {
      const content = extractPageContent();
      const formattedContent = convertFormat(content, request.format || 'text');
      sendResponse({ success: true, content: formattedContent });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  // 必须返回true以保持消息通道开放
  return true;
});

// 提取页面内容
function extractPageContent() {
  // 1. 尝试找到主要内容区域
  const mainContent = findMainContent();
  
  // 2. 清理内容
  const cleanedContent = cleanContent(mainContent);
  
  return cleanedContent;
}

// 查找主要内容区域
function findMainContent() {
  // 按优先级尝试不同的选择器
  const selectors = [
    'article',                                    // 文章内容
    'main',                                       // 主要内容区
    '.article-content, .post-content',            // 常见的文章内容类名
    '#content, .content',                         // 内容ID或类名
    '.main-content, .main',                       // 主要内容类名
    'body'                                        // 如果都没找到，使用body
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.cloneNode(true);
    }
  }

  return document.body.cloneNode(true);
}

// 清理内容
function cleanContent(element) {
  if (!(element instanceof HTMLElement)) {
    return element;
  }

  // 1. 移除不需要的元素
  const removeSelectors = [
    'script',                    // 脚本
    'style',                     // 样式
    'iframe',                    // 嵌入框架
    'nav',                       // 导航
    'header',                    // 页头
    'footer',                    // 页脚
    '#header',                   // 页头（ID）
    '#footer',                   // 页脚（ID）
    '.header',                   // 页头（类）
    '.footer',                   // 页脚（类）
    '.navigation',              // 导航
    '.nav',                     // 导航
    '.sidebar',                 // 侧边栏
    '.ad',                      // 广告
    '.advertisement',           // 广告
    '.social-share',            // 社交分享
    '.related-posts',           // 相关文章
    '.comments',                // 评论区
    'form',                     // 表单
    'button'                    // 按钮
  ];

  removeSelectors.forEach(selector => {
    element.querySelectorAll(selector).forEach(el => el.remove());
  });

  // 2. 移除空白节点
  element.querySelectorAll('*').forEach(el => {
    if (!el.textContent?.trim()) {
      el.remove();
    }
  });

  // 3. 移除所有事件处理器
  element.querySelectorAll('*').forEach(el => {
    const clone = el.cloneNode(true);
    el.parentNode?.replaceChild(clone, el);
  });

  return element;
}

// 转换格式
function convertFormat(content, format) {
  switch (format) {
    case 'text':
      return extractText(content);
    case 'html':
      return content.innerHTML;
    case 'markdown':
      return convertToMarkdown(content);
    default:
      return extractText(content);
  }
}

// 提取纯文本
function extractText(element) {
  // 获取所有文本节点
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text) {
      textNodes.push(text);
    }
  }

  // 合并文本，保持段落格式
  return textNodes
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // 将多个换行符替换为两个
    .trim();
}

// 转换为Markdown
function convertToMarkdown(element) {
  let markdown = '';

  // 1. 处理标题
  element.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    const level = heading.tagName.charAt(1);
    const text = heading.textContent.trim();
    markdown += '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
  });

  // 2. 处理段落
  element.querySelectorAll('p').forEach(p => {
    markdown += p.textContent.trim() + '\n\n';
  });

  // 3. 处理列表
  element.querySelectorAll('ul, ol').forEach(list => {
    list.querySelectorAll('li').forEach((item, index) => {
      const prefix = list.tagName === 'UL' ? '* ' : `${index + 1}. `;
      markdown += prefix + item.textContent.trim() + '\n';
    });
    markdown += '\n';
  });

  // 4. 处理链接
  element.querySelectorAll('a').forEach(link => {
    const text = link.textContent.trim();
    const url = link.href;
    if (text && url) {
      markdown += `[${text}](${url})\n`;
    }
  });

  // 5. 处理图片
  element.querySelectorAll('img').forEach(img => {
    const alt = img.alt || '';
    const src = img.src;
    if (src) {
      markdown += `![${alt}](${src})\n`;
    }
  });

  return markdown.trim();
} 