if(!global.hasOwnProperty('db')){

      var mongoose=require('mongoose');
      var dbName='crum_central_db';
      var dbdir='mongodb://localhost/';
      var reconnTimer = null;

      function tryReconnect() {
          if(mongoose.connection.readyState==0){
                mongoose.connect(dbdir+dbName,{server: { auto_reconnect: false }},function(err){
                    if (err) {
                        //console.log('No se puede conectar a Mongo.');
                    }else{
                        console.info('Conectado a Mongo');
                        clearTimeout(reconnTimer);
                        reconnTimer = null;
                    }
                });
            }
      }

      mongoose.connection.on('disconnected',function(){
          mongoose.connection.readyState = 0; // force...
          reconnTimer = setTimeout(tryReconnect, 1000);
      });
      tryReconnect();


      global.db={
          mongoose: mongoose,
          frapActivos:require('./frapActivos')(mongoose),
          mensajes:require('./mensajes')(mongoose),
          signos: require('./signos')(mongoose),
          especialistas:require('./especialistas')(mongoose)
      };
}

module.exports=global.db;
