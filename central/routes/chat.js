/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    chat.js
. Lenuaje:              Javascript
. Propósito:    Modulo la recepcion de chat
.
. Desarrollado por:     Rocío Alejandra Zavala Anguiano
******************************************************************************/

var express = require('express');
var router = express.Router();
var http = require('http').Server(router);
var io = require('socket.io')(http);
var arrSockets = [];
var arrEspecialistas = [];
var idSitcrum = "SITCRUM1";
var kinvey = require('../backend/visor/kinvey');

/**
 * funcion para agregar un nuevo frap activo
 */
function agregarFrapActivo(frap, fn) {
  var obFrapActivo = new db.frapActivos({
    idFrap: frap.idFrap,
    nombreAmbulancia: frap.nombreAmbulancia,
    numSerie: frap.numSerie,
    estado: frap.estado
  });
  obFrapActivo.save(function(error, frapActivos) {
    console.error(error);
    fn(frapActivos);
  });
}

/*
 * Funcion para agregar a la base de datos un especialista
 */
function agregarEspecialista(ob, fn) {
  var obEspecialista = new db.especialistas(ob);
  obEspecialista.save(function(error, socketsEspecialistas) {
    console.error(error);
    fn(socketsEspecialistas);
  });
}

/**
 * funcion para eliminar un especialista de la base de datos
 */
function eliminarEspecialista(idFrap) {
  db.especialistas.remove({
    'idFrap': idFrap
  }, function(err) {
    console.info(err);
  });
}

/*
 * funcion para buscar room existente en la base de datos
 */
function buscarRoom(idFrap, fn) {
  db.frapActivos.find({
    idFrap: idFrap
  }).exec(function(error, frapActivos) {
    if (error)
      console.error(error);
    fn(frapActivos);
  });
}

/*
 * Funcion para modificar el estdo del especialista
 * activo, descativado, terminado
 */
function cambiarEstadoEspecialista(idEspecialista, estado, fn) {
  db.especialistas.update({
    $and: [{
      'estado': {
        $ne: 'terminado'
      }
    }, {
      'idEspecialista': idEspecialista
    }]
  }, {
    $set: {
      estado: estado
    }
  }, fn);
}


/*
 * Funcion para modificar el estado del frap
 * estado activo, terminado, desconectado
 */
function cambiarEstadoFrap(idFrap, estado, fn) {
  //db.frapActivos.update({idFrap:idFrap},
  db.frapActivos.update({
    $and: [{
      'estado': {
        $ne: 'terminado'
      }
    }, {
      'idFrap': idFrap
    }]
  }, {
    $set: {
      estado: estado
    }
  }, fn);
}

/**
 * Funcion para guardar en la base de datos el mensaje emitido en el chat
 */
function guardarMensaje(obMensaje, fn) {

  var obMensaje = new db.mensajes({
    idFrap: obMensaje.idFrap,
    idUsuario: obMensaje.idUsuario,
    nombreUsuario: obMensaje.nombreUsuario,
    mensaje: obMensaje.mensaje,
    fecha: obMensaje.fecha
  });
  obMensaje.save(function(error, mensajeGuardado) {
    if (error)
      console.error(error);
    fn();
  });

}

io.on('connection', function(socket) {

  /*
   * Socket para guardar el objeto socket del front de visor de signos vitales
   */
  socket.on('conectarSocket', function(fn) {
    arrSockets.push(socket);
    var frapActi = [];
    var arrMensajesMandar = [];
    //obtener los mensajes
    db.mensajes.find({}, function(error, arrMensajes) {

      //conectarse  a todos los frap que no estan en estado terminado
      db.frapActivos.find({
        'estado': {
          $ne: 'terminado'
        }
      }, function(error, doc) {

        //traer todo slos mens
        doc.forEach(function(ob) {

          //obtener mensajes por frap
          arrMensajes.forEach(function(obMensajes) {

            if (obMensajes.idFrap === ob.idFrap) {
              arrMensajesMandar.push(obMensajes);
            }

          });
          //realizar join al room
          socket.join(ob.idFrap);
          //obtener mensajes de cada frapActivos
          var obFrap = {
            "frap": ob,
            "mensajes": arrMensajesMandar
          };
          frapActi.push(obFrap);
          arrMensajesMandar = [];
          //para evitar mandar mas de mensaje de conexion de sitcrum, en caso de que haya multiples pantallas
          if (arrSockets.length <= 1) {
            var obMensaje = {
              "idFrap": ob.idFrap,
              "idUsuario": idSitcrum,
              "mensaje": "El SITCRUM se conecto",
              "sistema": true
            };
            //io.to(ob.idFrap).emit('chatSitcrum', obMensaje);
          }
        });
        fn(frapActi);
      });

    });

  });

  /*Funcion para obtener los mensajes para la ambulancia y especialistas*/
  function obtenerMensajes(idFrap, fn) {
    db.mensajes.find({
      'idFrap': idFrap
    }, function(error, arrMensajes) {
      fn(arrMensajes);
    });
  }

  /*
   * Evento socket donde se hace la invitacion al especialista, hace la peticion a kinvey en la que
   * manda una notificacion push
   */
  socket.on('llamarEspecialista', function(datosEspecialista, fn) {
    kinvey.llamarEspecialista(datosEspecialista, function(respuesta) {
      fn(respuesta);
    });
  });

  /*
   * evento socket para obtener las desconexiones de las ambulancias y especialistas
   */
  socket.on('disconnect', function() {
    //solo las ambulancias tienen idFrap y especialistas
    if (socket.idFrap === undefined) {
      /*Para front de la central*/
      //variable para saber que socket se desconecto
      var arrSocktmp = arrSockets;
      //saber si se desconecto una de las pantallas del sitcrum
      for (var i = 0; i < arrSocktmp.length; i++) {
        if (socket.id === arrSocktmp[i].id) {
          //quitar el socket del arreglo
          arrSockets.splice(i, 1);
          i = arrSocktmp.length;
        }
      }
      arrSocktmp = null; //liberar memoria
      if (arrSockets.length === 0) {
        //no hay ningun front de sitcrum conectado, entonces enviar el aviso a las ambulancias y especialistas
        //hace broadcast
        //el sitcrum fue el que se desconecto
        var obMensaje = {
          "idUsuario": idSitcrum,
          "mensaje": "El SITCRUM se desconecto",
          "sistema": true
        };
        //le avisa a todos los socket conectados
        //  io.sockets.emit('chatSitcrum', obMensaje);
      }
    } else {
      if (socket.nombreEspecialista === undefined) {
        /*es una ambulancia*/
        //cambiar estado en la base de datos que se desconectado
        //verificar que no este terminado el servicio
        cambiarEstadoFrap(socket.idFrap, 'desconectado', function(error) {
          var obMensaje = {
            "idFrap": socket.idFrap,
            "mensaje": "La unidad se desconecto",
            "sistema": true,
            "desconexion": true
          };
          //io.to(socket.idFrap).emit('chatSitcrum', obMensaje);
        });
      } else {
        /*es especialista el que se desconecto*/
        //buscar especialista desconectado en en arreglo para eliminarlo
        cambiarEstadoEspecialista(socket.idEspecialista, 'desconectado', function(res) {
          var obMensaje = {
            "idFrap": socket.idFrap,
            "idUsuario": socket.idEspecialista,
            "mensaje": "Se desconecto el especialista " + socket.nombreEspecialista,
            "sistema": true
          };
          io.to(socket.idFrap).emit('chatSitcrum', obMensaje);
        });
      }
    }
  });

  /*
   * Funcion de socket para avisar que el especialista ha salido de forma voluntaria de
   * la app y tenia un servicio asignado
   */
  socket.on('terminarServicio', function(idEspecialista, fn) {
    //comunicar a todos que el especialista se retiro de la aplicacion
    //cambiar el estado en la base de datos
    cambiarEstadoEspecialista(socket.idEspecialista, 'terminado', function(res) {
      var obMensaje = {
        "idFrap": socket.idFrap,
        "idUsuario": socket.idEspecialista,
        "mensaje": "El especialista " + socket.nombreEspecialista + " ha salido de la aplicación",
        "sistema": true
      };
      io.to(socket.idFrap).emit('chatSitcrum', obMensaje);
      fn(true);
    });
  });

  /*
   * Funcion para conectar al espcialista al chat
   */
  socket.on('conectarEspecialista', function(datosEspecialista, fn) {
    if (datosEspecialista != null) {
      //buscar si esta activo la conversacion del idFrap
      db.frapActivos.find({
        $and: [{
          'estado': {
            $ne: 'terminado'
          }
        }, {
          'idFrap': datosEspecialista.idFrap
        }]
      }, function(error, doc) {
        if (doc.length <= 0) {
          //regresa false cuando no existe el idFrap
          fn(false);
        } else {
          //agregar identificadores al frap
          socket.idEspecialista = datosEspecialista.idEspecialista;
          socket.idFrap = datosEspecialista.idFrap;
          socket.nombreEspecialista = datosEspecialista.nombreUsuario;
          socket.username = datosEspecialista.username;
          //conectar el socket al room
          socket.join(datosEspecialista.idFrap);

          //verificar si el especialista se conecto por primera vez
          db.especialistas.find({
            'idEspecialista': datosEspecialista.idEspecialista
          }, function(error, especialistObt) {
            if (especialistObt.length > 0) {
              db.mensajes.find({
                $and: [{
                  'idFrap': datosEspecialista.idFrap
                }, {
                  'fecha': {
                    $gte: datosEspecialista.fecha
                  }
                }]
              }, function(error, arrMensajes) {
                fn(arrMensajes);
              });
            } else {
              //arreglar el socket  a la base de datos
              //se crea objeto de tipo especialista, para guardar en la base de datos de especialistas
              var obEsp = {
                'idFrap': datosEspecialista.idFrap,
                'idEspecialista': datosEspecialista.idEspecialista,
                'nombreEspecialista': datosEspecialista.nombreUsuario,
                'username': datosEspecialista.username,
                'estado': 'activo',
                'fecha': new Date()
              };
              agregarEspecialista(obEsp, function(ob) {
                fn(true);
              });
            }
            var obMensaje = {
              "idFrap": datosEspecialista.idFrap,
              "idUsuario": datosEspecialista.idEspecialista,
              "mensaje": "Sea conectado el especialista " + datosEspecialista.nombreUsuario,
              "sistema": true
            };
            //mandar broadcast para anunciar que el especialista se conecto a la conversacion
            io.to(datosEspecialista.idFrap).emit('chatSitcrum', obMensaje);
          });
        }
      });
    }
  });

  /*
   * Socket para iniciar rom por cada usuario que se conecta
   */
  socket.on('connectRoom', function(datosUsuario, fn) {
    if (datosUsuario != null) {
      //agregar el idFrap al objeto del socket
      socket.idFrap = datosUsuario.idFrap;

      //buscar si el idFrap ya se encuentra en una conversacion previa
      buscarRoom(datosUsuario.idFrap, function(frapActivos) {

        if (frapActivos.length === 0) {
          //no tiene una conversacion activa
          agregarFrapActivo(datosUsuario, function(datosUsuarioGuardado) {
            //unir el socket a ese room del frap unico
            socket.join(datosUsuario.idFrap);
            //hay front de sitcrum conectados
            if (arrSockets.length != 0) {
              for (var i = 0; i < arrSockets.length; i++) {
                arrSockets[i].join(datosUsuario.idFrap);
                arrSockets[i].emit('conectarseRoom', datosUsuario);
              }
              //obtener todos los mensajes de este idFrap
              obtenerMensajes(datosUsuario.idFrap, function(arrMensajes) {
                fn(arrMensajes);
              });
            }
          });
        } else {
          //cambiar el estado del frap a activo
          cambiarEstadoFrap(datosUsuario.idFrap, 'activo', function() {
            //unir el socket a ese room del frap unico
            socket.join(datosUsuario.idFrap);
            if (arrSockets.length != 0) {
              for (var i = 0; i < arrSockets.length; i++) {
                arrSockets[i].join(datosUsuario.idFrap);
              }
            }
            var obMensaje = {
              "idFrap": datosUsuario.idFrap,
              "mensaje": "La unidad se conecto",
              "sistema": true,
              "desconexion": false
            };
            //obtener todos los mensajes de este idFrap
            obtenerMensajes(datosUsuario.idFrap, function(arrMensajes) {
              fn(arrMensajes);
            });
          });
        }
      });
    }
  }); //fin socket


  /**
   * Socket de chat para la conversacion
   */
  socket.on('chatSitcrum', function(ob) {
    //ver que no se mensaje del sistema para que no se guarde en la base de datos
    //guardar la conversacion en la base de datos
    guardarMensaje(ob, function() {
      //emitir por broadcast los mensajes en idFrap Correspondiente
      io.to(ob.idFrap).emit('chatSitcrum', ob);
    });

  }); //fin socket chatSitcrum

  /**
   * Socket de chat para la conversacion
   */
  socket.on('obtenerMensajesIdFrap', function(idFrap, fn) {

    //ver que no se mensaje del sistema para que no se guarde en la base de datos
    //guardar la conversacion en la base de datos
    obtenerMensajes(idFrap, function(arrMensajes) {
      //emitir por broadcast los mensajes en idFrap Correspondiente
      fn(arrMensajes);
    });

  }); //fin socket

  /**
   * Socket de chat para terminar el frap activo
   */
  socket.on('terminarFrap', function(idFrap, fn) {
    cambiarEstadoFrap(idFrap, 'terminado', function() {
      if (arrSockets.length != 0) {
        for (var i = 0; i < arrSockets.length; i++) {
          arrSockets[i].emit("termanarFrapFront", idFrap);
        }
      }
      //avisarle al especialista que se termino el servicio, si exite un especialista
      //hacer una busqueda a la base de datos
      db.especialistas.find({
        'idFrap': idFrap
      }, function(error, obE) {
        if (obE.length > 0) {
          obE.forEach(function(obEspecialista) {
            kinvey.terminarSercicio(obEspecialista.username, function(res) {
              if (res.estatus != '200') {
                console.log('error, en avisar al especialista el termino de servicio');
                kinvey.terminarSercicio(obEspecialista.username, function(error) {
                  if (error) {
                    console.log('error, en reintentar avisar al especialista el termino de servicio');
                  }
                });
              }
            });
          });
          //eliminar todos los especialistas de la base de datos
          eliminarEspecialista(idFrap);
        }
      });
      fn('terminado');
    });
  }); //fin socket
});



http.listen(global.configuracion.puertoChat, function(grupo) {
  console.log('listening on *' + global.configuracion.puertoChat);
});

module.exports = router;
