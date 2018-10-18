/******************************************************************************
.                   Centro de Ingeniería y Desarrollo Industrial
. Nombre del módulo:    postgresql.js
. Lenguaje:             Javascript
. Propósito:    Módulo que gestiona la conexión a la base de datos del SITCRUM
.			    respondiendo a los diferentes escenarios a la consulta de inicio
.               de servicio, solicitado por medio de la tablet.
.
. Desarrollado por:     Rebeca Chavarria Cruz
******************************************************************************/
var pg = require('pg');

var conString = global.configuracion.direccionPOSTGRE;

var cliente;

//Timmer que ejecuta consulta a base de datos, cada 10 minutos
setInterval(function(){tiempo_conexion();}, 600000);

conectaPostgre();   //  Se llama a función que ejecuta la conexión a la base de datos.
/*var cliente = new pg.Client(conString);
cliente.connect();
console.log('Valor cliente :' + cliente); */

//Conexión con la base de datos
function conectaPostgre(){
    pg.connect(conString, function(err, client, done){
        if(err){
            //console.error(err.stack);
            conectaPostgre();
            return console.error('Error al conectarse a postgres');
        }
        console.log('Conectado a Postgres');

        cliente = client;
        console.log('Valor cliente :' + cliente);
    });
};



//Función que extrae la información
function buscame(idNitro, fechaBusqueda, socket){
    var codigo_con;
    var resultado = {};
    console.log("Vamos a HAcer el eJeteCuery");
    cliente.query('SELECT "cs_Agrupaciones"."iniAgrupacion", "cs_Unidades"."iniUnidad", "cs_Unidades"."folioRERA", "aa_CRUM"."idAmbuCrum", "aa_CRUM"."fk_idAgrupacion",' + 
        '"aa_CRUM"."fk_idUnidad",  "aa_CRUM"."numero", "aa_CRUM"."base" FROM public."aa_CRUM", public."cs_Agrupaciones", public."cs_Unidades" WHERE "aa_CRUM"."fk_idAgrupacion" = "cs_Agrupaciones"."idAgrupacion" AND ' + 
        '"aa_CRUM"."fk_idUnidad" = "cs_Unidades"."idUnidades" AND "aa_CRUM"."numeroSerie" like \'' + idNitro + '\'', function(error, result){
        if(error){
            codigo_con = 2;
            resultado = {
                "codigo" : codigo_con,
                "descripcion" : "Error al realizar consulta CRUM"
            };
            //socket.emit('error', resultado);
            return console.error('Error al hacer Consulta CRUM', error);
        }
        //console.log(result);
        var consulta = result.rows;
        //La ambulancia tiene servicio asignado
        if(consulta.length > 0){
           console.log('Tenemos datos del Servicio: ' + consulta[0].iniAgrupacion + ' --- ' + consulta[0].iniUnidad + ' ----- ' + consulta[0].folioRERA);
            // Construcción de Folio RERA
            var folioRERA = consulta[0].iniAgrupacion + consulta[0].iniUnidad + 'RA';

            // Obteniendo Año
            var da = new Date();
            var Hoy = da.getFullYear().toString();
            var folioNuevo = parseInt(consulta[0].folioRERA) + 1;
            var consecutivo = consulta[0].folioRERA.toString();
            var fin = '';
            var consulta1,consulta2;

            console.log("Tamaño de consecutivo: " + consecutivo.length);
            if(consecutivo.length < 4)
            {
                for(var i = consecutivo.length; i < 4; i++)
                {
                    fin = fin + '0';
                }

                fin = fin + consecutivo;
            }
            folioRERA = folioRERA + Hoy.substr(2,3) + fin;
            console.log("Mi nuevo folio es: " + folioRERA);

            // Vamos a buscar a la guardia saliente
            var saliente = 'SELECT tum1, tum2, base, "numAmbu" FROM "rg_ParametrosRG" WHERE "idParamRG"=(SELECT "fk_idParamRG" FROM public."rg_ConfiguraRG" WHERE "fk_idAmbu"=4' +
                          ' AND "fechaHoraFin" BETWEEN \'' + //consulta[0].idAmbuCrum
                          fechaBusqueda + ' 00:00:00\' AND \'' +
                          fechaBusqueda + ' 23:59:59\')';
            console.log(saliente);
            cliente.query(saliente, function(error, respuesta){
                if(error){
                    console.log("Hubo un error al obtener rol de Guardas Saliente");
                }
                else
                {
                    consulta1 = respuesta.rows;
                    console.log("Guardia SALIENTE");
                    console.log(consulta);
                    var entrante = 'SELECT tum1, tum2, base, "numAmbu" FROM "rg_ParametrosRG" WHERE "idParamRG" =(SELECT "fk_idParamRG" FROM public."rg_ConfiguraRG" WHERE "fk_idAmbu"=4' +
                           ' AND "fechaHoraIni" BETWEEN \'' + //consulta[0].idAmbuCrum
                          fechaBusqueda + ' 00:00:00\' AND \'' +
                          fechaBusqueda + ' 23:59:59\')';
                    cliente.query(entrante, function(error, respuesta){
                        if(error){
                            console.log("Hubo un error al obtener rol de Guardas ENTRANTE");
                        }
                        else
                        {
                            consulta2 = respuesta.rows;
                            console.log("Guardia ENTRANTE");
                            console.log(consulta2);

                            var respuestaJSON = {
                                folioRERA : folioRERA,
                                idAmbu : consulta[0].idAmbuCrum,
                                idAgru : consulta[0].fk_idAgrupacion,
                                idUnidad : consulta[0].fk_idUnidad,
                                numAmb : consulta[0].numero,
                                base : consulta[0].base,
                                nitro : idNitro,
                                folioSiguiente : folioNuevo,
                                guardiaSal1 : consulta1[0].tum1,
                                guardiaSal2 : consulta1[0].tum2,
                                guardiaEnt1 : consulta2[0].tum1,
                                guardiaEnt2 : consulta2[0].tum2,
                            }
                            console.log("JSON--------");
                            console.log(respuestaJSON);
                            socket.emit('dataFolio', respuestaJSON);
                        }
                    });
                }
            });
        }
        else
        {
            console.log("NO tenemos Datos en la Búsqueda, que tenemos que retornar?");
        }
    });
};

// Función que permite extraer la informacion relacionada con el id de la Nitro
function obtieneInfoNitro(idNitro, fechaBusqueda, socket){
  var jResp = {};
  console.log("Buscando Info de Nitro: " + idNitro);
  var sTQuery = 'SELECT * FROM public."aa_CRUM" WHERE "estatusAmb" = 0 AND "numeroSerie" like \'' + idNitro + '\'';
  console.log(sTQuery);
  cliente.query(sTQuery, function(error, resultado){
    if(error){
        jResp = {
          "codigo" : 1,
          "descripcion" : 'Error al realizar la consulta del ID'
        };
        socket.emit('infoIDNitro', jResp);
    }
    else
    {
        var consulta = resultado.rows;
        
        if(consulta.length > 0){
            if(consulta[0].tipo == "Ambulancia")
            {   // Se Obtienen los datos de la ambulancia en base al ID de la Nitro
                // Vamos a consultar los datos de los TUM para Mostrarlos en Pantalla

                var jReID = {
                  codigo : 0,
                  idAmbu : consulta[0].idAmbuCrum,
                  idAgrupacion : consulta[0].fk_idAgrupacion,
                  idUnidad : consulta[0].fk_idUnidad,
                  numAmb : consulta[0].numero,
                  base : consulta[0].base
                };

                // Vamos a buscar a la guardia SALIENTE
                var saliente = 'SELECT tum1, tum2, base, "numAmbu" FROM "rg_ParametrosRG" WHERE "idParamRG"=(SELECT "fk_idParamRG" FROM public."rg_ConfiguraRG" WHERE "fk_idAmbu"=' +
                                jReID.idAmbu +
                              ' AND "fechaHoraFin" BETWEEN \'' +
                              fechaBusqueda + ' 00:00:00\' AND \'' +
                              fechaBusqueda + ' 23:59:59\')';
                console.log(saliente);

                // Vamos a buscar a la guardia ENTRANTE
                var entrante = 'SELECT tum1, tum2, base, "numAmbu" FROM "rg_ParametrosRG" WHERE "idParamRG" =(SELECT "fk_idParamRG" FROM public."rg_ConfiguraRG" WHERE "fk_idAmbu"=' +
                                jReID.idAmbu +
                                ' AND "fechaHoraIni" BETWEEN \'' +
                                fechaBusqueda + ' 00:00:00\' AND \'' +
                                fechaBusqueda + ' 23:59:59\')';
                console.log(entrante);

                // Ejecutando Query de Guardia saliente
                cliente.query(saliente, function(error, respS){
                    if(error)
                    {
                        jReID.guardiaSal1 = 'Desconocido1';
                        jReID.guardiaSal2 = 'Desconocido2';
                        jReID.guardiaEnt1 = 'SinReg1';
                        jReID.guardiaEnt2 = 'SinReg2';
                        console.log("Hubo Problema al extraer guardia Saliente");
                        socket.emit('infoIDNitro', jReID);
                    }
                    else
                    {
                        var conSal = respS.rows;
                        if(conSal.length > 0)
                        {
                            jReID.guardiaSal1 = conSal[0].tum1;
                            jReID.guardiaSal2 = conSal[0].tum2;
                        }
                        else
                        {
                            jReID.guardiaSal1 = 'SinReg1';
                            jReID.guardiaSal2 = 'SinReg2';
                        }

                        cliente.query(entrante, function(error, respE){
                            if(error)
                            {
                                jReID.guardiaEnt1 = 'DesconocidoE1';
                                jReID.guardiaEnt2 = 'DesconocidoE2';
                                console.log("Hubo Problema al extraer guardia Entrante");
                                socket.emit('infoIDNitro', jReID);
                            }
                            else
                            {
                                var conEnt = respE.rows;
                                if(conEnt.length > 0)
                                {
                                    jReID.guardiaEnt1 = conEnt[0].tum1;
                                    jReID.guardiaEnt2 = conEnt[0].tum2;
                                }
                                else
                                {
                                    jReID.guardiaEnt1 = 'SinReg1';
                                    jReID.guardiaEnt2 = 'SinReg2';
                                }
                                console.log("JSON--------");
                                console.log(jReID);
                                // Finaliza LA consulta Y Mandamos Datos a ClienteServidor.js
                                socket.emit('infoIDNitro', jReID);
                            }
                        }); // Guardia Entrante
                    }
                }); // Guardia Saliente
            }
            else
            {
              jResp = {
                  "codigo" : 5,
                  "descripcion" : 'No es Ambulancia no le aplica este formato'
                };
                socket.emit('infoIDNitro', jResp);
            }
        }
        else
        {
            jResp = {
              "codigo" : 3,
              "descripcion" : 'No obtuvimos nada en la consulta'
            };
            socket.emit('infoIDNitro', jResp);
        }
    }
  }); //Cliente.query
};


// ------------------------------------------------------------
/*
    Genera el folio RERA para el formato de Entrega - Recepción
*/
function getFolioR(data, callback){
	var jRespuesta = {};
	var folioRERA = ''; // = data.iAgrupacion + data.iUnidad + 'RA';
	// Obteniendo Año
    var da = new Date();
    var Hoy = da.getFullYear().toString();
    var fin = '';
    console.log('Vamos a Buscar el Folio Rera');
    console.log(data);
    //var QueryFolio = 'SELECT "folioRERA" from public."cs_Unidades" WHERE "idUnidades" = ' + data.iUnidad;
    var QueryFolio = 'SELECT "folioRERA","iniAgrupacion","iniUnidad" FROM public."cs_Agrupaciones", public."cs_Unidades" WHERE "idAgrupacion" =' +
        data.iAgrupacion +
        ' AND "idUnidades" =' +
        data.iUnidad;

    console.log(QueryFolio);
    // Obtenemos FolioRERA
    cliente.query(QueryFolio, function(error, respuesta){
    	if(error)
    	{
    		jRespuesta.codigo = 1;
    		jRespuesta.descripcion = "Hubo error al extraer FOLIO";
            callback(jRespuesta);
    	}
    	else
    	{
    		var consF = respuesta.rows;
    		if(consF.length > 0)
    		{	// Tenemos Datos de Folio RERA
    			jRespuesta.codigo = 0;

    			var folioNuevo = parseInt(consF[0].folioRERA) + 1;
    			var consecutivo = consF[0].folioRERA.toString();
    			console.log("Tamaño de consecutivo: " + consecutivo.length);
	            if(consecutivo.length < 4)
	            {
	                for(var i = consecutivo.length; i < 4; i++)
	                {
	                    fin = fin + '0';
	                }

	                fin = fin + consecutivo;
	            }
                // Concatenamos las Iniciales que Necesitamos
                folioRERA = consF[0].iniAgrupacion + consF[0].iniUnidad;
	            folioRERA = folioRERA + Hoy.substr(2,3) + fin;
	            console.log("---> Mi nuevo folio es: " + folioRERA);

	            jRespuesta.folio = folioRERA;
	            jRespuesta.folioSiguiente = folioNuevo;
                callback(jRespuesta);
    		}
    		else
    		{
    			jRespuesta.codigo = 2;
    			jRespuesta.descripcion = "No tenemos nada en la consulta";
                callback(jRespuesta);
    		}
    	}
    }); // Query RERA
}


// Función Transaccional para entrega Ambulancia
function entregaAmb(datosEntrega, socket){
	var iFolioReRa = 0;
	var iFolioSiguiente = 0;
	var jRespuesta = {};
	var indexFolioRera = 0;
	var mQuery = '';
	// Vamos a Obtener FolioRERA
	var rera = {
		iAgrupacion : datosEntrega.ambulancia.idAgrupacion,
		iUnidad : datosEntrega.ambulancia.idUnidad
	};
	getFolioR(rera, function(respuesta){
        console.log("REspuesta de getFolio");
        console.log(respuesta);
		if(respuesta.codigo == 0)
		{
			iFolioReRa = respuesta.folio;
			iFolioSiguiente = respuesta.folioSiguiente;


			/**
		     *  Tabla con registro único
		     *  Descripción: sentencia SQL para almacenamiento de información de la entrega recepción ambulancia
		     *  Apartado Pantalla 1: Entrega Ambulancia.
		     */
		    var hora = datosEntrega.condiciones.entrega.fecha + ' ' + datosEntrega.condiciones.entrega.hora;

		    var tablaAaRERA = 'BEGIN; INSERT INTO public."aa_RERA"("fk_idUnidad", "fk_idAmbulancia", "fechaRERA", "horaRERA", ' +
		    '"folioRERA", "baseAmbulancia", "recibeTum1", "recibeTum2", "entregaTum1", "entregaTum2", "firmaRecibeTum1", "firmaRecibeTum2", "firmaEntregaTum1", "firmaEntregaTum2") ' +
		    'VALUES (' + datosEntrega.ambulancia.idUnidad + "," +
		        datosEntrega.ambulancia.idAmbu + ",'" +
		        datosEntrega.condiciones.entrega.fecha + "','" +
		        hora + "','" +
		        iFolioReRa + "','" +
		        datosEntrega.condiciones.entrega.base + "','" +
		        datosEntrega.condiciones.entrega.recibe1 + "','" +
		        datosEntrega.condiciones.entrega.recibe2 + "','" +
		        datosEntrega.condiciones.entrega.entrega1 + "','" +
		        datosEntrega.condiciones.entrega.entrega2 + "','" +
		        datosEntrega.condiciones.entrega.recibe1Firma + "','" +
		        datosEntrega.condiciones.entrega.recibe2Firma + "','" +
		        datosEntrega.condiciones.entrega.entrega1Firma + "','" +
		        datosEntrega.condiciones.entrega.entrega2Firma + "'" +
		    ')';

            console.log("Vamos a Insertar esto");
           // console.log(tablaAaRERA);

			// Insertamos
			cliente.query(tablaAaRERA, function(error, respIn){
				if(error)
				{
					jRespuesta.codigo = 1;
					jRespuesta.descripcion = 'Error al insertar en aa_RERA ENtra ROllBAck';
                    socket.emit('FIN', jRespuesta);
				}
				else
				{
					if(respIn.rowCount == 1){
						// Buscamos el máximo index en aa_RERA
						cliente.query('select max("id_RERA") from public."aa_RERA"', function(error, resultado){
							var conMax = resultado.rows;
							if(conMax.length > 0)
							{
								indexFolioRera = conMax[0].max;
								console.log("Este es el que dice indefinido: " + iFolioSiguiente);

								var tablaCondU = 'INSERT INTO public."aa_RCondicionesU"("fk_idRERA", "kilometraje", "nivelConbustible", "limpiezaEquipo", "limpiezaInterna", "limpiezaExterna", "aceiteMotor", ' +
							                    '"direccionH", "transmisionA", "aguaLimpiaPara", "anticongelante", "liquidoFrenos", "presionLlantas") ' +
							                    'VALUES (' + indexFolioRera + ",'" +
							                        datosEntrega.condiciones.entrega.kilometraje + "','" +
							                        datosEntrega.condiciones.entrega.nivelGas + "','" +
							                        datosEntrega.condiciones.unidad.limpEquipo + "','" +
							                        datosEntrega.condiciones.unidad.limInterior + "','" +
							                        datosEntrega.condiciones.unidad.limExterior + "','" +
							                        datosEntrega.condiciones.niveles.aceiteMotor + "','" +
							                        datosEntrega.condiciones.niveles.aceiteDirHid + "','" +
							                        datosEntrega.condiciones.niveles.transmision + "','" +
							                        datosEntrega.condiciones.niveles.aguaLimp + "','" +
							                        datosEntrega.condiciones.niveles.anticongelante + "','" +
							                        datosEntrega.condiciones.niveles.liqFrenos + "','" +
							                        datosEntrega.condiciones.niveles.presionLlantas + "'" +
							                    ');';

								var tablaEquipamiento = 'INSERT INTO public."aa_REquipamientoU"("fk_idRERA", "tanqueOxigenoB", "tanqueOxigenoM", "carroCamilla", "colchonCL", ' +
						                            '"camillaPl", "tablaRigida", inmovilizador, "ferulaR", "cantidadFerulaR", "ferulaN", "ferulaT", collarines, "collarinesG", "collarinesM", "collarinesCH", "collarinesP", ' +
						                            '"monitorDesf", "autoEvent", "presenciaLang", laringoscopio, "cincoMil", "cuatroMac", "estucheDiag", oft, ot, "mochilaPR", "glucometroP", "aspiradorS", "tablaReportes", "cantidadFerulaN", "cantidadFerulaT") ' +
						                            'VALUES (' + indexFolioRera + ",'" +
						                                datosEntrega.condiciones.equipamiento.tOxiBase + "','" +
						                                datosEntrega.condiciones.equipamiento.tOxiMovil + "','" +
						                                datosEntrega.condiciones.equipamiento.carCamilla + "','" +
						                                datosEntrega.condiciones.equipamiento.colchon + "','" +
						                                datosEntrega.condiciones.equipamiento.camPlegable + "','" +
						                                datosEntrega.condiciones.equipamiento.tablas + "','" +
						                                datosEntrega.condiciones.equipamiento.inmovilizadorSpider + "','" +
						                                datosEntrega.condiciones.equipamiento.ferulasRig + "','" +
						                                datosEntrega.condiciones.equipamiento.ferulasRigCant + "','" +
						                                datosEntrega.condiciones.equipamiento.ferulasNeu + "','" +
						                                datosEntrega.condiciones.equipamiento.ferulaTrac + "','" +
						                                datosEntrega.condiciones.equipamiento.collarines + "','" +
						                                datosEntrega.condiciones.equipamiento.collarinesCant.grande + "','" +
						                                datosEntrega.condiciones.equipamiento.collarinesCant.mediano + "','" +
						                                datosEntrega.condiciones.equipamiento.collarinesCant.chico + "','" +
						                                datosEntrega.condiciones.equipamiento.collarinesCant.p + "','" +
						                                datosEntrega.condiciones.equipamiento.monDesf + "','" +
						                                datosEntrega.condiciones.equipamiento.autoEvent + "','" +
						                                datosEntrega.condiciones.equipamiento.cMacOpc + "','" +
						                                datosEntrega.condiciones.equipamiento.laringoscopio + "','" +
						                                datosEntrega.condiciones.equipamiento.cMil + "','" +
						                                datosEntrega.condiciones.equipamiento.cMac + "','" +
						                                datosEntrega.condiciones.equipamiento.estucheDiag + "','" +
						                                datosEntrega.condiciones.equipamiento.OFT + "','" +
						                                datosEntrega.condiciones.equipamiento.OT + "','" +
						                                datosEntrega.condiciones.equipamiento.mochilaPrim + "','" +
						                                datosEntrega.condiciones.equipamiento.glucometro + "','" +
						                                datosEntrega.condiciones.equipamiento.aspirador + "','" +
                                                        datosEntrega.condiciones.equipamiento.tablaRep + "','" +
                                                        datosEntrega.condiciones.equipamiento.ferulasNeuCant + "','" +
						                                datosEntrega.condiciones.equipamiento.ferulaTracCant + "'" +
						                            ');';

									 var tablaPresenciaD = 'INSERT INTO "aa_RPresenciaDe"("fk_idRERA", "lucesPrincipales", "lucesDireccionales", "lucesAlto", "lucesReversa", "lucesInterm", "lucesTablero", "lucesInter", "sirena", "torreta", "codigosLatPos", "barraPost", "lamparaMano", "bombaInfusion", "radioNC", "computadoraBam", "convertRegula", "antena", "asientosG", "extinguidor", "gatoC", "llantaRef", ' +'"triangulosRef", "herramientaC", "manijasP", "elevadoresV", "guiaROJI", "guiaSETIQ", "polizaSeg", "tarjetaCir", "bandasM", "observFalt", "reporteFallas") ' +
				                                    'VALUES (' + indexFolioRera + ",'" +
				                                        datosEntrega.funcionamiento.lPrincipales + "','" +
				                                        datosEntrega.funcionamiento.lDireccionales + "','" +
				                                        datosEntrega.funcionamiento.lStop + "','" +
				                                        datosEntrega.funcionamiento.lReversa + "','" +
				                                        datosEntrega.funcionamiento.lIntermitentes + "','" +
				                                        datosEntrega.funcionamiento.lTablero + "','" +
				                                        datosEntrega.funcionamiento.lInteriores + "','" +
				                                        datosEntrega.funcionamiento.sirena + "','" +
				                                        datosEntrega.funcionamiento.torreta + "','" +
				                                        datosEntrega.funcionamiento.codigos + "','" +
				                                        datosEntrega.funcionamiento.barraP + "','" +
				                                        datosEntrega.funcionamiento.lMano + "','" +
				                                        datosEntrega.funcionamiento.bombaInfusion + "','" +
				                                        datosEntrega.funcionamiento.radios + "','" +
				                                        datosEntrega.funcionamiento.BAM + "','" +
				                                        datosEntrega.funcionamiento.convertidor + "','" +
				                                        datosEntrega.funcionamiento.antena + "','" +
				                                        datosEntrega.funcionamiento.asientos + "','" +
				                                        datosEntrega.funcionamiento.extinguidor + "','" +
				                                        datosEntrega.funcionamiento.gatoC + "','" +
				                                        datosEntrega.funcionamiento.llantaRef + "','" +
				                                        datosEntrega.funcionamiento.tReflejantes + "','" +
				                                        datosEntrega.funcionamiento.herrCompleta + "','" +
				                                        datosEntrega.funcionamiento.manijasP + "','" +
				                                        datosEntrega.funcionamiento.elevadores + "','" +
				                                        datosEntrega.funcionamiento.gRoji + "','" +
				                                        datosEntrega.funcionamiento.gSETIQ + "','" +
				                                        datosEntrega.funcionamiento.polizaSeg + "','" +
				                                        datosEntrega.funcionamiento.tarCirculacion + "','" +
				                                        datosEntrega.funcionamiento.bandasMot +  "','" +
				                                        datosEntrega.funcionamiento.observaciones +  "','" +
				                                        datosEntrega.funcionamiento.reporteFallas + "'" +
				                                    ');';

									var tablaMaletinSensores = 'INSERT INTO "aa_RMaletinSensores"("fk_idRERA", "sensorECG", "sensorTMP", "sensorTAR", "sensorOXI", "sensorCAP", "sensorMonitorF", ' +
		                                            '"cableECG", "sondaTMP", "bandaBN", "bandaBI", "bandaBA", "bandaBAG", "puntaMF", "cableOxA", "cableOxI", "cableEnergia") ' +
		                                            'VALUES (' + indexFolioRera + ",'" +
		                                                datosEntrega.maletin.sensores.ecg + "','" +
		                                                datosEntrega.maletin.sensores.tmp + "','" +
		                                                datosEntrega.maletin.sensores.ta + "','" +
		                                                datosEntrega.maletin.sensores.oxi + "','" +
		                                                datosEntrega.maletin.sensores.cap + "','" +
		                                                datosEntrega.maletin.sensores.mon + "','" +
		                                                datosEntrega.maletin.bolsa.cegc + "','" +
		                                                datosEntrega.maletin.bolsa.sondaTmp + "','" +
		                                                datosEntrega.maletin.bolsa.bandaNeonato + "','" +
		                                                datosEntrega.maletin.bolsa.bandaInfantil + "','" +
		                                                datosEntrega.maletin.bolsa.bandaAdulto + "','" +
		                                                datosEntrega.maletin.bolsa.bandaAdultoG + "','" +
		                                                datosEntrega.maletin.bolsa.puntaMon + "','" +
		                                                datosEntrega.maletin.bolsa.cOxiAdulto + "','" +
		                                                datosEntrega.maletin.bolsa.cOxiInfantil + "','" +
		                                                datosEntrega.maletin.bolsa.cEnergia +  "'" +
		                                            ');';

                                    var fSalida = datosEntrega.maletin.mantenimiento.fechaSalida.length > 5 ? datosEntrega.maletin.mantenimiento.fechaSalida:'2016-01-01 00:00:00';
                                    var fEntrada = datosEntrega.maletin.mantenimiento.fechaEntrada.length > 5 ? datosEntrega.maletin.mantenimiento.fechaEntrada:'2016-01-01 00:00:00';
									var tablaMantenimiento = 'INSERT INTO "aa_RMantenimientoP"("fk_idRERA", "fechaMant1", "kilometrajeMant1", "tallerMant1", "descMant1", "fechaMant2", ' +
                                                '"kilometrajeMant2", "tallerMant2", "descMant2") ' +
                                                'VALUES (' + indexFolioRera + ",'" +
                                                    fSalida + "','" +               //datosEntrega.maletin.mantenimiento.fechaSalida + "','" +
                                                    datosEntrega.maletin.mantenimiento.kmSalida + "','" +
                                                    datosEntrega.maletin.mantenimiento.tallerSalida + "','" +
                                                    datosEntrega.maletin.mantenimiento.descSalida + "','" +
                                                    fEntrada + "','" +               //datosEntrega.maletin.mantenimiento.fechaEntrada + "','" +
                                                    datosEntrega.maletin.mantenimiento.kmEntrada + "','" +
                                                    datosEntrega.maletin.mantenimiento.tallerEntrada + "','" +
                                                    datosEntrega.maletin.mantenimiento.descEntrada +  "'" +
                                                ');';

									var updateKm = 'UPDATE public."aa_CRUM" SET "kilometraje" = ' +
                                                    datosEntrega.condiciones.entrega.kilometraje + ' WHERE "numeroSerie" like \'' + datosEntrega.ambulancia.nitro + '\';';

                                  	var updateFolios = 'UPDATE public."cs_Unidades" SET "folioRERA" = ' +
                                                        iFolioSiguiente + ' WHERE "idUnidades" =' + datosEntrega.ambulancia.idUnidad + ';';

                                    // Generación del Query Transaccional
                                    mQuery = ' ' + tablaCondU + ' ' + tablaEquipamiento + ' ' + tablaPresenciaD + ' ' +
                                    	      tablaMaletinSensores + ' ' + tablaMantenimiento + ' ' + updateKm + ' ' + updateFolios +
                                    	      ' COMMIT; END;';
                                    console.log(mQuery);

                                     cliente.query(mQuery, function(error, respuesta){
                                        if(error)
                                        {
                                            jRespuesta.codigo = 2;
                                            jRespuesta.descripcion = "Hubo error al generar Kraken Procede Rollback";
                                            socket.emit('FIN', jRespuesta);
                                        }
                                        else
                                        {
                                            console.log("Salimos del Query Kraken");
                                            console.log(respuesta);
                                            jRespuesta.codigo = 0;
                                            jRespuesta.descripcion = 'Release the Kraken......';

                                            socket.emit('FIN', jRespuesta);
                                        }
                                     }); // Query Transaccional
							}
							else
							{
								jRespuesta.codigo = 1;
								jRespuesta.descripcion = 'Error al obtener el máximo en aa_RERA';
                                socket.emit('FIN', jRespuesta);
							}
						}); //cliente.Query Max
					}
					else
					{
						jRespuesta.codigo = 2;
						jRespuesta.descripcion = 'Error No Realizó el Insert en aa_RERA';
                        socket.emit('FIN', jRespuesta);
					}
				}
			});	// Query Insert
		}
		else
		{
			jRespuesta.codigo = -1;
			jRespuesta.descripcion = 'Hubo Un error al extraer Folio REra y se suspendió guardado de datos';
            socket.emit('FIN', jRespuesta);
		}
	});
	// Iniciamos con el primer Insert
}

//Función que realiza la consulta si el número de ambulancia recibido, tiene un servicio asignado.
function consultaServicio (datos, socket, callback){
   var num_amb = datos.idConfig;
   console.log(num_amb);
   //Variables que estructuran el Json que es enviado a la tablet
   var resultado = {};
   var codigo_con ;
   var descr_con;
   var idFrap;

   //Variables para la consulta de la fecha de los insumos.
   var informacion = {};

   //Se realiza la consulta a la base de datos de los hospitales que estan activos en el SITCRUM
    buscaHospitales(datos.fechaActHospitales, socket);

    // Se realiza la consulta a la base de datos de los paramedicos de CRUM
    buscaParamedicos(datos.fechaActTums, socket);

//   setTimeout(function(){

    //Consulta a la base de datos acerca del servicio que tiene activo la idNitro - ambulancia
   cliente.query('SELECT * from public."fp_Activos" WHERE "numSerieNitro" like \'' + num_amb+'\' ORDER BY "idFA"' , function(error, result){
               //done();
               //Si hubo algún error al realizar la consulta...
               if(error){
                   codigo_con = 2;
                   resultado = {
                       "codigo" : codigo_con,
                       "descripcion" : "Error al realizar la consulta. Intentalo nuevamente."
                   }
                   //   socket.emit('reserv', resultado);
                   console.error(error.stack);
                   callback(resultado);
                   return console.error('Error al hacer la consulta', error);
               }

               var consulta = result.rows;
               console.log('Esto trae la consulta del servicio......' + consulta);

               //La ambulancia tiene servicio asignado
               if(consulta.length > 0){
                   console.log('La ambulancia si tiene un servicio, se debe de validar que sea el último registro que se tiene en la base de datos');

                   var tamConsulta = consulta.length;
                   codigo_con = 1;
                   descr_con = consulta[tamConsulta-1];
                   resultado = {
                       "codigo" : codigo_con ,
                       "descripcion" : descr_con
                   }
                   console.log(descr_con);
                   //  Se envían los datos al socket que recibió esa petición.....
                   //  socket.emit('reserv', resultado);
                   callback(resultado);

                   idFrap = consulta[tamConsulta-1].idFrap;
                   //  Se debe de verificar, si es que ya existe en el arreglo de las conexiones de la nitro
                   buscaConexionFrap(idFrap, function(respuesta){
                       if(respuesta === 'noExiste'){
                           console.log('Se agrega a arreglo de Nitro.......');
                           global.conexionesNitro.push({conexionId : socket.id, conexion: socket, idFrap : idFrap});
                           console.log('Tamaño arreglo..... ' + global.conexionesNitro.length);
                       }
                   });

                   //   Se envian datos a consulta para validar la fecha de la última actualización de los insumos médicos
                   informacion = {
                       fechaAct : datos.fechaActInsumos,
                       idAgrupacion : consulta[tamConsulta-1].idAgrupacion,
                       idAmbulancia : consulta[tamConsulta-1].idAmbulancia,
                       idUnidad : consulta[tamConsulta-1].idUnidad,
                   };
                   buscaInsumos(informacion, socket);
               }else{  //La ambulancia, no cuenta con servicio asignado
                   console.log('La ambulancia no tiene servicio');
                   codigo_con = 0;
                   descr_con = "No tiene ningún servicio asignado por el momento";
                   resultado = {
                       "codigo" : codigo_con,
                       "descripcion" : descr_con
                   }
                  //    socket.emit('reserv', resultado);
                  callback(resultado);
               }

               //console.log('Valor de resultado ' + resultado);
               //console.log(result.rows);
           }

       );

//   }, 28000)

};

//Función que se ejecuta cada 10 minutos generando una consulta a la base de datos, para evitar que se cierre la conexión,
//ya que despues de cierto tiempo de inactividad, se cierran las conexiones.
function tiempo_conexion(){
 if(cliente){
   cliente.query('SELECT NOW() AS "theTime"', function(err, result){
       if(err){

           console.error('Error al ejecutar el query de tiempo_conexion');
           conectaPostgre();   //   Se llama a función conectaPostgre, para que se realice la conexión nuevamente a BD
           return;
       }
       console.log(result.rows[0].theTime);
       //cliente.end();
   });
 }
}
/*
   funcion para el acceso de usuarios al sistema.
*/
function validaUsuario(user,pass,callback)
{
   var query="select "+
                   "count(*) as \"user\""+
               "from \"ap_DatosPersonales\""+
               "inner join \"cs_MenuPerUser\" on \"idAdmonPers\"=\"fk_idUser\""+
               "inner join \"cs_MenuParam\" on \"idMenuParam\"=\"fk_idMenuParam\""+
               "where \"nomOpcMenu\"='Monitor Signos Vitales'"+
               "and \"usuario\"='"+user+"'"+
               "and \"password\"='"+pass+"'";

   cliente.query(query,callback);
}
/*
    funcion que valida el acceso al visor del historial de un frap por medio de
    del id del usuario.
*/
function validaIngresoMonitorHistorial(user,callback){
    var query="select "+
                    "count(*) as \"user\" "+
                "from \"cs_MenuPerUser\" "+
                "inner join \"cs_MenuParam\" on \"idMenuParam\"=\"fk_idMenuParam\" "+
                "inner join \"ap_DatosPersonales\" on \"idAdmonPers\"=\"fk_idUser\" "+
                "where \"nomOpcMenu\"='Monitor Signos Vitales' "+
                "and \"usuario\"="+"'"+user+"'";

    cliente.query(query,callback);
}

/**
* Descripción: Función que gestiona el cierre del FRAP
* Parametros de entrada:
*      variable datos <-- contiene un JSON con toda la información capturada en la ambulancia de Frap
*          estructura de JSON : datos {
*              idFrap : #,
*              datosServicio : {},
*              consulta : {}
*          }
*      donde idFrap es el # de FRAP que quiere cerrarse
*      datosServicio, contiene la información de la ambulancia y del servicio activo
*      consulta, trae toda la información capturada en la ambulancia.
*      variable socket <-- trae la conexión la cual hizo la petición del cierre
* Parametros de salida:
*      evento socket emit :    Para notificar si se hizo o no correctamente el cierre del Frap
*/
function cierreFrap(datos,socket, callback) {

   //Variable que almacenara el QUERY final para realizar el cierre del FRAP
   var megaQuery;

   //Variables que administraran la respuesta que se enviara a ambulancia que gestionó el cierre de Frap
   var respuesta = {};
   var codigo ;
   var descripcion;

   cliente.query('SELECT "idFrap", "numAmbulancia", "numSerieNitro", "folioServ", "idAgrupacion", "idUnidad", "idAmbulancia" FROM public."fp_Activos" WHERE "folioFrap" = \'' + datos.datosServicio.folioFrap + '\';', function(error, resultado){

       if(error){
           console.log('Error al consultar la información de la ambulancia... :S ');
           //   Se envia mensaje a la conexión que envió la información del folio de Frap, de que existió un error en la consulta
           respuesta = {
               "codigo" : 3,
               "folioFrap" : datos.datosServicio.folioFrap,
               "descripcion" :  "Error en la consulta de folioFrap"
           }
           //   socket.emit('errorCierreFrap', respuesta);
           callback(respuesta);
       }

       var respConsulta = resultado.rows;

       if(respConsulta.length > 0){
           console.log('Si trae datos la información de la ambulancia.... :D....');
           //   Se continua con el proceso de cierre....
           /**
            * Creación de sentencias para la insercción de datos de FRAP enviados desde la NITRO
            */

            /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_DatosPaciente
             *  Se valida que el campo de tipoSeguro venga con un valor diferente a -Selecciona Uno-
             *  En caso de que venga con ese valor, se manda una cadena vacía
             *  Parámetro de entrada: json, con los datos de paciente
             *  Parámetro de salida: callback, con la respuesta de la función, sql = " " si los campos están vacios, sql = "INSERT..."
             *  si los campos tienen información
             */
            var tablaDatosP = function(jsonDatosPrincipales, callback){

                var tipoSeg, sql, valSexo;

                if(jsonDatosPrincipales.tipoSeguro == '-Selecciona Uno-'){
                    tipoSeg = '';
                } else {
                    tipoSeg = jsonDatosPrincipales.tipoSeguro;
                }
                 valSexo = jsonDatosPrincipales.sexo == '-Selecciona Uno-' ? ' ' : jsonDatosPrincipales.sexo;

                sql = ' INSERT INTO public."fp_DatosPaciente"("fk_idFrap", "nombrePac", "domicilioPac", "estadoCiudad", "sexoPac", "edadPac", "pesoPac", "tipoSeguro", "noAfiliacion", "telPaciente") ' +
                'VALUES (' + respConsulta[0].idFrap + ",'" + jsonDatosPrincipales.nombre + "','" + jsonDatosPrincipales.domicilio + "','" + jsonDatosPrincipales.ciudad + "','" +
                valSexo + "','" + jsonDatosPrincipales.edad + "','" + jsonDatosPrincipales.peso + "','" + tipoSeg + "','" +
                jsonDatosPrincipales.numAfiliacion + "','" + jsonDatosPrincipales.telefono +"');";

                callback(sql);

            };

            /**
             *  Tabla con registro unico
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_AyudaSoporteB
             */
            var tablaAyudaSB = ' INSERT INTO public."fp_AyudaSoporteB"("fk_idFrap", "S", "OPN", "OM", "RCP", "V", "AC", "IC", "AP", "VA", "CO", "VBVM", otro, "otroDesc") ' +
            'VALUES (' + respConsulta[0].idFrap + ',' + datos.consulta.Ayuda.soporteBasic.S + ',' + datos.consulta.Ayuda.soporteBasic.OPN + ',' + datos.consulta.Ayuda.soporteBasic.OM + ',' + datos.consulta.Ayuda.soporteBasic.RCP + ',' +
            datos.consulta.Ayuda.soporteBasic.V + ',' + datos.consulta.Ayuda.soporteBasic.AC + ',' + datos.consulta.Ayuda.soporteBasic.IC + ',' + datos.consulta.Ayuda.soporteBasic.AP + ',' + datos.consulta.Ayuda.soporteBasic.VA + ',' +
            datos.consulta.Ayuda.soporteBasic.CO + ',' + datos.consulta.Ayuda.soporteBasic.VBVM + ',' + datos.consulta.Ayuda.soporteBasic.otro + ",'" + datos.consulta.Ayuda.soporteBasic.otroDesc + "');";

            /**
             *  Tabla con registro unico
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_AyudaSoporteA
             */
            var tablaAyudaSA = ' INSERT INTO public."fp_AyudaSoporteA"("fk_idFrap", "IE", "ML", "OVAA", "ET", "D", "TIV", "AM", "AI", "AVC", "V", "DT", "P", otro, "otroDesc", observaciones) ' +
            'VALUES (' + respConsulta[0].idFrap + ',' + datos.consulta.Ayuda.soporteAvanzado.IE + ',' + datos.consulta.Ayuda.soporteAvanzado.ML + ',' + datos.consulta.Ayuda.soporteAvanzado.OVAA + ',' + datos.consulta.Ayuda.soporteAvanzado.ET + ',' +
            datos.consulta.Ayuda.soporteAvanzado.D + ',' + datos.consulta.Ayuda.soporteAvanzado.TIV + ',' + datos.consulta.Ayuda.soporteAvanzado.AM + ',' + datos.consulta.Ayuda.soporteAvanzado.AI + ',' + datos.consulta.Ayuda.soporteAvanzado.AVC + ',' +
            datos.consulta.Ayuda.soporteAvanzado.V + ',' + datos.consulta.Ayuda.soporteAvanzado.DT + ',' + datos.consulta.Ayuda.soporteAvanzado.P + ',' + datos.consulta.Ayuda.soporteAvanzado.otro + ",'" + datos.consulta.Ayuda.soporteAvanzado.otroDesc + "','" +
            datos.consulta.Ayuda.observaciones + "');";

            /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_ParoCardiaco
             *  Se deberá de validar que todos los campos tengan valor, de lo contrario, no se generará script.
             *  Parámetro de entrada: json, con los datos de paro cardiaco
             *  Parámetro de salida: callback, con la respuesta de la función, sql = " " si los campos están vacios, sql = "INSERT..."
             *  si los campos tienen información
             */
            var tablaParoCardiaco = function(jsonParoCardiaco, callback){
                var sql = ' ';
                if(jsonParoCardiaco.horaColapso == '.'){
                    console.log('No envió datos de paro cardiaco... no se generá script');
                    callback(sql);
                } else {
                    console.log('Si tiene datos, se genera script......');
                    sql = ' INSERT INTO public."fp_ParoCardiaco"("fk_idFrap", "horaColapso", "rcpPrimerResp", "horaInicioRCP", "primerRitIdent", "numIntentosDesfib", "horaPrimerDesc", joules, estado) ' +
                    'VALUES (' + respConsulta[0].idFrap + ",'" + jsonParoCardiaco.horaColapso + "','" + jsonParoCardiaco.rcpPrimerResp + "','" + jsonParoCardiaco.horaInicioRCP + "','" + jsonParoCardiaco.primerRitIdent + "','" +
                    jsonParoCardiaco.numIntentosDesfib + "','" + jsonParoCardiaco.horaPrimerDesc + "','" + jsonParoCardiaco.joules + "','" + jsonParoCardiaco.estado + "');";
                    callback(sql);
                }
            };

            /**
             *  Tabla con registro unico
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_Sintomas
             *  Se debera de validar que todos los campos tengan valor, de lo contrario, se almacenara como valor 0.
             *  Parametro de entrada: json, con los datos de sintomas
             *  Parametro de salida: callback, con la respuesta de la función, sql = " " si los campos estan vacios, sql = "INSERT..."
             *  si los campos tienen información
             */
            var tablaSintomas = function (jsonSintomas, callback) {
                var sql = ' ';
                var valorDolor, sangrado, pupilas, izquierda, derecha, respiracion, temperaturaP, humedad, color;
                if(jsonSintomas.dolor == '-Selecciona Uno-'){
                    //console.log('No seleccionó dolor.... se le da estado de 0....');
                    valorDolor = 0;
                } else {
                    //console.log('Selecciono un valor de dolor.... se le deja su mismo valor.....');
                    valorDolor = jsonSintomas.dolor;
                }

                if(jsonSintomas.sangrado == '-Selecciona Uno-'){
                    //console.log('No selecciono sangrado.... se le da estado de no....');
                    sangrado = '';
                } else {
                    //console.log('Selecciono un valor de sangrado.... se le deja su mismo valor.....');
                    sangrado = jsonSintomas.sangrado;
                }

                if(jsonSintomas.pupilas == '-Selecciona Uno-'){
                    //console.log('No selecciono pupilas.... se le da estado de no....');
                    pupilas = 0;
                } else {
                    //console.log('Seleccionó un valor de pupilas.... se le deja su mismo valor.....');
                    pupilas = jsonSintomas.pupilas;
                }

                if(jsonSintomas.izquierda == '-Selecciona Uno-'){
                    //console.log('No seleccionó pupila izquierda.... se le da estado de 0....');
                    izquierda = 0;
                } else {
                    //console.log('Seleccionó un valor de pupila izquierda.... se le deja su mismo valor.....');
                    izquierda = jsonSintomas.izquierda;
                }

                if(jsonSintomas.derecha == '-Selecciona Uno-'){
                    //console.log('No seleccionó derecha.... se le da estado de 0....');
                    derecha = 0;
                } else {
                    //console.log('Seleccionó un valor de derecha.... se le deja su mismo valor.....');
                    derecha = jsonSintomas.derecha;
                }

                if(jsonSintomas.respiracion == '-Selecciona Uno-'){
                    //console.log('No seleccionó respiracion.... se le da estado de 0....');
                    respiracion = 0;
                } else {
                    //console.log('Seleccionó un valor de respiracion.... se le deja su mismo valor.....');
                    respiracion = jsonSintomas.respiracion;
                }

                if(jsonSintomas.severidad == '-Selecciona Uno-'){
                    //console.log('No seleccionó severidad.... se le da estado de 0....');
                    severidad = 0;
                } else {
                    //console.log('Seleccionó un valor de severidad.... se le deja su mismo valor.....');
                    severidad = jsonSintomas.severidad;
                }

                if(jsonSintomas.tempPiel == '-Selecciona Uno-'){
                    //console.log('No seleccionó temperaturaP.... se le da estado de 0....');
                    temperaturaP = 0;
                } else {
                    //console.log('Seleccionó un valor de temperaturaP.... se le deja su mismo valor.....');
                    temperaturaP = jsonSintomas.tempPiel;
                }

                if(jsonSintomas.humedad == '-Selecciona Uno-'){
                    //console.log('No seleccionó humedad.... se le da estado de 0....');
                    humedad = 0;
                } else {
                    //console.log('Seleccionó un valor de humedad.... se le deja su mismo valor.....');
                    humedad = jsonSintomas.humedad;
                }

                if(jsonSintomas.color == '-Selecciona Uno-'){
                    //console.log('No seleccionó color de piel.... se le da estado de 0....');
                    color = 0;
                } else {
                    //console.log('Seleccionó un valor de color.... se le deja su mismo valor.....');
                    color = jsonSintomas.color;
                }

                sql = ' INSERT INTO public."fp_Sintomas"("fk_idFrap", sangrado, dolor, temperatura, pupilas, izquierda, derecha, respiracion, severidad, "llenadoCapilar", "fCFetal", "tempPiel", "humPiel", "colorPiel", "nivelConsciencia") ' +
                'VALUES (' + respConsulta[0].idFrap + ",'" + sangrado + "'," + valorDolor + ",'" + jsonSintomas.temperatura + "','" +
                pupilas + "','" + izquierda + "','" +	derecha + "','" + respiracion + "','" + severidad + "','" +
                jsonSintomas.llenadoCapilar + "','" + jsonSintomas.frecuenciaCF + "','" + temperaturaP + "','" + humedad + "','" + color +  "','" + jsonSintomas.nivConsiencia + "');";

                callback(sql);

            };

            /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_SintomasPri
             *  Se debera de validar que todos los campos tengan valor, de lo contrario, no se generara script.
             *  Nota: por un campo que traiga un valor, se generara el script
             *  Parametro de entrada: json, con los datos de sintomas (sample)
             *  Parametro de salida: callback, con la respuesta de la función, sql = " " si los campos estan vacios, sql = "INSERT..."
             *  si los campos tienen información
             */
            var tablaSintomasPri = function (jsonSintomasPri, callback) {
                var tamS = jsonSintomasPri.S.length;
                var tamA = jsonSintomasPri.A.length;
                var tamM = jsonSintomasPri.M.length;
                var tamP = jsonSintomasPri.P.length;
                var tamE = jsonSintomasPri.E.length;
                var SQL = ' ';

                if(tamS > 1){
                    //console.log('S es mayor a 1... se genera script....');
                    scriptSample(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tamA > 1){
                    //console.log('A es mayor a 1... se genera script....');
                    scriptSample(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tamM > 1){
                    //console.log('M es mayor a 1... se genera script....');
                    scriptSample(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tamP > 1){
                    //console.log('S es mayor a 1... se genera script....');
                    scriptSample(function(respuesta){
                        callback(respuesta);
                    });
                } else if(jsonSintomasPri.L != '-Selecciona Uno-'){
                    //console.log('L si tiene un valor... se genera script....');
                    scriptSample(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tamE > 1){
                    //console.log('E es mayor a 1... se genera script....');
                    scriptSample(function(respuesta){
                        callback(respuesta);
                    });
                } else {
                    //console.log('Ningún campo trae datos.... no se genera script..............');
                    return callback(SQL);
                }

                //Función que realiza el script para insertar en la base de datos, una vez que ha sido encontrado un valor
                function scriptSample(callback){
                    var l;
                    if(jsonSintomasPri.L == '-Selecciona Uno-'){
                        l = ' ';
                    } else {
                        l = jsonSintomasPri.L;
                    }

                    SQL = ' INSERT INTO public."fp_SintomasPri"("fk_idFrap", s, a, m, p, l, e) ' +
                    'VALUES (' + respConsulta[0].idFrap + ",'" + jsonSintomasPri.S + "','" + jsonSintomasPri.A + "','" + jsonSintomasPri.M + "','" + jsonSintomasPri.P + "','" +
                    l + "','" + jsonSintomasPri.E + "');";
                    return callback(SQL);
                }

            };

            /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_AyudaCuidadosB
             *  Se valida que venga el dato de posición del paciente, en caso de venir como -Selecciona Uno-, se manda un campo vacios
             *  Parametro de entrada: json, con los la información de Ayuda Proporcionada: (Cuidados Basicos)
             *  Parametro de salida: callback, con la respuesta de la función, ya con el insert estructurado
             */
            var tablaAyudaCB = function(jsonAyudaCB, callback){
                var sql = ' ';
                //Validación de posición del paciente en cuidados basicos
                var posicionPac;
                if(jsonAyudaCB.posicion == '-Selecciona Uno-'){
                    //console.log('No hay una posicion para el paciente seleccionada..... se modifica campo');
                    posicionPac = '';
                } else {
                    //console.log('Si seleccionaron una posición...... se mantiene el valor.....');
                    posicionPac = jsonAyudaCB.posicion;
                }

                sql = ' INSERT INTO public."fp_AyudaCuidadosB"("fk_idFrap", "V", "CF", "T", "AP", "CH", "ST", "MSV", "P", posicion, otro, "otroDesc") ' +
                'VALUES (' + respConsulta[0].idFrap + ',' + jsonAyudaCB.V + ',' + jsonAyudaCB.CF + ',' + jsonAyudaCB.T + ',' + jsonAyudaCB.AP + ',' +
                jsonAyudaCB.CH + ',' + jsonAyudaCB.ST + ',' + jsonAyudaCB.MSV + ',' + jsonAyudaCB.P + ",'" + posicionPac + "'," +
                jsonAyudaCB.otro + ",'" + jsonAyudaCB.otroDesc + "');";

                return callback(sql);
            };
              /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_Lesion
             *  Se valida que los campos causa y enfermedad, vengan seleccionados, en caso de que ninguno de los dos muestre un estatus
             *  de -Selecciona Uno-, no se generara el script. En caso de que alguno venga seleccionado, se realiza escript.
             *  Parametro de entrada: json, con los la información de Lesiones
             *  Parametro de salida: callback, con la respuesta de la función, ya con el insert estructurado o campo vacio
             */
            var tablaLesion = function(lesiones, callback){
                //Validaciones de pantalla de Lesiones....
                var causaLesion, enfermedad;
                var sql = ' ';
                if(lesiones.causa == '-Selecciona Uno-'){
                    //console.log('No seleccionó nada en causa de Lesiones.... se iguala a vacio....');
                    causaLesion = '';

                    if(lesiones.enfermedad == '-Selecciona Uno-'){
                        //console.log('Tampoco seleccionó enfermedad.... no se debe de generar script');
                        enfermedad = '';
                        return callback(sql);

                    } else {
                        enfermedad = lesiones.enfermedad;
                        //console.log('Se genera script sólo con el valor de enfermedad.....');
                        sql = ' INSERT INTO public."fp_Lesion"("fk_idFrap", "causaProbable", enfermedad) ' +
                            'VALUES ( ' + respConsulta[0].idFrap + ",'" + causaLesion + "','" + enfermedad + "');";
                        return callback(sql);
                    }

                } else {
                    //console.log('Si seleccionó una causa... se deja el valor que trae.....');
                    causaLesion = lesiones.causa;

                    if(lesiones.enfermedad == '-Selecciona Uno-'){
                        enfermedad = '';
                        //console.log('Quiere decir que no seleccionó enfermedad... se genera script solo con causaLesion');
                        sql =  sql = ' INSERT INTO public."fp_Lesion"("fk_idFrap", "causaProbable", enfermedad) ' +
                            'VALUES ( ' + respConsulta[0].idFrap + ",'" + causaLesion + "','" + enfermedad + "');";
                        return callback(sql);
                    } else {
                        enfermedad = lesiones.enfermedad;
                        //console.log('Quiere decir que seleccionó enfermedad como causa... se genera script.....');
                        sql =  sql = ' INSERT INTO public."fp_Lesion"("fk_idFrap", "causaProbable", enfermedad) ' +
                            'VALUES ( ' + respConsulta[0].idFrap + ",'" + causaLesion + "','" + enfermedad + "');";
                        return callback(sql);
                    }

                }
            };

            /**
             *  Actualización de tabla utilizada por SITCRUM
             *  Descripción: sentencia SQL para la actualización de información de Frap en fp_Arribos
             */
            var fecha = new Date();
            //var fechaC = ''+fecha.getFullYear()+'-'+fecha.getMonth()+'-'+fecha.getDay()+'';
            // se cambian funciones para obtener mes y día numérico correpondiente
            /*
            var mes = parseInt(fecha.getMonth()) + 1;
            var dia = fecha.getDate();
            mes = mes < 10 ? '0'+ mes:mes;
            dia = dia < 10 ? '0'+ dia:dia;
            var fechaC = '' + fecha.getFullYear() + '-' + mes + '-' + dia +'';
            */
            var UtablaArribos = ' UPDATE public."fp_Arribos" ' +
            'SET "odometroIni" = ' + datos.consulta.Principal.dataAmbulancia.oInicial + ',' +
                '"odometroFin" = ' + datos.consulta.Principal.dataAmbulancia.oFinal + ',' +
                '"kilometrosRec" = ' + datos.consulta.Principal.dataAmbulancia.kmRecorridos + ' ' +
            'WHERE "fk_idFrap" = ' + respConsulta[0].idFrap + ';';

            /**
             *  Actualización de tabla utilizada por SITCRUM
             *  Descripción: sentencia SQL para la actualización de información de Frap y liberación de ambulancia en tabla aa_CRUM
             */
            var UtablaAaCrum = ' UPDATE public."aa_CRUM" ' +
            'SET "estatusAmb" = ' + 0 + ' ' +
            'WHERE "fk_idAgrupacion" = ' + respConsulta[0].idAgrupacion + ' AND "fk_idUnidad" = ' + respConsulta[0].idUnidad + ' AND "numero" ' + " = '" + respConsulta[0].numAmbulancia + "';";

            /**
             *  Actualización de tabla utilizada por SITCRUM
             *  Descripción: sentencia SQL para la actualización de información capturada en FRAP en tabla bs_RadioOperador
             *  Realiza el cierre del servicio
             */
            /*var UtablaRadioOperador = ' UPDATE public."bs_RadioOperador" ' +
            'SET "estatusServ" = ' + 0 + ' ' +
            'WHERE "folioFRAP"' + "='" + datos.datosServicio.folioFrap + "'" + ' AND "folioServ"' + "='" + respConsulta[0].folioServ +"';";*/

            /**
             *  Tablas con registros únicos
             *  Descripción: en esta función, se generaran scripts, de acuerdo a los parametros de entrada que son recibidos
             *  Se generara el escript para la tabla trasladadoA, en caso de en el frap, haya sido seleccionada esta opción,
             *  De lo contrario, se validara si hay un campo seleccionado en la negativa de traslado - transportado...
             *  En caso de que ninguno de los campos sea seleccionado, sólo se generara el script para la actualización de bs_Despachador
             * Función que generara en función a los parametros recibidos, los scripts de negativa o traslado
             */
            var validaNegTras = function(datosTraslado, datosNegativa, callback){
                //console.log('..... entro a la función de validación de Negativa o traslado.....');
                //console.log(datosTraslado);
                //console.log(datosNegativa);
                var sexoPaciente;
                var SQL = ' ';

                if(datos.consulta.Principal.dataPaciente == 'Femenino'){
                    sexoPaciente = 'Fem';
                } else {
                    sexoPaciente = 'Mas';
                }

                if(datosTraslado.Traslado.hospital == '-Selecciona Uno-'){
                    //console.log('Ningún campo fue seleccionado de Traslado a Hospital.... ');

                    if(datosNegativa.razon != '-Selecciona Uno-'){
                        //console.log('Quiere decir que llenaron la hoja de Negativa a traslado... se genera script de negativa....');

                        /**
                         *  Tabla con registro único
                         *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_NegativaTrans
                         */
                        SQL = ' INSERT INTO public."fp_NegativaTrans"("fk_idFrap", razon, fecha, hora, "firmaP", "negativaFirma", "nomRespPac", "firmaRespPac", "nomTest1", "firmaTest1", "nomTest2", "firmaTest2") ' +
                        'VALUES (' + respConsulta[0].idFrap + ",'" + datos.consulta.Negativa.razon + "','" + datos.consulta.Negativa.fecha + "','" + datos.consulta.Negativa.hora + "','" + datos.consulta.Negativa.nfPaciente + "','" + datos.consulta.Negativa.negativaFirma + "','" +
                        datos.consulta.Negativa.nomResponsable + "','" + datos.consulta.Negativa.nfResponsable + "','" + datos.consulta.Negativa.nomTestigo1 + "','" + datos.consulta.Negativa.nfTestigo1 + "','" +	datos.consulta.Negativa.nomTestigo2 + "','" +
                        datos.consulta.Negativa.nfTestigo2 + "');";

                        var updateTraslado = "";

                        if(datosNegativa.razon == 'Transportado'){
                            var noTranslado = "El paciente se negó a ser trasladado";
                            updateTraslado = ',"causaNoTranslado"' + "='" + noTranslado + "' ";

                        }

                        var uTablaDespachador = ' UPDATE public."bs_Despachador" ' +
                        'SET "nomPac"' + "='" + datos.consulta.Principal.dataPaciente.nombre + "'," +
                        'edad='+ datos.consulta.Principal.dataPaciente.edad + ',' +
                        "sexo='" + sexoPaciente + "'," +
                        '"telPaciente"' + "='" + datos.consulta.Principal.dataPaciente.telefono + "', " +
                        'transladado=' + 0 + ' ' + updateTraslado +
                        'WHERE "fk_idServ"=(SELECT "idServicio" FROM "bs_RadioOperador" WHERE "folioServ"' + "='" + respConsulta[0].folioServ + "' AND \"folioFRAP\" = '" + datos.datosServicio.folioFrap  + "');";
                        SQL = SQL + uTablaDespachador;

                        return callback(SQL);

                    } else {
                        console.log('Tampoco se seleccionó otro campo en traslado...., no se genera ningún script.....');
                        console.log('Que se hace aquí????.....');

                        var uTablaDespachador = ' UPDATE public."bs_Despachador" ' +
                            'SET "nomPac"' + "='" + datos.consulta.Principal.dataPaciente.nombre + "'," +
                                'edad='+ datos.consulta.Principal.dataPaciente.edad + ',' +
                                "sexo='" + sexoPaciente + "'," +
                                '"telPaciente"' + "='" + datos.consulta.Principal.dataPaciente.telefono + "' " +
                            'WHERE "fk_idServ"=(SELECT "idServicio" FROM "bs_RadioOperador" WHERE "folioServ"' + "='" + respConsulta[0].folioServ + "' AND \"folioFRAP\" = '" + datos.datosServicio.folioFrap  + "');";

                        return callback(uTablaDespachador);
                    }


                } else {
                    console.log('Se seleccionó un campo en hospitales, por lo tanto si fue trasladado... se genera script d trasladadoA....');

                    var noTranslado = " ";
                    var hospitalTraslado = "";
                    var hospitalF = "";

                    if(datosTraslado.Traslado.hospital == 'Otro'){

                        hospitalF = datosTraslado.Traslado.otroHospital;

                        hospitalTraslado = ', "otroHospTraslado"' + "='" + datosTraslado.Traslado.otroHospital + "', " +
                        '"hospTranslado"' + "='" + "' " ;

                    } else {
                        hospitalF = datosTraslado.Traslado.hospital;
                        hospitalTraslado = ', "hospTranslado"' + "='" + datosTraslado.Traslado.hospital + "' "

                    }

                    /**
                     *  Tabla con registro único
                     *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_TrasladoA
                     */
                    SQL = ' INSERT INTO public."fp_TrasladoA"("fk_idFrap", "nomPersRecPac", "firmaPersRecPac", "nomPersRecPert", "firmaPersRecPert", "trasladadoA", "tipoPersRecPac", "objetosPertenencias") ' +
                    'VALUES (' + respConsulta[0].idFrap + ",'" + datos.consulta.Traslado.Traslado.nombreRec + "','" + datos.consulta.Traslado.Traslado.firma + "','" + datos.consulta.Traslado.pertenencias.recibe + "','" + datos.consulta.Traslado.pertenencias.firma + "','" +
                    hospitalF + "','" + datos.consulta.Traslado.Traslado.receptor + "','" + datos.consulta.Traslado.pertenencias.objetos + "');";

                    var uTablaDespachador = ' UPDATE public."bs_Despachador" ' +
                        'SET "nomPac"' + "='" + datos.consulta.Principal.dataPaciente.nombre + "'," +
                        'edad='+ datos.consulta.Principal.dataPaciente.edad + ',' +
                        "sexo='" + sexoPaciente + "'," +
                        '"telPaciente"' + "='" + datos.consulta.Principal.dataPaciente.telefono + "', " +
                        'transladado=' + 1 + ',' +
                        '"causaNoTranslado"' + "='" + noTranslado + "' " + hospitalTraslado  +
                        'WHERE "fk_idServ"=(SELECT "idServicio" FROM "bs_RadioOperador" WHERE "folioServ"' + "='" + respConsulta[0].folioServ + "' AND \"folioFRAP\" = '" + datos.datosServicio.folioFrap  + "');";

                    SQL = SQL + uTablaDespachador;

                    return callback(SQL);

                }

            };

            /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_NotaAP
             *  Se debera de validar la longitud de los parametros, para hacer la insercción de datos...
             *  Nota: Si ningún campo trae información, no se debera de generar el script
             *  Parametro de entrada: json, con los datos de atención prehospitalaria
             *  Parametro de salida: callback, con la respuesta de la función, sql = " " si los campos estan vacios, sql = "INSERT..."
             *  si los campos tienen información
             */
            var tablaNotaAP = function(json, callback){
                var tam1 = json.subjetivos.length;
                var tam2 = json.objetivos.length;
                var tam3 = json.planes.length;
                var tam4 = json.apreciacion.length;
                var sql = ' ';

                if(tam1 > 1){
                    //console.log('subjetivos si era mayor a 1, se debe de generar el script.....');
                    scriptNotaAP(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tam2 > 1){
                    //console.log('subjetivos no fue mayor a 1, pero objetivos trae mas datos, se genera script......');
                    scriptNotaAP(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tam3 > 1){
                    //console.log('subjetivos ni objetivos fueron mayores a 1, pero planes si trae datos, se genera script');
                    scriptNotaAP(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tam4 > 1){
                    //console.log('subjetivos, objetivos, planes fueron menores a 1, pero apreciacion trae datos, se genera script');
                    scriptNotaAP(function(respuesta){
                        callback(respuesta);
                    });
                } else {
                    //console.log('Ningún campo trae datos.... no se genera script..............');
                    callback(sql);
                }

                // Función que genera el script en caso de que, alguno de los campos, no este vacio....
                function scriptNotaAP(callback){
                    sql = ' INSERT INTO public."fp_NotaAP"("fk_idFrap", "napSubjetivos", "napObjetivos", "napApreciacion", "napPlanes") ' +
                    'VALUES (' + respConsulta[0].idFrap + ",'" + datos.consulta.Atencion.subjetivos + "','" + datos.consulta.Atencion.objetivos + "','" + datos.consulta.Atencion.apreciacion + "','" + datos.consulta.Atencion.planes + "');";
                    callback(sql);
                }

            };

            /**
             *  Tabla con registro único
             *  Descripción: sentencia SQL para almacenamiento de información de Frap en fp_AutoridadC
             *  Se debera de validar la longitud de los parametros de dependencias, para saber si se genera el script
             *  para la insercción de datos.
             *  Nota: Si ningún campo de los validados trae información, no se debera de generarl el script
             *  Parametro de entrada: json, con los datos de la autoridad que toma conocimiento
             *  Parametro de salida: callback, con la respuesta de la función, sql = " "  si los campos estan vacios, sql = "INSERT..."
             *  si los campos tienen información
             */
            var tablaAutoridadC = function(json, callback){
                var tam1 = json.dependencia1.length;
                var tam2 = json.dependencia2.length;
                var script = " ";

                if(tam1 > 1){
                    //console.log('Si existe la dependencia1... se debe de generar el script.......');
                    scriptAutoridadC(function(respuesta){
                        callback(respuesta);
                    });
                } else if(tam2 > 1){
                    //console.log('Si existe dependencia2, pero no dependencia1.... se genera script?????');
                    scriptAutoridadC(function(respuesta){
                        callback(respuesta);
                    });
                } else {
                    //console.log('Campos vacios de dependencias..... no se genera script......');
                    callback(script);
                }

                // Función que genera el script en caso de que, alguno de los campos, no este vacio....
                function scriptAutoridadC(retorno){
                    var script = ' INSERT INTO public."fp_AutoridadC"("fk_idFrap", "autoridadDep1", "nombrePersDep1", "unidadDep1", "autoridadDep2", "nombrePersDep2", "unidadDep2") ' +
                    'VALUES (' + respConsulta[0].idFrap + ",'" + datos.consulta.Traslado.autoridades.dependencia1 + "','" + datos.consulta.Traslado.autoridades.nombre1 + "','" + datos.consulta.Traslado.autoridades.unidad1 + "','" + datos.consulta.Traslado.autoridades.dependencia2 + "','" +
                    datos.consulta.Traslado.autoridades.nombre2 + "','" + datos.consulta.Traslado.autoridades.unidad2 + "');";
                    retorno(script);
                };
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de signos vitales, para la insercción de información en la tabla de fp_SignosVitales
             *  Se validara que existan registros en esta tabla, verificando que el campo de hora, no venga vacio
             *  en caso de encontrar el primer registro de hora vacio, no se generara el script de ese valor....
             */
            var tablaDatosSignosV = function(arreglo, callback){

                //console.log('Esto trae signosVitales......');
                //console.log(arreglo);

                var tamaArreglo = arreglo.length;
                var queryFinal = ' ';
                if(tamaArreglo > 0){
                    //console.log('SI ES MAYOR A 0 en signos vitales........');
                    //Se realizara una búsqueda entre todos los datos que trae ese arreglo y formar la estructura de el INSERT de cada valor
                    for(var posicion in arreglo){
                        if(arreglo[posicion].hora == "."){
                            //console.log('Es igual al punto, no debería de generar script');
                            return callback(queryFinal);
                        } else {
                            //console.log('Si trae información.... genera script.....');
                            var miQuery = 'INSERT INTO public."fp_SignosVitales"("fk_idFrap", "taSistolica", "taDistolica", pulso, "frPulso", glucosa, oximetria, "glasgowAO", "glasgowRV", "glasgowRM", hora) ' +
                            'VALUES (' + respConsulta[0].idFrap + ",'" +
                                    arreglo[posicion].TA.sistolica + "','" +
                                    arreglo[posicion].TA.diastolica + "','" +
                                    arreglo[posicion].pulso + "','" +
                                    arreglo[posicion].frPulso + "','" +
                                    arreglo[posicion].glucosa + "','" +
                                    arreglo[posicion].oximetria + "'," +
                                    arreglo[posicion].glasgow.AO + ',' +
                                    arreglo[posicion].glasgow.RV + ',' +
                                    arreglo[posicion].glasgow.RM + ",'" +
                                    arreglo[posicion].hora  +"');";
                            queryFinal = queryFinal + miQuery;
                        }
                    }
                    callback(queryFinal);
                } else {
                    console.log('NO ES MAYOR A 0 en signos vitales......... PUDFADIFA');
                    callback(queryFinal);
                }
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de pAnterior en el apartado de Lesiones, para la insercción de información en la tabla de fp_ParteLesion
             *  Hay que validar si el primer registro, no viene lleno con un ".", de ser así, se indica que el arreglo no trae ningún
             *  valor, por lo que no se debe de generar el script
             *  Valida parte lesion Anterior
             */
            var tablaParteLesionA = function(myarreglo, callback){
                //console.log('......que trae myarreglo????.....');
                //console.log(myarreglo);
                var tamArreglo = myarreglo.length;
                var queryFinal = ' ';
                if(tamArreglo > 0){
                    //console.log('es mayor en parte lesión anterior........');
                    //Se realizara una búsqueda entre todos los datos que trae ese arreglo y formar la estructura de el INSERT de cada valor
                    for(var posicion in myarreglo){
                        if(myarreglo[posicion].control == '.'){
                            //console.log('Si es igual... no se genera script.....');
                            return callback(queryFinal);
                        } else{
                            //console.log('No es un punto, se generaaa script........');
                            if(myarreglo[posicion].tipo != '-Selecciona Uno-'){
                                //console.log('Si trae un tpo de lesión, se genera script.....');
                                var myQuery = ' INSERT INTO public."fp_ParteLesion"("fk_idFrap","ladoLesion","parteLesion", "tipoLesion") ' +
                                'VALUES (' + respConsulta[0].idFrap + ",'" + 'A' + "','" +
                                    myarreglo[posicion].parte + "','" +
                                    myarreglo[posicion].tipo + "');";
                                queryFinal = queryFinal + myQuery;

                            }

                        }
                    }
                    callback(queryFinal);

                } else {
                    //console.log('.... es menor a 0 en lesión anterior.......');
                    callback(queryFinal);
                };
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de pPosterior en el apartado de Lesiones, para la insercción de información en la tabla de fp_ParteLesion
             *  Se debera de validar si el primer registro, no tiene como contenido un ".", ya que esto indica que el arreglo no
             *  trae ningún valor, por lo que, no se debera de generar ese script.
             *  Valida parte lesion Posterior
             */
            var tablaParteLesionP = function(arreglo, callback){

                //console.log('que trae el arreglo de LesionesP....?');
                //console.log(arreglo);

                var tamArreglo = arreglo.length;
                var queryFinal = ' ';
                if(tamArreglo > 0){
                    //console.log('....es mayor en parte posterior de lesión.....');
                    //Se realizara una búsqueda entre todos los datos que trae ese arreglo y formar la estructura de el INSERT de cada valor
                    for(var posicion in arreglo){
                        if(arreglo[posicion].control == '.'){
                            //console.log('Si es igual, no se genera script......');
                            return callback(queryFinal);
                            //continue;
                        } else {
                            //console.log('No trae el punto, se genera el script.....');
                            if(arreglo[posicion].tipo != '-Selecciona Uno-'){
                                //console.log('Si trae un tipo de lesión, se genera script');

                                var myQuery = ' INSERT INTO public."fp_ParteLesion"("fk_idFrap", "ladoLesion", "parteLesion", "tipoLesion") ' +
                                'VALUES (' + respConsulta[0].idFrap + ",'" + 'P' + "','" +
                                    arreglo[posicion].parte + "','" +
                                    arreglo[posicion].tipo + "');";
                                queryFinal = queryFinal + myQuery;

                            } else {
                                continue;
                            }
                        }
                    }
                    callback(queryFinal);
                } else {
                    //console.log('.....es menor en parte posterior de lesión');
                    callback(queryFinal);
                };
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de tratamientos para la insercción de información en la tabla de fp_Tratamiento
             *  Se validara que existan registros en ese arreglo, verificando que el campo de hora, no venga vacio
             *  en caso de encontrar el primer registro de hora vacio, no se generara el script de ese valor....
             */
            var tablaTratamiento = function(arreglo, callback){
                //console.log('esto trae tratamientossssss....');
                //console.log(arreglo);
                var tamArreglo = arreglo.length;
                var queryF = ' ';
                if(tamArreglo > 0){
                    //console.log('Arreglo de tratamiento es mayor a 0.........');
                    //Se realizara una búsqueda entre todos los datos que trae ese arreglo y formar la estructura de el INSERT de cada valor
                    for(var posicion in arreglo){
                        if(arreglo[posicion].hora == '.'){
                            //console.log('Trae campo vacio, no se genera script.....');
                            return callback(queryF);
                        } else {
                            //console.log('No viene vacio... se debera de generar script....');
                            var solucion;
                            if(arreglo[posicion].solucion == '-Selecciona Uno-'){
                                //console.log('No se seleccionó ningún tipo de solución.... va vacio....');
                                solucion = ' ';
                            } else {
                                //console.log('Si se seleccionó un campo, se mantiene el valor......');
                                solucion = arreglo[posicion].solucion;
                            }

                            var query = ' INSERT INTO public."fp_Tratamiento"("fk_idFrap", hora, medicamento, solucion, via, dosis) ' +
                            'VALUES (' + respConsulta[0].idFrap + ",'" +
                                arreglo[posicion].hora + "','" +
                                arreglo[posicion].medicamento + "','" +
                                solucion + "','" +
                                arreglo[posicion].via + "','" +
                                arreglo[posicion].dosis + "');";
                            queryF = queryF + query;

                        }
                    };
                    callback(queryF);
                } else {
                    //console.log('Arreglo de tratamiento es menor a 0.... no entraaaaa');
                    callback(queryF);
                }
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de monParoCardiaco para la insercción de información en la tabla de fp_MonECG
             *  Se validara que existan registros en ese arreglo, verificando que el campo de hora, no venga vacio
             *  en caso de encontrar el primer registro de hora vacio, no se generara el script de ese valor....
             */
            var tablaMonECG = function(arreglo, callback){

                //console.log('Esto trae mi arreglo de monitoreoECG.......');
                //console.log(arreglo);

                var tamArreglo = arreglo.length;
                var queryFinal = ' ';
                if(tamArreglo > 0){
                    //console.log('Si es mayor a 0 en monitoreoECG......');
                    //Se realizara una búsqueda entre todos los datos que trae ese arreglo y formar la estructura de el INSERT de cada valor
                    for(var posicion in arreglo){
                        if(arreglo[posicion].hora == '.'){
                            //console.log('Viene vacio la hora, no se genera script......');
                            return callback(queryFinal);
                        } else {
                            //console.log('Si viene la hora....., se genera script');
                            var myQuery = ' INSERT INTO public."fp_MonECG"("fk_idFrap", hora, ritmo, frecuencia) ' +
                            'VALUES (' + respConsulta[0].idFrap + ",'" +
                                arreglo[posicion].hora + "','" +
                                arreglo[posicion].ritmo + "','" +
                                arreglo[posicion].frecuencia + "');";
                            queryFinal = queryFinal + myQuery;
                        }
                    };
                    callback(queryFinal);
                } else {
                    //console.log('Es menor a 0 en monitoreoECG');
                    callback(queryFinal);
                }
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de medicamentos para la insercción de información en la tabla de fp_InsumosMedicos
             *  Se validara que existan registros en ese arreglo, verificando que el campo de codigo, no venga vacio
             *  en caso de encontrar el primer registro de codigo vacio, no se generara el script de ese valor....
             */
            var tablaInsumosM = function(arreglo, callback){
                //console.log('Esto trae el arreglo de insumos.....');
                //console.log(arreglo);
                var tamArreglo = arreglo.length;
                var queryFinal = ' ';
                if(tamArreglo > 0){
                    //console.log('Es mayor a 0 en insumos......');
                    //Se realizara una búsqueda entre todos los datos que trae ese arreglo y formar la estructura de el INSERT de cada valor
                    for(var posicion in arreglo){
                        if(arreglo[posicion].codigo == '.'){
                            //console.log('Trae punto en código, no genera script.......');
                            return callback(queryFinal);
                        } else {
                            //console.log('Si trae datos de medicamentos.... se genera script');
                            var MyQuery = ' INSERT INTO public."fp_InsumosMedicos"("fk_idFrap", codigo, cantidad, costo) ' +
                            'VALUES ('+ respConsulta[0].idFrap + ',' +
                                arreglo[posicion].cod + ",'" +
                                arreglo[posicion].cantidad + "','" +
                                arreglo[posicion].costo + "');";
                            queryFinal = queryFinal + MyQuery;
                        }
                    };
                    callback(queryFinal);
                } else{
                    //console.log('es menor a 0 en insumos............');
                    callback(queryFinal);
                };
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de medicamentos para la actualización de los insumos medicos utilizados por la ambulancia
             *  en la tabla de im_DetalleRIMA
             */
            var uTablaDetalleRIMA = function(arreglo, datosAmbulancia, callback){
                //console.log('.....llego a detalleRima.....');
                //console.log(arreglo);
                var tam = arreglo.length;
                var sql = ' ';
                if(tam > 0){
                    //console.log('Si se tienen medicamentos para aumentar... ');
                    for(var posi in arreglo){
                        if(arreglo[posi].codigo == "."){
                            //console.log('No trae medicamentos....');
                            return callback(sql);
                        } else {
                            //console.log('Si tiene medicamentos...... se genera script....');
                            var query = ' UPDATE public."im_DetalleRIMA" ' +
                                'SET "consumo" = (SELECT "Table_A"."consumo" ' +
                                    'FROM public."im_DetalleRIMA" AS "Table_A" ' +
                                    'INNER JOIN public."im_EncRIMA" AS "Table_B" ' +
                                    'ON "Table_B"."idAgrupacion" = ' + respConsulta[0].idAgrupacion + ' ' +
                                    'AND "Table_B"."idUnidad" = ' + respConsulta[0].idUnidad + ' ' +
                                    'AND "Table_B"."idAmbulancia" = ' + respConsulta[0].idAmbulancia + ' ' +
                                    'AND "Table_B"."id_EncRIMA" = "Table_A"."fk_IdRIMA" ' +
                                    'AND "Table_A"."codigo" = ' + arreglo[posi].cod + ' ) + ' + arreglo[posi].cantidad  +
                                ' FROM public."im_EncRIMA" AS "A" ' +
                                'WHERE "A"."idAgrupacion" = ' + respConsulta[0].idAgrupacion + ' ' +
                                'AND "A"."idUnidad" = ' + respConsulta[0].idUnidad + ' ' +
                                'AND "A"."idAmbulancia" = ' + respConsulta[0].idAmbulancia + ' ' +
                                'AND "A"."id_EncRIMA" = "im_DetalleRIMA"."fk_IdRIMA" ' +
                                'AND "im_DetalleRIMA"."codigo" = ' + arreglo[posi].cod + ';';
                            sql = sql + query;
                        }
                    };
                    callback(sql);

                } else {
                    //console.log('No trae medicamentos agregados......');
                    callback(sql);
                }
            };

            /**
             *  Descripción : Función que crea sentencias SQL de acuerdo a la cantidad de elementos que contenga
             *  el arreglo de medicamentos para la actualización de los insumos medicos utilizados por la ambulancia
             *  en la tabla de im_ParametrosIM
             *  Nota: se debera de validar si es que se utilizaron insumos medicos durante el servicio,
             *  si no se utilizaron, no se debera de generar el script... en caso de que si se hayan utilizados
             *  se genera script, por cada insumo utilizado.
             */
            var uTablaImParametros = function(arreglo, callback){

                //console.log('Esto trae medicamentos para actualizar uTablaImParametros.....');
                //console.log(arreglo);
                var tamanoArreglo = arreglo.length;
                var sqlF = ' ';
                if(tamanoArreglo > 0){
                    //console.log('Si hay medicamentos que descontar......');
                    for(var posicion in arreglo){
                        if(arreglo[posicion].codigo == '.'){
                            //console.log('Trae punto medicamentos, no se actualiza.....');
                            return callback(sqlF);
                        } else {
                            //console.log('No tiene puntos, si trae datos, se debe generar el script');
                            var Query =  ' UPDATE "im_ParametrosIM" ' +
                            'SET "cantidad" = (SELECT "ParametrosIM"."cantidad" ' +
                                    'FROM public."im_ParametrosIM" AS "ParametrosIM" ' +
                                    'INNER JOIN public."im_InsumosMedicos" AS "Insumos" ' +
                                    'ON  "ParametrosIM"."codigo"=' + arreglo[posicion].codigo + ' ' +
                                    'AND "ParametrosIM"."costoUnitario"=' + arreglo[posicion].costo + ' ' +
                                    'AND "ParametrosIM"."fechaCaducidad"' + "='" + arreglo[posicion].fechaCad + "' " +
                                    'AND "Insumos"."codigo"=' + arreglo[posicion].codigo + ' ' +
                                    'AND "Insumos"."fk_idUnidad"=' + respConsulta[0].idUnidad + ' ' +
                                    'AND "Insumos"."fk_idAgrupacion"=' + respConsulta[0].idAgrupacion + ') - ' + arreglo[posicion].cantidad +
                            ' WHERE public."im_ParametrosIM".codigo=' + arreglo[posicion].codigo + ' ' +
                            'AND public."im_ParametrosIM"."costoUnitario"=' + arreglo[posicion].costo + ' ' +
                            'AND public."im_ParametrosIM"."fechaCaducidad"' + "='" + arreglo[posicion].fechaCad + "' " +
                            'AND public."im_ParametrosIM"."fk_idIM" = (SELECT "idIM" FROM public."im_InsumosMedicos" ' +
                            'WHERE "codigo"=' + arreglo[posicion].codigo + ' AND "fk_idUnidad"=' + respConsulta[0].idUnidad + ' AND "fk_idAgrupacion"=' + respConsulta[0].idAgrupacion + ');';
                            sqlF = sqlF + Query;
                        }
                    };
                    callback(sqlF);
                } else {
                    //console.log('No tiene medicamentos que descontar.......');
                    callback(sqlF);
                }
            };

            /**
             *  Descripción : Función que crea sentencias SQL para la actualización de la tabla fp_DatosFrapP
             *  Nota: se debera de validar si es que ha sido cancelado o no el servicio.
             */
            var uTablaDatosFrap = function(jsonPrincipal, jsonCierre, callback){

                //console.log(jsonPrincipal);
                //console.log(jsonCierre);

                var SQL = ' ';
                var tipoUbicacion, lugar, cancelacionF;
                if(jsonPrincipal.tipoUbicacion == '-Selecciona Uno-'){
                    //console.log('No se selccionó tipo ubicación.... se hace cadena vacia....');
                    tipoUbicacion = '';
                } else {
                    //console.log('Si seleccionó tipo ubicación, se mantiene.....');
                    tipoUbicacion = jsonPrincipal.tipoUbicacion;
                }

                if(jsonPrincipal.lugar == '-Selecciona Uno-'){
                    //console.log('No se seleccionó lugar de ocurrencia, se hace cadena vacia.....');
                    lugar = '';
                } else {
                    //console.log('Si se seleccionó lugar de ocurrencia.... se mantiene valor....');
                    lugar = jsonPrincipal.lugar;
                }

                if(jsonCierre.cancelacion.length > 1){
                    //console.log('Si trae cancelación escrita.....');
                    cancelacionF = 2;

                    
                } else {
                    //console.log('No trae cancelacion.........');
                    cancelacionF = 0;
                }

                var estado = jsonCierre.cancelacion.length > 1 ? 6 : 0;

                /**
                 *  Actualización de tabla utilizada por SITCRUM
                 *  Descripción: sentencia SQL para la actualización de información capturada en FRAP en tabla bs_RadioOperador
                 *  Realiza el cierre del servicio, se valida si existe cancelación o no del FRAP, si se canceló, el estatus del
                 *  servicio, también se actualiza.
                 */
                var UtablaRadioOperador = ' UPDATE public."bs_RadioOperador" ' +
                'SET "estatusServ" = ' + estado + ' ' +
                'WHERE "folioFRAP"' + "='" + datos.datosServicio.folioFrap + "'" + ' AND "folioServ"' + "='" + respConsulta[0].folioServ +"';";



                SQL = ' UPDATE public."fp_DatosFrapP" ' +
                    ' SET "edoFrap"=' + cancelacionF + ',' +
                        '"tipoUbicacion"' + "='" + tipoUbicacion + "'," +
                        '"lugarOcurrencia"' + "='" + lugar + "'," +
                        '"costoTotal"=' + jsonCierre.costoTotal + ',' + '"observCancelacion"' + "='" + jsonCierre.cancelacion + "' " +
                    'WHERE "idFrap" =' + respConsulta[0].idFrap + ';';

                callback(SQL + UtablaRadioOperador);

            };

            /**
             *  Actualización de tabla utilizada por SITCRUM
             *  Descripción: sentencia SQL para la eliminación de registro en la tabla de fp_Activos
             *  Nota: Esta tabla sólo debera de tener los fraps que aun esten activos, por lo que
             *  al cerrar el frap se debera de eliminar el registro donse se consultó el servicio
             */
            var DtablaActivos = ' DELETE FROM public."fp_Activos" WHERE "idFrap" = ' +  respConsulta[0].idFrap + ';';

            /**
             * Generación de Query transcaccional
             */
            tablaSintomas(datos.consulta.Sintomas.Sintomas, function(tablaSintom){ //Tabla de Sintomas
                if(tablaSintom){
                    //  console.log(tablaSintom);

                    tablaSintomasPri(datos.consulta.Sintomas.principales, function(sintomasPri){ //Tabla de Sintomas principales
                        if(sintomasPri){
                            //  console.log(sintomasPri);

                            tablaAyudaCB(datos.consulta.Ayuda.cuidadosBasic, function(ayudaCB){ //Tabla de cuidados basicos
                                if(ayudaCB){
                                    //  console.log(ayudaCB);

                                    tablaLesion(datos.consulta.Lesiones, function(tablaLesiones){ // tabla de lesiones
                                        if(tablaLesiones){
                                            //  console.log(tablaLesiones);

                                            validaNegTras(datos.consulta.Traslado, datos.consulta.Negativa, function(negativaTraslado){ //Tabla para negativa de Traslado o trasladadoA
                                                if(negativaTraslado){
                                                    //  console.log(negativaTraslado);

                                                    tablaNotaAP(datos.consulta.Atencion, function(notaAP){ //Tabla para notas de atención prehospitalaria
                                                        if(notaAP){
                                                            //  console.log(notaAP);

                                                            tablaAutoridadC(datos.consulta.Traslado.autoridades, function(autoridadC){ //Tabla para autoridades que toman conocimiento
                                                                if(autoridadC){
                                                                    //  console.log(autoridadC);

                                                                    tablaDatosSignosV(datos.consulta.Sintomas.monitoreoECG, function(signosV){ //Tabla para registrar signos vitales
                                                                        if(signosV){
                                                                            //  console.log(signosV);

                                                                            tablaParteLesionA(datos.consulta.Lesiones.pAnterior, function(lesionA){ //Tabla para lesiones
                                                                                if(lesionA){
                                                                                    //  console.log(lesionA);

                                                                                    tablaParteLesionP(datos.consulta.Lesiones.pPosterior, function(lesionP){ //Tabla para lesiones
                                                                                        if(lesionP){
                                                                                            //  console.log(lesionP);

                                                                                            tablaTratamiento(datos.consulta.Tratamientos.Tratamiento, function(tratamiento){ //Tabla para tratamientos
                                                                                                if(tratamiento){
                                                                                                    //  console.log(tratamiento);

                                                                                                    tablaMonECG(datos.consulta.Tratamientos.monParoCardiaco, function(monECG){ //Tabla para monitoreoECG
                                                                                                        if(monECG){
                                                                                                            //  console.log(monECG);

                                                                                                            tablaInsumosM(datos.consulta.Cierre.medicamento, function(medicamento){ //Tabla para medicamentos
                                                                                                                if(medicamento){
                                                                                                                    //  console.log(medicamento);

                                                                                                                    uTablaDetalleRIMA(datos.consulta.Cierre.medicamento, datos.datosServicio, function(updateDetalleRIMA){ //Update para detalleRima
                                                                                                                        if(updateDetalleRIMA){
                                                                                                                            //  console.log(updateDetalleRIMA);

                                                                                                                            uTablaImParametros(datos.consulta.Cierre.medicamento, function(updateImParametros){ //Update para insumos
                                                                                                                                if(updateImParametros){
                                                                                                                                    //  console.log(updateImParametros);

                                                                                                                             uTablaDatosFrap(datos.consulta.Principal.generales, datos.consulta.Cierre, function(updateDatosFrap){ //update para datos frap
                                                                                                                                        if(updateDatosFrap){
                                                                                                                                            //  console.log(updateDatosFrap);

                                                                                                                                            tablaParoCardiaco(datos.consulta.ParoCardiaco, function(paroCardiaco){
                                                                                                                                                if(paroCardiaco){
                                                                                                                                                    //  console.log(paroCardiaco);

                                                                                                                                                    tablaDatosP(datos.consulta.Principal.dataPaciente, function(datosPaciente){
                                                                                                                                                        if(datosPaciente){

                                                                                                                                                            //Generación de script
                                                                                                                                                            megaQuery = 'BEGIN;' + ' ' + tablaSintom + ' ' + sintomasPri + ' ' + ayudaCB + ' ' + tablaLesiones + ' ' +
                                                                                                                                                            negativaTraslado + ' ' + notaAP + ' ' + autoridadC + ' ' + signosV + ' ' + lesionA + ' ' + lesionP + ' ' +
                                                                                                                                                            tratamiento + ' ' + monECG + ' ' + medicamento + ' ' + updateDetalleRIMA + ' ' + updateImParametros + ' ' +
                                                                                                                                                            updateDatosFrap + ' ' + tablaAyudaSB + ' ' + tablaAyudaSA + ' ' + UtablaArribos + ' ' + datosPaciente + ' ' +
                                                                                                                                                            UtablaAaCrum + ' ' + DtablaActivos + ' ' /*+ UtablaRadioOperador + ' '*/ + paroCardiaco + ' ' + ' COMMIT; END;';

                                                                                                                                                            console.log(megaQuery);

                                                                                                                                                            //  Se ejecuta el script que contiene todo el Query a la base de datos.
                                                                                                                                                            cliente.query(megaQuery, function (error, result) {
                                                                                                                                                                if(error){
                                                                                                                                                                    respuesta = {
                                                                                                                                                                        "codigo" : 3,
                                                                                                                                                                        "folioFrap" : datos.datosServicio.folioFrap,
                                                                                                                                                                        "descripcion" : "Error en base de datos, contacta con el administrador"
                                                                                                                                                                    }
                                                                                                                                                                    //  socket.emit('errorCierreFrap', respuesta);
                                                                                                                                                                    console.log(error);
                                                                                                                                                                    return callback(respuesta);
                                                                                                                                                                    
                                                                                                                                                                }

                                                                                                                                                                var fechaCrak = new Date();
                                                                                                                                                                var mes  = parseInt(fechaCrak.getMonth()) + 1;
                                                                                                                                                                var dia = fechaCrak.getDate();
                                                                                                                                                                mes = mes < 10 ? '0'+ mes:mes;
                                                                                                                                                                dia = dia < 10 ? '0'+ dia:dia;
                                                                                                                                                                var tiempoEjecucion = ''+fechaCrak.getFullYear()+'-'+mes+'-'+dia+' ' + fechaCrak.getHours() + ':' + fechaCrak.getMinutes() + ':' + fechaCrak.getSeconds() + ':' + fechaCrak.getMilliseconds();
                                                                                                                                                                console.log('Nadeeeeeen, ya liberaron al craken!!!!!!!!!!!! D: '+ tiempoEjecucion);
                                                                                                                                                                //  var resultado = result;
                                                                                                                                                                //  console.log(resultado);

                                                                                                                                                                //Se envia mensaje a la conexión que envió la información de FRAP, de que ha sido cerrado exitosamente
                                                                                                                                                                respuesta = {
                                                                                                                                                                    "codigo" : 1,
                                                                                                                                                                    "folioFrap" : datos.datosServicio.folioFrap,
                                                                                                                                                                    "descripcion" : "El Frap ha sido cerrado correctamente"
                                                                                                                                                                };
                                                                                                                                                                //  socket.emit('frapCerrado', respuesta);
                                                                                                                                                                callback(respuesta);

                                                                                                                                                                //Se verifica si en el momento del cierre, existe alguien del SITCRUM que esté
                                                                                                                                                                //visualizando el frap en tiempo real.... de ser así, se envía evento para notificar que ya se cerró
                                                                                                                                                                consultaConexionSIT(datos.idFrap, function(respuesta){
                                                                                                                                                                    if(respuesta != 'conexionNoActiva'){
                                                                                                                                                                        //Se encontró una conexión de SITCRUM que esta solicitado ese frap
                                                                                                                                                                        respuesta.conexion.emit('frapCerrado');
                                                                                                                                                                    }
                                                                                                                                                                }); 

                                                                                                                                                            });

                                                                                                                                                        } //if de datosP
                                                                                                                                                    }); //  Cierre tablaDatosP

                                                                                                                                                } // if de Paro Cardiaco
                                                                                                                                            }); //Cierre de tablaParoCardiaco

                                                                                                                                        } // if de updateDatosFrap
                                                                                                                                    }); // Cierre de updateDatosFrap

                                                                                                                                } // if de updateImParametros
                                                                                                                            }); //Cierre de uTablaImParametros

                                                                                                                        } //if de updateDetalleRIMA
                                                                                                                    }); //Cierre de uTablaDetalleRIMA

                                                                                                                } // if de medicamento
                                                                                                            }); // Cierre de tablaInsumosM

                                                                                                        } // if de monECG
                                                                                                    }); // Cierre de tablaMonECG

                                                                                                } // if de tratamiento
                                                                                            }); // Cierre de tablaTratamiento

                                                                                        } // if de lesionP
                                                                                    }); // Cierre de tablaParteLesionP

                                                                                } // if de lesionA
                                                                            }); // Cierre de tablaParteLesionA

                                                                        } // if de signosV
                                                                    }); // Cierre de tablaDatosSignosV

                                                                } // if de autoridadC
                                                            }); // Cierre de tablaAutoridadC

                                                        } // if de notaAP
                                                    }); //  Cierra de tablaNotaAP

                                                } // if de negativaTraslado
                                            }); // Cierre de validaNegTras

                                        } // if de tablaLesiones
                                    }); //  Cierre de tablaLesion

                                }   // if de ayudaCB
                            }); // Cierre de tablaAyudaCB

                        }   // if de sintomasPri
                    }); // Cierre de tablaSintomasPri

                } // if de tablaSintom
            });  // Cierre de tablaSin

       } else {

           console.log('No existe información en base a ese folio de Frap.... :S :S :S');

           // Se construye Query transcaccional para almacenar la información que no se almacenó correctamente
           var transaccion = "BEGIN; " +
              'INSERT INTO "fp_frapsTemporales"("folioServ", "folioFrap", "numSerieNitro", "nombrePac", "lugarOcurrencia", "tipoUbicacion", "domicilioPac", "telefonoPac", "informacionGral") ' +
              "VALUES ('" + datos.datosServicio.folioServ + "','" + datos.datosServicio.folioFrap + "','" + datos.datosServicio.numSerieNitro + "','" + datos.consulta.Principal.dataPaciente.nombre + "','" +
              datos.consulta.Principal.generales.lugar + "','" + datos.consulta.Principal.generales.tipoUbicacion + "','" + datos.consulta.Principal.dataPaciente.domicilio + "','" +
              datos.consulta.Principal.dataPaciente.telefono + "','" + JSON.stringify(datos.consulta) + "'); COMMIT; END;";

           console.log(transaccion);

           cliente.query(transaccion, function(error, resp){

             if(error){
                 respuesta = {
                     "codigo" : 3,
                     "folioFrap" : datos.datosServicio.folioFrap,
                     "descripcion" : "No se pudo almacenar el Frap, intentalo nuevamente"
                 }
                 console.log(respuesta);
                 //  socket.emit('errorCierreFrap', respuesta);
                 console.log(error.stack);
                 callback(respuesta);
                 return;
             }

             console.log('Se realizó insercción en tabla de fp_frapsTemporales!!!! ');

             //Se envia mensaje a la conexión que envió la información de FRAP, de que ha sido cerrado exitosamente
             respuesta = {
                 "codigo" : 1,
                 "folioFrap" : datos.datosServicio.folioFrap,
                 "descripcion" : "El Frap ha sido almacenado correctamente en la tabla de fp_frapsTemporales"
             };
             //  socket.emit('frapCerrado', respuesta);
             callback(respuesta);

           });

       }

   });

};

//  Función que valida si existe alguna conexión que ya tenga almacenado el id de Frap que fue consultado
function buscaConexionFrap(Frap, callback){
   var tamaArreglo = global.conexionesNitro.length;
   //  Se tiene que validar que no exista una conexión almacenada en el arreglo con ese id de Frap
   var existe = false;

   for(var v = 0; v < tamaArreglo; v++){
       if(global.conexionesNitro[v].idFrap === Frap){
           console.log('Si lo encontró... no se agregaaaaaa..... ');
           console.log('Tamaño arreglo..... ' + global.conexionesNitro.length);
           existe = true;
           callback('yaExiste');
       }
   }

   if(existe == false){
       callback('noExiste');
       console.log('No esta en el arreglo..... se agregaaaaa.......');
   }

}


//Función que consulta el arreglo de las conexiones del SITCRUM, para el envio de datos.
 function consultaConexionSIT(id, callback) {
     console.log('Id a buscar.... ' + id);

     var conexion = false;

     var num = global.conexionesSIT.length;
     for(var a = 0; a < num; a++){
         if(global.conexionesSIT[a].idFrap == id){
            //Indica que se encontró la conexión.... se retorna esa conexión para enviar el mensaje
            callback(global.conexionesSIT[a]);
            conexion = true;
         };
     };

     if(conexion == false){
        console.log('No hay visualizando ese FRAP....');
        callback('conexionNoActiva');
     };
}

/**
 *  Descripción: Función que consulta el total de medicamentos con los que cuenta la ambulancia
 *  Si la fecha enviada desde la consulta de servicio, es diferente a la que se tiene registrada en
 *  el sistema de la última actualización, entonces se devolverá el código, descripción y existencia
 *  del total de insumos a la conexión que lo solicitó.
 *  En caso de que sea la misma, no se actualizará ningún dato.
 */
function buscaInsumos(informacion, socket){

    var codigo_con ;
    var resultado = {};

    console.log('...llegó a buscar insumos.....');

    cliente.query('SELECT "id_EncRIMA", "fechaHora" FROM public."im_EncRIMA" WHERE "idUnidad"=' + informacion.idUnidad +
    ' AND "idAgrupacion"=' + informacion.idAgrupacion + ' AND "idAmbulancia"=' + informacion.idAmbulancia + ';', function(err, result){
        if(err){
            codigo_con = 2;
            console.log('Hubo un error para consultar el id de EncRIMA....');
            resultado = {
                "codigo" : codigo_con,
                "descripcion" : "Error al realizar la consulta"
            }
            socket.emit('insumosA', resultado);
        }

        var valorConsulta = result.rows;
        if(valorConsulta.length > 0){
            console.log('Si tiene datos.....');

            /**
             * Se deberá de validar que la fecha que se envío en inicio de servicio, sea diferente a la que está
             * en la base de datos.... Si es diferente, se hace una nueva consulta para ver el total de insumos
             * que se tienen en la ambulancia. Si no es diferente, quiere decir que no se le han asignado nuevos
             * insumos a la ambulancia, por lo tanto se deberá de trabajar con los insumos que se tienen
             *  */
             var fechaBD = (valorConsulta[0].fechaHora).toUTCString();
             console.log(fechaBD);
             console.log(informacion.fechaAct);

             if(fechaBD != informacion.fechaAct){
                 console.log('Si es diferente... traer insumos....');

                 var idRIMA = valorConsulta[0].id_EncRIMA;
                 console.log('id....' + idRIMA);

                 cliente.query('SELECT codigo, descripcion, existencia FROM public."im_DetalleRIMA" WHERE "fk_IdRIMA"='+idRIMA+' ORDER BY "descripcion" ASC;', function(err, resultCons){
                     if(err){
                         console.log('');
                         codigo_con = 2;
                        console.log('Hubo un error para consultar el insumo.....');
                        resultado = {
                            "codigo" : codigo_con,
                            "descripcion" : "Error al realizar la consulta"
                        }
                        socket.emit('insumosA', resultado);
                     }

                     var totalInsumos = resultCons.rows;
                     if(totalInsumos.length > 0){
                         console.log('SI trae nuevos insumos..... se debe actualizar tabla...');
                         resultado = {
                               "codigo" : 1,
                               "descripcion" : totalInsumos,
                               "fechaActualizacion" : fechaBD
                           }
                           socket.emit('insumosA', resultado);


                     } else {
                         console.log('existe ese ID de RIMA... pero no hay insumos...');
                        resultado = {
                            "codigo" : 0,
                            "descripcion" : "algo raro está pasando........"
                        }
                     }

                 });


             } else {
                 console.log('No cambio la fecha... no ha habido actualización de insumos.....');
                 resultado = {
                    "codigo" : 0,
                    "descripcion" : "No se han actualizado insumos para ambulancia....."
                }
                socket.emit('insumosA', resultado);
             }


        } else {
            console.log('Esa ambulancia aún no tiene asignada medicamentos....');
            resultado = {
                "codigo" : 0,
                "descripcion" : "Esa ambulancia no tiene medicamentos asignados"
            }
            socket.emit('insumosA', resultado);
        }


    });

}

/**
 *  Descripción: Función que consultará la información que es necesaria para la visualización en el
 *  dispositivo móvil.
 *  Parámetros de entrada: idNitro que va a buscar y socket que envio esa petición
 *  Paràmetros de salida: Datos consultados....
 */
function consultaDatosMovil(informacion, socket){
    var idnitro = informacion.idNitro;
    var idfrap = informacion.idFrap;    //  Este id Frap, se remplazó por el folioFrap, que es enviado desde la tablet.

    var respuesta = {};
    var codigo ;
    var descr;

    cliente.query('SELECT "folioFrap", "tipoServicio", "horaAlta", "detalleTS", "nombPac", "edadPac", "sexoPac" FROM public."fp_Activos" WHERE "numSerieNitro" like \'' + idnitro+'\' AND "folioFrap" like \'' + idfrap + '\';' , function(error, result){
        //  Si hubo un error al realizar la consulta
        if(error){
            codigo = 2;
            respuesta = {
                "codigo" : codigo,
                "descripcion" : "Error al realizar la consulta"
            }

            socket.emit('datosServicio', respuesta);
            console.log('Error al realizar la consulta...', error);
            console.error(error.stack);
            return;
        }

        var datosConsulta = result.rows;

        //Si la nitroIngresada si recuperó algún valor.
        if(datosConsulta.length > 0){
            console.info('Si hay valores para ese servicio');
            codigo = 1;
            descr = datosConsulta;
            respuesta = {
                "codigo" : codigo,
                "descripcion" : descr
            };

            //  Se envian los valores a la conexión que hizo la petición....
            socket.emit('datosServicio', respuesta);

        } else { //No hay valores asociados a ese id
            console.info('No hay valores para ese servicio, algo raro está pasando....');
            codigo = 0;
            descr = "No hay valores para ese servicio";
            respuesta = {
                "codigo" : codigo,
                "descripcion" : descr
            };

            //  Se envian valores a la conexión que hizo la petición...
            socket.emit('datosServicio', respuesta);

        }


    });

}

/**
 * Descripción : Función que realiza la actulización de horas de salida y arribo en los diferentes escenarios de la ambulancia.
 * Parámetros de entrada : Esquema con las diferentes horas manejadas en la ambulancia, folioFrap del cual viene la petición de actualización.
 * Parámetros de salida : Resultado de insercción.
*/
function actualizaHorasAmbulancia (campoAmbulancia, valor, folioFrap, estatus){

    var res;        //  Variable que almacenará el valor del resultado de la consulta.

    /**
     * Se hace realiza una validación del campo "valor", para que en caso de venir con un valor nullo o vacio, no realice
     * la búsqueda y actualización de los campos.
     */
    if(valor !== ""){

        cliente.query('SELECT "idFrap" FROM public."fp_Activos" WHERE "folioFrap" = \'' + folioFrap + '\';', function(error, respuesta){

            if(error){
                console.log('Error en la consulta de folioFRAP... actualizaHorasAmbulancia');
                console.error(error);
            }
        var valIdFrap = respuesta.rows;

            if(valIdFrap.length > 0){

                var frap = valIdFrap[0].idFrap;

                //  Se realiza la búsqueda del valor del campoAmbulancia que ha sido enviado.
                cliente.query('SELECT "' + campoAmbulancia + '" FROM public."fp_Arribos" WHERE "fk_idFrap" = ' + frap + ';', function(error, resultado){

                    //  Si hubo algún error en la consulta, se muestra.
                    if(error){
                        console.log('Hubo un error.... en consulta del campo ', campoAmbulancia);
                        console.log(error);
                    }

                    //  Se toma el valor de esa consulta.
                    var resultadoConsulta = resultado.rows;

                    //  Se valida si la consulta arrojada trae datos.
                    if(resultadoConsulta.length > 0){

                        //  Se extrae el valor que trae esa consulta.
                        for(var d in resultadoConsulta[0]){
                            res = resultadoConsulta[0][d];
                        }

                        //  Si devolvió un valor..... se debe validar si el campo es nullo o si tiene un valor...
                        //var columnaConsulta = resultadoConsulta[0].campoAmbulancia;
                        //console.log('Valor de columnaConsulta '+ columnaConsulta);
                        if(res !== null){

                            console.log('No está vacio el campo, no se actualiza....');

                        } else {
                            //  En caso de que el campo venga nullo, se procede a realizar la actualización
                            console.log('Esta vacio.... se debe de actualizar.....');

                            //  Se obtiene la fecha actual del sistema para hacer la actualización.
                            // var fecha = new Date();
                            // var fechaC = ''+fecha.getFullYear()+'-'+fecha.getMonth()+'-'+fecha.getDay()+'';

                            //  Se realiza la actualización de la fecha de la hora seleccionada.
                            //cliente.query('UPDATE public."fp_Arribos" SET "' + campoAmbulancia + '" = \'' + fechaC + ' ' + valor + '\' WHERE "fk_idFrap" = ' + frap + ';', function(error, resultado){
                            cliente.query('UPDATE public."fp_Arribos" SET "' + campoAmbulancia + '" = \'' + valor + '\' WHERE "fk_idFrap" = ' + frap + ';', function(error, resultado){
                                //  Si existe un error, se visualiza.
                                if (error){
                                    console.log('Hubo un error en la actualización del campo.... ' + campoAmbulancia);
                                    console.log(error);
                                }

                                //  Si no, la actualización se realizó con éxito.
                                console.log('Se actualizó con éxito el campo ' + campoAmbulancia + ' tiempo ' + valor);

                                //  Si la actualización fue exitosa, se debe de actualizar el estatus del servicio, dependiendo del valor que se ingresó
                                if(estatus != null){
                                    
                                    //  Se realiza la actualización del estatus del servicio.
                                    cliente.query('UPDATE public."bs_RadioOperador" SET "estatusServ" = ' + estatus + ' WHERE "fk_idFrap" = ' + frap + ';', function(error, resultado){
                                        if(error){
                                            console.log(error);
                                            console.log('Hubo un error al actualizar el estatus del servicio...');
                                        }

                                        console.log('Se actualizo con exito el esatus del servicio....'  + estatus);
                                    });
                                }

                            });
                        }
                    } else {
                        //  No devolvió valor la consulta.....
                        console.log('No devolvio valor....');
                    }
                });
            } else {
                console.log('No hay valor de folioFrap.... :S :S actualizaHorasAmbulancia');
            }

        });


    }

}

/**
 * Descripción: Función que realiza la búsqueda de los hospitales en base a la fecha de actualización enviada.
 * Parámetros de entrada : fecha de última actualización y socket que envio la petición.
 * Parámetros de salida : Caso de hospitales. Si hay actualización.
 * */
function buscaHospitales (fecha, socket){

    var respuestaAmbulancia = {};
    var codigoRespuesta;
    console.log('....llegó a buscar hospitales.....');

    cliente.query('SELECT "horaHosp" FROM "cs_HorasAct"', function(error, resp){
        if(error){
            codigoRespuesta = 2;
            respuestaAmbulancia = {
                "codigo" : codigoRespuesta,
                "descripcion" : 'Error al consultar la hora de actualización'
            }

            socket.emit('hospitalesA', respuestaAmbulancia);
            return console.error('Error al hacer la consulta de fecha de actualización de horas....');

        }

        var consulta = resp.rows;

        if(consulta.length > 0){

            console.log('Hay algo en la columna..... de horaHosp.....');
            /**
             * Se deberá de validar que la fecha que se envio en el inicio de servicio, sea diferente a la que está almacenada
             * en la base de datos.... si es diferente, se hace una nueva consulta para obtener todos los hospitales que tienen
             * el estatus de activos en el SITCRUM. Si no es diferente, quiere decir que no se ha actualizado la tabla de
             * hospitales, por lo que no es necesario mandar insumos.
             * */
            var fechaBD = (consulta[0].horaHosp).toUTCString();

            if(fechaBD != fecha){
                console.log('La fecha de actualización de hospitales, es diferente, se procede a la consulta nuevamente de hospitales....');

                cliente.query('SELECT * FROM public."cs_Hospitales" WHERE "edoHospital" = 1', function (error, result) {
                    if(error){
                        codigoRespuesta = 2;
                            respuestaAmbulancia = {
                            "codigo" : codigoRespuesta,
                            "descripcion" : "Error al realizar la consulta de hospitales"
                        }
                        socket.emit('hospitalesA', respuestaAmbulancia);
                        console.log(error.stack);
                        return console.error('Error al hacer la consulta de hospitales ' + error);
                    };

                    var consulta = result.rows;

                    //  Si hay medicamentos activos
                    if(consulta.length > 0){
                        codigoRespuesta = 1;
                        respuestaAmbulancia = {
                            "codigo" : codigoRespuesta,
                            "descripcion" : consulta,
                            "fechaActualizacion" : fechaBD
                        }
                        socket.emit('hospitalesA', respuestaAmbulancia);

                    }else{ //Si no existe ningún medicamento activo
                        codigoRespuesta = 0;
                        respuestaAmbulancia = {
                            "codigo" : codigoRespuesta,
                            "descripcion" : "No hay hospitales activos por el momento"
                        }
                        socket.emit('hospitalesA', respuestaAmbulancia);
                    }
                });


            } else {
                codigoRespuesta = 0;
                respuestaAmbulancia = {
                    "codigo" : 0,
                    "descripcion" : 'La fecha de actualización de hospitales es igual, no ha existido actualización....'
                };
                console.log('La fecha de actualización de hospitales es igual, no ha existido actualización....');
                socket.emit('hospitalesA', respuestaAmbulancia);
            }


        } else {
            console.log('Aun no hay un campo de fecha de actualización... :S no tiene hospitales????');
            codigoRespuesta = 0;
            respuestaAmbulancia = {
                "codigo" : codigoRespuesta,
                "descripción" : 'Aún no hay hospitales registrados....'
            }
            socket.emit('hospitalesA', respuestaAmbulancia);
        }


    });

}

/**
 * Descripción: Función que realiza la búsqueda de los parámedicos que han sido dados de alta en el CRUM.
 * Parámetros de entrada: fecha de última actualización almacenada en la tablet.
 * Parámetros de salida: lista actual de los paramédicos registrados en CRUM
 */
function buscaParamedicos (fechaActualizacion, socket){

    var respuestaParamedico = {};

    cliente.query('SELECT "horaPers" FROM "cs_HorasAct"', function(error, resp){

        if(error){
            respuestaParamedico = {
                "codigo" : 2,
                "descripcion" : "Error en la consulta de hora de actualización de paramédicos"
            };

            socket.emit('paramedicosA', respuestaParamedico);
        }

        var consultaFecha = resp.rows;
        if(consultaFecha.length > 0){

            console.log('Si tiene fecha de actualización de paramédicos........');

            /**
             * Se deberá de validar que la fecha que envio la ambulancia desde el inicio de servicio, sea diferente que la
             * que está almacenada en la base de datos... si es diferente, nos indica que existió una actualización
             * de información, por lo que se deberá de consultar la nueva información y actualizar los datos que tiene la ambulancia
             */
            var fechaBD = (consultaFecha[0].horaPers).toUTCString();

            if(fechaBD != fechaActualizacion){

                console.log('Las fechas de actualización si son diferentes... se deberá de actualizar la lista de paramédicos....');

                cliente.query('SELECT "nomPers", "tipoPers" FROM "ap_DatosPersonales" WHERE estado = 1 AND "cargoPers" = \'TAMP\';', function(error, respuesta){
                    if(error){
                        console.log('Existió un error al consultar a los TAMPsssss...');
                        respuestaParamedico = {
                            "codigo" : 0,
                            "descripcion" : 'Existió un error al consultar a los TAMPs'
                        }
                        socket.emit('paramedicosA', respuestaParamedico);
                    }

                    var paramedicos = respuesta.rows;
                    if(paramedicos.length > 0){
                        console.log('Si encontró a personas con cargo de paramédico....');

                        respuestaParamedico = {
                            "codigo" : 1,
                            "descripcion" : paramedicos,
                            "fechaActualizacion" : fechaBD
                        };
                        socket.emit('paramedicosA', respuestaParamedico);

                    } else {
                        console.log('No existe ninguna persona con el cargo de TAMP...???');
                        respuestaParamedico = {
                            "codigo" : 0,
                            "descripcion" : 'No existe ningúna persona con el cargo de TAMP'
                        };
                        socket.emit('paramedicosA', respuestaParamedico);

                    }


                });


            } else {

                console.log('Las fecha no ha cambiado... no ha existido actualización de paramédicos');
                respuestaParamedico = {
                    "codigo" : 0,
                    "descripcion" : 'Las fecha no ha cambiado... no ha existido actualización de paramédicos'
                };
                socket.emit('paramedicosA', respuestaParamedico);
            }

        } else {
            console.log('No existe fecha de actualización... :S');
            respuestaParamedico = {
                "codigo" : 0,
                "descripcion" : "No existe hora de actualización.... :S"
            }
            socket.emit('paramedicosA', respuestaParamedico);
        }


    });

}

/**
 *  Descripción: Función que realiza la búsqueda de las bases que han sido dadas de alta en el CRUM.
 *  Parámetros de entrada: ninguno
 *  Parámetros de salida: listado con las bases que están dadas de alta
 */
function buscaBases (socket, callback) {
    
    var respuestaAmbulancia, codigoRespuesta;

    
    cliente.query('SELECT * FROM public."cs_Bases"', function (error, result) {

        if(error){
            codigoRespuesta = 2;
            respuestaAmbulancia = {
                "codigo" : codigoRespuesta,
                "descripcion" : "Error al realizar la consulta de bases"
            }
            callback(respuestaAmbulancia);
            return console.error('Error al hacer la consulta de bases ' + error);
        };

        var consulta = result.rows;

        //  Si hay medicamentos activos
        if(consulta.length > 0){

            codigoRespuesta = 1;
            respuestaAmbulancia = {
                "codigo" : codigoRespuesta,
                "descripcion" : consulta
            }
            callback(respuestaAmbulancia);
            

        }else{ //Si no existe ningún medicamento activo
            codigoRespuesta = 0;
            respuestaAmbulancia = {
                "codigo" : codigoRespuesta,
                "descripcion" : "No existen bases registradas en el CRUM"
            }
            callback(respuestaAmbulancia);

        }
    });

}


//Funciones expuestas en el módulo para que puedan ser accedidas externamente.
module.exports = validaUsuario;
module.exports.validEnterHistory = validaIngresoMonitorHistorial;
module.exports.consultaServicio = consultaServicio;
module.exports.cierreFrap = cierreFrap;
module.exports.consultaDatosMovil = consultaDatosMovil;
module.exports.buscame = buscame;
module.exports.obtieneInfoNitro = obtieneInfoNitro;
module.exports.entregaAmb = entregaAmb;
module.exports.actualizaHorasAmbulancia = actualizaHorasAmbulancia;
module.exports.buscaBases = buscaBases;
