#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Serveur HTTPS simple pour tester l'application XR
Usage: python3 serveur-https.py
"""

import http.server
import ssl
import socketserver
import socket
import os

PORT = 8443

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    local_ip = get_local_ip()
    
    # Vérifie si les certificats existent
    cert_file = ".cert/cert.pem"
    key_file = ".cert/key.pem"
    
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("❌ Certificats SSL introuvables dans .cert/")
        print("Les certificats ont déjà été créés normalement.")
        exit(1)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(cert_file, key_file)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        
        print("=" * 60)
        print("🎣 Serveur HTTPS XR démarré !")
        print("=" * 60)
        print(f"\n🔒 URL HTTPS:")
        print(f"   https://{local_ip}:{PORT}")
        print(f"\n💻 En local:")
        print(f"   https://localhost:{PORT}")
        print(f"\n🥽 Sur Quest 3:")
        print(f"   1. Connectez PC et casque au même WiFi")
        print(f"   2. Ouvrez: https://{local_ip}:{PORT}")
        print(f"   3. Acceptez l'avertissement de certificat")
        print(f"   4. Cliquez sur 'Enter VR'")
        print(f"\n🛑 Ctrl+C pour arrêter")
        print("=" * 60 + "\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Serveur arrêté.")
