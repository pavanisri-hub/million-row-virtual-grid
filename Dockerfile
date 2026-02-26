# Stage 1: Build React app
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
# Ensure data exists in public for final image
RUN npm run generate-data
RUN npm run build

# Stage 2: Nginx to serve static files
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/public/index.html /usr/share/nginx/html/index.html

# Basic nginx config (optional: use default)
EXPOSE 80

# Healthcheck will hit /
CMD ["nginx", "-g", "daemon off;"]
