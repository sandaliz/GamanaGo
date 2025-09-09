
FROM node:18-alpine
WORKDIR /app

# for some native modules + better file watching
RUN apk add --no-cache libc6-compat git

# Install deps first (cache layer)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# App sources
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Put Next cache in a local FS path (not bind-mount)
ENV NEXT_CACHE_DIR=/tmp/next
# Improve watching on macOS bind mounts
ENV CHOKIDAR_USEPOLLING=1
ENV WATCHPACK_POLLING=true

EXPOSE 3000
CMD ["npm","run","dev","--","-p","3000","-H","0.0.0.0"]



# FROM node:18-alpine
# WORKDIR /app

# RUN apk add --no-cache libc6-compat


# COPY package*.json ./
# RUN npm ci --no-audit --no-fund


# COPY . .
# ENV NEXT_TELEMETRY_DISABLED=1
# EXPOSE 3000
# CMD ["npm","run","dev","--","-p","3000","-H","0.0.0.0"]


