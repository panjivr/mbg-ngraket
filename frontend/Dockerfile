# Frontend (Node + Express + SQLite). Build toolchain included so the native
# sqlite3 module compiles on ARM (Oracle A1) if no prebuilt binary is available.
FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
EXPOSE 3014
ENV PORT=3014 NODE_ENV=production
CMD ["node", "server.js"]
