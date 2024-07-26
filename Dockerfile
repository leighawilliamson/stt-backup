FROM icr.io/codeengine/node:20-alpine
WORKDIR /app
RUN node -v
RUN npm -v
COPY package.json /app
RUN npm install --omit=dev

COPY src/*.js /app

ENV NODE_ENV production

EXPOSE 8080
CMD [ "node", "app.js" ]
