FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER root

COPY app/.next/standalone/app ./
COPY app/.next/standalone/node_modules ./node_modules
COPY app/.next/standalone/example /example
COPY app/.next/static ./.next/static
COPY docker ./docker
RUN mkdir -p /data/scriptorium \
  && chmod +x ./docker/entrypoint.sh \
  && chown -R bun:bun /app /data /example

EXPOSE 3000
USER bun
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["bun", "server.js"]
