module.exports=function(mongoose){
  var Schema=mongoose.Schema;

  var especialistas=new Schema({
    idFrap: String,
    idEspecialista: String,
    nombreEspecialista: String,
    username: String,
    estado: String,
    fecha: String
  });

  return mongoose.model('especialistas',especialistas);
}
