

// :: CONECTAR LINK ::

(function () {
    // ATRAPAR LA OPCION CREADA EN EL SELECTOR Y MANDARLO A UN INPUT HIDDEN 
    $(document).ready(function () {
      function selectBuscar(id) {
        id.chosen({
          no_results_text: "Sin resultados para",
          allow_single_deselect: true,
          placeholder_text_single: "Selecciona una opción",
          width: '100%',
        });
  
        const campoBusqueda = id.next('.chosen-container').find('.chosen-search input');
        const categoriaHidden = $('#categoriaHidden');
  
        campoBusqueda.on('change', function () {
          const valorBusqueda = campoBusqueda.val().trim();
  
          const opcionExistente = id.find('option[value="' + valorBusqueda + '"]');
          if (opcionExistente.length) {
            opcionExistente.prop('selected', true);
            categoriaHidden.val(valorBusqueda);
          } else {
            id.prepend('<option value="' + valorBusqueda + '">' + valorBusqueda + '</option>');
            id.val(valorBusqueda);
            categoriaHidden.val(valorBusqueda);
          }
  
          id.trigger('chosen:updated');
        });
  
        $(document).on('click', function (e) {
          if (!$(e.target).closest('.chosen-container').length) {
            const opcionSeleccionada = id.val();
  
            categoriaHidden.val(opcionSeleccionada);
          }
        });
      }
  
      const claseCajaGeneral = $('.sltBuscar');
      selectBuscar(claseCajaGeneral);
    });
    
  })();

//   PARA MOSTRAR CIERTA PARTE DE NOMBRES LARGOS EN LA TABLA
document.addEventListener("DOMContentLoaded", function() {
    var truncatedCells = document.getElementsByClassName("truncated-cell");
    for (var i = 0; i < truncatedCells.length; i++) {
      var cell = truncatedCells[i];
      var maxWidth = parseFloat(window.getComputedStyle(cell).maxWidth);
      var text = cell.textContent.trim();
      if (cell.offsetWidth < cell.scrollWidth) {
        while (cell.offsetWidth < cell.scrollWidth && text.length > 0) {
          text = text.slice(0, -1);
          cell.textContent = text + "...";
        }
      }
    }
  });

//   ELIMINANDO RECURSOS SUELTOS
function eliminarRecurso(id) {
    Swal.fire({
    title: '¿Seguro de eliminar este recurso?',
    text: "Se quitara de tu lista de recursos.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#50368C',
    cancelButtonColor: '#d33',
    cancelButtonText: 'Cancelar',
    confirmButtonText: '¡Sí, Borrar!'
    }).then((result) => {
    if (result.isConfirmed) {
        fetch('/eliminarRecurso', {
        method: 'POST',
        body: JSON.stringify({id}),
        headers: {'Content-Type': 'application/json'}
        }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(response => {
            if (response) {
            location.reload();
            } else {
            Swal.fire(
                'Error!',
                'Error al borrar el recurso.',
                'error'
            )
            }
        });
        
    }
    })
}

// ============ FIN CONECTAR LINK ============

  // :: GRUPO RECURSOS ::
// :: PARA CAPTURAR EL COLOR DEL GRUPO ::
// Obtener los botones de selección de color
let colorButtons = document.querySelectorAll('.colorButton');
let colorGrupoInput = document.getElementById("colorGrupoInput");

// Agregar evento de clic a los botones de color
colorButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    // Remover la clase 'selected' de todos los botones
    colorButtons.forEach(function(btn) {
      btn.classList.remove('selected');
    });

    // Agregar la clase 'selected' al botón clicado
    this.classList.add('selected');

    // Obtener el color seleccionado
    let selectedColor = this.getAttribute('data-color');

    // Guardar el color seleccionado en el campo de entrada oculto
    colorGrupoInput.value = selectedColor;
  });
});

// Obtener elementos del DOM
const select = document.getElementById("opciones");
const contenido = document.getElementById("contenido");

// Variables de contador para cada tipo de campo
let contadorTitulo = 1, contadorDescripcion = 1;
let contadorUrl = 1, contadorHr = 1, contadorFile = 1

// Función para crear el campo de titulo
function crearCampoTitulo() {
  const inputTitulo = document.createElement("input");
  inputTitulo.type = "text";
  inputTitulo.classList.add("form-control", "campo");
  inputTitulo.style.color = "black";
  inputTitulo.placeholder = "Ingrese el título aquí";
  inputTitulo.id = "titulo" +  contadorTitulo

  const campoTituloContainer = document.createElement("div");
  campoTituloContainer.classList.add("campo-container");

  const tituloContainer = document.createElement("div");
  tituloContainer.classList.add("titulo-container");
  tituloContainer.appendChild(inputTitulo);

  const botonBorrarTitulo = document.createElement("i");
  botonBorrarTitulo.classList.add("fas", "fa-trash-alt", "icono-borrar");
  botonBorrarTitulo.style.color = "red";
  botonBorrarTitulo.addEventListener("click", function() {
    contenido.removeChild(campoTituloContainer);
  });

  campoTituloContainer.appendChild(tituloContainer);
  campoTituloContainer.appendChild(botonBorrarTitulo);

  contenido.appendChild(campoTituloContainer);
  inputTitulo.addEventListener('blur', handleCampoBlur);
  contadorTitulo++
}

// Función para crear el campo de descripción
function crearCampoDescripcion() {
  const textarea = document.createElement("textarea");
  textarea.classList.add("form-control", "campo_descrip");
  textarea.placeholder = "Agrega algo de texto";
  textarea.style.color = "black";
  textarea.style.resize = "none"; // Quitar la capacidad de redimensionar
  textarea.id = "descripcion" + contadorDescripcion

  const campoDescripcionContainer = document.createElement("div");
  campoDescripcionContainer.classList.add("campo-container");
  campoDescripcionContainer.appendChild(textarea);

  const botonBorrarDescripcion = document.createElement("i");
  botonBorrarDescripcion.classList.add("fas", "fa-trash-alt", "icono-borrar");
  botonBorrarDescripcion.style.color = "red";
  botonBorrarDescripcion.addEventListener("click", function() {
    contenido.removeChild(campoDescripcionContainer);
  });

  campoDescripcionContainer.appendChild(botonBorrarDescripcion);

  contenido.appendChild(campoDescripcionContainer);
  contadorDescripcion++
  // Ajustar la altura del textarea en función de su contenido
  textarea.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

    textarea.addEventListener('blur', handleCampoBlur);
}

// Función para crear el separador
function crearSeparador() {
  const hr = document.createElement("hr");
  hr.style.border = "1px solid #5c5c5c";
  hr.classList.add("separador");
  hr.id = "separador" + contadorHr;

  // Agregar los valores al separador
  const campoId = hr.id;
  const valorCampo = "hr";
  const tipoCampo = "3";

  // Ejemplo: enviar el valor del separador al controlador mediante fetch
  fetch('/guardar-grupo', {
    method: 'POST',
    body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.json())
    .then(data => {
      console.log("Separador creado:", data);
    })
    .catch(error => {
      console.error('Error al crear separador:', error);
    });

  const separadorContainer = document.createElement("div");
  separadorContainer.classList.add("campo-container");
  separadorContainer.appendChild(hr);

  const botonBorrarSeparador = document.createElement("i");
  botonBorrarSeparador.classList.add("fas", "fa-trash-alt", "icono-borrar");
  botonBorrarSeparador.style.color = "red"; // Cambiar el color del icono a rojo
  botonBorrarSeparador.addEventListener("click", function() {
    contenido.removeChild(separadorContainer);
  });

  separadorContainer.appendChild(botonBorrarSeparador);

  contenido.appendChild(separadorContainer);
  contadorHr++;
}

// Función para crear el campo de URL
function crearCampoUrl() {
  const inputUrl = document.createElement("input");
  inputUrl.type = "text";
  inputUrl.placeholder = "Ingrese la URL";
  inputUrl.classList.add("form-control","campo_url");
  inputUrl.style.color = "black"; // Cambiar el color del icono a rojo
  inputUrl.id = "url" + contadorUrl

  const campoUrlContainer = document.createElement("div");
  campoUrlContainer.classList.add("campo-container");
  campoUrlContainer.appendChild(inputUrl);

  const botonBorrarUrl = document.createElement("i");
  botonBorrarUrl.classList.add("fas", "fa-trash-alt", "icono-borrar");
  botonBorrarUrl.style.color = "red"; // Cambiar el color del icono a rojo
  botonBorrarUrl.addEventListener("click", function() {
    contenido.removeChild(campoUrlContainer);
  });

  campoUrlContainer.appendChild(botonBorrarUrl);

  contenido.appendChild(campoUrlContainer);
  contadorUrl++
  inputUrl.addEventListener('blur', handleCampoBlur);
}

// Función para crear el campo de archivo
function crearCampoArchivo() {
  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.name = "file" + contadorFile;

  const campoArchivoContainer = document.createElement("div");
  campoArchivoContainer.classList.add("campo-container");
  campoArchivoContainer.appendChild(inputFile);

  const botonBorrarArchivo = document.createElement("i");
  botonBorrarArchivo.classList.add("fas", "fa-trash-alt", "icono-borrar");
  botonBorrarArchivo.style.color = "red"; // Cambiar el color del icono a rojo
  botonBorrarArchivo.addEventListener("click", function() {
    contenido.removeChild(campoArchivoContainer);
  });

  campoArchivoContainer.appendChild(botonBorrarArchivo);
  contenido.appendChild(campoArchivoContainer); 
  contadorFile++;

  inputFile.addEventListener('change', function(event) {
    const archivos = event.target.files;

    // Crear un objeto FormData para enviar los datos y los archivos al controlador
    const formData = new FormData();
    formData.append('id', inputFile.name);
    formData.append('valor', archivos[0].name);
    formData.append('tipo', '5'); // Tipo 5 para archivos

    // Agregar los archivos al FormData
    for (let i = 0; i < archivos.length; i++) {
      formData.append('archivos', archivos[i]);
    }

    // Ejemplo: enviar el FormData al controlador mediante fetch
    fetch('/guardar-grupo', {
      method: 'POST',
      body: formData,
    })
      .then(response => response.json())
      .then(data => {
        // ...
      })
      .catch(error => {
        // ...
      });
  });
}

// Evento change del selector de opciones
select.addEventListener("change", function() {
  const opcionSeleccionada = select.value;
  switch (opcionSeleccionada) {
    case "titulo":
      crearCampoTitulo();
      break;
    case "descripcion":
      crearCampoDescripcion();
      break;
    case "separador":
      crearSeparador();
      break;
    case "url":
      crearCampoUrl();
      break;
    case "archivo":
      crearCampoArchivo();
      break;
  }
});

function handleCampoBlur(event) {
    const valorCampo = event.target.value;
    const campoId = event.target.id;

    let tipoCampo;
  
    // Determinar el tipo de campo según su ID
    if (campoId.startsWith('titulo')) {
        tipoCampo = '1'; // Tipo 1 para títulos
    } else if (campoId.startsWith('descripcion')) {
        tipoCampo = '2'; // Tipo 2 para descripcion
    } else if (campoId.startsWith('url')) {
        tipoCampo = '4'; // Tipo 4 para url
    }

    // Ejemplo: enviar el valor del campo al controlador mediante fetch
    fetch('/guardar-grupo', {
        method: 'POST',
        body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo }),
        headers: { 'Content-Type': 'application/json'}
      })
        .then(response => response.json())
        .then(data => {
        //console.log("TODO BIEN");
        })
        .catch(error => {
       // console.log("TODO MAL");
        });
}

//   ELIMINANDO GRUPO DE RECURSOS
function eliminarGrupo(id) {
    Swal.fire({
    title: '¿Seguro de eliminar este recurso ?',
    text: "Se quitara de tu grupos de recursos.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#50368C',
    cancelButtonColor: '#d33',
    cancelButtonText: 'Cancelar',
    confirmButtonText: '¡Sí, Borrar!'
    }).then((result) => {
    if (result.isConfirmed) {
        fetch('/eliminarGrupo', {
        method: 'POST',
        body: JSON.stringify({id}),
        headers: {'Content-Type': 'application/json'}
        }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then(response => {
            if (response) {
            location.reload();
            } else {
            Swal.fire(
                'Error!',
                'Error al borrar el grupo.',
                'error'
            )
            }
        });
        
    }
    })
}