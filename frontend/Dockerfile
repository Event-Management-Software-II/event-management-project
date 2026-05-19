FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV PORT=3002
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", ".output/server/index.mjs"]