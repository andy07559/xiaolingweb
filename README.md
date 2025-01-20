# 小灵内容提取 Chrome插件

## 功能介绍

小灵内容提取是一个强大的Chrome浏览器插件，可以帮助用户快速提取网页内容，并提供AI智能总结功能。

### 主要特点

1. 智能内容提取
   - 自动识别网页主要内容
   - 支持多种输出格式（纯文本、HTML、Markdown）
   - 支持选中内容提取

2. AI智能总结
   - 集成DeepSeek AI引擎
   - 多种总结风格可选
   - 支持自定义提示词

3. 便捷操作
   - 右键菜单快速访问
   - 快捷键支持（Ctrl+Shift+E）
   - 一键复制和保存

## 安装说明

1. 下载插件文件
2. 打开Chrome浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择插件文件夹

## 配置说明

### DeepSeek API配置

1. 获取API Key
   - 访问 https://platform.deepseek.com/
   - 注册/登录DeepSeek账户
   - 在控制台申请API Key

2. 配置API Key
   - 点击插件图标
   - 点击右上角设置图标（⚙️）
   - 输入API Key并保存
   - 可以点击"测试连接"验证配置

### AI总结风格设置

提供以下预设风格：
- 默认总结：结构化的基础总结
- 简短精炼：200字以内的核心内容
- 详细分析：五个维度的深入分析
- 创意解读：创新视角的内容解读
- 学术分析：学术角度的专业分析
- 自定义：用户自定义提示词

## 使用说明

### 1. 内容提取

方式一：通过插件图标
1. 点击Chrome工具栏中的插件图标
2. 选择输出格式（纯文本/HTML/Markdown）
3. 点击"提取内容"按钮

方式二：通过右键菜单
1. 在网页空白处右键
2. 选择"小灵内容提取"

方式三：使用快捷键
- Windows/Linux: `Ctrl+Shift+E`
- Mac: `Command+Shift+E`

### 2. AI总结功能

1. 提取内容后，点击"AI总结"按钮
2. 等待几秒钟，AI生成的总结会显示在内容下方
3. 可以：
   - 点击"复制总结"将内容复制到剪贴板
   - 点击"保存总结"将内容保存为文本文件

### 3. 自定义总结风格

1. 点击设置图标（⚙️）
2. 在"AI总结风格"下拉菜单中选择"自定义"
3. 在文本框中输入自定义提示词
4. 提示词会自动保存

## 注意事项

1. API使用
   - 需要自行申请DeepSeek API Key
   - API调用可能产生费用
   - 请妥善保管API Key

2. 内容提取
   - 部分网站可能限制内容提取
   - 动态加载的内容可能无法完全提取
   - 建议在提取前等待页面完全加载

3. 数据安全
   - 所有数据本地处理
   - API Key加密存储
   - 不收集用户隐私信息

## 常见问题

1. Q: 为什么无法提取某些网站的内容？
   A: 可能是因为网站有反爬虫机制或使用了特殊的内容加载方式。

2. Q: 如何调整AI总结的长度？
   A: 可以在自定义提示词中指定要求的字数限制。

3. Q: 提取的内容格式混乱怎么办？
   A: 尝试切换不同的输出格式（纯文本/HTML/Markdown）。

## 更新日志

### v1.0
- 基础内容提取功能
- DeepSeek AI总结集成
- 多种总结风格支持
- 一键复制和保存功能

## 技术支持

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件至[support@email.com]

## 许可证

本项目采用 MIT 许可证 
