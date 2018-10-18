/******************************************************************************
.                   Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    socketioServer.js
. Lenguaje:             Javascript
. Propósito:    Este módulo gestiona todas las conexiones entrantes, realizadas
.               por medio de las tablets, al servidor ubicado en el SITCRUM,
.               para consultar si se tiene algún servicio activo. 
. 
. Desarrollado por:     Rebeca Chavarria Cruz
******************************************************************************/
module.exports = function(app, server){
   var io = require('socket.io').listen(global.configuracion.puertoSocketInicioServicio, { pingTimeout : 26000 });
   var con = require('../db/postgresql');
   var kinvey = require('../visor/kinvey');
   
   
   /**
    *   Arreglos creados para la gestión de conexiones de Ambulancias, SITCRUM y médicos especialistas
    *   Las conexiones se van a eliminar una vez que se detecte la desconexión con
    *   el servidor... 
    */
   global.conexionesNitro = [];
   global.conexionesSIT = [];
   global.conexionesMoviles = [];

    
    //Se acepta una nueva conexión entrante
    io.sockets.on('connection', function(socket){
        console.log('Un nuevo cliente conectado id ' + socket.id);
        //Se envía el mensaje de bienvenida a usuario
        socket.emit('message', 'Bienvenido');
        //Se almacena el valor de la conexión entrante
     
        //Función que lee algún mensaje enviado por el cliente.
        //Evento emitido por NITRO
        socket.on('message', function(dato){
            console.log('Mensaje del cliente ' + dato);
        });
        
        //Función que realiza la consulta del servicio de una ambulancia
        //Evento emitido por NITRO
        socket.on('servicio', function(dato, callback){
            console.log('Ambulancia pidiendo servicio ' + dato.idConfig);
            con.consultaServicio(dato, socket, function(respuesta){
                callback(respuesta);
            });
        });
        
        //Función que consultará el Frap en tiempo real de la nitro
        //Evento emitido por SITCRUM
        socket.on('consultaFrap', function (dato) {
            
            //Este evento se ejecuta la primera vez que entra a solicitar la información de un frap
            //Si entra en este evento, quiere decir que quien se ha conectado es una persona de SITCRUM
            //Por lo que se debe de buscar si se tiene alguna conexión con alguna NITRO con el id que solicitó
            //También se debe de almacenar el id del frap y de esa conexión.
            console.log('Alguien quiere cosultar un FRAP desde el SITCRUM!!!!! ID : ' + dato);
            consultaIdSIT(dato, socket, function (resultado) {
                
                if(resultado == 'conexionAgregada'){
                    
                    var activa = false;
                    //Se debe de buscar en el arreglo de las conexiones de la nitro, si existe alguna conexión
                    //activa con ese id de frap... 
                    var tamArreglo = global.conexionesNitro.length;
                    for(var x = 0; x < tamArreglo ; x++){
                        if(global.conexionesNitro[x].idFrap == dato){
                            console.log('Si está activa la conexión con ese frap');
                            //Si encontró una conexión con ese frap en alguna nitro... entonces....
                            global.conexionesNitro[x].conexion.emit('consultaFRAP');   //prueba
                            activa = true;
                        }
                    };
                    
                    if(activa == false){
                        console.log('Aun no es atendido el servicio...... ');
                        //Se debe de notificar al SITCRUM que el frap que consultó, no ha sido tomado...
                        var numArrego = global.conexionesSIT.length;
                        for(var r = 0; r < numArrego; r++){
                            if(global.conexionesSIT[r].idFrap == dato){
                                //Encontró la conexión que está buscando ese frap......
                                var respuesta = {
                                    "codigo" : 0,
                                    "descripcion" : 'El servicio aun no es atendido o la ambulancia se encuentra sin conexión'
                                };
                                global.conexionesSIT[r].conexion.emit('infoNoDisponible', respuesta);
                            }
                        };
                        
                    }
                    
                }
                
            });
            
            
        });
        
        //Función que actualizará la información que se tiene de la conexión de la NITRO, en caso de que se haya desconectado y tenga un servicio activo
        //Evento emitido por NITRO
        socket.on('actualizaDatosNitro', function (datos) {
            
            console.log(JSON.stringify(datos));
      
            console.log('Nitro tiene servicio activo, se debe de actualizar los datos frap ' + datos + ' socket id ' + socket.id);
            var tamArregloN = global.conexionesNitro.length;
            console.log(tamArregloN);
            global.conexionesNitro.push({conexionId : socket.id, conexion: socket, idFrap : datos}); // Se añade nuevamente a la colección... 
            tamArregloN = global.conexionesNitro.length;
            console.log(tamArregloN);
            
            //Se envía una petición a la nitro, para que envie toda la información que tiene disponible en el FRAP...
            socket.emit('consultaFRAP');
   
        });

        
        
        //Función que envia la información activa del frap a la conexión del SITCRUM que lo solicitó
        //Evento emitido por NITRO
        socket.on('datosCompletosFrap', function (datos) {
            console.log('Se recibió la información completa de un frap');
            console.log(JSON.stringify(datos));

            var infoNitro = datos.consulta
            // Se busca dentro de la llave de consulta, si no cuenta con la llave de principal, se le solicitara nuevamente la informacion a la ambulancia
            if (!infoNitro.hasOwnProperty('Principal')) {
                console.log('noooo tiene datos en la consulta, se solicitara a ambulancia su informacion')
                //Se debe de buscar en el arreglo de las conexiones de la nitro, si existe alguna conexión activa con ese id de frap... 
                var tamArreglo = global.conexionesNitro.length;
                for(var x = 0; x < tamArreglo ; x++){
                    if(global.conexionesNitro[x].idFrap == datos.idFrap){
                        console.log('Si está activa la conexión con ese frap');
                        //Si encontró una conexión con ese frap en alguna nitro... entonces....
                        global.conexionesNitro[x].conexion.emit('consultaFRAP');   //prueba
                    }
                }; 
            } else {
                //Se deberá de buscar si existe alguna conexión activa del SITCRUM que haya solicitado esa información
                var inum = global.conexionesSIT.length;
                var conexionA = false;
                
                consultaConexionSIT(datos.idFrap, function(respuesta){
                    
                    if(respuesta != 'conexionNoActiva'){
                        //Quiere decir que si se encontró quien solicitó esa información.....
                        
                        //Se debe de validar si ya se tienen datos del frap...
                        if(datos.codigo == 1){
                            console.log('Si tiene datos el FRAP....');
                            //respuesta.conexion.emit('datosFrap', datos.consulta);
                            if (datos.consulta.Principal) {
                                //console.log(datos.consulta.Principal);
                                respuesta.conexion.emit('fPrincipal', datos.consulta.Principal);
                            }
                            if (datos.consulta.Sintomas && datos.consulta.Sintomas.monitoreoECG) {
                                respuesta.conexion.emit('fSintomas', datos.consulta.Sintomas);
                                //  console.log(datos.consulta.Sintomas);
                            }
                            
                            if (datos.consulta.Lesiones) {
                                respuesta.conexion.emit('fLesiones', datos.consulta.Lesiones);
                                //console.log(datos.consulta.Lesiones);
                            }

                            if (datos.consulta.Atencion) {
                                respuesta.conexion.emit('fAtencion', datos.consulta.Atencion);
                                //console.log(datos.consulta.Atencion);
                            }

                            if (datos.consulta.Ayuda) {
                                respuesta.conexion.emit('fAyuda', datos.consulta.Ayuda);
                            }

                            if (datos.consulta.Tratamientos) {
                                respuesta.conexion.emit('fTratamiento', datos.consulta.Tratamientos);
                            }

                            if (datos.consulta.Traslado) {
                                respuesta.conexion.emit('fTraslado', datos.consulta.Traslado);
                            }

                            if (datos.consulta.Negativa) {
                                respuesta.conexion.emit('fNegativa', datos.consulta.Negativa);
                            }

                            if (datos.consulta.ParoCardiaco) {
                                respuesta.conexion.emit('fParoCardiaco', datos.consulta.ParoCardiaco);
                            }

                        }else{
                            var resp = {
                                "codigo" : datos.codigo,
                                "descripcion" : 'No hay actualización de información de FRAP'
                            };
                            console.log('Aun no tiene datos el FRAP.....');
                            respuesta.conexion.emit('noHayDatos', resp);
                        };
                            
                    };
                    
                });
            }
            
        });
        
        //Función de socket.io que captura la excepción en caso de error.
        socket.on('error', function(err){
            console.log("Caught flash policy server socket error: ");
            console.error(err.stack);
            //  sys.log("Ignoring exception: " + err);
        });
       
        /**
         *  Función de desconexión de dispositivos.
         *  Este evento es emitido por todas las conexiones que llegan a conectarse por este puerto
         *  Se verificará que tipo de entidad (ambulancia, sitcrum web, médico especialista), se desconectó
         *  para poder eliminarlo del arreglo de conexiones que le corresponde. 
         */
        socket.on('disconnect', function(){
            console.log('Se ha desconectado el cliente '+ socket.id );
            
            //Aquí se tiene que verificar que tipo de USUARIO se desconectó
            var tamArregloN = global.conexionesNitro.length;
            var tamArregloS = global.conexionesSIT.length;
            var tamArregloM = global.conexionesMoviles.length;
            
            //  Para buscar en el arreglo de las conexiones de las nitro
            for(var x = 0; x < tamArregloN; x++) {
                //  Se valida que el id del socket que se desconectó exista dentro del arreglo de la conexión de la nitro
                if(global.conexionesNitro[x].conexionId == socket.id) {
                    console.log('El que se fue fue una nitrooooo......');
                    
                    // Se debe de notificar a personal de sitcrum, en caso de que alguien este viendo ese servicio
                    if (tamArregloS != 0) { 
                        for(var r = 0; r < tamArregloS; r++){
                            if(global.conexionesNitro[x].idFrap == global.conexionesSIT[r].idFrap){
                                //Encontró la conexión que
                                var respuesta = {
                                    "codigo" : 0,
                                    "descripcion" : 'El equipo se ha desconectado'
                                };
                                global.conexionesSIT[r].conexion.emit('infoNoDisponible', respuesta);
                            }

                        if (r == tamArregloS - 1) {
                                //Se debería de eliminar del arreglo de las nitrooooo..........
                                console.log(tamArregloN);
                                global.conexionesNitro.splice(x,1);
                                tamArregloN = global.conexionesNitro.length;
                                console.log(tamArregloN);
                            }
            
                        }; 
                        
                    } else {
                        //Se debería de eliminar del arreglo de las nitrooooo..........
                        console.log(tamArregloN);
                        global.conexionesNitro.splice(x,1);
                        tamArregloN = global.conexionesNitro.length;
                        console.log(tamArregloN);
                    }

                    return;
                };
            }
            
             //  Para buscar en el arreglo de las conexiones del sitcrum web
            for(var r = 0; r < tamArregloS; r++){
                if(global.conexionesSIT[r].conexionId == socket.id){
                    console.log('Se fue alguien del SITCRUM.........');
                    //Se deberìa de eliminar del arreglo del SITCRUM
                    console.log(tamArregloS);
                    global.conexionesSIT.splice(r,1); //Se elimina del arreglo....
                    tamArregloS = global.conexionesSIT.length;
                    console.log(tamArregloS);
                    return;
                }
            };

             //  Para buscar en el arreglo de las conexiones de especialistas
             for(var m = 0; m < tamArregloM; m++){
                 if(global.conexionesMoviles[m].conexionId == socket.id){
                     console.log('Se ha desconectado un médico especialista.....');
                     // Se debe de eliminar del arreglo de conexiones de especialistas
                     console.log(tamArregloM);
                     global.conexionesMoviles.splice(m,1);
                     tamArregloM = global.conexionesMoviles.length;
                     console.log(tamArregloM);
                     return;
                 }
             };
            
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de generales al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fPrincipal', function (datos) {
            console.log('Recibió una actualización de la pantalla de principales...');
            console.log(JSON.stringify(datos));
            //Deberá de buscar si existe alguna conexión con el SITCRUM que haya solicitado ese idFrap
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se le envia la información a SITCRUM
                    console.log('Encontro a alguien fPrincipal.....');
                    respuesta.conexion.emit('fPrincipal', datos.consulta);
                } else {
                    socket.emit('message', respuesta);
                };
            });
            
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de sintomas al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fSintomas', function(datos){
            console.log('Recibió una actualización en la pantalla de sintomas...');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Si se encontró conexión con el frap....
                    respuesta.conexion.emit('fSintomas', datos.consulta);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de lesiones al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fLesiones', function(datos){
            console.log('Recibió una actualización en la pantalla de lesiones');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function (respuesta) {
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está pidiendo datos...
                    respuesta.conexion.emit('fLesiones', datos.consulta.Lesiones);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de atención al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fAtencion', function(datos){
            console.log('Recibió una actualización en la pantalla de atención prehospitalaria');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está solicitando los datos...
                    respuesta.conexion.emit('fAtencion', datos.consulta.Atencion);
                }else{
                    socket.emit('message', respuesta);
                };
            });            
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de ayuda al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fAyuda', function(datos){
            console.log('Recibió una actualización en la pantalla de ayuda....');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está solicitando la información de ese frap...
                    respuesta.conexion.emit('fAyuda', datos.consulta.Ayuda);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de tratamientos al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fTratamiento', function(datos){
            console.log('Recibió una actualización en la pantalla de tratamientos....');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está solicitando información de ese frap....
                    respuesta.conexion.emit('fTratamiento', datos.consulta.Tratamientos);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de traslado al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fTraslado', function(datos){
            console.log('Recibió una actualización en la pantalla de traslado....');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está solicitando información de ese frap....
                    respuesta.conexion.emit('fTraslado', datos.consulta.Traslado);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de negativa al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fNegativa', function(datos){
            console.log('Recibió una actualización en la pantalla de negativa....');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está solicitando información de ese frap....
                    respuesta.conexion.emit('fNegativa', datos.consulta.Negativa);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro, buscando actualizar los datos obtenidos
         * en la pantala de Paro Cardiaco al SITCRUM
         * Evento emitido por NITRO
         */
        socket.on('fParoCardiaco', function(datos){
            console.log('Recibió una actualización en la pantalla de paro cardiaco....');
            console.log(JSON.stringify(datos));
            consultaConexionSIT(datos.idFrap, function(respuesta){
                if(respuesta != 'conexionNoActiva'){
                    //Se encontró conexión de SITCRUM que está solicitando información de ese frap....
                    respuesta.conexion.emit('fParoCardiaco', datos.consulta.ParoCardiaco);
                }else{
                    socket.emit('message', respuesta);
                };
            });
        });
        
        /**
         * Función que es emitida por la nitro para disparar el cierre del FRAP
         * Evento emitido por NITRO
         */
        socket.on('fCierre', function(datos, callback){
            console.log('Recibió datos para cierre del Frap .... ' + datos.idFrap);
            console.log(JSON.stringify(datos));
            console.log(JSON.stringify(datos.consulta.ParoCardiaco));
            con.cierreFrap(datos, socket, function(respuesta){
                 callback(respuesta)
            });

            //Aquí se tiene la longitud del arreglo que gestiona las conexiones de la nitro.
            var tamArregloN = global.conexionesNitro.length;
            
            //  Para buscar en el arreglo de las conexiones de las nitro
            for(var x = 0; x < tamArregloN; x++){
                if(global.conexionesNitro[x].conexionId == socket.id){
                    console.log('El que hizo el cierre fue nitrooooo......');
                    //Se debería de eliminar del arreglo de las nitrooooo..........
                    console.log(tamArregloN);
                    global.conexionesNitro.splice(x,1);
                    tamArregloN = global.conexionesNitro.length;
                    console.log(tamArregloN);
                    return;
                };
            }

        });
        
        // Nos pidieron investigar los datos de la ambulancia correspondiente al id de la Nitro
        socket.on('getDataAmbulancia', function(idNitro, fecha) {
            console.log("TEam: " + fecha);
           con.buscame(idNitro, fecha, socket); 
        });
        
        // Recibimos datos de base de datos para Entrega Recepción de Ambulancia
        socket.on('entregaAmbulanciaSITCRUM', function(datos){
            console.log("DATA adquirida: " + datos);
            socket.emit('dataFPRERA', datos);
        });
        
        /*
        * Obtiene información de datos referente a la ambulancia em base al id del Nitro
        */
        socket.on('getDataAmb', function(idNitro, fechaBusqueda){
            console.log("......Vamos a buscar datos.......");
            con.obtieneInfoNitro(idNitro, fechaBusqueda, socket); 
        });
        
        /*
        * Recibimos datos de base de datos para Entrega Recepción de Ambulancia
        */
        socket.on('KRAKEN', function(datos){
            console.log("---> DATA adquirida: ----> " + JSON.stringify(datos));
             con.entregaAmb(datos, socket);
        });
        
        /**
         * Función que es emitida por la nitro para gestionar la entrega/recepción de ambulancia
         * Evento emitido por NITRO
         */
        socket.on('entregaAmbulancia', function(datos){
            console.log('Se recibieron datos para la entrega recepción de ambulancia');
            con.entregaAmbulancia(datos, socket);
        });

        /**
         * Función que es emitida por la nitro para gestionar el envio de las horas de registro
         * de la ambulancia.    Evento emitido por NITRO
         */
        socket.on('horasAmbulancia', function(datos){
            console.log(datos);

            //  Arreglo que almacena los diferentes estatus que se pueden presentar en el servicio.
            var estatus = [2, 3, 4, 5];
            //  Arreglo de control de los tipos de tiempos que se registran de la ambulancia.
            var tiempos = ['salidaAmbulancia', 'arriboEscena', 'salidaEscena', 'arriboUnidadMed', 'ambDisponible'];
            //  Arreglo que almacena el valor de esos tiempos de registro de la ambulancia.
            var datosAmbu = [datos.salidaAmbulancia, datos.arriboEscena, datos.salidaEscena, datos.arriboUnidadMed, datos.ambDisponible];
            var i;
            for(i = 0; i < tiempos.length; i++){
                posicion = i;
                //  Se manda a llamar la función actualizaHorasAmbulancia para realizar la actualización de los tiempos de la ambulancia
                con.actualizaHorasAmbulancia(tiempos[posicion], datosAmbu[posicion], datos.folioFrap, estatus[posicion]);
            }
        });

        /********************************************************************************
         *  APARTADO PARA EVENTOS RECIBIDOS POR PARTE DE LA APLICACIÓN MÓVIL...
        *********************************************************************************/
        socket.on('movil', function (datos) {
            console.log('Se ha conectado un dispositivo móvil.....' + datos);
            //socket.idAmbulancia = datos;
            global.conexionesMoviles.push({conexionId : socket.id, conexion : socket, idAmbulancia : datos});
            //console.info((global.conexionesMoviles));
        });

        //  Función que hace la petición al SITCRUM de la consulta de información del servicio al cual fue asignado
        socket.on('infoServicio', function (datos) {
            console.info('Especialista pidiendo datos del servicio.....');
            con.consultaDatosMovil(datos, socket);
        });

        //  Función que es enviada por el dispositivo móvil, una vez que el médico especialista quiere abandonar la 
        //  aplicación, y aun el servicio está activo.
        socket.on('solicitudDesconexion', function(datos){
            console.log('Médico desea desconectarse.....' + JSON.stringify(datos));
        
            kinvey.liberaEspecialista(datos, function(respuesta){
                
                if(respuesta.estatus === 200){
                    console.log('Se pudo liberar el especialista........ envio de cierre de aplicación....');
                    socket.emit('liberacionExitosa');
                } else if(respuesta.estatus === 400){
                    console.log('No se pudo liberar... intentarlo nuevamente????');
                    socket.emit('liberacionIncorrecta', respuesta);
                }

            });
            //socket.emit('peticionRecibida');
        });

        /********************************************************************************
         *  APARTADO PARA EVENTOS RECIBIDOS POR PARTE DE LA APLICACIÓN MÓVIL...
        *********************************************************************************/

        //  Función que es enviada por parte de la ambulancia. 
        socket.on('basesAmbulancia', function (callback){
            con.buscaBases(socket, function(respuesta) {
                callback(respuesta);
            });
        });
        
    });
    
    //Función que sirve para la búsqueda / actualización del arreglo que gestiona las conexiones del SITCRUM
    function consultaIdSIT(idFrap, socket, callback) {
        console.log('Llego a la función que consultará el frap....');
        console.log('idFRAp... ' + idFrap);
        console.log('id conexioooon..... ' + socket.id);
        
        //Se tendria que buscar si el id del socket que envio el id del frap, ya existe en el
        //arreglo, si existe... se debería de reemplazar - eliminar por el nuevo id.
        var tam = global.conexionesSIT.length;
        
        //Variable de control... 
        var existe = false;
        console.log('tam....'  + tam);        
        if(tam > 0){
            //Valida que ya exista un valor en el arreglo.... 
            //Si ya cuenta con algún valor, comienza la búsqueda.... 
            console.log('Ya hay valores en el arreglooo se debe de realizar una búsqueda');
            
            //Se realiza una búsqueda en el arreglo de conexiones del SITCRUM para validar si la conexión ya existe.    
            for(var i = 0; i < tam; i++){
                if(global.conexionesSIT[i].conexionId == socket.id){
                    //Si existe en el arrego....
                    console.log('Ya existe ese id..... se debe de actualizar el id de Frap en la conexión');
                    //Se actualiza el idFrap por el nuevo que quiere consultar....
                    global.conexionesSIT[i].idFrap = idFrap;
                    console.log(global.conexionesSIT[i].conexionId + ' - ' + global.conexionesSIT[i].idFrap);
                    console.log('Tamaño de arregloooooo.... ' + global.conexionesSIT.length);
                    existe = true;
                    callback('conexionAgregada');   
                }
            };
            
            //Si no se encontró el id de la conexión, se agrega al arreglo...
            if(existe == false){
                console.log('No existía en el arreglo, se debe de agregar.... ');
                global.conexionesSIT.push({conexionId : socket.id, conexion : socket, idFrap: idFrap});
                console.log('Tamaño de arregloooooo.... ' + global.conexionesSIT.length);
                callback('conexionAgregada');
            };
                          
        } else {
            //Si no tiene ningún valor.... entonces se agrega la conexión.....
            console.log('No hay ningún valor... se debe de agregar la conexión entrante.....');
            global.conexionesSIT.push({conexionId : socket.id, conexion : socket, idFrap: idFrap});
            console.log('Tamaño de arregloooooo.... ' + global.conexionesSIT.length);
            callback('conexionAgregada');
        } 
        
    };
    
    //Función que consulta el arreglo de las conexiones del SITCRUM, para el envio de datos.
    function consultaConexionSIT(id, callback) {
        console.log('Id a buscar.... ' + id);
        
        var conexion = false;
        
        var num = global.conexionesSIT.length;
        for(var a = 0; a < num; a++){
            if(global.conexionesSIT[a].idFrap == id){
                //Indica que se encontró la conexión.... se retorna esa conexión para enviar el mensaje
                callback(global.conexionesSIT[a]);
                conexion = true;
            };           
        };
        
        if(conexion == false){
            console.log('No hay nadie que reciba la información....');
            callback('conexionNoActiva');
        };
    };


};
