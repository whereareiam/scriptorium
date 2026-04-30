FROM oven/bun:1 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER root

COPY app/.next/standalone ./
COPY app/.next/static ./app/.next/static
COPY docker ./docker
RUN mkdir -p /data/scriptorium \
  && chmod +x ./docker/entrypoint.sh \
  && chown -R bun:bun /app /data

EXPOSE 3000
USER bun
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["bun", "app/server.js"]
