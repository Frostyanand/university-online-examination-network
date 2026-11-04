FROM kathara/base:latest
RUN apt-get update && apt-get install -y --no-install-recommends \
    keepalived \
    nginx \
    curl \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

