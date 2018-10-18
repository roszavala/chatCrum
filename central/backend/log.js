/***********************************************************************************
 . Centro de Ingeniería y Desarrollo Industrial
 . Nombre del módulo:    sensores.js
 . Lenuaje:              Javascript
 . Propósito:    Funcion que modifica el console.log para que muestre los mensajes
 .               deacuerdo a una configuracion de activar o desactivar mensajes.
 .
 . Desarrollado por:     Nataly Janeth Contreras Ramirez
 ***********************************************************************************/
function log(){

    console.log=nuevo_log;

    function nuevo_log(men,error){
      if(global.configuracion.muestraConsolesLog){
          console.info(men);
      }
      if(error && global.configuracion.muestraConsolesLog){
          console.error(error);
      }
    }
}
module.exports=log;
