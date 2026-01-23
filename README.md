# Hifyre Music Player

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/react-19.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)

**Hifyre** is a premium, open-source web-based music player designed for audiophiles and power users. built on the modern web stack (React, Vite, TypeScript), it prioritizes performance, privacy, and aesthetic consistency. It features a robust local-first architecture using IndexedDB for library management, ensuring your music library feels instant and reliable.

## 🌟 Key Features

### 🎧 **Premium Audio Experience**
*   **Lossless Streaming**: High-quality lossless audio streaming for the best listening experience.
*   **Karaoke Mode**: Synchronized lyrics support with an immersive karaoke mode.
*   **Smart Queue**: Advanced queue management with shuffle, repeat modes, and easy reordering.
*   **System Integration**: Full **Media Session API** integration for native system media controls.

### 📚 **Organization & Library**
*   **Personal Library**: Comprehensive management for your favorites (tracks, albums, artists).
*   **History Tracking**: "Recently Played" tracking for instant access to your listening history.
*   **Downloads**: Track downloads with **automatic metadata embedding** for offline portability.

### 🚀 **Performance & Reliability**
*   **Intelligent Caching**: Smart API caching strategies for improved performance and reduced bandwidth.
*   **High Availability**: Support for **Multiple API instances** with automatic failover protection.
*   **Offline-Capable**: Fully functional **Progressive Web App (PWA)** that works offline.

### 🎨 **Design & Customization**
*   **Minimalist UI**: Dark, focus-optimized interface designed to let the music stand out.
*   **Theming**: Customizable themes to match your aesthetic preferences.
*   **Power User Controls**: Extensive **Keyboard Shortcuts** for efficient navigation and control.

---

## 🏗️ Architecture & Tech Stack

Hifyre is built as a Single Page Application (SPA).

### **Frontend Core**
*   **[React 19](https://react.dev/)**: The library for web and native user interfaces.
*   **[TypeScript](https://www.typescriptlang.org/)**: Strongly typed JavaScript for scalability and maintainability.
*   **[Vite](https://vitejs.dev/)**: Next Generation Frontend Tooling.

### **State Management**
*   **[Zustand](https://github.com/pmndrs/zustand)**: A small, fast and scalable bearbones state-management solution. Used for:
    *   `player.ts`: Managing playback state (playing, paused, seeking), queue, and volume.
    *   `auth.ts`: Handling user sessions (if applicable).

### **Data & Persistence**
*   **[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)** (via `idb`): Stores the entire user library (thousands of tracks) locally for instant load times.
*   **LocalStorage**: Stores lightweight preferences (volume, theme settings).

### **Routing**
*   **[React Router v7](https://reactrouter.com/)**: Handling client-side routing.

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js**: v18 or higher recommended.
*   **npm**: v9 or higher.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-org/hifyre.git
    cd hifyre
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Environment Setup**
    Copy `.env.example` to `.env` and fill in necessary keys.
    ```bash
    cp .env.example .env
    ```
    *Required Variables:*
    *   `VITE_API_URL`: URL to your backend music API (if using a custom hosted instance).

4.  **Start Development Server**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

---

## 📜 Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with HMR. |
| `npm run build` | Compiles TypeScript and builds the app for production in `dist/`. |
| `npm run preview` | Locally preview the production build. |
| `npm run lint` | Runs ESLint to check for code quality issues. |

---

## 📂 Project Structure Explained

```graphql
src/
├── components/           # UI Building Blocks
│   ├── common/           # Generic atoms (Buttons, Cards, Modals)
│   ├── layout/           # Structural components (Sidebar, TopBar)
│   ├── player/           # The complexities of the Music Player UI
│   ├── playlists/        # Playlist management specific UI
│   └── ui/               # Design system primitives (Toast, Input)
├── lib/                  # Core Logic Framework
│   ├── api.ts            # Centralized API client (Fetch wrapper)
│   ├── db.ts             # Database schema and access layer
│   ├── player.ts         # Global Audio State (Zustand store)
│   └── utils.ts          # Helper functions
├── pages/                # Route Controllers
│   ├── HomePage.tsx      # Dashboard
│   ├── LibraryPage.tsx   # User's collection
│   ├── SearchPage.tsx    # Search results
│   └── ...
├── styles/               # Global CSS and Variables
├── App.tsx               # Main Router and Context Providers
└── main.tsx              # Application Entry Point
```

---

## 🐛 Troubleshooting

**Audio not playing?**
*   Check your internet connection.
*   Verify your browser supports the audio format (most modern browsers support all common formats).
*   Check if Autoplay policies are blocking audio (interact with the page first).

**"Network Error" or API failures?**
*   Ensure the backend API is reachable.
*   Check the console (F12) for CORS errors.

**Library not saving?**
*   Ensure you are not in "Incognito" or "Private" mode, as IndexedDB may be restricted.
*   Check available disk space.

---

## 🤝 Contributing

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the Branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Made with ❤️ by the Hifyre Team.*
