module.exports=function(mongoose){
  var Schema=mongoose.Schema;

  var mensajes=new Schema({
    idFrap: String,
    idUsuario: String,
    nombreUsuario:String,
    mensaje: String,
    fecha: String
  });

  return mongoose.model('mensajes',mensajes);
}
