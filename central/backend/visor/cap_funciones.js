/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    cap_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para estructurar el mensaje a
.               enviar a los clientes de navegador con la informacion del
.               capnografo a intervalos de 2 segundos
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

var pila = [];
var pilaMsg = [];
//estructura del mensaje de capnografo
var cap = {
    param1 : 0,
    param2 : 0,
    param3 : 0,
    param4 : 0,
    param4 : 0,
    param5 : 0,
    param6 : 0,
    grafica : []
};
var cap_recibiendo=1;  //indica cada cuantos paquetes informa que se están recibiendo datos
var cap_acumulador=0;   //acumulador de paquetes que se reciben

//Método para extraer un mensaje de tipo CAP
function cap_extraerMensaje() {
    var existeMensaje = false;
    var longitud = pila.length;
    var mensaje = [];
    var numeroMsg=0;

    while (!existeMensaje && longitud>=115) {
        //analiza si los primeros tres caracteres son CAP
        if (pila[0]==0x43 && pila[1]==0x41 && pila[2]==0x50) {
            for (var i=0;i<115;i++) {
                mensaje.push(pila[i]);
            }
            for (var i=0;i<115;i++) {
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
//capnografia
function cap_separarInformacion(buffer){
    var longitud = buffer.length

    //mueve la informacion a la pila
    for (var i=0;i<longitud;i++){
        pila.push(buffer[i]);
    }

    //comienza el analisis de la informacion
    var longitudPila = pila.length;

    //mientras la pila tenga datos para analizar
    while (longitudPila >= 115) {
        var msg = cap_extraerMensaje();
        if (msg.length==115) {
            pilaMsg.push(msg);
        }
        longitudPila = pila.length;
    }
}

//Obtiene el valor contenido por los 2 bytes
function obtieneValor(byte1, byte2) {
    var mas2 = 0x7F;
    var mas3 = 0x01;
    var mas4 = 0x02;
    var mas5 = 0x04;

    var dato2 = byte2 & mas2;
    var bit8 = byte1 & mas3;
    var bit9 = byte1 & mas4;
    var bit7 = byte1 & mas5;

    var resultado = dato2 + (bit7 << 5)  + (bit8 << 8) + (bit9 << 8);

    return resultado;
}

/*
    Analiza el mensaje que se ha recibido
 */

function cap_Analizar(datos){
    var buffer = new Buffer(datos, "utf-8");

    cap_separarInformacion(datos);
    //elimina la informacion de la grafica

    var longitudPila = pilaMsg.length;
    for (var i=16; i<116; i+=2) {
        cap.grafica.shift();
    }
    if (longitudPila > 0) {

        if (cap_acumulador > cap_recibiendo) {
            console.log('Se han recibido:  ' + cap_recibiendo + ' paquetes de datos.');
            cap_acumulador=0;
        }

        cap_acumulador++;

        //Se ajustan los valores para su escalamiento
        cap.param1 = obtieneValor(buffer[3], buffer[4])/10.0;   //buffer[4]/10.0;
        cap.param2 = obtieneValor(buffer[5], buffer[6]); //buffer[6];
        cap.param3 = obtieneValor(buffer[7], buffer[8]); //buffer[8];
        cap.param4 = obtieneValor(buffer[9], buffer[10])/10.0; //buffer[10]/10.0;
        cap.param5 = obtieneValor(buffer[11], buffer[12])/10.0; //buffer[12]/10.0;
        cap.param6 = obtieneValor(buffer[13], buffer[14]); //buffer[14];

        //extrae la informacion para el arreglo que se graficara
        for (var i=16; i<116; i+=2) {
            cap.grafica.push(obtieneValor(buffer[i-1], buffer[i])/10.0);
            //cap.grafica.push(buffer[i]/10.0);
        }
        return cap;
    }else {
        return null;
    }
}
//Funciones expuestas en el módulo
module.exports.cap_Analizar = cap_Analizar;
