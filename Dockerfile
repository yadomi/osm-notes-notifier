FROM node:16-alpine

ADD ./yarn.lock .
ADD ./packag.json .

RUN yarn install

ADD index.js .

ENTRYPOINT [ "node", "index.js", "/data/config.yml" ]