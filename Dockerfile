FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Prisma Migrate (opsional di Dockerfile, karena ini dilakukan di pipeline Jenkins)
# RUN npx prisma migrate deploy

EXPOSE 8002

CMD [ "npm", "run", "start" ]
