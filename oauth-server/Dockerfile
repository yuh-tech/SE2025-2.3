FROM node:22-bullseye-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all deps (include dev for prisma generate)
RUN npm install

# Copy source
COPY . .

# Generate prisma client if schema exists (non-fatal if prisma not used)
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]

