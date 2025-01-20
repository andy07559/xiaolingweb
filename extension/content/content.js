// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    try {
      // 检查URL类型
      if (window.location.protocol === 'chrome:' || 
          window.location.protocol === 'chrome-extension:' ||
          window.location.protocol === 'about:') {
        throw new Error('无法从浏览器内部页面提取内容');
      }

      const content = extractPageContent();
      const contentText = extractText(content); // 获取纯文本用于分析
      const analysis = analyzeContent(contentText);
      
      // 提取图片和表格
      const media = extractMediaContent(content);
      
      // 根据请求的格式转换内容
      const formattedContent = convertFormat(content, request.format);
      
      sendResponse({
        success: true,
        content: formattedContent,
        analysis: analysis,
        media: media
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  } else if (request.type === 'TRANSLATE_CONTENT') {
    try {
      const translationPrompt = generateTranslationPrompt(request.content, request.targetLang);
      sendResponse({
        success: true,
        prompt: translationPrompt
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
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

// 提取纯文本
function extractText(element) {
  if (!(element instanceof HTMLElement)) {
    return '';
  }

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

// 提取图片和表格内容
function extractMediaContent(element) {
  if (!(element instanceof HTMLElement)) {
    return { images: [], tables: [] };
  }

  // 提取图片
  const images = Array.from(element.querySelectorAll('img')).map(img => ({
    src: img.src,
    alt: img.alt || '',
    title: img.title || '',
    dimensions: {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height
    }
  })).filter(img => img.src && !img.src.startsWith('data:')); // 过滤掉base64图片

  // 提取表格
  const tables = Array.from(element.querySelectorAll('table')).map(table => {
    const rows = Array.from(table.rows).map(row => 
      Array.from(row.cells).map(cell => ({
        content: cell.textContent.trim(),
        isHeader: cell.tagName.toLowerCase() === 'th',
        colspan: cell.colspan || 1,
        rowspan: cell.rowspan || 1
      }))
    );

    return {
      caption: table.caption ? table.caption.textContent.trim() : '',
      rows: rows
    };
  });

  return {
    images,
    tables
  };
}

// 生成翻译提示词
function generateTranslationPrompt(content, targetLang) {
  const langNames = {
    'en': '英语',
    'zh': '中文',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语',
    'ru': '俄语',
    'it': '意大利语',
    'pt': '葡萄牙语',
    'nl': '荷兰语',
    'pl': '波兰语',
    'tr': '土耳其语',
    'ar': '阿拉伯语',
    'hi': '印地语',
    'th': '泰语',
    'vi': '越南语'
  };

  const langStyles = {
    'en': {
      formal: '使用正式的英语表达，适合商务和学术场合',
      casual: '使用日常口语化的表达，适合非正式场合',
      technical: '准确使用专业术语，保持技术文档的严谨性',
      creative: '采用生动活泼的表达方式，适合文学和创意内容'
    },
    'ja': {
      keigo: '使用敬语，适合正式场合',
      casual: '使用普通形式，适合日常交流',
      anime: '使用动漫风格的表达方式',
      technical: '使用专业用语，适合技术文档'
    }
  };

  const style = langStyles[targetLang]?.formal || '使用标准的书面语表达';
  const targetLangName = langNames[targetLang] || targetLang;
  
  return `你是一位专业的${targetLangName}翻译专家，请将以下文本翻译成${targetLangName}。

翻译要求：
1. ${style}
2. 保持原文的语气和风格
3. 确保专业术语的准确性
4. 保留原文的格式和段落结构
5. 适应目标语言的表达习惯和文化特点
6. 对于专有名词：
   - 若有官方翻译，使用官方翻译
   - 若无官方翻译，保留原文并在首次出现时用括号标注解释
7. 对于文化特定表达：
   - 优先使用目标语言中的对应表达
   - 若无对应表达，采用意译并在必要时添加解释
8. 对于缩写和简称：
   - 首次出现时给出完整翻译
   - 后续可使用目标语言的对应缩写

原文：
${content}

翻译：`;
}

// 转换格式
function convertFormat(content, format) {
  if (!(content instanceof HTMLElement)) {
    return '';
  }

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

// 转换为Markdown
function convertToMarkdown(element) {
  if (!(element instanceof HTMLElement)) {
    return '';
  }

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

// 内容分析功能
function analyzeContent(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return {
      keywords: [],
      topic: '未知',
      wordCount: 0,
      readingTime: 0
    };
  }

  try {
    // 提取关键词
    const keywords = extractKeywords(content);
    
    // 识别主题
    const topic = identifyTopic(content);
    
    return {
      keywords,
      topic,
      wordCount: countWords(content),
      readingTime: estimateReadingTime(content)
    };
  } catch (error) {
    console.error('Content analysis failed:', error);
    return {
      keywords: [],
      topic: '未知',
      wordCount: 0,
      readingTime: 0
    };
  }
}

// 提取关键词
function extractKeywords(content) {
  if (typeof content !== 'string') {
    return [];
  }

  const words = content.toLowerCase().split(/\s+/);
  const stopWords = new Set(['的', '了', '和', '是', '在', '我', '有', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
  
  // 统计词频
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 1 && !stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // 排序并返回前10个关键词
  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// 识别主题
function identifyTopic(content) {
  if (typeof content !== 'string') {
    return '未知';
  }

  const topics = {
    '技术': ['编程', '开发', '软件', '代码', '技术', '框架', 'API', '服务器', '数据库', '算法'],
    '新闻': ['新闻', '报道', '记者', '消息', '事件', '现场', '采访', '调查', '发布', '公布'],
    '教育': ['教育', '学习', '考试', '课程', '学校', '老师', '学生', '教学', '培训', '知识'],
    '商业': ['企业', '公司', '市场', '经济', '投资', '产品', '营销', '销售', '管理', '战略'],
    '科学': ['研究', '科学', '实验', '数据', '分析', '发现', '证明', '理论', '假设', '结论']
  };
  
  // 计算每个主题的匹配度
  const scores = {};
  for (const [topic, keywords] of Object.entries(topics)) {
    scores[topic] = keywords.reduce((score, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      return score + (matches ? matches.length : 0);
    }, 0);
  }
  
  // 返回得分最高的主题
  const sortedTopics = Object.entries(scores)
    .sort(([,a], [,b]) => b - a);
  
  return sortedTopics[0][1] > 0 ? sortedTopics[0][0] : '未知';
}

// 统计字数
function countWords(content) {
  if (typeof content !== 'string') {
    return 0;
  }
  return content.trim().split(/\s+/).length;
}

// 估算阅读时间（以分钟为单位）
function estimateReadingTime(content) {
  if (typeof content !== 'string') {
    return 0;
  }
  const wordsPerMinute = 200; // 假设平均阅读速度
  const words = countWords(content);
  return Math.ceil(words / wordsPerMinute);
} 