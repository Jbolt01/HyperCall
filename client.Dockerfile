FROM node:17-alpine3.14

WORKDIR /bruh

COPY package*.json ./
RUN yarn install

ENV NODE_OPTIONS=--openssl-legacy-provider

copy . .
CMD ["yarn", "start"]
