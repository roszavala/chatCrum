/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    tar_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para estructurar el mensaje a
.               enviar a los clientes de navegador con la informacion del
.               equipo de tension arterial a intervalos definidos por el usuario
.
.               Mensaje:    TARA0;C03;PXXXYYYZZZ;RXXX
.                           0123456789111111111122222
.                                     012345678901234
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

var tar = {
    tipo: 0,    //0 adulto  1 neonatal
    modo: 0,    //0 manual   3 ciclico
    sistolica: 0,   //presion sistolica
    diastolica: 0,  //presion diastolica
    arterial:0,      //presion arterial
    ritmo: 0         //ritmo cardiaco
};
var pila = [];
var pilaMsg = [];
var tar_recibiendo=1;  //indica cada cuantos paquetes informa que se están recibiendo datos
var tar_acumulador=0;   //acumulador de paquetes que se reciben

//Método para extraer un mensaje de tipo CAP
function tar_extraerMensaje() {
    var existeMensaje = false;
    var longitud = pila.length;
    var mensaje = [];
    var numeroMsg=0;

    while (!existeMensaje && longitud>=25) {
        //analiza si los primeros tres caracteres son CAP
        if (pila[0]==0x54 && pila[1]==0x41 && pila[2]==0x52) {
            for (var i=0;i<25;i++) {
                mensaje.push(pila[i]);
            }
            for (var i=0;i<25;i++) {
                pila.shift();
            }
            numeroMsg++;
            existeMensaje=true;
        } else {
            console.log('TAR Caracter desconocido');
            pila.shift();
        }
        longitud = pila.length;
    }
    return mensaje;
}

//Método para extrar del buffer mensajes completos de
//tension arterial
function tar_separarInformacion(buffer){
    var longitud = buffer.length

    //mueve la informacion a la pila
    for (var i=0;i<longitud;i++){
        pila.push(buffer[i]);
    }

    //comienza el analisis de la informacion
    var longitudPila = pila.length;

    //mientras la pila tenga datos para analizar
    while (longitudPila >= 25) {
        var msg = tar_extraerMensaje();
        if (msg.length==25) {
            pilaMsg.push(msg);
        }
        longitudPila = pila.length;
    }
}

//Analiza el mensaje que se ha recibido
function tar_Analizar(datos, callback){
    var buffer = new Buffer(datos, "utf-8");

    tar_separarInformacion(datos);

    var longitudPila = pilaMsg.length;
    if (longitudPila > 0) {

        tar_acumulador++;

        if (tar_acumulador == tar_recibiendo) {
            console.log('Se han recibido:  ' + tar_acumulador + ' paquetes de datos.');
            tar_acumulador=0;
        }

        tar.tipo = tar_Numero(buffer[4]);
        tar.modo = tar_Numero(buffer[7],buffer[8]);
        tar.sistolica = tar_Numero(buffer[11],buffer[12], buffer[13]);
        tar.diastolica = tar_Numero(buffer[14],buffer[15], buffer[16]);
        tar.arterial = tar_Numero(buffer[17],buffer[18], buffer[19]);
        tar.ritmo = tar_Numero(buffer[22],buffer[23], buffer[24]);

      
        callback(tar);

        for (var m=0;m<longitudPila;m++) {
            pilaMsg.shift();
        }
    }
}

//Metodo para convertir un numero a partir del Ascii
function tar_Numero(param1, param2, param3){
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
module.exports.tar_Analizar = tar_Analizar;
