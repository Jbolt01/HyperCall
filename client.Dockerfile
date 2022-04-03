FROM node:17-alpine3.14

WORKDIR /bruh

COPY package*.json ./
RUN yarn install

copy . .
CMD ["yarn", "start"]
