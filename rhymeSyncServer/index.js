let { Server } = require("socket.io")

// Variables
var activeSockets = []

// Init Socket
const io = new Server(80, {
    cors: {origin: "*", methods: ["GET", "POST"]}
});


// Functions
function sendToAllClientsExcept(channel, data, exceptionSocketId){
    for (index in activeSockets){
        if (activeSockets[index] != exceptionSocketId){ // Won't send the data back to the client it got it from to avoid looping (not that it's been caught looping)
            io.to(activeSockets[index]).emit(channel, data);
        }
    }
}

io.on("connection", (socketObj)=>{
    socketObj.emit("connectionEstablished", true);
    
    activeSockets.push(socketObj.id)
    socketObj.on("disconnect", ()=>{activeSockets.splice(activeSockets.indexOf(socketObj.id), 1)})
    
    socketObj.on("getActiveSocketList", ()=>{socketObj.emit("debuggerReceiver", {type: "activeSocketData", activeSockets: activeSockets, selfSocket: socketObj.id})})
    socketObj.on("sendDataToDebuggers", (arg)=>{let returnValue = arg; returnValue["fromID"]=socketObj.id; sendToAllClientsExcept("debuggerReceiver", returnValue, socketObj.id)})
    socketObj.on("sendDataToSpecificID", (arg)=>{try{io.to(arg.recipientsID).emit("clientReceiver", arg)}catch(e){}})
    socketObj.on("sendDataToOthers", (arg)=>{sendToAllClientsExcept("clientReceiver", arg, socketObj.id)})
})