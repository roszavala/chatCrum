/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    tar_funciones.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para analizar el contenido de la
.               información de un paquete de datos tipo TAR.
.
. Desarrollado por:     Cesar Armando Cruz Mendoza
******************************************************************************/

//Metodo para actualizar la informacion en el front
function tar_Actualizar(datos) {

    var valor = datos.tension.sistolica.toString() + '/' + datos.tension.diastolica.toString();

    if($('#m_'+datos.id_ambulancia).length) {
        $('#tarValor').text(valor);
        $('#tarArterial').text(datos.tension.arterial);
        $('#tarRitmo').text(datos.tension.ritmo);
    }

    $('#nibp_' + datos.id_ambulancia).text(datos.tension.sistolica+'/'+datos.tension.diastolica);

}
