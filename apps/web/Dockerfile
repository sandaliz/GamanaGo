FROM node:18-alpine
WORKDIR /app

# Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

EXPOSE 3000
CMD ["npm","run","dev"]
