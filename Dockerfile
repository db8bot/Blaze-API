FROM node:18.12

ENV NODE_ENV=production

WORKDIR /blazeAPI

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8080

CMD npm start
