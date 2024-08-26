# Dockerfile

FROM node:latest

WORKDIR /app

# Copy package.json dan install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Install PM2 globally
RUN npm install -g pm2

# Install OpenSSL
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy semua file
COPY . .

# Debugging: menampilkan isi .env
RUN echo "DATABASE_URL: $(grep DATABASE_URL .env)" \
    && echo "DIRECT_URL: $(grep DIRECT_URL .env)"

# Generate Prisma Client dan tambahkan logging untuk memastikan eksekusi sukses
RUN npx prisma generate

# Build aplikasi (sesuaikan perintah build ini dengan framework yang Anda gunakan, contoh untuk aplikasi berbasis Nest.js)
RUN npm run build

# Salin file .env ke dalam direktori dist
RUN cp .env ./dist/.env

# Expose port
EXPOSE 8002

# Jalankan aplikasi
# CMD ["npm", "run", "start"]
CMD ["pm2-runtime", "main.js"]
