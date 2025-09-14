FROM node:20-alpine

USER node
WORKDIR /app

EXPOSE 5173

ENTRYPOINT [ ]
CMD ["sh", "-c", "npm install && npm run dev"]