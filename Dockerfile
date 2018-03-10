# dockerize 
# docker build -t nickreed/second .

ARG MONGODB

FROM node:carbon

# Install yarn
RUN npm install --global yarn

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN yarn install
# If you are building your code for production
# RUN npm install --only=production
RUN yarn global add nodemon

# Bundle app source
COPY . .

EXPOSE 7001

CMD [ "npm", "run", "server:dev", "--", "--MONGODB=${MONGODB}" ]


