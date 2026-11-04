FROM kathara/frr:latest
RUN apt-get update && apt-get install -y --no-install-recommends \
    keepalived \
    iproute2 \
    iptables \
    tcpdump \
    procps \
    && rm -rf /var/lib/apt/lists/*

