/******************************************************************************
 . Centro de Ingeniería y Desarrollo Industrial
 . Nombre del módulo:    scripts.js
 . Lenuaje:              Javascript
 . Propósito:            Archivo javascript que contiene todo el javascript de la pagina del visor

 . Desarrollado por:     Nataly Janeth Contreras Ramírez.
 ******************************************************************************/
var dirSocket=dirLocal+":"+puertoSocket;


$( document ).ready(function() {

    ConectaGraficas();
    traerMonitor();
    eventosIndex();


    /*
        funciones para mostrar o ocultar monitor del visor.
     */
    function traerMonitor(){
    $.get("monitor", function(data) {
      $('.mainIndex').append(data);
            eventosMonitor();
     });
    }

    function eventosMonitor(){
    $('.cerrarMonitor').click(function(){
       $(".pantCompletaOcultar").removeClass("pantCompletaMostrar");
    });
    }

    function eventosIndex(){
    $('.cerrarChat').click(function(){
       $('.divChat').fadeOut(1,function(){
         $('.signos').fadeIn();
       });
     });

     $('.chat').click(function(){
      $('.signos').fadeOut(1,function(){
        $('.divChat').fadeIn();
         eventosIndex();
      });
     });

     $(document).on('inicializaGraficas',function(){
        inicializaGraficas();
     });
    }

    $("#salir").click(function(){
        var salir = confirm("¿Desea cerrar sesión?");
        if(salir)
            window.location.href="/logout";
    });
});

/*
 Cuando carga la pagina puede empezar a inicializar las graficas y la conexion de los sockets.
 */

function ConectaGraficas() {

    socket = io.connect(dirSocket);

    // Add a connect listener
    socket.on('connect',function() {
        console.log('Visor conecatado correctamente al servidor');
    });


    /*
     Eventos para revicir los paquetes de cada sensor.
     */

    socket.on('ECG', function (datos) {

        $('#idDescarga_'+datos.id_ambulancia).html(datos.acumulado);

        actualizar(datos);

    });

    socket.on('TAR', function (datos) {
        tar_Actualizar(datos);
    });

    socket.on('CAP', function (datos) {
        cap_Actualizar(datos);
    });

    socket.on('SPO', function (datos) {
       console.log(datos);
       spo_Actualizar(datos);
    });


    socket.on('TMP', function (dato) {
        $('#temp_'+dato.id_ambulancia).text(dato.temperatura);
        if($('#m_'+dato.id_ambulancia).length)
            $('#tmp').text(dato.temperatura);
    });

    socket.on('FRE',function(dato){
        $('#bpm_'+dato.id_ambulancia).text(dato.frecuencia);
        if($('#m_'+dato.id_ambulancia).length)
            $('#bmp').text(dato.frecuencia);
    });

}

function inicializaGraficas()
{
    /*
     Establece las condiciones iniciales de cada uno de los sensores
     */
    ecg_inicializar();
    cap_inicializar();
    spo_inicializar();
}

/*
     Llamada para actualizar la información del ECG en el front
 */
var actualizar = function(datos) {
    nuevoDato(datos);
};

/*
 Funcion que agrega el espacio sin lineas que indica el movimiento de la grafica.
 */
function drawSpaceBlack(anchoPuntero,grafica,CoordenadaX,Y_NoVisible,ventana)
{
    for(var i=0;i<anchoPuntero;i++)
    {
        if(CoordenadaX+i>=ventana)return;
        grafica.options.data[0].dataPoints[CoordenadaX+i] = {
            x: CoordenadaX + i,
            y: Y_NoVisible
        };
    }
}
