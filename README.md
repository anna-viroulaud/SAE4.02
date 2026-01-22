# SAE4.02

Petit projet A-Frame / WebXR : jeu de pêche au harpon destiné au Meta Quest.

## Générer des certificats locaux (simple)

J'ai ajouté un petit script qui crée des certificats auto-signés dans `certs/` :

1. Installer les dépendances et générer les certificats :

```bash
npm install
npm run gen:certs
```

2. Démarrer le serveur dev en HTTPS :

```bash
npm run dev:https
```

3. Depuis le Quest, ouvrez `https://<IP_DE_VOTRE_PC>:5173` (remplacez par l'IP locale de votre PC). Le certificat généré est auto-signé — si la page affiche un avertissement, vous pouvez utiliser `mkcert` (optionnel) pour créer un certificat de développement plus fiable sur vos appareils.

Remarque : ne commitez pas les certificats privés dans un dépôt public.