# 家庭积分管理系统V3 Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装构建工具
RUN apk add --no-cache python3 make g++ git

# 复制所有代码
COPY . .

# 安装依赖
RUN npm install

# 暴露端口
EXPOSE 3002

# 启动命令
CMD ["node", "server.js"]
