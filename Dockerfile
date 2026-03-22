# 家庭积分管理系统V3 Dockerfile
FROM node:18-slim

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制代码
COPY . .

# 暴露端口
EXPOSE 3002

# 启动命令
CMD ["node", "server.js"]
