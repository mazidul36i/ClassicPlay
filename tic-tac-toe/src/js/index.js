import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, child, get, update, off, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyALaZLJLP5suH4sDM4T63Ys8hYjYdZ4Dbw",
    authDomain: "gs-gameplay.firebaseapp.com",
    projectId: "gs-gameplay",
    storageBucket: "gs-gameplay.appspot.com",
    messagingSenderId: "353145150738",
    appId: "1:353145150738:web:ba3736989893b89f48e7cb",
    measurementId: "G-23YJW741SM",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
let mUser;

let usersDBRef = ref(database, "users/");
let currentUserDBRef;
let currentUserData;
let rootRoomRef = ref(database, "rooms/");

console.log("Started Application");

onAuthStateChanged(auth, (user) => {
    if (user != null) {
        mUser = user;
        console.log("logged in as", user.displayName);
        currentUserDBRef = ref(database, "users/" + user.uid);
        updateProfileUI(user);
        initStartUI();
    } else {
        console.log("No user");
        window.location = "/login";
    }
});

const createUserDB = (user) => {
    set(ref(database, "users/" + user.uid), {
        email: user.email,
        username: user.displayName,
        profile_picture: user.imageUrl ? user.imageUrl : "",
        games_played: 0,
        games_won: 0,
        games_lost: 0,
        score: 0,
    }).then(() => {
        window.location.reload();
    });
};

document.getElementById("logout").onclick = () => {
    signOut(auth, () => {});
};

/* =====================================================
                    DOM content Finder
======================================================== */

let btnEditProfile = document.getElementById("edit_profile");

let startContainer = document.getElementById("start_container");
let gameContainer = document.getElementById("game_container");

let btnNewGame = document.getElementById("new_game");
let formJoinRoom = document.getElementById("join_room");

let player1DisplayName = document.getElementById("player1_displayName");
let player2DisplayName = document.getElementById("player2_displayName");

let player1WinCount = document.querySelector("#player1_win_count");
let player2WinCount = document.querySelector("#player2_win_count");

let boxes = document.querySelectorAll(".game > div");

let turnPlayer1 = document.querySelector(".turn-player-1");
let turnPlayer2 = document.querySelector(".turn-player-2");

let displayWinnerLine = document.getElementById("display_winner_line");
let winnerAnnounce = document.querySelector(".winner_announce");

let btnPlayAgain = document.getElementById("play_again");

/* =====================================================
                    Game Function Area
======================================================== */

btnEditProfile.onclick = async () => {
    const snapshot = await get(child(usersDBRef, mUser.uid));
    const userDetails = snapshot.val();
    const now = new Date();
    const lastUsernameUpdate = userDetails.lastUsernameUpdate ? new Date(userDetails.lastUsernameUpdate) : new Date(now);

    const diff = Math.abs(lastUsernameUpdate.getTime() - now.getTime());

    if (!lastUsernameUpdate || diff == 0 || diff / (1000 * 3600 * 24) >= 3) {
        let newUsername = prompt("Please enter your new username");
        if (newUsername.length < 3) {
            alert("Username must be between 3 to 20 characters long!");
            return;
        } else {
            updateProfile(mUser, {
                displayName: newUsername,
            })
                .then(() => {
                    updateProfileUI(mUser);
                    update(currentUserDBRef, { lastUsernameUpdate: now.toLocaleString() });
                    alert("Username changed successfully!");
                })
                .catch((error) => {
                    console.log("Error setting username", error);
                });
        }
    } else {
        let nextDate = new Date(lastUsernameUpdate.getTime() + 1000 * 3600 * 24 * 3);
        alert("You can only change username after: " + nextDate.toLocaleString());
    }
};

btnNewGame.onclick = () => {
    createNewRoom();
};

formJoinRoom.onsubmit = (e) => {
    e.preventDefault();
    let roomId = formJoinRoom.join_room_id.value;
    enterGameRoom(roomId);
};

const updateProfileUI = (user) => {
    document.getElementById("profile_username").innerText = user.displayName;

    onValue(currentUserDBRef, (snapshot) => {
        let currentUserData = snapshot.val();
        if (!currentUserData) {
            createUserDB(user);
        }

        document.getElementById("profile_games_played").innerText = currentUserData.games_played;
        document.getElementById("profile_games_won").innerText = currentUserData.games_won;
        document.getElementById("profile_score").innerText = currentUserData.score;
    });
};

const initStartUI = (roomId) => {
    if (!roomId) {
        startContainer.style.display = "flex";
        gameContainer.style.display = "none";
        btnNewGame.disabled = false;
        formJoinRoom.querySelector("button").disabled = false;
    } else {
        // TODO join a room
    }
};

const initGameUI = () => {
    startContainer.style.display = "none";
    gameContainer.style.display = "block";
};

const createNewRoom = () => {
    generateUniqueKey().then((key) => {
        let roomInfo = {
            roomId: key,
            createdBy: mUser.uid,
            createdOn: new Date().toLocaleString(),
            players: [],
            game: {
                board: createNewBoard(),
                matches: [],
                activePlayer: mUser.uid,
            },
        };

        set(child(rootRoomRef, key), roomInfo)
            .then(() => {
                console.log("Created new room with roomId:", key);
                enterGameRoom(key);
            })
            .catch(() => {
                alert("Something went you wrong: Unable to create new room");
            });
    });
};

const generateUniqueKey = async () => {
    let key = push(rootRoomRef).key.substr(5, 8);
    while (true) {
        const snapshot = await get(child(rootRoomRef, key));
        if (!snapshot.exists()) {
            return key;
        }
        key = push(rootRoomRef).key.substr(5, 8);
    }
};

const enterGameRoom = async (roomId) => {
    let roomRef = ref(database, `rooms/${roomId}`);
    off(rootRoomRef);
    off(roomRef);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
        alert("Room not found!");
        return;
    }

    let roomDetails = snapshot.val();

    if (roomDetails.players && Object.keys(roomDetails.players).includes(mUser.uid)) {
        console.log(`Joined [${roomId}]`);
        startGame(roomId);
        updateGamesPlayed(mUser.uid);
        return;
    } else if (!snapshot.val().players || Object.keys(roomDetails.players).length < 2) {
        console.log(`Joined room successfully [${roomId}]`);
    } else {
        alert("The room is already full!");
        return;
    }

    let symble, symbleCode;

    if (!snapshot.val().players || Object.keys(roomDetails.players).length == 0) {
        symble = "X";
        symbleCode = "X";
    } else {
        symble = "O";
        symbleCode = "O";
    }

    update(child(roomRef, `players/${mUser.uid}`), {
        playerUid: mUser.uid,
        displayName: mUser.displayName,
        joinedOn: new Date().toLocaleString(),
        symble: symble,
        symbleCode: symbleCode,
    })
        .then(() => {
            console.log("Added current user into the player list");
            startGame(roomId);
            updateGamesPlayed(mUser.uid);
        })
        .catch((error) => {
            console.log("Error: " + error);
            alert("Something went you wrong: Unable to enter room!");
        });
};

const startGame = (roomId) => {
    initGameUI();
    let roomRef = ref(database, `rooms/${roomId}`);
    off(roomRef);

    onValue(roomRef, (snapshot) => {
        let roomDetails = snapshot.val();
        if (!roomDetails) {
            alert("Something went you wrong: you might not have access to the room or the room has been removed!");
            return;
        }

        let player1Details = null,
            player2Details = null;

        player1Details = roomDetails.players[mUser.uid];
        delete roomDetails.players[mUser.uid];

        if (Object.keys(roomDetails.players).length == 1) {
            player2Details = roomDetails.players[Object.keys(roomDetails.players)[0]];
        }

        if (player1Details != null) {
            player1DisplayName.innerText = player1Details.displayName;
            player1WinCount.innerText = winCount(roomDetails.game.matches, player1Details.playerUid);
            turnPlayer1.innerText = player1Details.symble;
        }

        if (player2Details != null) {
            player2DisplayName.innerText = player2Details.displayName;
            player2WinCount.innerText = winCount(roomDetails.game.matches, player2Details.playerUid);
            turnPlayer2.innerText = player2Details.symble;
        } else {
            console.log("Waiting for an opponent...");
            player2DisplayName.innerText = "Invite Player";
            player2WinCount.innerText = roomId;
            return;
        }

        // Playable only if there are two players
        let gameDetails = roomDetails.game;
        let board = gameDetails.board;
        let isActivePlayer = gameDetails.activePlayer == player1Details.playerUid;
        const symbleCode = player1Details.symbleCode;
        console.log("Is current user move:", isActivePlayer);

        updateBoard(board);
        const currentBoardDetails = checkOwnOver(board);

        if (isActivePlayer && currentBoardDetails.status == "PLAYING") {
            turnPlayer1.classList.add("active");
            turnPlayer2.classList.remove("active");

            playerMove((row, col) => {
                if (board[row][col] == "" && isActivePlayer) {
                    isActivePlayer = false;
                    board[row][col] = symbleCode;
                    let boardDetails = checkOwnOver(board);

                    let updateObj = { activePlayer: player2Details.playerUid, board: board };
                    update(child(roomRef, "game"), updateObj);

                    if (boardDetails.status != "PLAYING") {
                        let matchCount = gameDetails.matches ? gameDetails.matches.length : 0;
                        let match = {
                            status: boardDetails.status,
                            won: boardDetails.status == "WON" ? player1Details.playerUid : "NONE",
                            board: board,
                            finishedAt: new Date().toLocaleString(),
                        };

                        update(child(roomRef, `game/matches/${matchCount}`), match);
                        updateScore(boardDetails, player1Details, player2Details);
                    }
                }
            });
        } else if (currentBoardDetails.status != "PLAYING") {
            turnPlayer1.classList.remove("active");
            turnPlayer2.classList.remove("active");

            // Display popup with winner/draw announcement
            findWinnerOver(board, symbleCode);

            btnPlayAgain.onclick = () => {
                let newBoard = createNewBoard();
                console.log("Reseting board >>");
                update(child(roomRef, "game"), { board: newBoard });
                updateGamesPlayed(player1Details.playerUid, player2Details.playerUid);
            };
        } else {
            turnPlayer1.classList.remove("active");
            turnPlayer2.classList.add("active");
        }
    });
};

const winCount = (matches, uid) => {
    let wins = 0;

    if (matches && matches.length > 0) {
        matches.forEach((match) => {
            if (match.status == "WON" && match.won == uid) wins++;
        });
    }

    return wins;
};

const updateBoard = (board) => {
    displayWinnerLine.setAttribute("class", "");
    winnerAnnounce.classList.remove("active");

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            let box = document.getElementById(`box_${row}${col}`);
            box.innerText = board[row][col];
        }
    }
};

const playerMove = (listener) => {
    boxes.forEach((box) => {
        box.onclick = (e) => {
            boxClickHandler(e, listener);
        };
    });
};

const boxClickHandler = (e, listener) => {
    let boxContent = e.target.textContent;
    if (boxContent) return;

    // remove listeners from all boxes
    boxes.forEach((box) => {
        box.onclick = () => {};
    });

    let rc = e.target.id.toString().replace("box_", "").split("");
    let row = rc[0];
    let col = rc[1];

    listener(row, col);
};

const checkOwnOver = (board) => {
    let boardDetails = { status: "PLAYING" };
    let isWonOver = false;

    for (let i = 0; i < 3; i++) {
        if (board[i][0] != "" && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
            isWonOver = true;
        }

        if (board[0][i] != "" && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
            isWonOver = true;
        }
    }

    if (board[0][0] != "" && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
        isWonOver = true;
    }

    if (board[0][2] != "" && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
        isWonOver = true;
    }

    let moveCount = board.flat().filter((item) => item !== "").length;

    if (isWonOver || moveCount == 9) {
        boardDetails.status = isWonOver ? "WON" : "OVER";
    }

    boardDetails.totalMoves = moveCount;
    return boardDetails;
};

const findWinnerOver = (board, symbleCode) => {
    for (let i = 0; i < 3; i++) {
        if (board[i][0] != "" && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
            displayWinner("h" + (i + 1), board[i][0], symbleCode);
            return;
        }

        if (board[0][i] != "" && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
            displayWinner("v" + (i + 1), board[0][i], symbleCode);
            return;
        }
    }

    if (board[0][0] != "" && board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
        displayWinner("d1", board[1][1], symbleCode);
        return;
    }

    if (board[0][2] != "" && board[0][2] === board[1][1] && board[0][2] === board[2][0]) {
        displayWinner("d2", board[1][1], symbleCode);
        return;
    }

    // Display draw
    let temp_text = document.querySelector("#winner_announce_text");
    temp_text.innerHTML = "Draw";
    temp_text.classList.add("yellow");

    setTimeout(() => {
        winnerAnnounce.classList.add("active");
    }, 600);
};

const displayWinner = (winningLine, xo, symbleCode) => {
    displayWinnerLine.setAttribute("class", "");
    displayWinnerLine.classList.add(winningLine);

    setTimeout(() => {
        displayWinnerLine.classList.add("active");
    }, 300);

    let temp_text = document.querySelector("#winner_announce_text");
    if (xo == symbleCode) {
        temp_text.innerHTML = "You Won<br>The Match";
        temp_text.classList.remove("yellow");
        temp_text.classList.remove("red");
    } else {
        temp_text.innerHTML = "You Lost";
        temp_text.classList.remove("yellow");
        temp_text.classList.add("red");
    }

    setTimeout(() => {
        winnerAnnounce.classList.add("active");
    }, 1500);
};

function createNewBoard() {
    return [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
    ];
}

const updateGamesPlayed = (player1Uid, player2Uid) => {
    let player1GamesPlayedRef = ref(database, `users/${player1Uid}/games_played`);

    runTransaction(player1GamesPlayedRef, (currentVal) => {
        return (currentVal || 0) + 1;
    });

    if (player2Uid) {
        let player2GamesPlayedRef = ref(database, `users/${player2Uid}/games_played`);
        runTransaction(player2GamesPlayedRef, (currentVal) => {
            return (currentVal || 0) + 1;
        });
    }
};

const updateScore = async (boardDetails, player1Details, player2Details) => {
    let player1ProfileRef = ref(database, `users/${player1Details.playerUid}`);
    let player2ProfileRef = ref(database, `users/${player2Details.playerUid}`);

    let score = (10 - boardDetails.totalMoves) * 5 + 20;

    let player1Profile = await get(player1ProfileRef);
    let player2Profile = await get(player2ProfileRef);

    if (boardDetails.status == "WON") {
        update(player1ProfileRef, { score: (player1Profile.score || 0) + score, games_won: (player1Profile.games_won || 0) + 1 });
        update(player2ProfileRef, { score: (player2Profile.score || 0) - score >= 0 ? (player2Profile.score || 0) - score : 0, games_lost: (player2Profile.games_lost || 0) + 1 });
    } else {
        update(player1ProfileRef, { score: (player1Profile.score || 0) - score >= 0 ? (player1Profile.score || 0) - score : 0, games_lost: (player1Profile.games_lost || 0) + 1 });
        update(player2ProfileRef, { score: (player2Profile.score || 0) + score, games_won: (player2Profile.games_won || 0) + 1 });
    }
};
