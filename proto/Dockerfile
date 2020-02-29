# Install dependencies and build
FROM node:12.2-alpine AS builder
WORKDIR /usr/src/app-build
ADD package.json /usr/src/app-build
RUN npm install --only=prod
RUN mkdir -p node_modules

# Load the source code and execute
FROM node:12.2-alpine AS runner
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app-build/node_modules ./node_modules
ADD index.js /usr/src/app
ADD fn.js /usr/src/app

ENV NODE_ENV=production
WORKDIR /usr/src/app
CMD node index.js