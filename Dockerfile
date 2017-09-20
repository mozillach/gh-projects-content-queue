FROM node:latest
COPY . .
RUN npm i --no-save --production
USER node
CMD npm start --production
