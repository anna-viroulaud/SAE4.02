#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const outDir = path.resolve(__dirname, '..', 'certs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const attrs = [{ name: 'commonName', value: 'localhost' }];
const opts = {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256',
  extensions: [
    { name: 'basicConstraints', cA: false },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '::1' }
      ]
    }
  ]
};

console.log('Génération de certificats auto-signés dans', outDir);
const pems = selfsigned.generate(attrs, opts);
fs.writeFileSync(path.join(outDir, 'localhost.pem'), pems.cert);
fs.writeFileSync(path.join(outDir, 'localhost-key.pem'), pems.private);
console.log('Certificats créés:');
console.log(' -', path.join(outDir, 'localhost.pem'));
console.log(' -', path.join(outDir, 'localhost-key.pem'));
console.log('\nMaintenant lancez `npm run dev:https` pour démarrer le serveur Vite en HTTPS.');
