import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    signOut,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-check";

const firebaseConfig = {
    apiKey: "AIzaSyALaZLJLP5suH4sDM4T63Ys8hYjYdZ4Dbw",
    authDomain: "gs-gameplay.firebaseapp.com",
    databaseURL: "https://gs-gameplay-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "gs-gameplay",
    storageBucket: "gs-gameplay.appspot.com",
    messagingSenderId: "353145150738",
    appId: "1:353145150738:web:ba3736989893b89f48e7cb",
    measurementId: "G-23YJW741SM",
};
const app = initializeApp(firebaseConfig);
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("6Le8VSgmAAAAAIuyC1aFnB_n3uFYhe8bvAb6aeyn"),
    isTokenAutoRefreshEnabled: true,
});
const auth = getAuth(app);
const database = getDatabase(app);

console.log("Login/register >>");
let finishSignUp = true;

onAuthStateChanged(auth, (user) => {
    if (user != null && finishSignUp) {
        console.log("logged in!");
        console.log(user);
        window.location = "/";
    } else if (user == null) {
        console.log("No user");
    }
});

let isLogin = true;
let isPassordReset = false;

let loginForm = document.getElementById("login_form");
let title = document.querySelector(".title");

let changeLoginSignupText = document.querySelector(".change-login-signup-text > .text");
let changeLoginSignup = document.querySelector(".change-login-signup");
let forgotPasswordBtn = document.getElementById("forgot_password");

changeLoginSignup.onclick = () => {
    if (isLogin) {
        title.innerText = "Signup to continue";
        changeLoginSignupText.innerText = "Already have an account?";
        changeLoginSignup.innerText = "Login";
        isLogin = false;
    } else {
        title.innerText = "Login to continue";
        changeLoginSignupText.innerText = "Don't have an account?";
        changeLoginSignup.innerText = "Register";
        isLogin = true;
    }
    loginForm.username.hidden = isLogin;
    loginForm.username.required = !isLogin;
    loginForm.password.hidden = false;
    loginForm.password.required = true;
    forgotPasswordBtn.parentNode.hidden = !isLogin;
    isPassordReset = false;
};

forgotPasswordBtn.onclick = () => {
    loginForm.username.hidden = true;
    loginForm.username.required = false;
    loginForm.password.hidden = true;
    loginForm.password.required = false;
    title.innerText = "Reset password";
    changeLoginSignupText.innerText = "Already have an account?";
    changeLoginSignup.innerText = "Login";
    forgotPasswordBtn.parentNode.hidden = true;
    isPassordReset = true;
    isLogin = false;
};

loginForm.onsubmit = (e) => {
    finishSignUp = false;
    e.preventDefault();
    if (isPassordReset) {
        resetPassword(loginForm.email.value);
    } else if (isLogin) {
        console.log("Login >>");
        login(loginForm.email.value, loginForm.password.value);
    } else {
        console.log("Register >>");
        signup(loginForm.username.value, loginForm.email.value, loginForm.password.value);
    }
};

const resetPassword = (email) => {
    sendPasswordResetEmail(auth, email)
        .then(() => {
            alert("Password reset mail has been sent successfully to your email. Please check your inbox");
            window.location.reload();
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(errorMessage);
        });
};

const login = (email, password) => {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Signed up successfully!");
            console.log(user);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorMessage);
            alert(errorMessage);
        });
    finishSignUp = true;
};

const signup = (username, email, password) => {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Logged in successfully!");
            const user = userCredential.user;
            console.log(user);

            updateProfile(user, {
                displayName: username,
            }).catch((error) => {
                console.log("Error setting username", error);
            });

            createUserDB(user, username);
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.log(errorMessage);
            alert(errorMessage);
        });
};

const createUserDB = (user, username) => {
    set(ref(database, "users/" + user.uid), {
        email: user.email,
        username: username,
        profile_picture: user.imageUrl ? user.imageUrl : "",
        joinedOn: new Date().toLocaleString(),
        lastUsernameUpdate: null,
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        score: 0,
    }).then(() => {
        window.location = "/";
    });
};
