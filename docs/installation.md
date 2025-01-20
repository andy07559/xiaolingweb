# Web内容提取工具安装部署指南

## 1. 系统要求

### 1.1 服务器环境
- 操作系统：Linux/Windows/MacOS
- Python 3.8+
- Node.js 16+
- npm 8+ 或 yarn 1.22+

### 1.2 推荐配置
- CPU: 2核心以上
- 内存: 4GB以上
- 硬盘: 20GB以上
- 网络: 带宽10Mbps以上

## 2. 安装步骤

### 2.1 获取代码
```bash
# 克隆代码仓库
git clone https://github.com/eggacheb/web-content-extractor.git
cd web-content-extractor
```

### 2.2 后端环境配置
```bash
# 创建Python虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/MacOS:
source venv/bin/activate

# 安装Python依赖
pip install -r requirements.txt
```

### 2.3 前端环境配置
```bash
# 安装Node.js依赖
npm install
# 或使用yarn
yarn install
```

### 2.4 构建前端
```bash
# 构建生产环境代码
npm run build
# 或使用yarn
yarn build
```

## 3. 部署配置

### 3.1 开发环境运行
```bash
# 启动开发服务器
npm run dev
# 或使用yarn
yarn dev
```

### 3.2 生产环境部署

#### 方案一：使用 PM2 部署（推荐）
```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "web-extractor" -- start

# 查看运行状态
pm2 status

# 查看日志
pm2 logs web-extractor
```

#### 方案二：使用 Docker 部署
```bash
# 构建Docker镜像
docker build -t web-extractor .

# 运行容器
docker run -d -p 3000:3000 --name web-extractor web-extractor

# 查看容器状态
docker ps

# 查看日志
docker logs web-extractor
```

## 4. 配置说明

### 4.1 环境变量配置
创建 `.env` 文件在项目根目录：
```env
# 服务器端口
PORT=3000

# API超时设置（毫秒）
API_TIMEOUT=15000

# 允许的来源域名，多个域名用逗号分隔
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 4.2 Nginx反向代理配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 5. 安全配置

### 5.1 防火墙设置
```bash
# 仅开放必要端口
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 5.2 SSL证书配置（推荐）
```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

## 6. 维护指南

### 6.1 日常维护
```bash
# 更新代码
git pull origin main

# 更新依赖
npm install
pip install -r requirements.txt

# 重新构建
npm run build

# 重启服务
pm2 restart web-extractor
```

### 6.2 日志管理
```bash
# 查看应用日志
pm2 logs web-extractor

# 清理日志
pm2 flush
```

### 6.3 性能监控
```bash
# 查看系统资源使用情况
pm2 monit
```

## 7. 故障排除

### 7.1 常见问题
1. 端口被占用
```bash
# 查看端口占用
lsof -i :3000
# 终止进程
kill -9 <PID>
```

2. 依赖安装失败
```bash
# 清理npm缓存
npm cache clean --force
# 重新安装依赖
npm install
```

### 7.2 错误日志位置
- PM2日志：`~/.pm2/logs/`
- Nginx日志：`/var/log/nginx/`
- 应用日志：`./logs/`

## 8. 更新维护

### 8.1 自动更新脚本
创建 `update.sh`:
```bash
#!/bin/bash
git pull
npm install
pip install -r requirements.txt
npm run build
pm2 restart web-extractor
```

### 8.2 定期维护建议
- 每周检查日志文件
- 每月更新依赖包
- 每季度进行性能评估
- 定期备份数据和配置

## 9. 备份策略

### 9.1 配置文件备份
```bash
# 创建备份目录
mkdir -p /backup/web-extractor

# 备份配置文件
cp .env /backup/web-extractor/
cp nginx.conf /backup/web-extractor/
```

### 9.2 自动备份脚本
创建 `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/web-extractor/$DATE"
mkdir -p $BACKUP_DIR
cp -r .env nginx.conf $BACKUP_DIR
``` 