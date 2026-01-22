import { defineConfig } from 'vite';
import fs from 'fs';

const certDir = './certs';
const keyPath = `${certDir}/localhost-key.pem`;
const certPath = `${certDir}/localhost.pem`;

let httpsOption = true;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  httpsOption = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    https: httpsOption
  }
});
