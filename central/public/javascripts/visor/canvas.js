/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    cnv_canvas.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene los metodos asociados con el manejo de
.               los objetos tipo graph para el despliegue de los trazos.
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/
var ajusteIncremento = 20;

function cnv_nuevaGrafica(id, titulo,colorLineaGraf){
    
    var chart = new CanvasJS.Chart(id,
        {
          backgroundColor: "#313131",
          height: $('#'+id).height()+ajusteIncremento,
          title:{
            //text: labelLead[indexLead[i]],
            text: titulo,
            fontSize: 9,
            fontFamily: "arial",
            fontColor: colorLineaGraf,
            fontweight: "bold"
          },
          axisX: {
            gridColor: "#313131",
            gridDashType:"dot",
            labelFontSize: 1,
            lineColor: "#313131",
            tickColor: "#313131",
            labelFontColor: "black"
          },
          axisY:{
//            minimum: -4,
//            maximum: -3.8,
            gridDashType:"dot",
            labelFontSize: 1,
            gridColor: "#313131",
            lineColor: "#313131",
            tickColor: "#313131",
            labelFontColor: "black"
          },
          toolTip: {
            fontColor: colorLineaGraf,
            backgroundColor: "rgba(49,49,49,.7)"
          },
          data: [
          {
            color: colorLineaGraf,
            lineThickness: 1,
            type: "line",
            dataPoints: []
          }
          ]
        });
    return chart;
}
