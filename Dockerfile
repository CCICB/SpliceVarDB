FROM nginx:1.27.3-alpine3.20-slim

RUN apk update
RUN apk upgrade

COPY ./static /usr/share/nginx/html/static
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf


EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
