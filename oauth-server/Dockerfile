FROM node:22-bullseye-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all deps (include dev for prisma generate)
RUN npm install

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

# Generate prisma client (sau khi có mã nguồn)
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

CMD ["npm", "start"]

