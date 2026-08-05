# Stage 1: Build application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS final
WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/build ./build
RUN npm ci --omit=dev

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "build"]