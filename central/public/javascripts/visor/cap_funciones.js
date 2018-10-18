/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    cap_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para analizar el contenido de la
.               información de un paquete de datos tipo CAP y lo pinta en el
.               front
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/
var ventanaCAP = 250;
var graficaCAP=null;
var xcorCAP=0;
var colorCAP='#48f3ff';
var CAP_Y_NoVisible=3;
var minCAPPlot=        0;
var maxCAPPlot=        1;
var anchoPunteroCAP=  20;

/*
    Metodo para inicializar el front
 */
function cap_inicializar(){

    //inserta las nuevas graficas
    if(graficaCAP==null) {

        graficaCAP = cnv_nuevaGrafica('cap', 'CO2', colorCAP);
        graficaCAP.options.axisY.minimum = minCAPPlot;
        graficaCAP.options.axisY.maximum = maxCAPPlot;
    }

    //inicializa el contenido del arreglo
    for (xcorCAP=0;xcorCAP<ventanaCAP;) {
        graficaCAP.options.data[0].dataPoints[xcorCAP]={
            x:xcorCAP++,
            y:0.0
        };
    }
    graficaCAP.render();
    xcorCAP=0;
}


//Actualiza la informacion del mensaje en la pantalla
function cap_Actualizar(datos) {
    if($('#m_'+datos.id_ambulancia).length) {

        if(graficaCAP!=null) {
            $('#capParam1').text(datos.capnografia.param1);
            $('#capParam2').text(datos.capnografia.param2);
            $('#capParam3').text(datos.capnografia.param3);
            $('#capParam4').text(datos.capnografia.param4);
            $('#capParam5').text(datos.capnografia.param5);
            $('#capParam6').text(datos.capnografia.param6);

            /*
            Dibuja la grafica CAP.
            */
            for (var i = 0; i < datos.capnografia.grafica.length; i++) {
                graficaCAP.options.data[0].dataPoints[xcorCAP] = {
                    x: xcorCAP++,
                    y: datos.capnografia.grafica[i]
                };
            }
            /*
            Se dibuja el puntero o espaciado en negro de la grafica despues del ultimo paquete recibido.
            */
            drawSpaceBlack(anchoPunteroCAP, graficaCAP, xcorCAP, CAP_Y_NoVisible, ventanaCAP);
            graficaCAP.render();

            if (xcorCAP >= ventanaCAP)
                xcorCAP = 0;
        }
    }
}
