/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    socketio.js
. Lenuaje:              Javascript
. Propósito:    Este módulo administra las conexiones vía socketIO entre el
.               servidor y el cliente web que consume el sitio del visor.
. 
. Desarrollado por:     Nataly Janeth Contreras Ramirez
******************************************************************************/
module.exports = function(app, server){
    var socketIO = require('socket.io')(global.configuracion.puertoVisorWebSocket); //libreria para socketIO   .(80)


    global.socketIO = socketIO;    //variable global temporal para hacer broadcast
	global.enviar = null;

	socketIO.sockets.on('connection', function(socket){

		if (global.enviar == null)
			global.enviar = socket;
		console.log('Se ha conectado un navegador web a SITCRUM.');

	});
}