# COAE-Forge frontend — build the Vite/React SPA, serve it with nginx.
# Build from the repo root:
#   docker build -f frontend/Dockerfile -t coae-forge-frontend .

# ---- build stage ----------------------------------------------------------
FROM node:20-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---- serve stage ----------------------------------------------------------
FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
