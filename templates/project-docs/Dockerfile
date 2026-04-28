FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache git

COPY .next/standalone/node_modules ./node_modules
COPY .next/standalone/templates/project-docs ./
COPY .next/node_modules ./.next/node_modules
COPY .next/static ./.next/static
RUN if [ -d .next/node_modules ]; then \
      find .next/node_modules -maxdepth 1 -type l | while read -r link; do \
        target_name="$(basename "$(readlink "$link")")"; \
        rm "$link"; \
        cp -R "./node_modules/${target_name}" "$link"; \
      done; \
    fi

EXPOSE 3000
CMD ["node", "server.js"]
