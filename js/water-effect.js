/**
 * water-effect.js
 * Effet d'eau avec montée progressive après le scan de la pièce
 */

document.addEventListener('DOMContentLoaded', function () {
    const scene = document.querySelector('a-scene');

    scene.addEventListener('loaded', function () {
        initWaterEffect();
    });

    // Écouter l'événement personnalisé pour le scan complet
    window.addEventListener('class-scanned', function () {
        console.log('🚀 Scan détecté ! Lancement de l\'effet sous l\'eau...');
        initWaterRising();
    });
});

function initWaterEffect() {
    const waterSurface = document.querySelector('#water-surface');
    if (!waterSurface) return;

    // Initialisation simple de l'eau (basée sur Three.js si disponible via index.html)
    console.log('✅ Surface d\'eau prête, en attente du scan...');
}

function initWaterRising() {
    const waterVolume = document.querySelector('#water-volume');
    const waterSurface = document.querySelector('#water-surface');
    const underwaterSphere = document.querySelector('#underwater-sphere');

    if (!waterVolume || !waterSurface) return;

    const endHeight = 5; // Remplit la pièce (5m)
    const eyeLevel = 1.6;
    const riseDuration = 20; // 20 secondes pour plus de réalisme
    const waterState = { height: 0.1 };

    let isUnderwater = false;

    // Animation de montée de l'eau
    if (window.gsap) {
        gsap.to(waterState, {
            height: endHeight,
            duration: riseDuration,
            ease: "power1.inOut",
            onUpdate: function () {
                const currentHeight = waterState.height;
                waterVolume.setAttribute('height', currentHeight);
                waterVolume.setAttribute('position', `0 ${currentHeight / 2} 0`);
                waterSurface.setAttribute('position', `0 ${currentHeight} 0`);

                if (currentHeight >= eyeLevel && !isUnderwater) {
                    isUnderwater = true;
                    transitionToUnderwater();
                }
            }
        });

        // Filtre bleu (overlay)
        if (underwaterSphere) {
            underwaterSphere.setAttribute('visible', 'true');
            gsap.to({ opacity: 0 }, {
                opacity: 0.45,
                duration: 10,
                ease: "sine.inOut",
                onUpdate: function () {
                    underwaterSphere.setAttribute('material', 'opacity', this.targets()[0].opacity);
                }
            });
        }
    } else {
        console.warn('GSAP non trouvé, animation simplifiée.');
        waterVolume.setAttribute('animation', `property: height; to: ${endHeight}; dur: ${riseDuration * 1000}`);
    }
}

function transitionToUnderwater() {
    console.log('🌊 Expérience sous-marine activée');
    // Autres effets (bulles, etc.) peuvent être ajoutés ici
}
