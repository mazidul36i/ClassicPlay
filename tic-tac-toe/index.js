let boxes = document.querySelectorAll(".game > div");

let displayWinnerLine = document.querySelector("#display_winner_line");
let winnerAnnounce = document.querySelector(".winner_announce");

let turnX = document.querySelector(".turn-x");
let turnO = document.querySelector(".turn-o");

let player1WinText = document.querySelector("#player1_win_count > span");
let player2WinText = document.querySelector("#player2_win_count > span");

let restartButton = document.getElementById("restart");
// let tryAgainButton = document.getElementById("try_again");

let turn = "X";
let algo = createArr();

let count = 0;
let gameOver = false;

let player1Wins = 0;
let player2Wins = 0;

boxes.forEach((box, i) => {
    box.addEventListener("click", () => {
        if (count == 9 || box.textContent != "" || gameOver) return;
        count++;

        if (restartButton.disabled) restartButton.disabled = false;
        box.innerHTML = turn;

        let m = Math.floor(i / 3);
        let n = i % 3;
        algo[m][n] = turn;

        turn = turn === "X" ? "O" : "X";

        if (count === 9) {
            turnO.classList.remove("active");
            turnX.classList.remove("active");
            restartButton.disabled = true;
        } else if (turn === "X") {
            turnX.classList.add("active");
            turnO.classList.remove("active");
        } else {
            turnX.classList.remove("active");
            turnO.classList.add("active");
        }

        if (count >= 5) {
            gameOver = findWinner(algo, gameOver);
        }

        if (gameOver) {
            turnO.classList.remove("active");
            turnX.classList.remove("active");
            restartButton.disabled = true;
        }

        if (count === 9 && !gameOver) {
            let temp_text = document.querySelector("#winner_announce_text");
            temp_text.innerHTML = "Draw";
            temp_text.classList.add("yellow");

            setTimeout(() => {
                winnerAnnounce.classList.add("active");
                player1WinText.innerText = player1Wins;
                player2WinText.innerText = player2Wins;
            }, 600);
        }
    });
});

const restart = () => {
    restartButton.disabled = true;
    turn = "X";
    count = 0;
    gameOver = false;

    algo = createArr();

    turnX.classList.add("active");
    turnO.classList.remove("active");

    boxes.forEach((box) => {
        box.innerHTML = null;
    });

    displayWinnerLine.classList.value
        .trim()
        .split(" ")
        .forEach((className) => {
            if (className.length > 0)
                displayWinnerLine.classList.remove(className);
        });
};

function tryAgain() {
    winnerAnnounce.classList.remove("active");
    restart();
}

function createArr() {
    return [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
    ];
}

const findWinner = (algo, gameOver) => {
    console.log(algo);

    for (let i = 0; i < 3; i++) {
        if (
            algo[i][0] != "" &&
            algo[i][0] === algo[i][1] &&
            algo[i][0] === algo[i][2]
        ) {
            gameOver = true;
            displayWinner("h" + (i + 1), algo[i][0]);
        }

        if (
            algo[0][i] != "" &&
            algo[0][i] === algo[1][i] &&
            algo[0][i] === algo[2][i]
        ) {
            gameOver = true;
            displayWinner("v" + (i + 1), algo[0][i]);
        }
    }

    if (
        algo[0][0] != "" &&
        algo[0][0] === algo[1][1] &&
        algo[0][0] === algo[2][2]
    ) {
        gameOver = true;
        displayWinner("d1", algo[1][1]);
    }

    if (
        algo[0][2] != "" &&
        algo[0][2] === algo[1][1] &&
        algo[0][2] === algo[2][0]
    ) {
        gameOver = true;
        displayWinner("d2", algo[1][1]);
    }

    return gameOver;
};

function displayWinner(winningLine, xo) {
    displayWinnerLine.classList.add(winningLine);
    setTimeout(() => {
        displayWinnerLine.classList.add("active");
    }, 300);

    let temp_text = document.querySelector("#winner_announce_text");
    if (xo == "O") {
        temp_text.innerHTML = "You Lost";
        temp_text.classList.remove("yellow");
        temp_text.classList.add("red");
        player2Wins++;
    } else {
        temp_text.innerHTML = "You Won<br>The Match";
        temp_text.classList.remove("yellow");
        temp_text.classList.remove("red");
        player1Wins++;
    }

    setTimeout(() => {
        winnerAnnounce.classList.add("active");
        player1WinText.innerText = player1Wins;
        player2WinText.innerText = player2Wins;
    }, 1500);
}
