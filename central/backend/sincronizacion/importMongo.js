/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    importMongo.js
. Lenuaje:              Javascript
. Propósito:    Este módulo contiene la lógica para importar los datos recibidos
.               por la nitrogen de la ambulancia y guardarlos directo en la base
.               de la central.
.
.
. Desarrollado por:     Nataly Janeth Contreras Ramírez.
******************************************************************************/
module.exports.Exec=function(path,callback){
var spawn = require('child_process').spawn;
     var totalImportado=0;
     var mongoImport = spawn('mongoimport', [
         '--db', 'crum_central_db', '-c', 'sensores',
         '--numInsertionWorkers','4',   // solo para la version 3.0.0 en adelante funciona.
         '--type=csv',
         '--headerline',
         '--file', path
     ]);

     //comando base
     //mongoimport --db crum -c sensores3 --type csv --headerline --file sensores2.csv


     mongoImport.stdout.on('data', function (data) {
         gettotal(data);
     });
     mongoImport.stderr.on('data',function(data){
        gettotal(data);
     });
     mongoImport.stdout.on('end', function () {
        console.log("Listo Termino de Importar");
        callback(totalImportado);
     });


     function gettotal(data){

            if (data) {
                 // You can change or add something else here to the
                 // reponse if you like before returning it.  Count
                 // number of entries returned by mongoexport for example
                 var str=data.toString();
                 var posicionImported = str.search("imported");
                 if(posicionImported>-1){

                     console.log("Se encontro imported "+posicionImported);
                     var posicionDocuments= str.search("documents");
                     var total=str.substring(posicionImported+8,posicionDocuments);

                     //obtengo el total de documentos importados
                     total=parseInt(total);
                     totalImportado=total;
                 }

             } else {
                 console.log('mongoimport returns no data');
                 totalImportado=0;
             }
     }
}
