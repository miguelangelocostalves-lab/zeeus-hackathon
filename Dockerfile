FROM node:18-alpine
WORKDIR /app
RUN npm install better-sqlite3
COPY app.html ./index.html
COPY server.js ./server.js
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", "server.js"]
