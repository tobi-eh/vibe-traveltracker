# Travel Tracker (Modern Vanilla JS)

🌎 A fast, responsive, and dynamic web application to track the places you've visited around the world.

This project was rewritten from the ground up using a modern frontend stack (HTML, CSS, Vanilla JS) to provide a premium user experience without the need for a backend server or complex build tools.

## Features

- **Interactive Maps:** Uses `D3.js` to render performant SVG maps directly in the browser.
- **Dynamic Scope:** Switch between USA (States & Territories), World, and Europe views seamlessly.
- **Click-to-Select:** Click directly on the map or use the sidebar list to toggle visited locations.
- **Searchable List:** Quickly filter the sidebar list to find specific countries or states.
- **Local Persistence:** Your visited locations are saved automatically in your browser's Local Storage.
- **Premium Aesthetics:** Features a sleek dark theme, glassmorphism UI elements, and smooth micro-animations.

## How to Run Locally

Since this is a purely static website, you can run it using any simple local web server.

1. Navigate to the `public/` directory:
   ```bash
   cd public
   ```
2. Start Python's built-in HTTP server:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and go to `http://localhost:8000`

## Deployment

Because the application is completely static (no backend required), it can be deployed for free using services like:
- **GitHub Pages**
- **Netlify Drop** (Just drag and drop the `public/` folder)
- **Vercel**

## Legacy Code

The original Python/Streamlit version of this application has been moved to the `legacy_streamlit/` directory for historical reference.
