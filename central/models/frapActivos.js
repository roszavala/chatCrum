module.exports=function(mongoose){
  var Schema=mongoose.Schema;

  var frapActivos=new Schema({
    idFrap: String,
    nombreAmbulancia: String,
    numSerie: String,
    estado: String
  });

  return mongoose.model('frapActivos',frapActivos);
}
