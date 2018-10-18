/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    ecg_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para analizar el contenido de la
.               información de un paquete de datos tipo ECG.
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/
//Configuracion para el ECG
var fs = require('fs');
var ecg = {
    paquete: 50,                                    //longitud del paquete a transmitir
    canal: [[],[],[],[],[],[],[],[],[],[],[],[]],   //arreglo para hasta 12 derivaciones
    frecuencia: 0,          //valor de frecuencia calculado del lado del servidor
    control: 0,             //
    pintar: [1,0,0,0,0,0,0,0,0,0,0,0],   //indica la derivacion que se desea pintar y transmitir hacia los clientes
    tiempoVentana : 5,      //Duracion de la ventana.
};
var frecuenciaAnterior=0;
var frecuencia = [80,81,82,81,82,82,81,83,82,82];   //simula la bmp
var numeroPaquetes=0;
var numeroBytes=0;
var pila = [];
var pilaMsg = [];
var valoresCanales = [0,0,0,0,0,0,0,0,0,0,0,0];
var valoresCanales2 = [0,0,0,0,0,0,0,0,0,0,0,0];
var secAnt=0;
var noPaq=0;
var paqPerdido=0;
var leadV1=0;
var canalAnterior = [0,0,0,0,0,0,0,0,0,0,0,0];
var modulo = 'ECG';
var ecg_recibiendo = 1500;  //indica cada cuantos paquetes informa que se están recibiendo datos
var ecg_acumulador = 0;     //acumulador de paquetes que se reciben
var propECG = {             //json para cuando se habilita la funcionalidad de almacenamiento de información
    habilitaArchivoECG: false,
    estadoActual: false,
    crearArchivo: false,
    nombreArchivo: '',
    refArchivo: null
};
var indiceECG2 = 0;         //esta variable ayuda a determinar el momento en que se ha completado la ventana de tiempo
var numeroECG2 = 500 * 7;   //determina la ventana de tiempo que se utiliza para calcular la frecuencia cardiaca
var espacioECG2 = 60;       //determina el numero de muestras que debe haber entre latido y latido (R-R)
var espacioECG22 = 0;       //variable para controlar la distancia entre R-R
var frecuenciaECG2_ = 0;    //registra el valor de la frecuencia cardiaca que se ha calculado
var vector_ecg2 = [];       //vector que contiene la informacion del trazo electrico para calcular la FC
var retardoCalculo = 250;   //variable que sirve como contador para llegar al valor de indiceRetardo
var indiceRetardo = 251;    //representa el numero de segundos que hay entre calculo y calculo de frecuencia cardiaca
var freRespaldo = 0;        //contiene la ultima frecuencia cardiaca calculada. Se usa cuando el sistema no logra determinarla
var paquete = {};           //Mensaje con la informacion del sensor que se envia al navegador

var grupoPaquetes = [];   //acumula los calculos de cada 50 paquetes

/*******************************************************************************
* Metodo para determinar si se habilita o detiene la construcción de un archivo
*******************************************************************************/
var ecg_EstadoArchivo = function (dato) {

    if (dato.estado === true) {
        propECG.habilitaArchivoECG = true;
        //archivoS.crearArchivo('ECG');

    } else {
        propECG.habilitaArchivoECG = false;
    }

    console.log(dato);
    //ecg_EscribirArchivo();
}

/*******************************************************************************
* Este método se implementa para almacenar la informacion que se reciben
* de los sensores en archivo TXT
*******************************************************************************/
function ecg_EscribirArchivo(datos) {
    if ( propECG.habilitaArchivoECG === true) {
        //se requiere escribir en el archivo
        //valida primero que el archivo se haya creado
        if (propECG.crearArchivo === false) {
            //el archivo no existe y hay que crearlo
            var fecha = new Date();

            propECG.nombreArchivo = 'ECG_' + fecha.getDay() + fecha.getMonth() + fecha.getFullYear() + '_' + fecha.getHours() + fecha.getMinutes() + fecha.getSeconds() + '.csv';

            propECG.refArchivo = fs.createWriteStream(propECG.nombreArchivo);

            propECG.refArchivo.on('finish', function () {
                console.log('archivo finalizado');
            });

            propECG.refArchivo.write('I,II,III,aVR,aVL,aVF,V1,V2,V3,V4,V5,V6,Frecuencia');
            propECG.estadoActual = true;
            console.log('archivo creado.....');
            propECG.crearArchivo = true;
        } else {
            //el archivo ya existe
            console.log(datos);

        }
    } else {
        //necesita verificar si el archivo se encuentra abierto
        if (propECG.estadoActual === true) {

            console.log('archivo cerrando....');

            //como el archivo esta activo, se requiere cerrar
            propECG.refArchivo.end();

            propECG.estadoActual = false;
            propECG.crearArchivo = false;
        }
    }
}

/*******************************************************************************
* Método para extraer la informaicion por tipo de sensor
*******************************************************************************/
//var ecg_Analizar = function(datos, tipoSensor,callback){
function ecg_Analizar(datos, tipoSensor){
    var buffer = new Buffer(datos, "utf-8");
    switch(tipoSensor) {
        case 'ECG':
            ecg_datosECG(buffer);
            break;
        default:
            console.log(modulo, 'El mensaje no es de tipo ECG.');
            break;
    }
}

/*******************************************************************************
* Actualiza las graficas que se deben de pintar en la pantalla
*******************************************************************************/
function actualizarPintar(datos) {
    ecg.pintar = datos;
}

/*******************************************************************************
* Método que se encarga de extraer la información del ECG del mensaje recibido
*******************************************************************************/
function ecg_extraerMensaje() {
    var existeMensaje = false;
    var longitud = pila.length;
    var mensaje = [];
    var numeroMsg=0;

    //console.log('longitud de la pila inicio:  ' + longitud);
    while (!existeMensaje && longitud>=20) {
        //analiza si los primeros tres caracteres son ECG
        if (pila[0]==0x45 && pila[1]==0x43 && pila[2]==0x47) {
            for (var i=0;i<20;i++) {
                mensaje.push(pila[i]);
            }
            for (var i=0;i<20;i++) {
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

/*******************************************************************************
* Método que se encarga de separar del buffer que se ha recibido
* paquetes validos de información para ser procesados posteriormente
*******************************************************************************/
function ecg_separarInformacion(buffer){
    numeroPaquetes++;
    var longitud = buffer.length

    //mueve la informacion a la pila
    for (var i=0;i<longitud;i++){
        pila.push(buffer[i]);
    }

    //comienza el analisis de la informacion
    var longitudPila = pila.length;

    //mientras la pila tenga datos para analizar
    while (longitudPila >= 20) {
        var msg = ecg_extraerMensaje();
        if (msg.length==20) {
            pilaMsg.push(msg);
        }
        longitudPila = pila.length;
    }
}

/*******************************************************************************
* Analiza la información para el caso de un ECG a partir de los
* mensaje que previamente se han separado y validado como correctos
*******************************************************************************/
//var ecg_datosECG = function(data, callback) {
function ecg_datosECG(data) {
    var i = 0;


    if (global.nuevoPintar==true) {
        ecg.pintar = global.pintar;
        global.nuevoPintar = false;
    }
    ecg_separarInformacion(data);
    var longitudPila = pilaMsg.length;

    if (longitudPila > 0) {
        noPaq++;
        for (var m=0;m<longitudPila;m++) {
            var buffer = pilaMsg[m];
            var signo=1.0;

            if (ecg_acumulador > ecg_recibiendo) {
                console.log(modulo, 'Se han recibido:  ' + ecg_recibiendo + ' paquetes de datos.');
                ecg_acumulador=0;
            }

            ecg_acumulador++;

            //Inicia la extracción de la informacion para ensamblar el valor de cada canal
            var indice = 4;     //permite el movimiento en el interior del mensaje saltando al byte indicado
            var valor = 0;      //contiene la valor de la derivacio que se ha escalado
            for (i = 0; i < 8; i++) {

                //no mover por favor!!!!
                var baja = parseInt(buffer[indice]);
                var alta = parseInt(buffer[indice+1]);
                var valor = ((alta << 8) + baja);

                if (valor > 32767) {
                    valor = 65535-valor;
                    valor *= -1.0;
                }

                var valor = ((((alta << 8) + baja)*8.0)/65535.0)-4.0;
                //var valor = ((((alta << 8) + baja))/100.0);       //CVI
                //var valor = (alta << 8) + baja;       //CVI

                //se acumula el valor en el arreglo de los valores de derivaciones
                valoresCanales[i]= valor;

                indice+=2;
            }
            //valoresCanales tiene un arreglo de 8 valores
            // V6, I, II, V2, V3, V4, V5, V1
            //resta calcular III, aVR, aVL y aVF
            valoresCanales[8] = valoresCanales[2]-valoresCanales[1];
            valoresCanales[9] = ((valoresCanales[1]+valoresCanales[2])/2.0);
            valoresCanales[10] = (valoresCanales[1]-valoresCanales[2]/2.0);
            valoresCanales[11] = (valoresCanales[2]-valoresCanales[1]/2.0);

            valoresCanales2[0] = valoresCanales[1];     // I
            valoresCanales2[1] = valoresCanales[2];     // II
            valoresCanales2[2] = valoresCanales[8];     // III
            valoresCanales2[3] = valoresCanales[9];     //  aVR
            valoresCanales2[4] = valoresCanales[10];    // aVL
            valoresCanales2[5] = valoresCanales[11];    // aVF
            valoresCanales2[6] = valoresCanales[7];     // V1
            valoresCanales2[7] = valoresCanales[3];     // V2
            valoresCanales2[8] = valoresCanales[4];     // V3
            valoresCanales2[9] = valoresCanales[5];     // V4
            valoresCanales2[10] = valoresCanales[6];    //  V5
            valoresCanales2[11] = valoresCanales[0];    //  V6

            for (var k = 0; k<12; k++) {
                if ( Math.abs( valoresCanales2[i] )  > 0.1 ) {
                    valoresCanales2[i] = canalAnterior[i];
                } else {
                    canalAnterior[i] = valoresCanales2[i];
                }

                if ( Math.abs( valoresCanales2[i] )  < -0.1 ) {
                    valoresCanales2[i] = canalAnterior[i];
                } else {
                    canalAnterior[i] = valoresCanales2[i];
                }
            }

            //Invoca la funcion que calcula la frecuencia cardiaca
	        ecg_CalculoV2(valoresCanales2[1]);

            var valor2 = 0.0;
            //Analiza si se ha acumulado el numero de datos requerido
            // para enviarlos por el metodo de CIDESI
            if (ecg.control < ecg.paquete) {
                //se acumula el nuevo dato
                for (var j=0; j<12; j++) {
                    ecg.canal[j].push(valoresCanales2[j]);
                }
                ecg.control++;
            } else {
                ecg.frecuencia = frecuenciaECG2_;
                paquete.tipoPaquete = 'ECG';
                paquete.datos = ecg;

                //Este envio es para los navegadores que se hayan conectado con la Nitrogen
                /*
                if(global.enviar)
                {
                    global.enviar.emit('nuevoECG', paquete);
                }
                if(global.conectedMongo && global.numSerie != undefined)
                  		global.servidor.com_servidor('FRE', new Buffer('FRE'+ecg.frecuencia.toString()), global.configuracion.metodoEnvio);
                */

                var ar=paquete.datos.canal;
                var arr2=[];
                for(var i=0;i<ar.length;i++){
                    //console.log(ar[i]);
                    //console.log("--------------");
                    var r=[];
                    for(var j=0;j<ar[i].length;j++){
                        //console.log(ar[i][j]);
                        r.push(ar[i][j]);
                        //console.log(r);
                    }
                    //console.log(r);
                    arr2.push(r.slice(0));

                }
                //console.log(arr2);
                var nuevoPaquete={
                    derivaciones: arr2,
                    frecuencia: frecuenciaECG2_
                }
                //console.log(nuevoPaquete.derivaciones);
                grupoPaquetes.push(nuevoPaquete);
                //console.log(grupoPaquetes[0].derivaciones[0].length);

                //ecg_EscribirArchivo(paquete);

                //limpia la informacion
                for (var i=0;i<ecg.paquete; i++) {
                    for (var j=0; j<12; j++) {
                        ecg.canal[j].pop();
                    }
                }
                ecg.control = 0;
                for (var j=0; j<12; j++) {
                    ecg.canal[j].push(valoresCanales2[j]);
                }
                ecg.control++;
                //callback(nuevoPaquete);
                //console.log(grupoPaquetes[0].derivaciones[0].length);
            }
        }
        for (var m=0;m<longitudPila;m++) {
            pilaMsg.shift();
        }
    }
}

function entregaGrupoPaquete() {
    //console.log(grupoPaquetes[0].derivaciones[0].length);
    var tmp =  {
        'grupo' : grupoPaquetes,
        'frecuencia' : frecuenciaECG2_ };

    grupoPaquetes = [];

    return tmp;
}

/*******************************************************************************
* Método que implementa el algoritmo de calculo de frecuencia cardiaca
*******************************************************************************/
function frecuenciaECG2V2(){
    var v1 = [];
    var maximo = -1;
    var numero = 0;
    var numero2 = 0;
    var contador = 0;
    var latido = false;
    var frec = [];
    var datoAnterior=0;

    for (var i = 0; i < numeroECG2; i++) {
        if ((vector_ecg2[i]>0.1) || (vector_ecg2[i]<-0.1)){
            vector_ecg2[i] = datoAnterior;
        }
        if ((vector_ecg2[i+5]>0.1) || (vector_ecg2[i+5]<-0.1)){
            vector_ecg2[i+5] = vector_ecg2[i+4];
        }

        numero = (vector_ecg2[i+5]-vector_ecg2[i])/0.002;
        if (numero > maximo)
            maximo = numero;
        v1.push(numero);
    }

    for (var i = 0; i < numeroECG2; i++) {
        numero2 = v1[i] / maximo;

        if (numero2 < 0) {
            numero2 = 0;
        } else {

            if (numero2 < 0.3) {
                numero2 = 0;
            }
        }
        v1[i] = numero2;
    }

    //Analiza los latidos
    espacioECG22 = espacioECG2+1;
    contador = 0;
    for (var i = 0; i < numeroECG2; i++){
        if ((v1[i] > 0) && (espacioECG22 > espacioECG2)){
            latido = true;
            v1[i] = 11111;
            espacioECG22 = 0;

            if (contador != 0) {
                contador = (1/(contador * 0.002))*60;
                frec.push(contador);
                contador=0;
            }
        } else {
            v1[i]=0;
        }

        espacioECG22++;

        if (latido)
            contador++;
    }

    var numFre = frec.length;
    if (numFre > 0) {
        var promedio = 0;
        for (var i = 0; i < numFre ; i++) {
            promedio += frec[i];
        }
        promedio/=numFre;
    }

    if (promedio == undefined)
    {
        //console.log('Problema con el calculo solucionado..... !!!!');
        //console.log(vector_ecg2);
        frecuenciaECG2_ = freRespaldo;
    } else {
        frecuenciaECG2_ =parseInt(promedio.toString());
    }
    freRespaldo = frecuenciaECG2_;
}

/*******************************************************************************
* Nueva funcion para el calculo de la frecuencia cardiaca
*******************************************************************************/
function ecg_CalculoV2(dato) {
    var frec_cal=0;

    //Esta condicion funciona como retardo para determinar
    //cada cuanto tiempo se debe calcular la frecuencia cardiaca
    if (indiceECG2 == numeroECG2) {
      indiceECG2--;

      //calcula la frecuencia en el vector que se ha acumulador
      if (indiceRetardo > retardoCalculo){
        frecuenciaECG2V2();

        indiceRetardo=0;
      } else {
          indiceRetardo++;
      }
      //elimina el ultimo elemento de la lista
      vector_ecg2.shift();
      vector_ecg2.push(dato);
    } else {
        //acumula la informacion en el vector de ecg
        vector_ecg2.push(dato);
    }
    indiceECG2++;
}

//Funciones expuestas en el módulo
module.exports.ecg_Analizar = ecg_Analizar;
module.exports.ecg_EstadoArchivo = ecg_EstadoArchivo;
module.exports.entregaGrupoPaquete = entregaGrupoPaquete;
