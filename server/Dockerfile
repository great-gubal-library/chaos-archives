# The jpegtran-bin dependency tries to build from source (and fails) under node:lts-alpine,
# so we use node:lts-slim instead.
FROM node:20-slim
WORKDIR /usr/src/app

# Install dependencies: curl, nest cli, and yarn wrapper (from corepack)
RUN apt update \
  && apt install -y curl \
  && npm install -g @nestjs/cli \
  && rm -rf /root/npm/_cacache \
  && corepack enable

# Switch to unprivileged user
RUN groupmod -g 1000 node && usermod -u 1000 -g 1000 node && chown -R node.node /usr/src/app
USER node

# Build application

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install && rm -rf /home/node/.cache/yarn /home/node/.npm

COPY . .

RUN nest build chaosarchives && nest build steward

CMD ["node", "dist/apps/chaosarchives/main.js"]
