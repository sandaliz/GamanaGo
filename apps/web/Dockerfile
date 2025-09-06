# FROM node:18-alpine
# WORKDIR /app

# # Copy package.json and install deps
# COPY package*.json ./
# RUN npm install

# # Copy app source
# COPY . .

# EXPOSE 3000
# CMD ["npm","run","dev"]


# apps/web/Dockerfile
FROM node:18-alpine
WORKDIR /app

# install deps in the image
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# bring in the rest of the app
COPY . .

EXPOSE 3000
CMD ["npm","run","dev","--","-p","3000","-H","0.0.0.0"]
