import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 5500 });

const CLIENTS = []

let PIPE_YS = [];
function makePipeLoop() {
  for (var client of CLIENTS){
    if (client.pipetimer > client.pipe_distance) {
      if (client.lost) {
        client.pipetimer = 0;
        client.pipe_distance = 70;
        continue;
      }
      if (client.score > PIPE_YS.length-1) PIPE_YS[client.score] = Math.round(100+Math.random()*200);
      client.send(JSON.stringify({"username":"server",packet:{"type":"summon_pipe","data":PIPE_YS[client.score]}}));
      client.pipetimer = 0;
    }
    client.pipe_distance = 70-client.score*0.25;
    client.pipetimer++;
  }
}
setInterval(makePipeLoop,1/60*1000);

wss.on('connection', function connection(ws) {
  if (ws.pipetimer == undefined) ws.pipetimer = 0;
  if (ws.pipe_distance == undefined) ws.pipe_distance = 70;
  ws.on('error', console.error);
  ws.on('close', function (){
    for (var client of CLIENTS){
      if (client != ws&&client != undefined){
        client.send(JSON.stringify({"username":ws.username,packet:{"type":"lost_connection"}}));
      }
    }
    CLIENTS.splice(CLIENTS.indexOf(ws),1);
  })

  ws.on('message', function message(data) {
    //console.log('received: %s', data);
    var forward = true;
    var packet = JSON.parse(data.toString())
    if (packet.type == "username") {
      for (client of CLIENTS){
        if (client.username == packet.data){
          ws.close();
          return;
        }
      }
      ws.username = packet.data;
      forward = false;
    }
    if (packet.type == "pos_update"){
      ws.score = packet.data[8];
      ws.lost = packet.data[7];
    }
    //ws.send("data received");
    for (var client of CLIENTS){
      if (client != ws&&client != undefined&& forward){
        client.send(JSON.stringify({"username":ws.username,packet:packet}));
      }
    }
  });

  CLIENTS.push(ws);
});