/***********************************************************************************
 . Centro de Ingeniería y Desarrollo Industrial
 . Nombre del módulo:    sensores.js
 . Lenuaje:              Javascript
 . Propósito:    Modulo para la conexion y consulta de especialistas de kenvey.
 .
 . Desarrollado por:     Nataly Janeth Contreras Ramirez
 ***********************************************************************************/
 var Kinvey=require('kinvey');
 var kinveyConectado=false;
 module.exports=function(){

	if(!kinveyConectado){
        console.log('VA a iniciaaaaaaarrr kinvey!!!!!! ');
        var promise=Kinvey.init({
        appKey       : global.configuracion.appKeyKinvey,
        appSecret    : global.configuracion.appSecretKinvey
        });

        //Evalua el resultado del proceso de inicializacion de Kinvey
        promise.then(function() {
            login();
        }, function(error) {
        console.log('No se pudo iniciar el servicio en Kinvey');
        });

        function login() {
            Kinvey.User.login('524423479396','4423479396',{
                success: function(estado){
                    console.log('Se ha iniciado sesión en Kinvey exitosamente');
                    kinveyConectado=true;
                }, error: function(error){
                    console.error(error);
                }
            });
        }
    }
}

/**
 *  Función que es invocada desde socketioServer, para la liberación del médico especialista
 *  En base a la petición que este mismo generó. Manda los datos al endpoint de generales,
 *  donde se realizará la actualización de los parámetros del médico especialista.
 */
function liberaEspecialista(user, callback) {

    var endPoint = 'generales';
    var datosEndP = {
        accion : 'liberaMedico',
        username : user.username,
        idNitro : user.idNitro,
        idFrap : user.idFrap
    };

    var promesa = Kinvey.execute(endPoint, datosEndP, {
        success : function (response) {
            //console.log(response);
            callback(response);
        },
        error : function (error) {
            //console.log(error);
            callback(error);
        }
    });

}

/**
 *  Función que gestiona el envio de notificaciones push al médico especialista....
 */

module.exports.liberaEspecialista = liberaEspecialista;
/*module.exports.Especialistas=function(callback,Error){

  	var query = new Kinvey.Query();
		query.equalTo('estatus', 'Validado');
		query.notEqualTo('name','admin');
    query.ascending('name');

    	var promise = Kinvey.User.find(query,{
    		success: callback,
    	   fields:['username','name','especialidad','horaIni','horaFin','diasDisponible'],
    		error:Error
    	});
}*/

module.exports.Especialistas=function(callback,Error){

  	var query = new Kinvey.Query();
		query.equalTo('estatus', 'Validado');
		query.notEqualTo('name','admin');
    query.notEqualTo('demo','true'); // no consultar usuarios de la aplicacion demo.
    query.ascending('name');

    	var promise = Kinvey.User.find(query,{
    		success: callback,
    		fields:['username','name','especialidad','horaIni','horaFin','diasDisponible', 'estatusServicio'],
    		error:Error
    	});
}


module.exports.terminarSercicio=function(username,fn) {
    var endPoint = 'generales';
    var datosEndP = {
        accion : 'cierreServicio',
        username: username
    };
    var promesa = Kinvey.execute(endPoint, datosEndP, {
        success : function (response) {
            fn(response);
        },
        error : function (error) {
            fn(error);
        }
    });
}


module.exports.llamarEspecialista=function(datosEspecialista, fn) {
    var endPoint = 'generales';
    var datosEndP = {
        accion : 'invitaMedico',
        datos:{
          username : datosEspecialista.username,
          idNitro : datosEspecialista.idNitro,
          idFrap : datosEspecialista.idFrap
        }
    };
    var promesa = Kinvey.execute(endPoint, datosEndP, {
        success : function (response) {
            fn(response);
        },
        error : function (error) {
            fn(error);
        }
    });
}
