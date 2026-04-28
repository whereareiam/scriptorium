FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache git

COPY .next/standalone/node_modules ./node_modules
COPY .next/standalone/templates/project-docs ./
COPY .next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
