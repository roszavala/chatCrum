/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    monitorHistorial.js
. Lenuaje:              Javascript
. Propósito:    Modulo para el acceso a la ruta del visor que visualizara los
.								signos vitales almacenados desde la base de datos. Recibe las
.								peticiones GET y POST para la visualizacion de la pagina o la
.								la entrega de los paquetes por JSON.
.
. Desarrollado por:     Nataly Janeth Contreras Ramirez.
******************************************************************************/

var express = require('express');
var session=require('express-session');
var router = express.Router();
var mongoHistorial=require('../backend/visor/viewMongoSignos');


router.use(session({ secret: 'Y2xhdmVzdXBlcnNlY3JldGFjaWRlc2k=', cookie: { maxAge: 3600000 }, resave: true, saveUninitialized: true }));
var sess;
var folioFrap=0;

//	se redirige al usuario a la pagina de inicio de la central en caso de ser
//  peticion GET.
//
router.get('/',function(req,res){
		res.redirect('../');
});
// home de monitorHistorial
//
router.post('/',function(req,res){

		sess=req.session;
		var datosSocket={
				ip: global.configuracion.direccionLocal || "hola",
				puertoS: global.configuracion.puertoServidorWeb || "80",
				inicio: -1,
				fin: -1,
				status: db.mongoose.connection.readyState,
		};

			// ID DE USUARIO.
			var usuario = req.body.idu || '';

			require('../backend/db/postgresql').validEnterHistory(usuario, function(err,result){
						if(!err){
									//posibles resultados: 0,1
									//Acceso concedido = 1 y Acceso Denegado = 0
									if(result.rows[0].user==='1')
									{
											sess = req.session;
											sess.usuario = usuario;


											if(db.mongoose.connection.readyState==1){

													folioFrap=req.body.folioFrap || folioFrap;

													console.log("Signos a consultar del folioFrap: "+folioFrap);
													mongoHistorial.paramIniciales(folioFrap,function(docs){

															datosSocket.inicio=docs.minFecha;
															datosSocket.fin=docs.maxFecha;
															if(datosSocket.inicio==-1 || datosSocket.fin==-1)
																	sess=null;
															res.render('monitorHistorial',datosSocket);

													},function(err){
															console.log("Error al consultar minimo y maximo");
															res.render('monitorHistorial',datosSocket);
													});
											}
											else {
													res.render('monitorHistorial',datosSocket);
											}
									}
									else{
											sess=null;
											datosSocket.status='-1';
											res.render('monitorHistorial',datosSocket);
									}
						}
						else {
								sess=null;
								datosSocket.status='-1';
								res.render('monitorHistorial',datosSocket);
						}

			});

});


// ruta cuando se empieza a utilizar el slider de la pagina para graficar signos
//
router.post('/scrolling',function(req,res){

		sess = req.session;
		if(sess.usuario) {
					if(db.mongoose.connection.readyState==1){
							if(req.body.fechaIni && req.body.fechaFin){

								var ini=req.body.fechaIni;		// fecha minima
								var fin=req.body.fechaFin; // se le suma los 10 segundos de la ventana.

								mongoHistorial.start(folioFrap,ini,fin,function(datos){


										//ECG
										var ecg=new require('../backend/visor/ecg_funciones.js');
										var tmpFrecuencia=0,graficasECG=[];
										datos.ecg.forEach(function(paquete){
												ecg.ecg_Analizar(paquete,'ECG');
										});

										var tmp = ecg.entregaGrupoPaquete();

										var jecg={
												graficas: tmp.grupo,
												fre: tmp.frecuencia
										}


										//SPO
										//SE PROCESAN LOS PAQUETES DE SPO PARA ENVIAR AL VISOR Y GRAFICARLOS.
										var spo=new require('../backend/visor/spo_funciones.js');
										var tmpoximetria=0, tmpBMP=0,graficaSPO=[];
										datos.spo.forEach(function(paquete){
												var json_spo=spo.spo_Analizar(paquete);
												if(json_spo!=null){
														graficaSPO.push(json_spo.grafica.slice(0));
														tmpoximetria=json_spo.oximetria;
														tmpBMP=json_spo.bmp;
												}
										});
										var jspo={
												graficas: graficaSPO,
												bmp: tmpBMP,
												oximetria: tmpoximetria
										}


										//CAP
										// SE PROCESAN LOS PAQUETES DE CAP PARA ENVIAR AL VISOR.
										var cap=new require('../backend/visor/cap_funciones.js');
										var p1,p2,p3,p4,p5,p6,graficaCAP=[];
										datos.cap.forEach(function(paquete){
												var json_cap=cap.cap_Analizar(paquete);
												if(json_cap!=null){
														graficaCAP.push(json_cap.grafica.splice(0));

														p1=json_cap.param1;
														p2=json_cap.param2;
														p3=json_cap.param3;
														p4=json_cap.param4;
														p5=json_cap.param5;
														p6=json_cap.param6;
												}
										});
										var jcap={
												graficas: graficaCAP,
												param1: p1,
												param2: p2,
												param3: p3,
												param4: p4,
												param5: p5,
												param6: p6
										}


										//TMP
										var tmp=new require('../backend/visor/tmp_funciones.js');
										var temperatura=0;
										datos.tmp.forEach(function(paquete){
												tmp.tmp_Analizar(paquete,function(tmp){
														temperatura=tmp;
												});
										});


										// TAR
										var tar=new require('../backend/visor/tar_funciones.js');
										var tmpTar=null;
										datos.tar.forEach(function(paquete){
												tar.tar_Analizar(paquete,function(item){
														tmpTar=item;
												});
										});


										// JSON que regrsa al front con los datos para ser graficados.
										var jcompleto={
												ecg: jecg,
												spo:jspo,
												cap: jcap,
												tmp: temperatura,
												tar: tmpTar
										}
										res.json(jcompleto);
								});
							}
							else {
									//res.json({status:404});
									res.status(400).json({status:'No fechaIni or fechaFin'});
							}
					}
					else {
							res.json({status:db.mongoose.connection.readyState});
					}
		}
		else {
				res.redirect('../');
		}
});
module.exports = router;
