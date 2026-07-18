// Titik masuk aplikasi React.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css"; // Muat gaya Tailwind + HeroUI.

// Pasang komponen App ke elemen #root, dibungkus AuthProvider agar seluruh
// aplikasi punya akses status login. HeroUI v3 tidak butuh Provider tema.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
