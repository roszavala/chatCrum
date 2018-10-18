/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    ecg_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para analizar el contenido de la
.               información de un paquete de datos tipo ECG.
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

var ventanaECG = 5000;     //valor inicial del numero de datos a pintar
var paquete = 0;
var labelLead = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6']; // Etiquetas de las derivaciones
var lista_derivaciones = [];  //arreglo de los controles graficos
var numeroGraficas=12;
var colorECG='#60f979'; // color de la grafica

var corX=0;
/*
    ancho del puntero o espacio negro que se estara moviendo junto al plot en la grafica y valor default del espacio
    vacio dibujandose junto con la grafica.
 */
var anchoPunteroPlot=70;
var ecg_Y_NoVisible=0.0;
/*
    maximo y minito del rango de datos en el Plot de la grafica.
 */
var maxYPlot=0.0006;
var minYPlot=-0.0005;

/*
    Inicializa los controles en el front
 */
function ecg_inicializar(){

    if(lista_derivaciones.length<1) {
        //Inserta los elementos graficos
        for (var i = 0; i < numeroGraficas; i++) {
            var chart = cnv_nuevaGrafica('dev' + (i + 1), labelLead[i], colorECG);
            chart.options.axisY.minimum = minYPlot;
            chart.options.axisY.maximum = maxYPlot;
            lista_derivaciones.push(chart);
            chart.render();
        }
    }
    /*
     inicializa la grafica con coordenadas en Y igual a ceros.
     */
    for (i = 0; i < numeroGraficas; i++) {
        //imprime el contexto del chart
        //inicializa el arreglo con 5000 datos
        for (corX = 0; corX< ventanaECG;) {
            lista_derivaciones[i].options.data[0].dataPoints[corX]={
                x: corX++,
                y: 0.0
            };
        }
        lista_derivaciones[i].render();
    }
    corX=0;
}

/*
    Metodo que recibe el nuevo paquete de informacion del sensor para procesar y mostrar en la grafica.
 */
function nuevoDato(datos) {

    if($('#m_'+datos.id_ambulancia).length) {

        if(lista_derivaciones.length>0) {

            paquete = datos.ecg.paquete;

            /*
                se pinta en la grafica el nuevo paquete de 50 datos.
            */
            for (var i = 0; i < paquete; i++) {
                for(var d=0;d<12;d++)
                    lista_derivaciones[d].options.data[0].dataPoints[corX] = {
                        x: corX,
                        y: (parseFloat(datos.ecg.canal[d][i]))
                    };
                corX++;
            }
            /*
                se dibuja el puntero o espaciado en negro de la grafica despues del ultimo paquete recibido.
            */
            for(var d=0;d<12;d++)
                drawSpaceBlack(anchoPunteroPlot, lista_derivaciones[d], corX, ecg_Y_NoVisible, ventanaECG);
            /*
                pintar la grafica.
            */
            for(var d=0;d<12;d++)
                lista_derivaciones[d].render();
            /*
                si la cordenada en x llega hasta el fin de la ventana se vuelve a empezar a cero para redibujarla desde ahi.
            */
            if (corX >= ventanaECG)
                corX = 0;
        }
    }
}
