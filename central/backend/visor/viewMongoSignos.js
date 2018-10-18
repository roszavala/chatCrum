/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    viewMongoSignos.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para consultar los paquetes de
.               cada uno de los sensores y retornar un solo paquete con todos
.               los buffers de Sensores para su posterior procesamiento.
.               La informacion está almacenada en MongoDB.
.
. Desarrollado por:     Nataly Janeth Contreras Ramirez
******************************************************************************/
var timerListo;
var timerMinMax;
var fminimo=null,fmaximo=null;
var spoListo=false;
var ecgListo=false;
var capListo=false;
var tmpListo=false;
var tarListo=false;

var bufferSPO=[];
var bufferECG=[];
var bufferCAP=[];
var bufferTMP=[];
var bufferTAR=[];


module.exports.start=function(idfrap,inicio,fin,success){

    limpiarVariables();
    timerListo=setInterval(function(){
        if(spoListo && ecgListo && capListo && tarListo && tmpListo){

            console.log("DATOS LISTOS DE LOS SENSORES PARA ENVIAR");
            console.log("ECG: "+bufferECG.length);
            console.log("SPO: "+bufferSPO.length);
            console.log("CAP: "+bufferCAP.length);
            console.log("TAR: "+bufferTAR.length);
            console.log("TMP: "+bufferTMP.length);

            var datos={
                ecg: bufferECG,
                spo: bufferSPO,
                cap: bufferCAP,
                tar: bufferTAR,
                tmp: bufferTMP
            };
            success(datos);
            clearInterval(timerListo);
        }
    },50);

    // obtener los datos ECG
    //
    getDatos(idfrap,'ECG', inicio, fin, function(docs){

        var cabeceraECG= new Buffer(3);
        cabeceraECG[0]=0x45, cabeceraECG[1]= 0x43, cabeceraECG[2]=0x47;
        completaTiempos(docs, inicio, fin, bufferECG, 5, 10, cabeceraECG, 1002);
        ecgListo=true;
    },
    function(error){
        throw error;
    });


    // CAP
    //
    getDatos(idfrap,'CAP', inicio, fin,  function(docs){

        var cabeceraCAP = new Buffer(3);
        cabeceraCAP[0]=0x43, cabeceraCAP[1]=0x41, cabeceraCAP[2]=0x50;
        completaTiempos(docs, inicio, fin, bufferCAP, 2000, 2000, cabeceraCAP, 115);
        capListo=true;
    },
    function(error){
        throw error;
    });

    // SPO
    //
    getDatos(idfrap,'SPO', inicio, fin, function(docs){
        /*
        var anterior=0;
        var diferencia=0;
        var promedio=0;

        for(var i in docs){

            //var buffer=new Buffer(docs[i].paquete,'base64');
            if(anterior!=0)
            {
                diferencia=docs[i].fecha-anterior;
            }
            anterior=docs[i].fecha;
            //console.log(diferencia);
            promedio+=diferencia;
            //spo.spo_Analizar(buffer);

            //bufferSPO.push(docs[i].paquete);
        }
        promedio=promedio/docs.length;
        console.log("tiempo intermedio SPO: "+promedio+ " R: "+Math.round(promedio));
        */
        /*
        var indiceTiempo=parseInt(inicio);
        var i=0;

        // codigo para rellenar con paquetes en blanco los tiempos muertos sin
        // conexion.

        while(indiceTiempo<=parseInt(fin)){
            if(i<docs.length){
                //console.log("Datos: "+docs[i].fecha);
                //console.log("Indice: "+indiceTiempo);

                var fecha = parseInt(docs[i].fecha);
                if(fecha>=indiceTiempo-150 && fecha<=(indiceTiempo+150)){
                    //console.log("si entro");
                    bufferSPO.push(docs[i].paquete);
                    indiceTiempo= parseInt(docs[i].fecha);
                    i++;
                }
                else {
                   indiceTiempo+=100;
                   var bufferDummy=new Buffer(26);
                   bufferDummy.fill(0);
                   bufferDummy[0]=0x53, bufferDummy[1]=0x50, bufferDummy[2]=0x4f;
                   bufferSPO.push(bufferDummy);
                }
            }
            else {
                break;
            }
        }
        */

        var cabecera= new Buffer(3);
        cabecera[0]=0x53, cabecera[1]=0x50, cabecera[2]=0x4f;
        completaTiempos(docs, inicio, fin, bufferSPO, 100, 150, cabecera, 26);
        spoListo=true;
    },
    function(error){
        throw error;
    });

    // TMP
    //
    getDatoUltimo(idfrap,'TMP', inicio, fin, function(docs){
        for(var i in docs){
            bufferTMP.push(new Buffer(docs[i].paquete,'base64'));
        }
        tmpListo=true;
    },
    function(error){
        throw error;
    });

    // TAR
    //
    getDatoUltimo(idfrap,'TAR', inicio, fin,  function(docs){
        for(var i in docs){
            bufferTAR.push(new Buffer(docs[i].paquete,'base64'));
        }
        tarListo=true;
    },
    function(error){
        throw error;
    });
}

// FUNCION QUE COMPLETA CON ESPACIOS VACIOS LOS INTERVALOS DE TIEMPO MUERTOS DE
// LA CONEXION.
function completaTiempos(docs, inicio, fin, bufferToFull, tiempoSensor, ajusteTiempo, cabecera, tamanoPaquete){
    var indiceTiempo=parseInt(inicio);
    var i=0;

    while(indiceTiempo<=parseInt(fin)){
        if(i<docs.length){
            var fecha = parseInt(docs[i].fecha);
            if(fecha>=indiceTiempo-ajusteTiempo && fecha<=(indiceTiempo+ajusteTiempo)){
                //console.log("si entro");
                bufferToFull.push(new Buffer(docs[i].paquete,'base64'));
                indiceTiempo= parseInt(docs[i].fecha);
                i++;
            }
            else {
               indiceTiempo+=tiempoSensor;
               var bufferDummy=new Buffer(tamanoPaquete);
               bufferDummy.fill(0);
               bufferDummy[0]=cabecera[0], bufferDummy[1]=cabecera[1], bufferDummy[2]=cabecera[2];
               bufferToFull.push(bufferDummy);
            }
        }
        else {
            break;
        }
    }
}

// FUNCION PARA CONSULTAR O TRAER LOS DATOS ALMACENADOS EN MONGO.

function getDatos(idfrap, sensor, ini, fin, success, error){
      console.log("realizara consulta MONGO al frap: "+idfrap);
      //console.log("Sensor: "+sensor+" ini: "+ini+" fin: "+fin);
      db.signos.find({
        idFrap: idfrap,
        'tipo': sensor,
        fecha: { $gt: ini, $lt: fin }
      }).
      sort({ fecha: 1 }).
      select({ tipo: 1, paquete: 1, fecha:1, idFrap:1 }).
      exec(function(err,docs){
          if(err) error(err);
          success(docs);
      });
}

// FUNCION PARA CONSULTAR EL ULTIMO PAQUETE ENTRE EL INTERVALO DE TIEMPO.

function getDatoUltimo(idfrap, sensor, ini, fin, success, error){
      db.signos.find({
          idFrap: idfrap,
          'tipo': sensor,
          fecha: {$gt: ini, $lt: fin }
      }).
      sort({ fecha: -1}).
      limit(1).
      exec(function(err, doc){
          if(err) error(err);
          success(doc);
      });
}

// funcion para consultar el minimo y maximo de las fechas para el inicio y fin
// del scroll de la pantalla. Y como son consultas separadas en tiempos distintos
// por eso se necesita un timer que pregunte cuando el minimo y el maximo esten
// listos, entonces podra regresar el resultado por el callback de "success".
module.exports.paramIniciales=function(idfrap, success, error){

      //console.log("consulta para maximo y minimo: "+idfrap);
      timerMinMax=setInterval(function(){
          if(fminimo!=null && fmaximo!=null){
              //console.log("Minima: "+fminimo+" Maximoa: "+fmaximo);
              var datos={
                  "maxFecha": fmaximo,
                  "minFecha": fminimo
              };
              success(datos);
              clearInterval(timerMinMax);
              fminimo=null;
              fmaximo=null;
          }
      },5);

      // se consulta la fecha minimo del frap
      db.signos.find({
          idFrap:idfrap
      }).
      sort({fecha:1}).
      limit(1).
      select({fecha:1}).
      exec(function(err,min){
          if(err)error(err);
          if(min.length>0)
              fminimo=min[0].fecha;
          else {
              fminimo=-1;
          }
      });

      // se consulta la fecha maxima del frap.
      db.signos.find({
          idFrap:idfrap
      }).
      sort({fecha:-1}).
      limit(1).
      select({fecha:1}).
      exec(function(err,max){
          if(err)error(err);
          if(max.length>0)
              fmaximo=max[0].fecha;
          else {
              fmaximo=-1;
          }
      });
}

// funcion para resetear variables tras las peticiones de datos de los sensores.
function limpiarVariables(){
    spoListo=false;
    ecgListo=false;
    capListo=false;
    tmpListo=false;
    tarListo=false;

    bufferSPO=[];
    bufferECG=[];
    bufferCAP=[];
    bufferTMP=[];
    bufferTAR=[];
}
