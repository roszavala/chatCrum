/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    signos.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene el modelo de mongoDB para la consulta de
.               los signos vitales almacenados de la sincronizacion.
.
. Desarrollado por:     Nataly Janeth Contreras Ramirez.
******************************************************************************/
module.exports=function(mongoose){
  var Schema=mongoose.Schema;

  var Signos=new Schema({
      idFrap: String,
      tipo: String,
      paquete: String,
      fecha: {type: Number, index: true}
  });
  return mongoose.model('sensores',Signos);
}
