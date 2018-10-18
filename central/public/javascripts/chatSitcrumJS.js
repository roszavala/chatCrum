/******************************************************************************
 . Centro de Ingeniería y Desarrollo Industrial
 . Nombre del módulo:    scripts.js
 . Lenuaje:              Javascript
 . Propósito:            Archivo javascript para el uso de chat  y asingacion de
 												nuevo servicio en front end

 . Desarrollado por:     Rocío Ajendra Zavala Anguiano
 ******************************************************************************/

var socket;
var idUsuario;
var numFrapActivos;
var hojaActual;
var bEspecialista;
var idEspecialista;
var idFrapUsar;
var pantallaCompleta;
var divMensajeGen;
var ventanaChat;
var nombreUsuario;
var idFrapActualEsp=null;
var bEspecialistaP;
var desconexionV;

main();
traerMonitor();

/*
* Funcion principal
*/
function main(){
	 socket = io.connect('http://'+dirLocal+':'+puertoChat);
	 idUsuario="SITCRUM1";
	 nombreUsuario="Sitcrum";
	 hojaActual=0;
	 bEspecialista=true;
	 idEspecialista=null;
	 idFrapUsar=null;
	 pantallaCompleta=false;
	 divMensajeGen=$('.chatP');
	 ventanaChat=false;
	 bEspecialistaP=true;
	 desconexionV=true;
	 //poner las notificaciones en la parte superior-derecha
	 alertify.set('notifier','position', 'top-right');
}

/*
* Funcion para la obtencion de monitor
*/
function traerMonitor(){
	$.get("monitor", function(data) {
		$("body").append(data);
	});
}

/*
* Funcion para la obtencion de fechas en el expendiente
*/
function mostrarFlechas(){
	if($('#hoja'+(hojaActual+1)).html()!=undefined){
		 mostrar($('#fSiguiente'));
	}else{
			ocultar($("#fSiguiente"));
	}
	if($('#hoja'+(hojaActual-1)).html()!=undefined){
	 	mostrar($('#fAnterior'));
	}else{
		  ocultar($("#fAnterior"));
	}
}

/*
* Funcion para la obtencion de la posicion x para el cambio de paginas
*/
function obtnerPosicionX(posX){
	var  porcentajePantalla=($(document).innerWidth ()/100);
	if((posX/porcentajePantalla)>75){
		return porcentajePantalla*75;
	}
	return posX+30;
}

/*
* Funcion para Obtencion de la posicion x para el cambio de paginas
*/
function acomodarHojas(idFrapTerminar){
    if($('#'+idFrapTerminar).html()!=undefined){
			//obtener la hoja en la que se encuentra idFrap a terminar
	    var nodo=$('#'+idFrapTerminar).parent('.hoja');
			var hAct=parseInt($(nodo).attr('id').substring(4));
			var hojaQueda=hAct;
			var hSig=parseInt(hAct)+1;
			var copiaServicio;
			var idServicio;
			//ver si existe la hoja siguiente
			while($('#hoja'+hSig).html()!=undefined){
			  copiaServicio=$('#hoja'+hSig).children('.servicio').first().clone();
				idServicio=copiaServicio.attr('id');
				$('#'+idServicio).remove();
				$('#hoja'+hAct).append(copiaServicio);
				//ver que la hoja no se haya quedado vacia
				if($('#hoja'+hSig).html()==""){
					$('#hoja'+hSig).remove();
				}
				++hSig;
				++hAct;
			}
			$('#'+idFrapTerminar).remove();
			numFrapActivos=numFrapActivos-1;
			hAct=null;
			hSig=null;
			copiaServicio=null;
			if($('#hoja'+hojaActual).html()==undefined){
				hojaActual--;
			}
			$('#hoja'+hojaActual).removeClass('ocultar');
			mostrarFlechas();
			eventos();
		}
}

/*
* Funcion para clonar codigo html, para establecer un nuevo frap
*/
function crearNuevoFrap(datosUsuario, mensajes){
	var htmlServicio=$('#servicioClonar').clone();
	var hojaNum=buscarHoja();
	//buscar que exista en el html, la hoja que se va a usar
	if($('#hoja'+hojaNum).html()===undefined){
		//no existe esa hoja, por lo tanto se debe de agregar
		if(hojaNum!=0){
			$('.mainIndex').append('<div class="hoja ocultar" id="hoja'+hojaNum+'"></div>');
		}else{
			//solo la hoja
			$('.mainIndex').append('<div class="hoja" id="hoja'+hojaNum+'"></div>');
		}
	}
	//cambiar valores para mostrar en el nuevo servicio
	htmlServicio.attr("id",datosUsuario.idFrap);
	//cambiar id de boton enviar mensaje para facil acceso
	htmlServicio.children('.divChat').children('.chatEnviarChico').children('.chatEnviarEspacio').children('.chatAreaEnviar').attr("id","b_"+datosUsuario.idFrap);
	htmlServicio.children('.divChat').children('.chatEnviarChico').children('.chatEnviarEspacio').children('.chatAreaMensaje').children().attr("id","t_"+datosUsuario.idFrap);
	htmlServicio.children('.servicioHeader').children('.folio').children('.valorFolio').html(datosUsuario.idFrap);
	htmlServicio.children('.servicioHeader').children('.datosDescarga').children('.datosDesc').attr("id","idDescarga_"+datosUsuario.numSerie);
	htmlServicio.children('.servicioHeader').children('.titulo').children('.valorNombre').html(datosUsuario.nombreAmbulancia);
	htmlServicio.children('.servicioHeader').children('.especialistaD').children('.clickEsp').attr("id","e_"+datosUsuario.idFrap);
	htmlServicio.children('.servicioHeader').children('.pantallaD').children('.completaP').attr("id","p_"+datosUsuario.idFrap);
	htmlServicio.children('.divChat').children('.chatMensajes').removeClass('chatP');
	htmlServicio.children('.contenido').children('.contenidoR').children('.bpm').children('.valor').attr("id","bpm_"+datosUsuario.numSerie);
	htmlServicio.children('.contenido').children('.contenidoR').children('.temp').children('.valor').attr("id","temp_"+datosUsuario.numSerie);
	htmlServicio.children('.contenido').children('.contenidoR').children('.spo2').children('.valor').attr("id","spo2_"+datosUsuario.numSerie);
	htmlServicio.children('.contenido').children('.contenidoR').children('.nibp').children('.valor').attr("id","nibp_"+datosUsuario.numSerie);
	htmlServicio.children('.servicioHeader').children('.conect').children('img').attr('id',"idDes_"+datosUsuario.idFrap);
	//puede ponerse en esta hoja
	$('#hoja'+hojaNum).append(htmlServicio);
	//cambiar estado de conexion en imagen para la unidad
	if(datosUsuario.estado=='desconectado'){
		$("#"+datosUsuario.idFrap).addClass('desconectado');
		$("#idDes_"+datosUsuario.idFrap).attr("src","assets/desconectado.svg");
	  $("#idDes_"+datosUsuario.idFrap).attr("title","Unidad desconectada");
		$("#"+datosUsuario.idFrap).addClass('desconectado');
	}else if(datosUsuario.estado=='activo'){
		$("#"+datosUsuario.idFrap).addClass('conect');
		$("#idDes_"+datosUsuario.idFrap).attr("title","Unidad conectada");
	}
	numFrapActivos++;
	mostrarMensajes(mensajes, htmlServicio);
}

/**
* Funcion para conectar al room de un usuario especifico
*/
function connectRoom(obUsuario){
	socket.emit('connectRoomCrum', obUsuario.roomNum,  function(){
        agregarConversacion(obUsuario);
  });
}

/**
* Funcion para mostrar el mensaje recibido en la ventana indicada de frap
*/
function agregarMensajeIn(obMensaje,div){
	div.append('<div class="inChat"><label class="mensajeHora">'+obMensaje.nombreUsuario+' '+getHora(new Date(obMensaje.fecha))+'</label><label class="ventanaMensaje">'+obMensaje.mensaje+'</label></div>');
	try {//solo para controlar error cuando aun no se construlle el html
    div.scrollTop(div[0].scrollHeight);
	}catch(err) {}
}

/*
* Funcion para mostrar el mensaje del chat en la ventana indicada de conversacion
*/
function agregarMensajeSistema(obMensaje, div){
	div.append('<div class="mensajeMandar"><label class="msjDesconexion">'+obMensaje.mensaje+'</label></div>');
	//verificar si es una desconexion de ambulancia
	if(obMensaje.desconexion!=undefined){
		if(obMensaje.desconexion){
			$("#idDes_"+obMensaje.idFrap).attr("src","assets/desconectado.svg");
			$("#idDes_"+obMensaje.idFrap).attr("title","Unidad desconectada");
			$("#"+obMensaje.idFrap).addClass('desconectado');
			$("#"+obMensaje.idFrap).removeClass('conect');
			//bloquear para mandar chat
			if(pantallaCompleta){
				$('.estadoConexionP').attr("src","assets/desconectado.svg");
				$('.estadoConexionP').attr("title","Unidad desconectada");
			}
		}else{
			$("#idDes_"+obMensaje.idFrap).attr("src","assets/conectado.svg")
			$("#"+obMensaje.idFrap).addClass('conect');
			$("#"+obMensaje.idFrap).removeClass('desconectado');
			$("#idDes_"+obMensaje.idFrap).attr("title","Unidad conectada");
			if(pantallaCompleta){
				$('.estadoConexionP').attr("src","assets/conectado.svg");
				$('.estadoConexionP').attr("title","Unidad conectada");
			}
		}
	}
	try {//solo para controlar error cuando aun no se construlle el html
    div.scrollTop(div[0].scrollHeight);
	}catch(err) {}
}

/**
* Funcion para mostrar el mensaje enviardo en la ventana indicada de frap
*/
function agregarMensajeOut(obMensaje, div){
    div.append('<div class="mensajeMandar"><div class="outChat"><label class="mensajeHora">'+obMensaje.nombreUsuario+' '+getHora(new Date(obMensaje.fecha))+'</label><label class="ventanaMensaje">'+obMensaje.mensaje+'</label></div></div>');
		try {//solo para controlar error cuando aun no se construlle el html
	    div.scrollTop(div[0].scrollHeight);
		}catch(err) {}
}

/*
* Funcion para obtener la hora de un objeto tipo Date
*/
function getHora(date) {
	//return addZero(date.getHours()) + ":" + addZero(date.getMinutes());
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;
	return strTime;
}

/*
* Funcion complementaria para obtener la hora
*/
function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

/*
* Funcion para mandar el mensaje por el socket
*/
function mandarMensaje(ob){
	var idFrapEnviar=ob.attr('id').substring(2);

	//ver si el mensaje viene de la pantalla completa
	var mensajeEnviar;
	if(pantallaCompleta){
		mensajeEnviar=$.trim($('#tP_'+idFrapEnviar).val());
		$('#tP_'+idFrapEnviar).val('');
	}else{
		mensajeEnviar=$.trim($('#t_'+idFrapEnviar).val());
		$('#t_'+idFrapEnviar).val('');
	}
	if(isEmpy(mensajeEnviar)){
		var packChat={
		 'idFrap':idFrapEnviar,
		 'mensaje':mensajeEnviar,
		 'nombreUsuario':nombreUsuario,
		 'idUsuario':idUsuario,
		 'fecha': new Date()
	 	};
		//manda el mensaje al crum con grupo
	  socket.emit('chatSitcrum', packChat);
	}
}

/**
* Funcion para agregar los eventos
*/
function eventos(){
	 //primero desactivar eventos
	 quitarEventos();

	$('.chatAreaEnviar').click(function(){
		if(navigator.onLine){
			if(desconexionV){
					mandarMensaje($(this));
			}else{
				alertify.error("No hay conexión al servidor");
			}
		}else{
				alertify.error("No hay conexión a Internet");
		}
	});

	$('#fSiguiente').click(function(){
		if(bEspecialista){
			 var hojaSiguiente=hojaActual+1;
	 		 var hojaDespSig=hojaSiguiente+1;
	 		 if($('#hoja'+hojaSiguiente).html()!=undefined){

	 			 		//cambiar hojas para visualizar otros frap activos
	 					$('#hoja'+hojaSiguiente).removeClass("ocultar");
	 					$("#hoja"+hojaActual).addClass("ocultar");

	 					//buscar si hay hoja siguiente de la que se quiere cambiar
	 					if($('#hoja'+hojaDespSig).html()!=undefined){
							mostrar($("#fSiguiente"));
	 					}else{
							ocultar($("#fSiguiente"));
	 					}
						mostrar($("#fAnterior"));
	 					hojaActual=hojaSiguiente;
						acomodarMensajes(hojaSiguiente);
	 		 }
		}
	});

	$('#fAnterior').click(function(){
			if(bEspecialista){
				 var hojaAnterior=hojaActual-1;
				 var hojaDespAnterior=hojaAnterior-1;
				 if($('#hoja'+hojaAnterior).html()!=undefined){

							//cambiar hojas para visualizar otros frap activos
							$('#hoja'+hojaAnterior).removeClass("ocultar");
							$("#hoja"+hojaActual).addClass("ocultar");

							//buscar si hay hoja siguiente de la que se quiere cambiara
							if($('#hoja'+hojaDespAnterior).html()!=undefined){
									mostrar($("#fAnterior"));
							}else{
									ocultar($("#fAnterior"));
							}
							mostrar($("#fSiguiente"));
							hojaActual=hojaAnterior;
							acomodarMensajes(hojaAnterior);
				 }
			}
	});

	$('.clickEsp').click(function(e){
		//utilizado para saber cual es idFrap que esta usando la lista de los especialistas
		idFrapActualEsp=$(this).attr('id').substring(2);
		controlarEspecialistas($(this));
	});

	$('.completaP').click(function(){
		if(bEspecialista){
			//indicar que se encuentra en pantalla completa
			pantallaCompleta=true;
			var idFrapUsar=$(this).attr('id').substring(2);

			var numSerie=$('#'+idFrapUsar).children('.contenido').children('.contenidoR').children('.bpm').children('.valor').attr("id");
			numSerie=numSerie.substring(4,numSerie.length);
			// se le asigna al monitor en pantalla completa el id de la ambulancia para poder identificar los datos de los sensores y colocarlos
			// en las etiquetas correspondientes.
			$(".pantCompletaOcultar").attr("id","m_"+numSerie);
			// limpiar textos para colocar los nuevos signos del frap seleccionado.
			$(".indicadoresTextos").text("0");
			$("#tarValor").text("0/0");

			//obtener los valoares de la ambulancia
			var nombreAmbulancia=$('#'+idFrapUsar).children('.servicioHeader').children('.titulo').children('.valorNombre').html();
			//cambiar id de boton de chat con el idFrap a usar
			$('.btnEnviarMensaje').attr('id',"b_"+idFrapUsar);
			$('.txtMensajeMandar').attr('id',"tP_"+idFrapUsar);
			$('.evtEspecialistas').attr('id',"frap_"+idFrapUsar);
			//cambiar valores de la ambulancia para pantalla completa
			if($('#'+idFrapUsar).hasClass('desconectado')){
				$('.estadoConexionP').attr("src","assets/desconectado.svg");
				$('.estadoConexionP').attr("title","Unidad desconectada");
			}else if($('#'+idFrapUsar).hasClass('conectado')){
				$('.estadoConexionP').attr("src","assets/conectado.svg");
				$('.estadoConexionP').attr("title","Unidad conectada");
			}
			$('.nombreAmbulancia').html(nombreAmbulancia);
			$('.numeroFolio').html(idFrapUsar);
			ocultarFlechas();
			$(".pantCompletaOcultar").addClass("pantCompletaMostrar");
			//cambiar el estado del icono para mostrar si esta conectada la ambulancia
			obtenerMensajesIdFrap(idFrapUsar);
			$(document).trigger('inicializaGraficas');
		}
	});

	$('.cerrarMonitor').click(function(){
		 mostrarFlechas();
		 //indicar que se cerro el modo pantala completa
		 pantallaCompleta=false;
		 $('.chatMensajesP').html('');
		 $(".pantCompletaOcultar").removeClass("pantCompletaMostrar");
		 $(".pantCompletaOcultar").removeAttr( "id");

		 $('#iniciarChat').attr("src", "assets/chat.svg");
		 $('.chatmax').fadeOut();
		 $('.evtEspecialistas').attr("src", "assets/especialista.svg");
	 	 $(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
	 	 bEspecialista=true;
		 bEspecialistaP=true;
	});

	//eventos de pantalla completa
	$('#iniciarChat').click(function(){
		$('.chatmax').fadeIn();
		$('.chatMensajesP').scrollTop($('.chatMensajesP')[0].scrollHeight);
		$('#iniciarChat').attr("src", "assets/chatAct.svg");
		ventanaChat=true;
	});

	$('#cerrarChat').click(function(){
		 $('.chatmax').fadeOut();
		 $('#iniciarChat').attr("src", "assets/chat.svg");
		 ventanaChat=false;
	});

	//evento para mostrar los especialistas en pantalla completa
	$('.evtEspecialistas').click(function(){
		 mostrarEspPantallaC($(this));
	});

}

/*
* Funcion para mostrar la lista de especialistas
*/
function mostrarLstEspecialistas(obEsp){
	if(bEspecialista){
		var idFrap=obEsp.attr('id').substring(5);//idFrap
			//no esta presionado el boton de especialista
				obtenerEspecialistas(idFrap, function(){
					 var posX = obtnerPosicionX(obEsp.offset().left);
					 var posY = obEsp.offset().top+30;
					 obEsp.attr("src", "assets/especialistaAct.svg");
					 $(".lstEspecialistas").addClass("mostrarLstEspecialistas");
					 $(".lstEspecialistas").css({top: posY, left: posX});
					 bEspecialista=false;
				});
	}else{
		obEsp.attr("src", "assets/especialista.svg");
		$(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
		bEspecialista=true;
	}
}

/*
* Funcion para mostrar la lista de especialistas en pantalla completa
*/
function mostrarEspPantallaC(obEsp){
	if(bEspecialistaP){
		var idFrap=obEsp.attr('id').substring(5);//idFrap
			//no esta presionado el boton de especialista
				obtenerEspecialistas(idFrap, function(){
					 var posX = obtnerPosicionX(obEsp.offset().left);
					 var posY = obEsp.offset().top+30;
					 obEsp.attr("src", "assets/especialistaAct.svg");
					 $(".lstEspecialistas").addClass("mostrarLstEspecialistas");
					 $(".lstEspecialistas").css({top: posY, left: posX});
					 bEspecialistaP=false;
				});
	}else{
		obEsp.attr("src", "assets/especialista.svg");
		$(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
		bEspecialistaP=true;
	}
}


/*
* Funcion para mostrar la lista de los especialistas
*/
function controlarEspecialistas(obEsp){
	var idEspClick=obEsp.attr('id').substring(2);//idFrap
	if(bEspecialista){
			//no esta presionado el boton de especialista
				obtenerEspecialistas(idEspClick, function(){
					 idEspecialista=idEspClick;
					 var posX = obtnerPosicionX(obEsp.offset().left);
					 var posY = obEsp.offset().top+30;
					 obEsp.attr("src", "assets/especialistaAct.svg");
					 $(".lstEspecialistas").addClass("mostrarLstEspecialistas");
					 $(".lstEspecialistas").css({top: posY, left: posX});
					 bEspecialista=false;
				});
	}else{
			if(idEspecialista==idEspClick){
				 obEsp.attr("src", "assets/especialista.svg");
				 $(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
				 bEspecialista=true;
				 idEspecialista=null;
				 idFrapActualEsp=null;
		 }
	}
}

/*
* Funcion para asignar mensaje
*/
function obtenerMensajesIdFrap(idFrapUsar){
		socket.emit('obtenerMensajesIdFrap',idFrapUsar,function(mensajes) {
			mostrarMensajes(mensajes, $('.chatMensajesP'));
		});
}

/*
* Funcion para agregar el evento del especialista y enviar la invitacion al back-end
*/
function agregarEventoEspecialista(){
	$('.agregarEsp').click(function(){
		//solo se ejecuta accion de evento cuando el especialista esta en estado Libre
		if($(this).parent('.renEspecialista').children('.estadoE').html()=='Libre'){
			var idFrap=$(this).attr('id');
			var htmlEl=$('#'+idFrap).children('.servicioHeader').children('.datosDescarga').children('.datosDesc').attr("id");
			var datosEspecialista={
				username : $(this).parent('.renEspecialista').children('.ocultar').html(),
				idNitro : htmlEl.substring(11),
				idFrap : idFrap
			};
			if (confirm('¿Desea invitar al especialista '+$(this).parent('.renEspecialista').children('.nombreEspecialista').html()+"?")) {
				if(pantallaCompleta){
					//se encuentra en pantalla completa
					$('.evtEspecialistas').attr("src", "assets/especialista.svg");
					$(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
					bEspecialista=true;
					 mostrarEspPantallaC($(".evtEspecialistas"));
				}else{
						controlarEspecialistas($("#e_"+idFrap));
				}
				socket.emit('llamarEspecialista',datosEspecialista,function(respuesta) {
					alertify.success("Se ha enviado la solicitud al especialista");
				});
			}
		}
	});
}

/*
* Funcion para generar la lista dinamica de los especialistas
*/
function obtenerEspecialistas(idFrap, fn){
	if(navigator.onLine){
		var posting = $.post('/getEspecialistas');
		posting.done(function(respuesta) {
				var especialistas = JSON.parse(respuesta.replace(/&quot;/g, "\""));
				var div="";
				var imagenEsp;
				for(var i=0;i<especialistas.length;i++){
						imagenEsp="";
						if(especialistas[i].estatusServicio==='Libre'){
							imagenEsp='<img src="assets/agregarEsp.svg"/>';
						}else if(especialistas[i].estatusServicio==='Invitado'){
							imagenEsp='<img src="assets/invitado.svg"/>';
						}else if(especialistas[i].estatusServicio==='Ocupado'){
							imagenEsp='<img src="assets/ocupado.svg"/>';
						}
						div+='<div class="renEspecialista">'+
						'<div class="ocultar">'+especialistas[i].username+'</div>'+
						'<div class="ocultar estadoE">'+especialistas[i].estatusServicio+'</div>'+
						'<div class="especialidad">'+especialistas[i].especialidad+'</div>'+
						'<div class="nombreEspecialista">'+especialistas[i].name+'</div>'+
						'<div id="'+idFrap+'" class="agregarEsp">'+imagenEsp+'</div>'+
						'</div>';
				}
				$('.lstNombresEsp').html(div);
				agregarEventoEspecialista();
				div=null;
				fn();
	  });
		posting.fail(function(data) {
			alertify.error("Ocurrio un error en el servidor, intente de nuevo");
	  });
	}else{
		alertify.error("Error de conexión");
	}
}

/*
* Funcion para no mostrar las flechas de la navegacion
*/
function ocultarFlechas(){
	ocultar($("#fAnterior"));
	ocultar($("#fSiguiente"));
}

/*
* Funcion para desactivar eventos
*/
function quitarEventos(){
	$('.chatAreaEnviar').unbind( "click" );
	$('#fSiguiente').unbind( "click" );
	$('#fAnterior').unbind( "click" );
	$('.clickEsp').unbind( "click" );
	$('.completaP').unbind( "click" );
	$('.cerrarMonitor').unbind( "click" );
	$('.iniciarChat').unbind( "click" );
	$('.cerrarChat').unbind( "click" );
	$('.evtEspecialistas').unbind( "click" );
}

/*
* Funcion para la obtencion de mensajes del usuario en fuera de linea
*/
function mostrarMensajes(obMensajes,html){
	if(obMensajes!=undefined){
		var divMensajes;
		if(pantallaCompleta){
			divMensajes=html;
		}else{
			divMensajes=html.children('.divChat').children('.chatMensajes');
		}
		obMensajes.forEach(function(ob){
				if(ob.idUsuario===idUsuario){
				divMensajes.append('<div class="mensajeMandar"><div class="outChat"><label class="mensajeHora">'+ob.nombreUsuario+' '+getHora(new Date(ob.fecha))+'</label><label class="ventanaMensaje">'+ob.mensaje+'</label></div></div>');
				}else{
					divMensajes.append('<div class="inChat"><label class="mensajeHora">'+ob.nombreUsuario+' '+getHora(new Date(ob.fecha))+'</label><label class="ventanaMensaje">'+ob.mensaje+'</label></div>');
				}
		});
		try{
				divMensajes.scrollTop(divMensajes[0].scrollHeight);
		}catch(err){}

	}
}

/*
* Funcion para mostrar los mensajes mas recientes en cada conversacion
*/
function acomodarMensajes(hoja){
	var divMensajes;
	$("#hoja"+hoja).children(".servicio").each(function(divMensajes){
		divMensajes=$(this).children(".divChat").children(".chatMensajes");
		divMensajes.scrollTop(divMensajes[0].scrollHeight);
	});
}

function ocultar(ob){
	ob.removeClass("mostrar");
}

function mostrar(ob){
	ob.addClass("mostrar");
}

/*
* Funcion para recargar fraps activos al refrescar la pantalla
*/
function desplegarFrapsActivos(frapActi){
 numFrapActivos=0;
 $(".mainIndex").html('');
	frapActi.forEach(function(ob){
			crearNuevoFrap(ob.frap,ob.mensajes);
	});
	//obtener mensajes de cada frap
	main();
	mostrarFlechas();
	eventos();
}

/*
* Obtiene la hoja en la cual se pondra el nuevo frap activo
*/
function buscarHoja(){
	//se obtienen los servicios puestos en el html mas uno que se va agregar
	return (Math.floor(numFrapActivos/8));
}




$(document).ready(function() {
	//conectar socket de front sitcrum para ser guardado por el servidor  B
	socket.emit('conectarSocket', desplegarFrapsActivos);

	 /*
	 * Evento para saber que el socket se desconecto
	 */
	 socket.on('disconnect', function(){
		  desconexionV=false;
			alertify.error("Se ha perdido la conexión con el servidor");
	 });

	 /*
	* Evento para saber que el socket se desconecto
	*/
	socket.on('termanarFrapFront', function(idFrapTerminar){
			alertify.warning("El servicio "+idFrapTerminar+" ha sido terminado");
		//eliminar recuadro del frap terminado de la ventan principal
		acomodarHojas(idFrapTerminar);

		//ver si esta en pantalla completa para cerrar esta
		if(pantallaCompleta){
			var idFrapPantCom=$('.folioPantallaCompleta').html();
			if(idFrapTerminar==idFrapPantCom){
				 //se encuentra en pantalla completa
				 //mostrar flechas porque se va a ir a pagina de inicio
				 mostrarFlechas();
				 //indicar que se cerro el modo pantala completa
				 pantallaCompleta=false;
				 $('.chatMensajesP').html('');
				 $(".pantCompletaOcultar").removeClass("pantCompletaMostrar");
				 $(".pantCompletaOcultar").removeAttr( "id");

				 $('#iniciarChat').attr("src", "assets/chat.svg");
				 $('.chatmax').fadeOut();
				 $('.evtEspecialistas').attr("src", "assets/especialista.svg");
				 $(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
				 bEspecialista=true;
			}
		}else{
			//verificar si se esta usando la lista de especialistas
			if(idFrapTerminar==idFrapActualEsp){
				//la lista de especialistas se esta usando en el mismo frap que se termina
				$('#e_'+idFrapTerminar).attr("src", "assets/especialista.svg");
				$(".lstEspecialistas").removeClass("mostrarLstEspecialistas");
				bEspecialista=true;
				idEspecialista=null;
			}else if(!bEspecialista){
				//cambiar la posicion de la lista de especialistas
				var posX = obtnerPosicionX($('#e_'+idFrapActualEsp).offset().left);
				var posY = $('#e_'+idFrapActualEsp).offset().top+30;
				$(".lstEspecialistas").css({top: posY, left: posX});
			}
		}
	});


	 socket.on('reconnect', function(data){
		 alertify.success("Se ha restablecido la conexión con el servidor");
		//restablecer valores
		main();
		socket.emit('conectarSocket', desplegarFrapsActivos)
	 });

	 /*
	 * Funcion para conectarse a un nuevo frap, y clonar el html correspondiente
	 */
	socket.on('conectarseRoom', function(datosFrap){
	  alertify.success("Se ha iniciado un nuevo servicio "+datosFrap.idFrap);
		crearNuevoFrap(datosFrap);
		mostrarFlechas();
		eventos();
	});

	/**
	* Funcion para restablecer la coneccion de un frap que estaba desconectado
	*/
	socket.on('restablecerConexionFrap', function(idFrap,fn){
		var obMensaje={
		 "idFrap":idFrap,
		 "mensaje": "La ambulancia se conecto"
	 	};
		var divMensajes=$('#'+idFrap).children('.divChat').children('.chatMensajes');
	 	agregarMensajeSistema(obMensaje, divMensajes);
		fn(idFrap);
	});

   	/*
		* Funcion para recibir los mensajes
		*/
    socket.on('chatSitcrum', function(obMensaje){
					var divChatNor=$('#'+obMensaje.idFrap).children('.divChat').children('.chatMensajes');

					//es un mensaje del sistema
					if(obMensaje.sistema!=undefined){
						 //no es un mensaje que mande desde la central
							  //esta en pantalla completa
							  if(pantallaCompleta){
									//el idfrap del mensaje es el que tengo en la pantalla completa
									if($('.folioPantallaCompleta').html()==obMensaje.idFrap){
										//manda el mensaje a pantalla de chat de pantalla completa
										agregarMensajeSistema(obMensaje,$('.chatMensajesP'));
									}
								}
									//manda el mensaje a chat de ventanas por default
									agregarMensajeSistema(obMensaje,divChatNor);
					}else{
						//no es un mensaje que mande desde la central
						if(obMensaje.idUsuario!=idUsuario){
							//estoy en pantalla completa
							if(pantallaCompleta){
									//el idfrap del mensaje es el que tengo en la pantalla completa
									if($('.folioPantallaCompleta').html()==obMensaje.idFrap){
										//manda el mensaje a pantalla de chat de pantalla completa
									  agregarMensajeIn(obMensaje, $('.chatMensajesP'));
											//si la pantalla de chat no esta activa en pantalla completa, se cambia el icono de chat
										 if(!ventanaChat){
											 $('#iniciarChat').attr("src", "assets/chatActAlert.svg");
										 }
								   }
							 }
							      agregarMensajeIn(obMensaje, divChatNor);


						}else{
							//es un mensaje desde la central
							//estoy en pantalla completa
							if(pantallaCompleta){
								//el idfrap del mensaje es el que tengo en la pantalla completa
								if($('.folioPantallaCompleta').html()==obMensaje.idFrap){
									//manda el mensaje a pantalla de chat de pantalla completa
									agregarMensajeOut(obMensaje, $('.chatMensajesP'));
								 }
							}
							agregarMensajeOut(obMensaje, divChatNor);
						}
					}
    });
});


/*
* Funcion de utilidad para saber que una cadena no esta vacia
*/
function isEmpy(str){
	if($.trim(str)!='')
		return true;
	return false;
}
