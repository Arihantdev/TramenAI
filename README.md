# 🚆 TramenAI

### AI-Powered Railway Traffic Control & Scheduling System

TramenAI is an intelligent railway traffic management and scheduling platform designed to optimize train movement, reduce conflicts, and improve railway network efficiency.

[🌐 Live Demo](https://tramenai.netlify.app/) • [💻 GitHub Repository](https://github.com/Arihantdev/TramenAI)

---

## ✨ Overview

TramenAI provides a real-time-inspired control interface for managing complex railway networks. It visualizes routes, stations, trains, and traffic conditions while enabling intelligent scheduling, prioritization, and conflict management.

## 🚀 Key Features

- 🚆 Multi-route railway network visualization
- 🗺️ Interactive station and route mapping
- 🤖 Intelligent train traffic management
- ⏱️ Train scheduling and prioritization
- 🚨 Traffic conflict and congestion handling
- 📊 Real-time-inspired monitoring dashboard
- 🔄 DEMO / LIVE operational modes
- 🚉 Real Delhi / Delhi-NCR station integration in LIVE mode
- 🌐 Live train-data integration through an authorized API
- 🧠 Platform-aware digital twin
- 🛡️ Safe disruption simulation
- 🌍 Multilingual support
- 📱 Responsive control-room interface

---

## 🛠️ Tech Stack

- React
- Vite
- JavaScript
- Firebase / Firestore
- Netlify Functions
- Railway live-data APIs
- SVG-based interactive mapping

---

## 📸 Screenshots

> Add screenshots of the TramenAI dashboard here to showcase the interface.

---

## 📦 Included in This Build

- Four connected demo routes with 7 stations each:
  - R1 North: Ratnapur → Chandigarh Jn
  - R2 Central: Ratnapur → Chandigarh Jn via Suryanagar / Bhimgarh
  - R3 East: Ratnapur → Chandigarh Jn via Eshanpur / Fatehpur Road
  - R4 Express: Ratnapur → Chandigarh Jn via Bravpur / Dhanpur / Rajgarh / Sonapur
- Platform-aware digital twin with conflict detection and TramenAI resolution.
- Responsive map layout that keeps all stations and labels inside the map viewport, including fullscreen layouts.
- Firestore live updates with simulation fallback.
- Optional authorized live-train API adapter via `VITE_TRAIN_DATA_URL`.
- Optional RapidAPI-style train-status adapter via `VITE_RAPIDAPI_KEY`.
- Passenger, controller, copilot, complaints, optimizer, disruptions, crew/rake and analytics views.
- Dark control-room UI and multilingual support.

## ⚙️ Run Locally

```bash
npm install
npm run dev
