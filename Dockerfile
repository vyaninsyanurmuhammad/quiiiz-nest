FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN apt-get update && apt-get install -y --no-install-recommends openssl && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npx prisma generate

EXPOSE 8002

CMD ["npm", "run", "start"]
