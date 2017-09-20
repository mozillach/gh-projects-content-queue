FROM node:latest
COPY . .
RUN npm i
USER node
