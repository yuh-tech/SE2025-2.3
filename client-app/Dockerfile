FROM node:18-bullseye-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production deps
RUN npm install --production

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "start"]

