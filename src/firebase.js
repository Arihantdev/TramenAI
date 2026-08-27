import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsKo5mRiP6sHTrzRUKUJsxPsGeJzD6tzo",
  authDomain: "train-a0e79.firebaseapp.com",
  projectId: "train-a0e79",
  storageBucket: "train-a0e79.firebasestorage.app",
  messagingSenderId: "25429622896",
  appId: "1:25429622896:web:b5f2c40afef08fa3f634b5",
  measurementId: "G-VGZ21T9LMH"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);