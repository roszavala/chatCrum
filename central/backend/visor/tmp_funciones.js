/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    tmp_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para estructurar el mensaje a 
.               enviar a los clientes de navegador con la informacion de la 
.               temperatura
. 
. Desarrollado por:     Nataly Janeth Contreras Ramirez.
******************************************************************************/

var temperatura = 0;    //valor de la temperatura
var pila = [];
var pilaMsg = [];
var tmp_recibiendo=10;  //indica cada cuantos paquetes informa que se están recibiendo datos
var tmp_acumulador=0;   //acumulador de paquetes que se reciben

//Método para extraer un mensaje de tipo TMP
function tmp_extraerMensaje() {
    var existeMensaje = false;
    var longitud = pila.length;
    var mensaje = [];
    var numeroMsg=0;
    
    while (!existeMensaje && longitud>=6) {
        //analiza si los primeros tres caracteres son TMP
        if (pila[0]==0x54 && pila[1]==0x4D && pila[2]==0x50) {
            for (var i=0;i<6;i++) {
                mensaje.push(pila[i]);
            }
            for (var i=0;i<6;i++) {
                pila.shift();
            }
            numeroMsg++;
            existeMensaje=true;
        } else {
            console.log('Caracter desconocido');
            pila.shift();
        }       
        longitud = pila.length;
    }
    return mensaje;
}

//Método para extrar del buffer mensajes completos de
//tension arterial
function tmp_separarInformacion(buffer){
    var longitud = buffer.length
    
    //mueve la informacion a la pila
    for (var i=0;i<longitud;i++){
        pila.push(buffer[i]);
    }
    
    //comienza el analisis de la informacion
    var longitudPila = pila.length;
        
    //mientras la pila tenga datos para analizar
    while (longitudPila >= 6) {
        var msg = tmp_extraerMensaje();
        if (msg.length==6) {
            pilaMsg.push(msg);
        }
        longitudPila = pila.length;
    } 
}

//Analiza el mensaje de informacion que se ha recibido
function tmp_Analizar(datos){
    var buffer = new Buffer(datos, "utf-8");

    tmp_separarInformacion(datos);
    
    var longitudPila = pilaMsg.length;
    if (longitudPila > 0) {

        if (tmp_acumulador > tmp_recibiendo) {
            console.log('Se han recibido:  ' + tmp_recibiendo + ' paquetes de datos.');
            tmp_acumulador=0;
        }

        tmp_acumulador++;

        temperatura = tmp_Numero(buffer[3],buffer[4], buffer[5])/10.0;


        //se envia la informacion al visor
        if (global.enviar) {
            global.enviar.broadcast.emit('TMP', temperatura);
        }

        for (var m=0;m<longitudPila;m++) {
            pilaMsg.shift();      
        }
    }
}
    
//Metodo para convertir un numero a partir del Ascii
function tmp_Numero(param1, param2, param3){
    var valor = 0;
    
    if (param3 != undefined) {
        //Se han recibido 3 parametros
        valor = parseInt( String.fromCharCode(param1) + String.fromCharCode(param2) + String.fromCharCode(param3));
    } else {
        if (param2 != undefined) {
            //se han recibido 2 parametros
            valor = parseInt( String.fromCharCode(param1) + String.fromCharCode(param2));
        } else {
            if (param1 != undefined) {
                valor = parseInt(String.fromCharCode(param1));
            }
        }
    }
    return valor;
}

//Funciones expuestas en el módulo
module.exports.tmp_Analizar = tmp_Analizar;

