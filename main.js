let SERVER_IP = "wss://kptqkckp-5500.inc1.devtunnels.ms/";
let DISPLAY_FPS = 60; // assume 60 by default

let ASSETS_LOADED = false;
let OFFLINE = false;
let DEATHLINK = false;
let INSTA_RESET = false;
document.title = "Crappy Bird";

let CANVAS = document.querySelector("canvas");
let CONTEXT = CANVAS.getContext('2d');

let imageData = {};
assets = ["medal-bronze.png", "medal-gold.png", "medal-silver.png", "ui_gameover.png", "pipe_base.png", "pipe_tip.png", "bg_cloud1.png", "bg_cloud2.png", "bg_cloud3.png", "bg_ground.png", "bg_groundhouse.png", "bird.png", "num/0.png", "num/1.png", "num/2.png", "num/3.png", "num/4.png", "num/5.png", "num/6.png", "num/6.png", "num/7.png", "num/8.png", "num/9.png", "ui_ns_box1.png", "ui_ns_box2.png", "ui_ns_box3.png", "ui_ns_box4.png", "ui_ns_box5.png", "ui_ns_box6.png", "ui_ns_box7.png", "ui_ns_box8.png", "ui_ns_box9.png"]

async function loadAssets() {
    var invisible_div = document.createElement("div");
    invisible_div.hidden = true;
    document.body.appendChild(invisible_div);
    for (var asset of assets) {
        var img = document.createElement("img");
        img.src = `./${asset}`;
        invisible_div.appendChild(img);
        imageData[asset] = img;
    }
    POLL_INTERVAL = setInterval(pollAssets,250);
}

POLL_INTERVAL = null

function pollAssets() {
    var allLoaded = true;
    var loaded = 0;
    for (var img in imageData) {
        if (!imageData[img].complete) {
            allLoaded = false;
        } else {
            loaded++;
        }
    }
    CONTEXT.fillStyle = "#CCCCCC";
    CONTEXT.fillRect(0,0,CANVAS.width,CANVAS.height);
    CONTEXT.fillStyle = "#000000";
    CONTEXT.fillText(`Loading assets... (${loaded}/${assets.length})`,0,50);
    if (allLoaded) {
        init_game();
        clearInterval(POLL_INTERVAL);
        ASSETS_LOADED = true;
    }
}

loadAssets();

class Object {
    x = 0;
    y = 0;
    update() {
        return;
    }
    render() {
        return;
    }
}

class Player extends Object {
    multiplayer = false;
    username = "placeholder";
    score = 0;
    fakexmultiplayer = 0;
    grav = 0.3;
    y_speed = 0;
    holding = false;
    terminal_velocity = 7;
    terminal_bottomcap = -4;
    loss_animation_started = false;
    constructor() {
        super();
        console.log("player created");
        this.x = 100;
    }
    update(delta) {
        if (!this.multiplayer) {
            this.score = SCORE;
            //if (GAME_STATE == GS_PLAYING) this.fakexmultiplayer += 5;
        }
        if (GAME_STATE != GS_PAUSED || this.multiplayer) {
            if (!this.holding) {
                this.y_speed += this.grav*delta;
            }
            if (this.y_speed > this.terminal_velocity && GAME_STATE != GS_LOST) {
                this.y_speed = this.terminal_velocity;
            }
            if (this.y_speed < this.terminal_bottomcap) {
                this.y_speed = this.terminal_bottomcap;
            }
            if (!this.loss_animation_started && GAME_STATE == GS_LOST) {
                if (!OFFLINE) multiplayer_ws.send(JSON.stringify({ 'type': 'death', 'data': {} }));
                this.y_speed = -5;
                this.loss_animation_started = true;
            }
            if (this.y > 430) {
                this.y = 430;
                if (!this.multiplayer) {
                    GAME_STATE = GS_PAUSED;
                }
            }
            if (this.holding) {
                this.y_speed -= 1;
            }
            this.y += this.y_speed*delta;
        }
    }
    render() {
        if (this.multiplayer) {
            this.x = this.fakexmultiplayer - PLAYER.fakexmultiplayer + 100;
            CONTEXT.fillStyle = "#000000";
            CONTEXT.font = "12px Serif"
            CONTEXT.fillText(this.username, this.x, this.y);
            CONTEXT.fillText(this.score, this.x, this.y - 15);
            //console.log(this.fakexmultiplayer);
        }
        var bird_sprite = imageData["bird.png"];
        var draw_x = this.x + bird_sprite.width / 2;
        var draw_y = this.y + bird_sprite.height / 2;
        CONTEXT.translate(draw_x, draw_y);
        CONTEXT.rotate(this.y_speed * 5 * Math.PI / 180)
        CONTEXT.drawImage(bird_sprite, -bird_sprite.width / 2, -bird_sprite.height / 2);
        CONTEXT.rotate(-(this.y_speed * 5 * Math.PI / 180))
        CONTEXT.translate(-draw_x, -draw_y);
    }
    jump() {
        if (GAME_STATE != GS_PLAYING) return;
        this.y_speed = -5;
    }
    unjump() {
        this.holding = false;
    }
    get_web() {
        return [this.x, this.y, this.grav, this.y_speed, this.holding, this.terminal_velocity, this.terminal_bottomcap, this.loss_animation_started, this.score, this.fakexmultiplayer]
    }
    set_web(arr) {
        this.x = arr[0]
        this.y = arr[1]
        this.grav = arr[2]
        this.y_speed = arr[3]
        this.holding = arr[4]
        this.terminal_velocity = arr[5]
        this.terminal_bottomcap = arr[6]
        this.loss_animation_started = arr[7]
        this.score = arr[8]
        this.fakexmultiplayer = arr[9]
    }
}

class Pipe extends Object {
    basey = 0;
    speed = 5;
    siner = 0;
    rand = 0;
    movedist = 0;
    increased_score = false;
    constructor() {
        super();
        this.x = 500;
        this.y = Math.round(100 + Math.random() * 200);
        this.basey = this.y;
        this.rand = 0.1 + Math.random() * 0.1;
        this.movedist = Math.round(20 + Math.random() * 15);
    }
    render() {
        var base = imageData["pipe_base.png"];
        var tip = imageData["pipe_tip.png"];
        //bottom half
        CONTEXT.drawImage(base, this.x, this.y, base.width, 999);
        CONTEXT.drawImage(tip, this.x, this.y);
        //top half
        CONTEXT.drawImage(base, this.x, this.y - 1090, base.width, 999);
        CONTEXT.drawImage(tip, this.x, this.y - 100);
    }
    update(delta) {
        if (GAME_STATE == GS_LOST || GAME_STATE == GS_PAUSED) return;
        var dist = Math.min(125,Math.abs(this.x - PLAYER.x))/125;
        if (SCORE >= 50) {
            this.siner += 1*delta;
            this.y = this.basey + (Math.sin(this.siner * this.rand) * this.movedist)*dist;
        }
        if ((PLAYER.y + 21 < this.y - 75 || PLAYER.y + 21 > this.y) && PLAYER.x + 28 > this.x && PLAYER.x + 28 < this.x + 50) {
            GAME_STATE = GS_LOST;
        }
        // PLAYER.x + 28 > this.x + 40 && 
        // instead check AFTER the pipe is passed
        if (PLAYER.x + 28 > this.x + 45 && !this.increased_score) {
            SCORE += 1;
            PIPE_DISTANCE -= 0.25;
            this.increased_score = true;
        }
        this.x -= this.speed*delta;
    }
}

class Cloud extends Object {
    texture = "bg_cloud1.png";
    speed = 1 + Math.random();
    constructor() {
        super();
        this.x = Math.round(100 + Math.random() * 250);
        this.y = Math.round(50 + Math.random() * 100);
        this.speed = 1 + Math.random();
    }
    randomize_texture() {
        this.texture = ["bg_cloud1.png", "bg_cloud2.png", "bg_cloud3.png"][Math.round(Math.random() * 2)];
    }
    render() {
        cloud = imageData[this.texture];
        CONTEXT.drawImage(cloud, this.x, this.y);
    }
    update(delta) {
        if (GAME_STATE == GS_LOST || GAME_STATE == GS_PAUSED) return;
        if (this.x < -140) {
            this.x = 540;
            this.y = Math.round(50 + Math.random() * 100);
            this.speed = 1 + Math.random();
            this.randomize_texture();
        }
        this.x -= this.speed*delta;
    }
}

class Ground extends Object {
    speed = 5
    height = 0
    width = 0
    texture = "bg_ground.png"
    constructor() {
        super();
        var txtr = imageData[this.texture];
        this.width = txtr.width;
        this.height = txtr.height;
        this.x = 0;
        this.y = 500 - this.height / 2;
    }
    render() {
        var txtr = imageData[this.texture]
        if (txtr.height == 0 || txtr.width == 0) return;
        for (var i = 0; i < (CANVAS.width/txtr.width)+1; i++) {
            CONTEXT.drawImage(txtr, this.x + this.width * i, this.y);
        }
    }
    update(delta) {
        if (GAME_STATE == GS_LOST || GAME_STATE == GS_PAUSED) return;
        if (this.x < -this.width) {
            this.x = 0;
        }
        this.x -= this.speed*delta;
    }
}

class City extends Object {
    speed = 2
    height = 0
    width = 0
    texture = "bg_groundhouse.png"
    constructor() {
        super();
        var txtr = imageData[this.texture];
        this.width = txtr.width;
        this.height = txtr.height;
        this.x = 0;
        this.y = 500 - this.height;
    }
    render() {
        var txtr = imageData[this.texture]
        if (txtr.height == 0 || txtr.width == 0) return;
        for (var i = 0; i < (CANVAS.width/txtr.width)+1; i++) {
            CONTEXT.drawImage(txtr, this.x + this.width * i, this.y);
        }
    }
    update(delta) {
        if (GAME_STATE == GS_LOST || GAME_STATE == GS_PAUSED) return;
        if (this.x < -this.width) {
            this.x = 0;
        }
        this.x -= this.speed*delta;
    }
}

class Counter extends Object {
    constructor() {
        super()
        this.x = 200;
        this.y = 500 / 8
    }
    render() {
        var string = SCORE.toString();
        var xoff = 0;
        var textures = [];
        for (var char of string) {
            var txtr = imageData[`num/${char}.png`];
            textures.push(txtr);
            xoff += txtr.width + 5;
        }

        var xoff2 = 0;
        for (var texture of textures) {
            CONTEXT.drawImage(texture, this.x - (xoff / 2) + xoff2, this.y - (texture.height / 2));
            xoff2 += texture.width + 5;
        }
    }
    update() {

    }
}

class ScorePopup extends Object {
    width = 350;
    height = 200;
    tx = CANVAS.width / 2 - this.width / 2;
    ty = CANVAS.height / 2 - this.height / 2 + 75;
    newScore = false;
    constructor() {
        super();
        this.x = this.tx;
        this.y = 900;
    }
    update() {
        if (GAME_STATE == GS_PAUSED) {
            if (SCORE > HIGH_SCORE) {
                HIGH_SCORE = SCORE;
                localStorage.setItem("crappy_bird_high_score",HIGH_SCORE);
                this.newScore = true;
            }
            this.y = this.y + (this.ty - this.y) * 0.1;
            if (INSTA_RESET) init_game();
        }
        else {
            this.y = this.y + (900 - this.y) * 0.1;
            this.newScore = false;
        }
    }
    render() {
        var side_w = this.width - 28 * 2;
        if (side_w < 0) side_w = 0;
        var side_h = this.height - 28 * 2;
        if (side_h < 0) side_h = 0;

        // rendering the background nineslice

        // 1 2 3
        CONTEXT.drawImage(imageData["ui_ns_box1.png"], this.x, this.y);
        CONTEXT.drawImage(imageData["ui_ns_box2.png"], this.x + 28, this.y, side_w, 28);
        CONTEXT.drawImage(imageData["ui_ns_box3.png"], this.x + 28 + side_w, this.y);
        // 8 9 4
        CONTEXT.drawImage(imageData["ui_ns_box8.png"], this.x, this.y + 28, 28, side_h);
        CONTEXT.drawImage(imageData["ui_ns_box9.png"], this.x + 28, this.y + 28, side_w, side_h);
        CONTEXT.drawImage(imageData["ui_ns_box4.png"], this.x + 28 + side_w, this.y + 28, 28, side_h);
        // 7 6 5
        CONTEXT.drawImage(imageData["ui_ns_box7.png"], this.x, this.y + side_h);
        CONTEXT.drawImage(imageData["ui_ns_box6.png"], this.x + 28, this.y + side_h, side_w, 28);
        CONTEXT.drawImage(imageData["ui_ns_box5.png"], this.x + 28 + side_w, this.y + side_h);

        // gameover
        var ratio = this.width / imageData["ui_gameover.png"].width;
        var newHeight = imageData["ui_gameover.png"].height * ratio;
        CONTEXT.drawImage(imageData["ui_gameover.png"], this.x, this.y - 5 - newHeight, this.width, newHeight);

        CONTEXT.font = "20px Comic Sans MS";
        CONTEXT.fillStyle = "#8A5B41";
        CONTEXT.fillText("MEDAL", this.x + 45, this.y + 40);
        CONTEXT.textAlign = 'end'
        CONTEXT.fillText("SCORE", this.x + 325, this.y + 40);
        CONTEXT.fillText(SCORE, this.x + 325, this.y + 70);
        CONTEXT.fillText((this.newScore ? "NEW " : "") + "BEST", this.x + 325, this.y + 100);
        CONTEXT.fillText(HIGH_SCORE, this.x + 325, this.y + 130);

        CONTEXT.textAlign = 'center'
        CONTEXT.fillText("Press the R key to restart...", 200, this.y + this.height);
        CONTEXT.textAlign = 'start'

        if (SCORE < 10) return;

        var medal = "bronze";

        if (SCORE > 20) medal = "silver";
        if (SCORE > 30) medal = "gold";

        var sprite = imageData[`medal-${medal}.png`]
        CONTEXT.drawImage(sprite, this.x + 35, this.y + 55, sprite.width / 2, sprite.height / 2);

    }
}

let GS_PLAYING = 0;
let GS_LOST = 1;
let GS_PAUSED = 2;
let GAME_STATE = GS_PLAYING;
let PIPE_DISTANCE = 70;
let SCORE = 0;
let pipetimer = 0;
let OBJECTS = [];
let CLOUDS = [];
let HIGH_SCORE = localStorage.getItem("crappy_bird_high_score") || 0;
OBJECTS.push(new City());
OBJECTS.push(new Ground());
// spawn clouds
for (var i = 0; i < 4; i++) {
    CLOUDS.push(new Cloud());
}
let PLAYER = new Player();
let COUNTER = new Counter();
let SCORE_POPUP = new ScorePopup();

function init_game() {
    GS_PLAYING = 0;
    GS_LOST = 1;
    GS_PAUSED = 2;
    GAME_STATE = GS_PLAYING;
    PIPE_DISTANCE = 70;
    SCORE = 0;
    pipetimer = 0;
    OBJECTS = [];
    CLOUDS = [];
    OBJECTS.push(new City());
    OBJECTS.push(new Ground());
    // spawn clouds
    for (var i = 0; i < 4; i++) {
        CLOUDS.push(new Cloud());
    }
    PLAYER = new Player();
    COUNTER = new Counter();
}

init_game();

let MP_PLAYERS = {};
let CHAT_HISTORY = [];

function updateLoop() {
    setTimeout(updateLoop, (1 / DISPLAY_FPS) * 1000);
    if (!ASSETS_LOADED) return;
    var _dt = 1/DISPLAY_FPS;
    var _dtmul = _dt/(1/60);

    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height); // clear the screen

    pipetimer += 1*_dtmul;
    if (pipetimer > PIPE_DISTANCE) {
        pipetimer = 0;
        if (OFFLINE) OBJECTS.push(new Pipe());
    }

    CONTEXT.fillStyle = "#A8DAE0";
    CONTEXT.fillRect(0, 0, CANVAS.width, CANVAS.height);


    var toremove = [];

    // todo: actually sort lol
    var clouds_sorted = CLOUDS.sort((a,b)=>{
        if (a.speed < b.speed) return -1;
    });

    for (cloud of clouds_sorted) {
        cloud.update(_dtmul);
        cloud.render();
    }

    // render the rest
    for (obj of OBJECTS) {
        if (obj instanceof Pipe && obj.x < -120) {
            toremove.push(obj);
            continue;
        }
        obj.update(_dtmul);
        obj.render();
    }


    for (obsolete of toremove) {
        OBJECTS.splice(OBJECTS.indexOf(obsolete), 1);
    }

    PLAYER.update(_dtmul);
    PLAYER.render();

    COUNTER.update(_dtmul);
    COUNTER.render();

    SCORE_POPUP.update(_dtmul);
    SCORE_POPUP.render();

    for (player in MP_PLAYERS) {
        if (OFFLINE) break;
        MP_PLAYERS[player].update(_dtmul);
        MP_PLAYERS[player].render();
    }

    //if (multiplayer_ws.readyState == CLOSED || GAME_STATE == GS_PAUSED) return;
    document.getElementById("chat").innerText = CHAT_HISTORY.join("\n");
}

updateLoop();

function multiplayerPacket() {
    if (OFFLINE) return;
    try {
        multiplayer_ws.send(JSON.stringify({ 'type': 'pos_update', 'data': PLAYER.get_web() }))
    } catch (e) {
        console.log("Unable to send multiplayer packet:",e);
    }
}

setInterval(multiplayerPacket, 1 / 60 * 1000);

let controls = false;

window.onkeydown = (e) => {
    if (e.code == "ArrowUp") PLAYER.jump();
    if (e.code == "KeyR" && GAME_STATE == GS_PAUSED) init_game();
    if (e.code == "Enter") chat_send()
}
window.onkeyup = (e) => { if (e.code == "ArrowUp") PLAYER.unjump() }
CANVAS.addEventListener("mousedown",(e) => {
    if (GAME_STATE == GS_PLAYING) PLAYER.jump();
    if (GAME_STATE == GS_PAUSED) init_game();
});
CANVAS.addEventListener("touchstart",(e) => {
    if (GAME_STATE == GS_PLAYING) PLAYER.jump();
    if (GAME_STATE == GS_PAUSED) init_game();
});

// multiplayer

// shorthand

function floor(x){
    return Math.floor(x);
}

let username = localStorage.getItem("online_username");
if (username == null){
    username = prompt("Please choose your multiplayer username:")
    if (username == undefined || username == null || username == "") {
        username = `player${floor(Math.random()*10)}${floor(Math.random()*10)}${floor(Math.random()*10)}${floor(Math.random()*10)}`;
        alert("You have been assigned a randomly generated name.")
    }
    localStorage.setItem("online_username",username);
}
let multiplayer_ws = new WebSocket(SERVER_IP);

multiplayer_ws.onopen = () => {
    multiplayer_ws.send(JSON.stringify({ "type": "username", "data": username }));
    multiplayer_ws.send(JSON.stringify({ "type": "joined", "data": {} }));
}
multiplayer_ws.onclose = () => {
    CHAT_HISTORY.push("Info: The WS has been closed.");
    CHAT_HISTORY.push("This means the game is running in offline mode, your chat messages");
    CHAT_HISTORY.push("won't be sent.");
    OFFLINE = true
}
multiplayer_ws.onmessage = (data) => {
    var parsed = JSON.parse(data.data);
    var user = parsed["username"];
    var type = parsed["packet"]["type"];
    var data = parsed["packet"]["data"];
    if (type == "lost_connection") {
        delete MP_PLAYERS[user];
        CHAT_HISTORY.push(`${user} disconnected from the game.`);
        return;
    }
    if (type == "joined") {
        CHAT_HISTORY.push(`${user} joined the game.`);
        return;
    }
    if (type == "chat_message") {
        CHAT_HISTORY.push(`${user}: ${data}`);
        return
    }
    if (type == "summon_pipe" && user == "server") {
        make_pipe(data);
        return
    }
    if (type == "death" && DEATHLINK) {
        GAME_STATE = GS_LOST;
        return;
    }
    if (MP_PLAYERS[user] == undefined) {
        MP_PLAYERS[user] = new Player();
        MP_PLAYERS[user].multiplayer = true;
        MP_PLAYERS[user].username = user;
        MP_PLAYERS[user].set_web(data);
    } else {
        MP_PLAYERS[user].set_web(data);
    }
}

function make_pipe(y) {
    var pipe = new Pipe();
    pipe.y = y;
    OBJECTS.push(pipe);
}

function chat_send() {
    var msg = document.getElementById("chatbox").value;
    if (msg.trim() == "") return;
    try {
        multiplayer_ws.send(JSON.stringify({ "type": "chat_message", "data": msg.trim() }));
    } catch (e) {
        CHAT_HISTORY.push("Send error: The multiplayer WS likely isn't open.");
    }
    CHAT_HISTORY.push(`${username}: ${msg.trim()}`);
    document.getElementById("chatbox").value = "";
}

function chat_hide(button) {
    var chat = document.getElementById("chat-container");
    if (chat.classList.contains("chat-hidden")) {
        chat.classList.remove("chat-hidden");
        button.innerText = "Hide";
    } else {
        chat.classList.add("chat-hidden");
        button.innerText = "Show";
    }
}

// copied shit
function getScreenRefreshRate(callback, runIndefinitely){
    let requestId = null;
    let callbackTriggered = false;
    runIndefinitely = runIndefinitely || false;

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
    }
    
    let DOMHighResTimeStampCollection = [];

    let triggerAnimation = function(DOMHighResTimeStamp){
        DOMHighResTimeStampCollection.unshift(DOMHighResTimeStamp);
        
        if (DOMHighResTimeStampCollection.length > 10) {
            let t0 = DOMHighResTimeStampCollection.pop();
            let fps = Math.floor(1000 * 10 / (DOMHighResTimeStamp - t0));

            if(!callbackTriggered){
                callback.call(undefined, fps, DOMHighResTimeStampCollection);
            }

            if(runIndefinitely){
                callbackTriggered = false;
            }else{
                callbackTriggered = true;
            }
        }
    
        requestId = window.requestAnimationFrame(triggerAnimation);
    };
    
    window.requestAnimationFrame(triggerAnimation);

    // Stop after half second if it shouldn't run indefinitely
    if(!runIndefinitely){
        window.setTimeout(function(){
            window.cancelAnimationFrame(requestId);
            requestId = null;
        }, 500);
    }
}

getScreenRefreshRate((fps)=>{
    DISPLAY_FPS = fps;
},true);
//DISPLAY_FPS = 30;