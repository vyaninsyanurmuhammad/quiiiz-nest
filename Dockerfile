# Dockerfile

FROM node:latest

WORKDIR /app

# Copy package.json dan install dependencies
COPY package*.json ./
RUN npm install

# Install OpenSSL
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy semua file
COPY . .

# Generate Prisma Client dan tambahkan logging untuk memastikan eksekusi sukses
RUN npx prisma generate --schema=./prisma/schema.prisma && echo "Prisma Client generated successfully"

# Expose port
EXPOSE 8002

# Jalankan aplikasi
CMD ["npm", "run", "start"]
