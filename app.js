let currentUser = null;
let currentChat = null;

// Elements
const loginScreen = document.getElementById("login-screen");
const mainScreen = document.getElementById("main-screen");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const loginStatus = document.getElementById("login-status");

const logoutBtn = document.getElementById("logout-btn");
const friendListDiv = document.getElementById("friend-list");
const addFriendInput = document.getElementById("add-friend-input");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const sendImgBtn = document.getElementById("send-img-btn");
const imageInput = document.getElementById("image-input");
const chatHeader = document.getElementById("chat-header");
const clearChatBtn = document.getElementById("clear-chat-btn");

// --- Login/Signup ---
signupBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!username || !password) return loginStatus.innerText="Fill fields";
  const snap = await db.collection("users").where("username","==",username).get();
  if(!snap.empty) return loginStatus.innerText="Username Taken";
  const doc = await db.collection("users").add({username,password,friends:[],friendRequests:[]});
  currentUser = await db.collection("users").doc(doc.id).get();
  localStorage.setItem("clapchatUser",currentUser.id);
  openMainScreen();
}

loginBtn.onclick = async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const snap = await db.collection("users").where("username","==",username).where("password","==",password).get();
  if(snap.empty) return loginStatus.innerText="Invalid";
  currentUser = snap.docs[0];
  localStorage.setItem("clapchatUser",currentUser.id);
  openMainScreen();
}

// --- Auto-login ---
async function autoLogin(){
  const id = localStorage.getItem("clapchatUser");
  if(!id) return;
  const doc = await db.collection("users").doc(id).get();
  if(doc.exists){ currentUser = doc; openMainScreen(); }
}
autoLogin();

// --- Open Main ---
function openMainScreen(){
  loginScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  loadFriends();
}

// --- Friends ---
async function loadFriends(){
  friendListDiv.innerHTML = "";
  const data = currentUser.data();
  data.friends.forEach(f => {
    const div = document.createElement("div");
    div.innerText = f;
    div.onclick = ()=>openChat(f);
    friendListDiv.appendChild(div);
  });
}

// --- Add Friend ---
addFriendInput.onkeypress = async (e)=>{
  if(e.key!=="Enter") return;
  const name = addFriendInput.value.trim();
  if(!name) return;
  const snap = await db.collection("users").where("username","==",name).get();
  if(snap.empty) return alert("User not found");
  const userDoc = snap.docs[0];
  if(userDoc.data().friends.includes(currentUser.data().username)) return alert("Already friends");
  await userDoc.ref.update({friendRequests: firebase.firestore.FieldValue.arrayUnion(currentUser.data().username)});
  alert("Request sent");
  addFriendInput.value="";
}

// --- Open Chat ---
async function openChat(friend){
  currentChat = friend;
  chatHeader.innerText = friend;
  chatMessages.innerHTML = "";
  const messagesSnap = await db.collection("messages").where("participants","array-contains",currentUser.data().username).orderBy("timestamp").get();
  messagesSnap.forEach(doc=>{
    const m = doc.data();
    if(m.participants.includes(friend)){
      const div = document.createElement("div");
      div.className = "message " + (m.sender===currentUser.data().username ? "from-me" : "from-them");
      if(m.type==="text") div.innerText = m.content;
      else if(m.type==="image") {
        const img = document.createElement("img");
        img.src = m.content;
        img.style.maxWidth="200px";
        div.appendChild(img);
      }
      chatMessages.appendChild(div);
    }
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Send Message ---
sendBtn.onclick = async ()=>{
  const text = chatInput.value.trim();
  if(!text || !currentChat) return;
  await db.collection("messages").add({
    participants: [currentUser.data().username,currentChat],
    sender: currentUser.data().username,
    type: "text",
    content: text,
    timestamp: Date.now()
  });
  chatInput.value="";
  openChat(currentChat);
}

// --- Send Image ---
sendImgBtn.onclick = ()=>imageInput.click();
imageInput.onchange = async (e)=>{
  if(!currentChat) return;
  const file = e.target.files[0];
  const ref = storage.ref().child(`images/${Date.now()}-${file.name}`);
  await ref.put(file);
  const url = await ref.getDownloadURL();
  await db.collection("messages").add({
    participants: [currentUser.data().username,currentChat],
    sender: currentUser.data().username,
    type: "image",
    content: url,
    timestamp: Date.now()
  });
  openChat(currentChat);
}

// --- Clear Chat ---
clearChatBtn.onclick = async ()=>{
  if(!currentChat) return;
  if(!confirm("Clear chat?")) return;
  const snap = await db.collection("messages").where("participants","array-contains",currentUser.data().username).get();
  snap.forEach(doc=>{
    const m = doc.data();
    if(m.participants.includes(currentChat)) doc.ref.delete();
  });
  openChat(currentChat);
}

// --- Logout ---
logoutBtn.onclick = ()=>{
  localStorage.removeItem("clapchatUser");
  location.reload();
}
