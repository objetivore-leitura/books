// firebase-config.js

// Importando as ferramentas do Firebase direto da web (sem precisar instalar nada)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// As chaves da sua Biblioteca Objetivo Lê
const firebaseConfig = {
  apiKey: "AIzaSyCYMBrxZUkl8U0858iyKk-y1Oa24rQrDwY",
  authDomain: "biblioteca-objetivo-le.firebaseapp.com",
  projectId: "biblioteca-objetivo-le",
  storageBucket: "biblioteca-objetivo-le.firebasestorage.app",
  messagingSenderId: "445617109453",
  appId: "1:445617109453:web:e0077d43818ffd4f33ec84"
};

// Inicializando a Magia (Conectando os serviços)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exportando para podermos usar no nosso app.js
export { app, auth, db };