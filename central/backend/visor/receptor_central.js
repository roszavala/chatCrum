/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    receptor_io.js
. Lenuaje:              Javascript
. Propósito:    Este módulo recibe las N conexiones desde el receptor_udp o en
.               su caso, directo desde cada una de las ambulancias via
.               Socket.io cuando se utiliza el método CIDESI
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

module.exports = function(){

    var io = require('socket.io')(global.configuracion.puertoReceptorIO);

    var c = [];

    //var id = setInterval(pintar, 1000);

    function pintar() {
        console.log('\033[2J');
        console.log(c);
    }

    /***********************************************************************************
     *  Método que revisa si existe algún socket (de un médico especialista) conectado
     *  e identificado con el id de la ambulancia, para reenviarle la información 
     *  obtenida de los sensores.
     **********************************************************************************/
    function enviarInformacionMovil(evento, datos) {

        var tamArregloMoviles = global.conexionesMoviles.length;

        for(var i = 0; i < tamArregloMoviles; i++){
            if(global.conexionesMoviles[i].idAmbulancia == datos.id_ambulancia){
                global.conexionesMoviles[i].conexion.emit(evento, datos);
            }
        };

    }

    /******************************************************************************
    *   Evento que indica se ha establecido una conexión vía Socket.io
    ******************************************************************************/
    io.on('connection', function(socket){
        socket.acumulado=0;
        console.log('Nueva conexión en la central: ' + socket.id);

        if (c[socket.id] == undefined) {
            c[socket.id] = { 'id_ambulancia' : 0, 'ecg' : 0, 'spo': 0, 'cap' : 0, 'tmp' : 0, 'tar' : 0, 'fre' : 0};
        }

        socket.on('nuevoTMP', function (datos){
            c[socket.id].id_ambulancia = datos.id_ambulancia;
            c[socket.id].tmp++;

            if (global.enviar != undefined) {
                global.enviar.broadcast.emit('TMP', datos);
            }

            enviarInformacionMovil('nuevoTMP', datos);
        });

        socket.on('nuevoTAR', function (datos){
            c[socket.id].id_ambulancia = datos.id_ambulancia;
            c[socket.id].tar++;

            if (global.enviar != undefined) {
                global.enviar.broadcast.emit('TAR', datos);
            }

            enviarInformacionMovil('nuevoTAR', datos);
        });

        socket.on('nuevoCAP', function (datos){
            c[socket.id].id_ambulancia = datos.id_ambulancia;
            c[socket.id].cap++;

            if (global.enviar != undefined) {
                global.enviar.broadcast.emit('CAP', datos);
            }

            enviarInformacionMovil('nuevoCAP', datos);
        });

        socket.on('nuevoSPO', function (datos){
            c[socket.id].id_ambulancia = datos.id_ambulancia;
            c[socket.id].spo++;

            if (global.enviar != undefined) {
                global.enviar.broadcast.emit('SPO', datos);
            }

            enviarInformacionMovil('nuevoSPO', datos);
        });

        socket.on('nuevoECG', function (datos){
            
            socket.acumulado+=datos.ecg.canal[0].length;
            datos.acumulado=socket.acumulado;

            c[socket.id].id_ambulancia = datos.id_ambulancia;
            c[socket.id].ecg++;

            if (global.enviar != undefined) {
                global.enviar.broadcast.emit('ECG', datos);
            }
            enviarInformacionMovil('nuevoECG', datos);
        });

        socket.on('nuevoFRE', function (datos){
            c[socket.id].id_ambulancia = datos.id_ambulancia;
            c[socket.id].fre++;

            //console.log(datos);

            if (global.enviar != undefined) {
                global.enviar.broadcast.emit('FRE', datos);
            }
            enviarInformacionMovil('nuevoFRE', datos);
        });
    });

    console.log('Corriendo la Receptor_Central.....');
}
