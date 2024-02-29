### Install

```bash
(sudo apt install -y nodejs npm)
```

---

### Quick Start

```bash
impromptu-server$ cd backend
impromptu-server/backend$ npm install
impromptu-server/backend$ npm run build

impromptu-server$ cd frontend
impromptu-server/frontend$ npm install
impromptu-server/frontend$ npm run build

// generate certificate
impromptu-server$ cd ssl
impromptu-server/ssl$ openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

// start
impromptu-server$ cd backend
impromptu-server/backend$ npm run start:https
```