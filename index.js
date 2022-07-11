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
    function getRandomCommandID(){return Math.random().toString()}


    // Outbound Events
    mpvPlayer.on("statuschange", (mpvArg)=>{
        if (mpvArg.pause != variables.currentlyPaused){
            socket.emit("sendDataToOthers", {type: "pauseState", commandID: getRandomCommandID(), isPaused: mpvArg.pause})
            variables.currentlyPaused = mpvArg.pause
        }
    })

    mpvPlayer.on("seek", (mpvArg)=>{
        if (Math.abs(mpvArg.start - mpvArg.end) > variables.minSeekDiff){
            socket.emit("sendDataToOthers", {type: "timepos", commandID: getRandomCommandID(), timepos: mpvArg.end})
        }
    })


    // Inbound Events
    socket.on("connectionEstablished", (arg)=>{console.log("Connected!!")})

    socket.on("clientReceiver", (arg)=>{
        if (arg.commandID != variables.lastCommandID){
            variables.lastCommandID = arg.commandID
            
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
            
            if (arg.type == "showText"){
                mpvPlayer.displayASS("{\\fs10}"+arg.text.toString(), arg.duration||7500, arg.position||7)
            }

            if (arg.type == "setProperty"){
                try{mpvPlayer.setProperty(arg.propertyName, arg.propertyValue)}catch(e){}
            }
            
            if (arg.type == "getProperty"){
                try{
                    mpvPlayer.getProperty(arg.propertyName).then((returnValue)=>{
                        socket.emit("sendDataToDebuggers", {type:"propertyData", data: returnValue})
                    })
                }catch(e){}
            }
        }
    })

})