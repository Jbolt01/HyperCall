FROM node:17-alpine3.14

WORKDIR /sus

COPY package*.json ./
RUN yarn install

copy . .
CMD ["yarn", "server"]
