/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    slider_monitorHistorial.js
. Lenuaje:              Javascript
. Propósito:    Archivo javascript con las funciones necesarias para recibir
.               cada uno de los datos de signos vitales almacenados en la base
.               de datos en el servidor y graficarlos en cada uno de los canvas.
.
. Desarrollado por:     Nataly Janeth Contreras Ramirez.
******************************************************************************/

var tiempoVentana=10000; // 10 segundos de ventana.
var finCalculado=0;
finCalculado=valorFin-tiempoVentana;
console.log("inicio:  "+moment(valorInicio).format('LTS'));
console.log("fin:     "+moment(valorFin).format('LTS'));

/*
              GRAFICAS CANVAS DE CADA UNA, ECG, SPO Y CAP.
*/
var derivaciones=[];
var spo;
var cap;

/*######################### DATOS ECG ########################################*/
var ventanaECG = 5000;     //valor inicial del numero de datos a pintar
var labelLead = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']; // Etiquetas de las derivaciones
var colorECG='#60f979'; // color de la grafica
var anchoPunteroPlot_ecg=200;
var ecg_Y_NoVisible_ecg=0.0;
//posicion  0=minY y 1=maxY
var minmax=[-0.01,0.03];

/*######################### DATOS SPO ########################################*/
var ventanaSPO = 1000;
var spoColor= '#e1f7d9';
var minmaxspo=[-10,300];
var anchoPunteroSPO=    10;
var SPO_Y_NoVisible=   -15;

/*######################### DATOS CAP ########################################*/
var ventanaCAP = 250;
var colorCAP='#48f3ff';
var CAP_Y_NoVisible=3;
var minmaxcap=[0,1];
var anchoPunteroCAP=  20;

inicializaGraficas();
function inicializaGraficas(){
    derivaciones=[];
    // AGREGA LAS GRAFICAS ECG:
    for(var i=0;i<labelLead.length;i++){
        derivaciones.push(creaGrafica('dev'+(i+1),labelLead[i],colorECG,minmax,ventanaECG));
    }
    derivaciones.forEach(function(dev){
        dev.render();
    });
    // AGREGA LAS GRAFICAS SPO:
    spo=creaGrafica('spo','SPO',spoColor,minmaxspo,ventanaSPO);
    spo.render();

    // AGREGA LAS GRAFICAS CAP:
    cap=creaGrafica('cap','CAP',colorCAP,minmaxcap,ventanaCAP);
    cap.render();
}
/* funcion encargada de crear e inicializar con una linea cada una de las graficas*/
function creaGrafica(div,label,color,minMax,ventana){

  var graph=cnv_nuevaGrafica(div,label,color);

  //graph.options.axisY.minimum = minMax[0];
  //graph.options.axisY.maximum = minMax[1];
  for (var X = 0; X< ventana;) {
      graph.options.data[0].dataPoints[X]={
          x: X++,
          y: 0.0
      };
  }
  return graph;
}
/*###########################################################################################*/
//                        EVENTOS DEL SLIDER.
$( ".mainSlider" ).hide();
//console.log(status);
//console.log(typeof(status));
if(status==='-1'){
    alert("El usuario no tiene permiso de visualizar el historial");
}
else if(status!=1){
    alert("No hay conexion a la base de datos");
}
else if(valorInicio<0){
    alert("No existen signos vitales almacenados para el Frap seleccionado");
}
else {
    $( ".mainSlider" ).show();
    //cargarDatos(valorInicio,valorInicio+tiempoVentana);
    $( "#valor" ).text(moment(valorInicio).format('LTS'));
    $( ".slider" ).slider({
      value:/*0*/valorInicio,
      min: /*50*/valorInicio,
      max: /*5000*/finCalculado,
      /*step: 50,*/
      slide: function( event, ui ) {
        //$( "#valor" ).text( "valor: " + ui.value );
        $( "#valor" ).text(moment(ui.value).format('LTS'));
      },
      stop: function(event, ui){
          //desactivamos la barra de navegacion de abajo.
          var ini=ui.value;
          var fin=parseInt(ini)+tiempoVentana;
          cargarDatos(ini,fin);
          /*
          console.log("Inicio: "+moment(ini).format('LTS')+" fin: "+moment(fin).format('LTS'));
          console.log("Inicio: "+ini+" fin: "+fin);
          */
      }
    });
}

function cargarDatos(ini,fin){
  inicializaGraficas();
  $.post("monitorHistorial/scrolling",{"fechaIni":ini,"fechaFin":fin,},function(data){

      if(data.status==undefined){
            //FRE *******************************************************************************
            //
            $('#bmp').text(data.ecg.fre);


            //  ECG *******************************************************************************
            //
            var corX=0;
            ecg:
            for(var paquete=0;paquete<data.ecg.graficas.length;paquete++){
                    /*
                        se pinta en la grafica el nuevo paquete de 50 datos.
                    */
                    for (var punto = 0; punto < data.ecg.graficas[paquete].derivaciones[0].length; punto++){
                        for(var d=0;d<derivaciones.length;d++)
                            if (corX >= ventanaECG){
                                console.log("se paso ECG :"+(data.ecg.graficas.length*50)+" > "+corX);
                                //corX = 0;
                                break ecg;
                            }
                            else
                                derivaciones[d].options.data[0].dataPoints[corX] = {
                                    x: corX,
                                    y: (parseFloat(data.ecg.graficas[paquete].derivaciones[d][punto]))
                                }
                        corX++;
                    }
            }
            for(var d=0;d<12;d++)
                derivaciones[d].render();


            //  CAP *******************************************************************************
            //
            var xcorCAP=0;
            $('#capParam1').text(data.cap.param1 || 0);
            $('#capParam2').text(data.cap.param2 || 0);
            $('#capParam3').text(data.cap.param3 || 0);
            $('#capParam4').text(data.cap.param4 || 0);
            $('#capParam5').text(data.cap.param5 || 0);
            $('#capParam6').text(data.cap.param6 || 0);
            cap:
            for(var i=0;i<data.cap.graficas.length;i++){
                /*
                Dibuja la grafica CAP.
                */
                for (var j = 0; j < data.cap.graficas[i].length; j++) {

                    if (xcorCAP >= ventanaCAP){
                        console.log("CAP > "+xcorCAP);
                        //xcorCAP = 0;
                        break cap;
                    }
                    else {
                        cap.options.data[0].dataPoints[xcorCAP] = {
                            x: xcorCAP++,
                            y: data.cap.graficas[i][j]
                        };
                    }
                }
            }
            cap.render();
            if(data.cap.graficas.length==0){
                cap=creaGrafica('cap','CAP',colorCAP,minmaxcap,ventanaCAP);
                cap.render();
            }


            //  SPO *******************************************************************************
            //
            var xcorSPO=0;
            $('#spoOximetria').text(data.spo.oximetria);
            $('#spoBpm').text(data.spo.bmp);
            spo:
            for(var i=0;i<data.spo.graficas.length;i++){
                /*
                Dibuja la grafica CAP.
                */
                for (var j = 0; j < data.spo.graficas[i].length; j++) {
                    if (xcorSPO >= ventanaSPO){
                        console.log("SPO > "+xcorSPO);
                        //xcorSPO = 0;
                        break spo;
                    }
                    else {
                        spo.options.data[0].dataPoints[xcorSPO] = {
                            x: xcorSPO++,
                            y: data.spo.graficas[i][j]
                        };
                    }

                }
            }
            spo.render();/*
            if (xcorSPO >= ventanaSPO){
                console.log("SE PASO DEL TAMAÑO DE LA VENTANA SPO:"+xcorSPO);
                xcorSPO = 0;
            }*/
            if(data.spo.graficas.length==0){
                spo=creaGrafica('spo','SPO',spoColor,minmaxspo,ventanaSPO);
                spo.render();
            }


            //  TMP *******************************************************************************
            //
            $('#tmp').text(data.tmp);


            //  TAR *******************************************************************************
            //
            if(data.tar!=null){
                $('#tarArterial').text(data.tar.arterial);
                $('#tarRitmo').text(data.tar.ritmo);
                $('#tarValor').text(data.tar.sistolica+'/'+data.tar.diastolica);
            }
            else {
                $('#tarArterial').text('0');
                $('#tarRitmo').text('0');
                $('#tarValor').text('0/0');
            }
      }
      else {
          if(data.status==='-1'){
              alert("El usuario no tiene permitido cargar datos");
          }
          else{
              console.log("Codigo de error de mongo: "+data.status);
              alert("No hay conexion a la base de datos");
          }

      }

  }).fail(function(){
      console.log("Ocurrio un error en la peticion POST");
  });
}
