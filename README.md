# 家庭积分管理系统 V3

一个简单实用的家庭积分管理 Web 应用，帮助家长管理孩子的积分奖惩。

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ 功能特点

- **管理员登录** - 家长账号管理
- **孩子管理** - 添加、编辑、删除孩子信息
- **积分管理**
  - 加分项自定义（做家务、学习进步等）
  - 扣分项自定义（迟到、调皮等）
  - 积分兑换奖励
- **数据记录** - 详细记录每次加减分情况
- **统计图表** - 可视化查看积分趋势
- **主题定制** - 自定义界面颜色
- **本地存储** - SQLite 数据库，无需额外配置

## 🛠 技术栈

- **后端**: Node.js + Express
- **前端**: 原生 HTML/CSS/JavaScript
- **数据库**: SQLite (sql.js)
- **部署**: Docker

## 🚀 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

访问 http://localhost:3002

### Docker 部署

```bash
# 构建并运行
docker-compose up -d
```

## 📱 使用说明

1. **首次登录** - 使用初始账号 admin/admin123
2. **添加孩子** - 在设置中添加孩子信息
3. **设置积分项目** - 自定义加分和扣分项目
4. **设置奖励** - 设置积分兑换的奖励
5. **日常使用** - 孩子登录后可查看积分和操作

## � API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/login` | POST | 管理员登录 |
| `/api/children` | GET/POST | 孩子列表/添加 |
| `/api/bonus-items` | GET/POST/DELETE | 加分项目管理 |
| `/api/deduct-items` | GET/POST/DELETE | 扣分项目管理 |
| `/api/rewards` | GET/POST/DELETE | 奖励管理 |
| `/api/bonus` | POST | 加分 |
| `/api/deduct` | POST | 扣分 |
| `/api/redeem` | POST | 积分兑换 |
| `/api/records` | GET | 积分记录 |
| `/api/statistics` | GET | 统计数据 |

## 📁 项目结构

```
kids-points-v2/
├── server.js          # 后端服务
├── public/            # 前端静态文件
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/              # SQLite 数据库
├── init.sql           # 初始化脚本
├── Dockerfile         # Docker 配置
└── docker-compose.yml # Docker Compose 配置
```

## 🔧 配置说明

- 默认端口: 3002
- 默认管理员: admin / 123456
- 数据库文件: data/points.db

## 📝 更新日志

### V3.0.0
- 全新界面设计
- 支持 Docker 部署
- 增加统计图表功能
- 增加主题定制功能

## 🤝 欢迎贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
