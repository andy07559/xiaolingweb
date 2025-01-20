/**
 * Web内容提取工具前端页面
 * 提供直观的用户界面，支持URL输入、格式选择和内容提取
 */

'use client';

import React, { useState } from 'react';
import { ArrowRight, Copy, Check, Github, MessageSquare, Volume2 } from 'lucide-react';

// 提取结果接口定义
interface ExtractResult {
  url: string;
  content: string;
  format: string;
  type: ContentType;
  success: boolean;
}

// 缓存结果接口定义
interface CachedResult {
  content: string;  // 提取的内容
  format: string;   // 输出格式
}

// 结果缓存接口定义
interface ResultCache {
  [key: string]: {
    [format: string]: CachedResult;
  };
}

// 内容类型定义
type ContentType = "article" | "forum" | "weixin" | "jina";

// 输出格式类型
type OutputFormat = "text" | "markdown" | "html";

export default function Home() {
  // 状态管理
  const [url, setUrl] = useState<string>('');                    // URL输入
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('text');  // 输出格式
  const [result, setResult] = useState<ExtractResult | null>(null);       // 提取结果
  const [loading, setLoading] = useState<boolean>(false);         // 加载状态
  const [error, setError] = useState<string>('');                // 错误信息
  const [copied, setCopied] = useState<boolean>(false);           // 复制状态
  const [cache, setCache] = useState<ResultCache>({});   // 结果缓存

  /**
   * 内容提取处理函数
   * @param format 输出格式，默认使用当前选择的格式
   */
  const handleExtract = async (format: OutputFormat = outputFormat) => {
    try {
      // 检查缓存中是否已有结果
      if (cache[url]?.[format]) {
        setResult(cache[url][format] as ExtractResult);
        return;
      }

      // 开始提取
      setLoading(true);
      setError('');
      setResult(null);

      // 调用API
      const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}&output_format=${format}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '提取内容失败');
      }

      // 更新缓存
      setCache((prevCache: ResultCache) => ({
        ...prevCache,
        [url]: {
          ...(prevCache[url] || {}),
          [format]: data
        }
      }));

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 输出格式变更处理
   * @param format 新的输出格式
   */
  const handleFormatChange = async (format: OutputFormat) => {
    setOutputFormat(format);
    if (result) {
      await handleExtract(format);
    }
  };

  /**
   * URL变更处理
   * @param newUrl 新的URL
   */
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    // 清除之前的结果和缓存
    setResult(null);
    setError('');
    setCache({});
  };

  /**
   * 复制内容到剪贴板
   */
  const handleCopy = async () => {
    if (result?.content) {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * 获取内容类型的中文显示文本
   * @param type 内容类型
   */
  const getTypeText = (type: ContentType): string => {
    switch (type) {
      case "article":
        return "文章";
      case "forum":
        return "论坛";
      case "weixin":
        return "微信";
      case "jina":
        return "AI提取";
      default:
        return type;
    }
  };

  /**
   * 获取内容类型的图标
   * @param type 内容类型
   */
  const getTypeIcon = (type: ContentType): string => {
    switch (type) {
      case "article":
        return "📄";
      case "forum":
        return "💬";
      case "weixin":
        return "💚";
      case "jina":
        return "🤖";
      default:
        return "📝";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-blue-100 fixed top-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Web Extractor
              </span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">功能</a>
              <a href="#api" className="text-gray-600 hover:text-blue-600 transition-colors">API</a>
              <a
                href="https://github.com/eggacheb/web-content-extractor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-16">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              智能网页内容提取
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              使用智能算法自动识别网页类型并提取核心内容，
              支持文章、论坛和微信等多种类型。
            </p>
          </div>

          {/* 功能卡片 */}
          <div className="grid md:grid-cols-2 gap-8 mb-20" id="features">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-50 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">智能内容提取</h3>
              <p className="text-gray-600">
                自动识别网页类型和主要内容，
                智能去除干扰元素。
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-50 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <Volume2 className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">多格式支持</h3>
              <p className="text-gray-600">
                支持输出为纯文本、Markdown和HTML等多种格式，
                满足不同场景需求。
              </p>
            </div>
          </div>

          {/* 输入部分 */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg border border-blue-50 p-8 mb-8">
              <div className="space-y-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="输入网页URL，例如: https://example.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">输出格式</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => handleFormatChange(e.target.value as OutputFormat)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
                  >
                    <option value="text">纯文本</option>
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                  </select>
                </div>
                
                <button
                  onClick={() => handleExtract()}
                  disabled={loading || !url}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-blue-200 hover:shadow-xl disabled:shadow-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      开始提取
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* API使用说明 */}
              <div className="mt-8 pt-8 border-t border-gray-100" id="api">
                <h4 className="text-sm font-medium text-gray-900 mb-3">API 快速上手</h4>
                <div className="space-y-4">
                  <div>
                    <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-3 font-mono text-sm border border-gray-100">
                      <span className="flex-1 overflow-x-auto whitespace-nowrap text-gray-600">
                        GET /api/extract?url=https://example.com
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('/api/extract?url=https://example.com');
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p className="mb-2">参数说明：</p>
                      <ul className="space-y-2 list-disc pl-5">
                        <li><code className="text-blue-600">url</code>: 要提取内容的网页地址（必需）</li>
                        <li>
                          <code className="text-blue-600">output_format</code>: 输出格式（可选，默认为text）
                          <ul className="mt-1 space-y-1 list-none pl-5">
                            <li>• text: 纯文本格式</li>
                            <li>• markdown: Markdown格式</li>
                            <li>• html: HTML格式</li>
                          </ul>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-shake">
                {error}
              </div>
            )}

            {/* 结果展示 */}
            {result && (
              <div className="bg-white rounded-2xl shadow-lg border border-blue-50 p-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">提取结果</h3>
                    {result.type && (
                      <p className="text-sm text-gray-500 mt-1">
                        检测类型：{getTypeText(result.type)} {getTypeIcon(result.type)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        复制内容
                      </>
                    )}
                  </button>
                </div>
                <div className={`prose prose-gray max-w-none max-h-[600px] overflow-y-auto ${
                  outputFormat === 'html' ? 'whitespace-pre-wrap font-mono text-sm' : ''
                }`}>
                  <div className="break-words whitespace-pre-wrap">
                    {result.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
