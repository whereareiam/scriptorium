FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

COPY .next/standalone ./
COPY .next/static ./.next/static

EXPOSE 3000
USER bun
CMD ["bun", "server.js"]
