// Initialize Firebase (already done in firebase-config.js)
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const loginStatus = document.getElementById('login-status');
const logoutBtn = document.getElementById('logout-btn');
const greeting = document.getElementById('greeting');

const addFriendInput = document.getElementById('add-friend-input');
const friendListDiv = document.getElementById('friend-list');

const chatPanel = document.getElementById('chat-panel');
const chatWithSpan = document.getElementById('chat-with');
const chatMessagesDiv = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const backToFriendsBtn = document.getElementById('back-to-friends');

let currentUser = null;
let currentFriend = null;
let unsubscribeChat = null;

// --------- LOGIN / SIGNUP ---------
signupBtn.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if (!username || !password) {
    loginStatus.textContent = "Enter username and password";
    return;
  }

  // Check if username already exists
  const userSnap = await db.collection('users').doc(username).get();
  if (userSnap.exists) {
    loginStatus.textContent = "Username already taken";
    return;
  }

  // Create user
  await db.collection('users').doc(username).set({
    password,
    friends: []
  });

  loginStatus.textContent = "Account created! Logging in...";
  login(username, password);
});

loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  login(username, password);
});

async function login(username, password) {
  if (!username || !password) return;

  const userSnap = await db.collection('users').doc(username).get();
  if (!userSnap.exists || userSnap.data().password !== password) {
    loginStatus.textContent = "Invalid username or password";
    return;
  }

  currentUser = username;
  localStorage.setItem('clapchat_user', currentUser); // persistent login
  greeting.textContent = `Hey, ${currentUser}`;
  loginScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  loadFriends();
}

// Check persistent login
window.addEventListener('load', async () => {
  const savedUser = localStorage.getItem('clapchat_user');
  if (savedUser) {
    currentUser = savedUser;
    greeting.textContent = `Hey, ${currentUser}`;
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    loadFriends();
  }
});

// --------- LOGOUT ---------
logoutBtn.addEventListener('click', () => {
  currentUser = null;
  currentFriend = null;
  localStorage.removeItem('clapchat_user');
  loginScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
  chatMessagesDiv.innerHTML = '';
});

// --------- FRIENDS ---------
addFriendInput.addEventListener('keypress', async (e) => {
  if (e.key !== "Enter") return;
  const friendName = addFriendInput.value.trim();
  if (!friendName || friendName === currentUser) return;

  const friendSnap = await db.collection('users').doc(friendName).get();
  if (!friendSnap.exists) {
    alert("User does not exist");
    return;
  }

  // Add friend to both users
  await db.collection('users').doc(currentUser).update({
    friends: firebase.firestore.FieldValue.arrayUnion(friendName)
  });
  await db.collection('users').doc(friendName).update({
    friends: firebase.firestore.FieldValue.arrayUnion(currentUser)
  });

  addFriendInput.value = '';
  loadFriends();
});

// Load friend list
async function loadFriends() {
  friendListDiv.innerHTML = '';
  const userSnap = await db.collection('users').doc(currentUser).get();
  const friends = userSnap.data().friends || [];
  friends.forEach(friend => {
    const div = document.createElement('div');
    div.textContent = friend;
    div.addEventListener('click', () => openChat(friend));
    friendListDiv.appendChild(div);
  });
}

// --------- CHAT ---------
async function openChat(friend) {
  currentFriend = friend;
  chatWithSpan.textContent = friend;
  chatPanel.style.display = 'flex';
  chatMessagesDiv.innerHTML = '';

  if (unsubscribeChat) unsubscribeChat(); // remove old listener

  unsubscribeChat = db.collection('chats')
    .doc(getChatId(currentUser, currentFriend))
    .collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
      chatMessagesDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const msg = doc.data();
        const div = document.createElement('div');
        div.classList.add('message');
        div.classList.add(msg.sender === currentUser ? 'from-me' : 'from-them');
        div.textContent = msg.text;
        chatMessagesDiv.appendChild(div);
      });
      chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}

function getChatId(user1, user2) {
  return [user1, user2].sort().join('_'); // consistent chat id
}

// Send message
sendBtn.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text || !currentFriend) return;

  const chatId = getChatId(currentUser, currentFriend);
  await db.collection('chats').doc(chatId).collection('messages').add({
    text,
    sender: currentUser,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  chatInput.value = '';
});

// Clear chat (local only)
clearChatBtn.addEventListener('click', () => {
  chatMessagesDiv.innerHTML = '';
});

// Back to friends
backToFriendsBtn.addEventListener('click', () => {
  chatPanel.style.display = 'none';
  currentFriend = null;
});
