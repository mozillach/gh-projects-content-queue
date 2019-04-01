FROM node:10-alpine
RUN npm install pm2 -g
COPY . .
RUN npm ci --production
USER node
CMD [ "pm2-docker", "index.js" ]
