/**
 * room-manager.js
 * Gère la détection de la pièce (Room Setup) sur Meta Quest 3
 * Déclenche l'événement 'class-scanned' lorsque le mesh ou les plans sont détectés
 */
AFRAME.registerComponent('room-manager', {
    init: function () {
        this.onEnterVR = this.onEnterVR.bind(this);
        this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
        this.meshDetected = false;
        console.log('room-manager initialized');
    },

    onEnterVR: function () {
        const session = this.el.sceneEl.renderer.xr.getSession();
        if (!session) return;

        // Écouter les changements dans les sources XR
        // Sur Quest 3, la fin du Room Setup expose le mesh/les plans
        session.addEventListener('squeezestart', () => {
            // Fallback manuel si besoin ou pour debug
            console.log('Squeeze detected - Debug trigger');
        });

        console.log('XR Session active, waiting for room data...');
    },

    tick: function () {
        const frame = this.el.sceneEl.frame;
        if (!frame || this.meshDetected) return;

        // Vérifier si des meshes (Room Setup) sont disponibles
        // L'API WebXR pour Quest 3 expose les meshes via frame.detectedMeshes
        if (frame.detectedMeshes && frame.detectedMeshes.size > 0) {
            console.log('🌊 Room Mesh detected! Initializing underwater effect...');
            this.meshDetected = true;

            // Colorer les meshes en bleu si possible (subtil)
            frame.detectedMeshes.forEach(mesh => {
                // Logique optionnelle pour styliser le mesh de la pièce
            });

            // Déclencher l'effet global
            window.dispatchEvent(new CustomEvent('class-scanned'));
        }
        // Fallback sur les plans si pas de mesh
        else if (frame.detectedPlanes && frame.detectedPlanes.size > 5) { // Seuil arbitraire pour "salle scannée"
            console.log('🌊 Room Planes detected! Initializing underwater effect...');
            this.meshDetected = true;
            window.dispatchEvent(new CustomEvent('class-scanned'));
        }
    }
});
