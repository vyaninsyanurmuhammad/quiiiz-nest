FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma migrate deploy

EXPOSE 8002

CMD [ "npm", "run", "start" ]
