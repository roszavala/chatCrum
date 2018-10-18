/******************************************************************************
 . Centro de Ingeniería y Desarrollo Industrial
 . Nombre del módulo:    scripts.js
 . Lenuaje:              Javascript
 . Propósito:            Archivo javascript del evento de Acceso al Sistema.

 . Desarrollado por:     Nataly Janeth Contreras Ramírez.
 ******************************************************************************/
 

function login()
{
    var reqPas=requerido('#txtPassword');
    var reqUs=requerido('#txtUsuario');

    if (reqPas && reqUs) {
            var usuario=$("#txtUsuario").val();
            var pass=$("#txtPassword").val();
    
            $.post("/login",{usuario:usuario,pass:pass},function(respuesta){
                if(respuesta==='si')
                {
                    window.location.href="/signosVitales";
                }
                else
                {
                    //alert("Usuario Incorrecto");
                    $('#lblMsjValida').text('Usuario Incorrecto');
                    $('#txtUsuario').val('');
                    $('#txtPassword').val('');
                }
            });
        

        
    }
}
$(document).ready(function(){
    var usuario,pass;
    $("#btnLogin").click(function(){
        login();
    });
    $('#txtPassword').keypress(function(event){
        if(event.keyCode===13)
            login();
    });
     /*
    * Funcion modificar el borde al precionar una tecla en todos los input
    */
    $("#txtPassword, #txtUsuario").keypress(function() {
        $(this).css({
        "border": "solid 1px #979797"
        });
    });
});

/*
 * Funcion para validar campo requerido
 */
function requerido(campo) {
    if ($.trim($(campo).val()) == '') {
      $(campo).css({
        "border": "2px solid red"
      });
      return false;
    }
    return true;
  }

