AFRAME.registerComponent('water-visual', {
  schema: {
    height: { type: 'number', default: 5.5 },
    radius: { type: 'number', default: 12 }
  },

  init: function () {
    // Simple static canvas texture for overhead light rays (cleaner, no animation)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Bright center gradient
    const grad = ctx.createRadialGradient(512, 180, 80, 512, 512, 680);
    grad.addColorStop(0, 'rgba(200,240,255,0.95)');
    grad.addColorStop(0.15, 'rgba(140,210,245,0.75)');
    grad.addColorStop(0.4, 'rgba(60,140,200,0.4)');
    grad.addColorStop(0.75, 'rgba(10,50,100,0.15)');
    grad.addColorStop(1, 'rgba(0,10,30,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Light rays (additive blend)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 20; i++) {
      const x = 350 + Math.random() * 324;
      const spread = 35 + Math.random() * 50;
      const gradient = ctx.createLinearGradient(x, 0, x - spread / 2, 1024);
      gradient.addColorStop(0, 'rgba(230,250,255,0.18)');
      gradient.addColorStop(0.5, 'rgba(190,230,255,0.08)');
      gradient.addColorStop(1, 'rgba(120,190,230,0.0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 12 + Math.random() * 16;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - spread + Math.random() * spread * 2, 1024);
      ctx.stroke();
    }

    const dataUrl = canvas.toDataURL();

    // Create hidden img element to avoid dataURL parsing issues
    const imgId = 'water-surface-texture';
    let img = document.getElementById(imgId);
    if (!img) {
      img = document.createElement('img');
      img.id = imgId;
      img.style.display = 'none';
      document.body.appendChild(img);
    }
    img.src = dataUrl;

    // Overhead plane for light shaft effect
    const plane = document.createElement('a-entity');
    plane.setAttribute('geometry', `primitive: plane; width: ${this.data.radius}; height: ${this.data.radius}`);
    plane.setAttribute('material', `src: #${imgId}; transparent: true; opacity: 0.5; side: double; emissive: #3a5f7a; emissiveIntensity: 0.1`);
    plane.setAttribute('rotation', '-90 0 0');
    plane.setAttribute('position', `0 ${this.data.height} 0`);
    this.el.sceneEl.appendChild(plane);
  }
});
