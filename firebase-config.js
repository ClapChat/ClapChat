// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCk8Iwb8sFF90ToYE44l8d95uKSB-jPBU8",
  authDomain: "clapchat-852a6.firebaseapp.com",
  projectId: "clapchat-852a6",
  storageBucket: "clapchat-852a6.firebasestorage.app",
  messagingSenderId: "918530152107",
  appId: "1:918530152107:web:87f233eaae46c2178a89ee"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
