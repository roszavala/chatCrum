/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    tmp_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para analizar el contenido de la
.               información de un paquete de datos tipo TMP.
.
. Desarrollado por:     Nataly Janeth Contreras Ramirez.
******************************************************************************/

//Metodo para actualizar la informacion en el front
function tmp_Actualizar(datos) {
    document.getElementById('tmp').innerHTML = datos;
    $('#tmp_index').text(datos);
}
