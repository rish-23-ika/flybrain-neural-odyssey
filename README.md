# 🪰 FLYBRAIN: Neural Odyssey

**Explore a fruit fly brain. Experiment with neural circuits. Experience flight in an interactive 3D world.**

FLYBRAIN: Neural Odyssey is an interactive browser-based project combining 3D connectome visualization, simplified neural circuit experiments, autonomous escape-response simulations, and immersive fruit fly flight environments.

The project explores how neural circuit models can be connected to observable behavior through interactive computational experiments.

## ✨ Features

- **🧠 3D Connectome Explorer** — Explore neural anatomy using 3D visualization of fruit fly neuron coordinates and cell classifications.
- **🔬 FLYLAB Experiments** — Experiment with circuit perturbations, including simulated neuron ablations, and compare model responses.
- **⚡ Neural Dodge** — Observe a simplified neural model respond to an approaching threat and influence simulated escape behavior.
- **🪰 Manual Flight** — Pilot a fruit fly through interactive 3D environments.
- **🌿 Immersive Environments** — Explore procedural worlds with obstacles, collectibles, and flight challenges.
- **🔊 Procedural Audio** — Experience synthesized sound effects generated in the browser.

## 🧪 Scientific Approach

FLYBRAIN combines connectome data visualization with simplified computational models of neural activity and behavior.

The Neural Dodge challenge uses mathematical looming-stimulus calculations and a simplified leaky-integrator neural model to connect simulated neural responses to movement.

**Scientific scope:** This is an educational and exploratory simulation, not a complete biological simulation of a living fruit fly brain. The presence of connectome data does not mean that every neuron and synapse is simulated in real time.

## 🛠️ Technology Stack

- React
- TypeScript
- Three.js / WebGL
- Vite
- HTML5 Canvas
- Web Audio API

## 🚀 Run Locally

### Prerequisites

- Node.js and npm
- Git

### Installation

```bash
git clone https://github.com/rish-23-ika/flybrain-neural-odyssey.git
cd flybrain-neural-odyssey
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

### Production Build

```bash
npm run build
npm run preview
```

The production build is typically generated in the `dist/` directory.

## 📁 Project Structure

```text
flybrain-neural-odyssey/
├── public/
│   └── data/          # Connectome and simulation data
├── src/               # Application source code
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🌐 Deployment

This project is designed as a client-side web application and can be deployed to a static hosting platform such as Cloudflare Pages, provided the production build succeeds and all required assets are included.

## 📚 Data Attribution

The project incorporates fruit fly connectome-related data and references the original FruitFly Brain project:

https://huggingface.co/spaces/VIDraft/fruitfly-brain

Please consult the original project's documentation and applicable data licence for attribution and redistribution requirements.

## ⚠️ Limitations

- Neural Dodge uses a simplified computational model rather than a complete real-time simulation of the full connectome.
- Simulated experimental outcomes depend on the model assumptions and parameters.
- Visualized anatomy and simulated neural behavior should not be interpreted as a complete reproduction of biological brain function.

## 👩‍💻 Author

**Rishika Rastogi**

B.Tech Computer Science & Engineering — Artificial Intelligence

GitHub: [@rish-23-ika](https://github.com/rish-23-ika)

---

*Built to explore the intersection of computational neuroscience, interactive simulation, and 3D web development.*
