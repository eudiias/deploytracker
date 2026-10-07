# Estágio 1: Build da aplicação React
FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Estágio 2: Servidor Nginx (Produção)
FROM nginx:alpine

# Remove configurações padrões do nginx
RUN rm -rf /usr/share/nginx/html/*
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração para o nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos gerados do estágio 1 para a pasta pública do nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
