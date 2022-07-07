let mpv = require('node-mpv');
let { io } = require("socket.io-client")
const prompt = require('prompt');

prompt.start();
prompt.get(["ip", "port", "videoFilePath"], (err, result)=>{


    // Variables
    var variables = {
        unobserveIDs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        observeProperties: [{property: "pause", id: 1}], //, {property: "sub-visibility", id: 2}
        mpvBinaryLoc: "mpv.exe",
        lastCommandID: undefined,
        currentlyPaused: undefined,
        minSeekDiff: 1.5,
        ip: result.ip,
        port: result.port,
        videoFilePath: result.videoFilePath,
    }


    // Init
    let socket = io(`ws://${variables.ip}:${variables.port}`)

    let mpvPlayer = new mpv({binary: variables.mpvBinaryLoc});
    unobserveProperties();observeProperties()

    mpvPlayer.load(variables.videoFilePath);


    // Functions
    function unobserveProperties(){for (index in variables.unobserveIDs){mpvPlayer.unobserveProperty(variables.unobserveIDs[index])}}
    function observeProperties(){for (index in variables.observeProperties){mpvPlayer.observeProperty(variables.observeProperties[index].property, variables.observeProperties[index].id)}}
    function setRandomCommandID(){let randomCommandID = Math.random().toString();variables.lastCommandID = randomCommandID;return randomCommandID}


    // Outbound Events
    mpvPlayer.on("statuschange", (mpvArg)=>{
        if (mpvArg.pause != variables.currentlyPaused){
            socket.emit("sendDataToServer", {"type": "pauseState", commandID: setRandomCommandID(), isPaused: mpvArg.pause})
            variables.currentlyPaused = mpvArg.pause
        }
    })

    mpvPlayer.on("seek", (mpvArg)=>{
        if (Math.abs(mpvArg.start - mpvArg.end) > variables.minSeekDiff){
            socket.emit("sendDataToServer", {"type": "timepos", commandID: setRandomCommandID(), timepos: mpvArg.end})
        }
    })


    // Inbound Events
    socket.on("connectionEstablished", (arg)=>{console.log("Connected!!")})

    socket.on("sendDataToClient", (arg)=>{
        if (arg.commandID != variables.lastCommandID){
            console.log(arg)
            if (arg.type == "pauseState"){
                if (arg.isPaused == true && variables.currentlyPaused == false){mpvPlayer.pause()}
                else if (arg.isPaused == false && variables.currentlyPaused == true){mpvPlayer.resume()}
            }
            
            if (arg.type == "timepos"){
                if (Math.abs(arg.timepos - mpvPlayer.currentTimePos) > variables.minSeekDiff){
                    mpvPlayer.goToPosition(arg.timepos)
                }
            }
        }
    })


})