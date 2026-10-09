FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    HUSKY=0 \
    CI=true \
    DATABASE_URL=file:/tmp/blockmine.db \
    PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh \
    PRISMA_BINARIES_MIRROR=https://binaries.prisma.sh

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY . /src
WORKDIR /src

RUN npm install --no-audit --no-fund \
    && npm run build

RUN npm test --workspace=backend || echo "WARNING: jest reported failures"
