FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Create directory for file upload vulnerability
RUN mkdir -p public/uploads
RUN chmod 777 public/uploads

# Expose the port
EXPOSE 3000

# Start the app
CMD [ "npm", "start" ]