FROM oven/bun:1.4.2 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY app/.next/standalone/app ./
COPY app/.next/standalone/node_modules ./node_modules
COPY app/.next/standalone/example /example
COPY app/.next/static ./.next/static
COPY docker ./docker
RUN mkdir -p /data/scriptorium \
  && if [ -d /app/.next/node_modules ]; then \
      for alias in /app/.next/node_modules/*; do \
        if [ -L "$alias" ]; then \
          target="$(readlink "$alias")"; \
          case "$target" in \
            ../../../node_modules/*) \
              package_target="${target#../../../node_modules/}"; \
              ln -snf "../../node_modules/$package_target" "$alias"; \
              ln -snf "$package_target" "/app/node_modules/$(basename "$alias")"; \
              ;; \
          esac; \
        fi; \
      done; \
    fi \
  && chmod +x ./docker/entrypoint.sh \
  && chown -R bun:bun /app /data /example

EXPOSE 3000
USER bun
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["bun", "--smol", "server.js"]
