/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    spo_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para estructurar el mensaje a
.               enviar a los clientes de navegador con la informacion del
.               oximetro a intervalos de 100 milisegundos
.
.
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

var pila = [];
var pilaMsg = [];
//estructura del mensaje de capnografo
var spo = {
    grafica : [],
    bmp: 0,
    oximetria: 0
};
var oxiAnterior=0;
var bandera=0;
var spo_recibiendo=50;  //indica cada cuantos paquetes informa que se están recibiendo datos
var spo_acumulador=0;   //acumulador de paquetes que se reciben
var longitudTrama = 26;     //SPO[3] - Numero[1] - Datos[22]
var numeroAnterior=255;   //control de la numeracion de los paquetes


//Método para extraer un mensaje de tipo CAP
function spo_extraerMensaje() {
    var existeMensaje = false;
    var longitud = pila.length;
    var mensaje = [];
    var numeroMsg=0;

    while (!existeMensaje && longitud>=longitudTrama) {
        //analiza si los primeros tres caracteres son SPO
        if (pila[0]==0x53 && pila[1]==0x50 && pila[2]==0x4F) {
            for (var i=0;i<longitudTrama;i++) {
                mensaje.push(pila[i]);
            }
            for (var i=0;i<longitudTrama;i++) {
                pila.shift();
            }
            numeroMsg++;
            existeMensaje=true;
        } else {
            pila.shift();
        }
        longitud = pila.length;
    }
    return mensaje;
}

//Método para extrar del buffer mensajes completos de
//oximetria
function spo_separarInformacion(buffer){
    var longitud = buffer.length

    //mueve la informacion a la pila
    for (var i=0;i<longitud;i++){
        pila.push(buffer[i]);
    }

    //comienza el analisis de la informacion
    var longitudPila = pila.length;

    //mientras la pila tenga datos para analizar
    while (longitudPila >= longitudTrama) {
        var msg = spo_extraerMensaje();
        if (msg.length==longitudTrama) {
            pilaMsg.push(msg);
        }
        longitudPila = pila.length;
    }
}

function secuencia(valor){
    var diferencia = 0;

    if ((valor == 0) && (numeroAnterior==255)){
        diferencia = 1;
        numeroAnterior = 0;
    } else {
        diferencia = valor - numeroAnterior;

    }

    if (diferencia > 1) {
        //hay un salto en la numeracion
        console.log('Salto en la numeracion del ' + numeroAnterior + ' al ' + valor + ' --> Perdidos: ' + diferencia);

    }
    numeroAnterior = valor;
}

//Analiza el mensaje que se ha recibido

function spo_Analizar(datos){
    var buffer = new Buffer(datos, "utf-8");
    spo_separarInformacion(datos);

    var longitudPila = pilaMsg.length;

    //elimina la informacion de la grafica
    for (var i=16; i<116; i+=2) {
        spo.grafica.shift();
    }
    if (longitudPila > 0) {
        if (spo_acumulador > spo_recibiendo) {
            console.log('Se han recibido:  ' + spo_recibiendo + ' paquetes de datos.');
            spo_acumulador=0;
        }

        spo_acumulador++;

        //obtiene el numero de paquete para su analisis
        secuencia(parseInt(buffer[3]));

        for (var i=0;i<20; i+=2) {
            var alta = parseInt(buffer[4+i]);
            var baja = parseInt(buffer[4+i+1]);
            var valor = ((alta << 8) + baja);

            //valida la amplitud del dato
            if ((valor-oxiAnterior)>5000) {
                if (bandera == 1) {
                    valor = oxiAnterior;
                } else {
                    bandera = 1;
                }
            } else {
                oxiAnterior = valor;
            }

            spo.grafica.push(valor);
        }

        //obtiene los valores finales
        spo.bmp = buffer[24];
        spo.oximetria = buffer[25];

        /*
        if (global.enviar) {
            global.enviar.broadcast.emit('SPO', spo);
        }
        */
        return spo;
    }
    else {
        return null;
    }
}


//Funciones expuestas en el módulo
module.exports.spo_Analizar = spo_Analizar;
