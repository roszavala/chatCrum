/******************************************************************************
. Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    index.js
. Lenuaje:              Javascript
. Propósito:    Modulo para el direccionamiento de paginas ejs y logueo de
.   						usuarios
.
. Desarrollado por:     Nataly Janeth Contreras Ramirez.
******************************************************************************/
var express = require('express');
var session=require('express-session');
var moment= require('moment');
var router = express.Router();
var http = require('http').Server(router);
var io = require('socket.io')(http);
var arrUsuarios=[];
var arrRooms=[];
var arrEstados=[];
var idSitcrum="SITCRUM1";
var arrMensajes=[];

/*
	configuracion para el control de session en el login. parametro cookie sirve para determinar un tiempo de sesion
	al usuario, despues del tiempo lo sacara de la sesion. Sino se espesifica no existe tiempo limite.
 */
router.use(session({ secret: 'Ym2VW2WRLNnXilKZG2a7nRBk1Nhhjuqr', /*cookie: { maxAge: 900000 },*/ resave: true, saveUninitialized: true }));
var sess;

/***********************************************    RUTAS    ********************************************************
 *
 */

router.get('/', function(req, res) {
	sess = req.session;
	if(sess.usuario) {
		res.redirect('signosVitales');
	}
	else
		res.redirect('acceso');
});

/* GET acceso o login al sistema */

router.get('/acceso',function(req,res){
	sess = req.session;
	if(sess.usuario) {
		res.redirect('signosVitales');
	}
	else
		res.render('acceso');
});

/* GET home monitor */

router.get('/monitor', function(req, res) {
	sess = req.session;
	if(sess.usuario) {
		res.render('monitor');
	}
	else
		res.redirect('/acceso');
});


router.post('/getEspecialistas', function(req,res){

	especialists:JSON.stringify(require('../backend/visor/kinvey').Especialistas()),
	require('../backend/visor/kinvey').Especialistas(function(resultado){


		/*	Validacion solo para enviar los especialistas deacuerdo al horiario y disponibilidad del dia	*/

		var ArrEsp=[];
		for(var i=0;i<resultado.length;i++){

				var daysDisponibles=resultado[i].diasDisponible.split('');
				var diaHoy=moment().day();
				//console.log("name: "+resultado[i].name+" dia: "+daysDisponibles[diaHoy]);
				var fechaHoy=moment().format('YYYY-MM-DD')+' ';
				var horaini=resultado[i].horaIni;
				var horafin=resultado[i].horaFin;
				//console.log(moment().format()+ "Ini: "+fechaHoy+horaini+" Fin: "+fechaHoy+horafin);
				if(daysDisponibles[diaHoy]==='1' && moment(moment().format()).isBetween(fechaHoy+horaini,fechaHoy+horafin,'time')){
						ArrEsp.push(resultado[i]);
				}
		}
		resultado=ArrEsp;


		var json=JSON.stringify(resultado);
		res.send(json);
	},
	function(error){
		console.log("Error al consultar los especialistas");
		res.end('no');
	});

});

/* GET home signos vitales */

router.get('/signosVitales', function(req, res) {

	sess = req.session;
	if(sess.usuario) {
		/*
		 le enviamos al index principal los datos de configuracion para conectar los sockets.
		 */
		var json = {

			puertoSocketBack: global.configuracion.puertoVisorWebSocket, // puerto de conexion socket con sensores.
			ipCentral: global.configuracion.direccionLocal ,  // ip local de Crum.
			puertoChat:global.configuracion.puertoChat
		}

		res.render('signosVitalesIndex', json);
	}
	else
		res.redirect('/');
});

/*	POST pra el login o ingreso de usuarios al sistema, valida el ingreso de un usuario */
router.post('/login',function(req,res){
	sess=req.session;
	if(!sess.usuario) {

		var usuario = req.body.usuario;
		var pass = req.body.pass;

		require('../backend/db/postgresql')(usuario,pass,function(err,result){
			if(err)
				throw err;

				//posibles resultados: 0,1
				//Acceso concedido = 1 y Acceso Denegado = 0

			if(result.rows[0].user==='1')
			{
				sess = req.session;
				sess.usuario = usuario;
				res.end('si');
				require('../backend/visor/kinvey')();
			}
			else
				res.end('no');

		});
	}
	else
		res.redirect('/signosVitales');
});

/*	GET salida del usuario del sistema o cierre de session  */
router.get('/logout',function(req,res) {
	req.session.destroy(function (err) {
		if (err) {
			console.error(err);
		} else {
			res.redirect('/');
		}
	});
});

module.exports = router;
