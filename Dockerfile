# 家庭积分管理系统V3 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装构建工具和better-sqlite3依赖
RUN apk add --no-cache python3 make g++

# 复制package.json
COPY package.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3002

# 启动命令
CMD ["node", "server.js"]
