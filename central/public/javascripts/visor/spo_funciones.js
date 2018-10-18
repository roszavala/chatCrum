 /******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    spo_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para analizar el contenido de la
.               información de un paquete de datos tipo SPO y lo pinta en el
.               front
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

var spo_ventana = 1000;
var spoColor= '#e1f7d9';
var spo_paquete = 10;
var graficaSPO=null;

var xcorSPO=0;
var minSPOPlot=        0;
var maxSPOPlot=        40000;
var anchoPunteroSPO=    15;
var SPO_Y_NoVisible=    300;

/*
    Metodo para inicializar el front
 */
function spo_inicializar(){

    //inserta las nuevas graficas

    if(graficaSPO==null) {

        graficaSPO = cnv_nuevaGrafica('spo', 'SPO', spoColor);
        graficaSPO.options.axisY.minimum = minSPOPlot;
        graficaSPO.options.axisY.maximum = maxSPOPlot;
    }

    //inicializa el contenido del arreglo
    //console.log(spo_ventana);
    for (xcorSPO = 0; xcorSPO< spo_ventana;) {
        graficaSPO.options.data[0].dataPoints[xcorSPO] = {
            x: xcorSPO++,
            y: 0.0
        };
    }
    graficaSPO.render();
    xcorSPO = 0;
}

/*
    Actualiza la informacion del mensaje en la pantalla
 */
function spo_Actualizar(datos) {

    if($('#m_'+datos.id_ambulancia).length) {
        if(graficaSPO!=null) {

            //inserta los nuevos elementos que se reciben

            for (var i = 0; i < spo_paquete; i++) {
                graficaSPO.options.data[0].dataPoints[xcorSPO] = {
                    x: xcorSPO++,
                    y: datos.oximetria.grafica[i]
                };
            }
            /*
            se dibuja el puntero o espaciado en negro de la grafica despues del ultimo paquete recibido.
            */

            drawSpaceBlack(anchoPunteroSPO, graficaSPO, xcorSPO, SPO_Y_NoVisible, spo_ventana);
            graficaSPO.render();

            if (xcorSPO >= spo_ventana)
                xcorSPO = 0;

            if (datos.oximetria.bmp < 255) {
                $('#spoBpm').text(datos.oximetria.bmp);
            }
            if (datos.oximetria.spo2 < 255) {
                $('#spoOximetria').text(datos.oximetria.spo2);
            }
        }
    }
    if(datos.oximetria.spo2 < 255)
    	$('#spo2_'+datos.id_ambulancia).text(datos.oximetria.spo2);
}
