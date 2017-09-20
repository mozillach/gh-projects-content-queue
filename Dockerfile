FROM node:latest
USER node
COPY . .
RUN npm i
