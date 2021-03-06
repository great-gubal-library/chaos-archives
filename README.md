# Chaos Archives

The prototype of the RP portal for the Chaos EU datacenter in FFXIV.

## Building

### Client

```
cd client
quasar build
```

### Server

```
cd server
yarn docker:build
```

## Deploying

Currently the frontend and the API are served from the same HTTP host.

### Client

Just copy `dist/spa` to your web root or set up your web server to serve it directly.

### Server

```
cd server
docker-compose up -d
```

Set up your web server to proxy the `/api` directory to the API server (runs HTTP on port 8111 by default).
