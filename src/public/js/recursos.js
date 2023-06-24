(function () {
  // ATRAPAR LA OPCION CREADA EN EL SELECTOR Y MANDARLO A UN INPUT HIDDEN 
  $(document).ready(function () {
    function selectBuscar(id, categoriaHiddenId) {
      id.chosen({
        no_results_text: "Sin resultados para",
        allow_single_deselect: true,
        placeholder_text_single: "Selecciona una opción",
        width: '100%',
      });

      const campoBusqueda = id.next('.chosen-container').find('.chosen-search input');
      const categoriaHidden = $('#' + categoriaHiddenId);

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
          const opcionSeleccionada = id.find(":selected").val();

          categoriaHidden.val(opcionSeleccionada);
        }
      });
    }

    const claseCajaGeneralCargar = $('#categoriaSelectCargar');
    selectBuscar(claseCajaGeneralCargar, 'categoriaHiddenCargar');

    const claseCajaGeneralConectar = $('#categoriaSelectConectar');
    selectBuscar(claseCajaGeneralConectar, 'categoriaHiddenConectar');
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

// Función para crear el campo de título
function crearCampoTitulo() {
  const inputTitulo = document.createElement("input");
  inputTitulo.type = "text";
  inputTitulo.classList.add("form-control", "campo");
  inputTitulo.style.color = "black";
  inputTitulo.placeholder = "Ingrese el título aquí";
  inputTitulo.id = "titulo" + contadorTitulo;

  const campoContainer = document.createElement("div");
  campoContainer.classList.add("campo-container");
  campoContainer.appendChild(inputTitulo);
  addIconoEliminar_(campoContainer, inputTitulo)

  contadorTitulo++;
  contenido.appendChild(campoContainer);
  inputTitulo.focus();
  inputTitulo.addEventListener("blur", handleCampoBlur);
}

// Función para crear el campo de descripción
function crearCampoDescripcion() {
  const textarea = document.createElement("textarea");
  textarea.classList.add("form-control", "campo_descrip");
  textarea.placeholder = "Agrega algo de texto";
  textarea.style.color = "black";
  textarea.style.resize = "none"; // Quitar la capacidad de redimensionar
  textarea.id = "descripcion" + contadorDescripcion;

  const campoContainer = document.createElement("div");
  campoContainer.classList.add("campo-container");
  campoContainer.appendChild(textarea);
  addIconoEliminar_(campoContainer, textarea)

  contadorDescripcion++;
  contenido.appendChild(campoContainer);
  
  // Ajustar la altura del textarea en función de su contenido
  textarea.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });
  textarea.focus();
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

  const campoContainer = document.createElement("div");
  campoContainer.classList.add("campo-container");
  campoContainer.appendChild(hr);
  addIconoEliminar_(campoContainer, hr)
  contadorHr++;
  contenido.appendChild(campoContainer);
}

// Función para crear el campo de URL
function crearCampoUrl() {
  const inputUrl = document.createElement("input");
  inputUrl.type = "text";
  inputUrl.placeholder = "Ingrese la URL";
  inputUrl.classList.add("form-control", "campo_url");
  inputUrl.style.color = "black";
  inputUrl.id = "url" + contadorUrl;
  inputUrl.focus();

  const tabla = document.createElement("table");
  const fila = document.createElement("tr");
  tabla.appendChild(fila)
  const columnaBorrar = document.createElement("td");

  const botonBorrarUrl = document.createElement("i");
  botonBorrarUrl.classList.add("fas", "fa-trash-alt");
  botonBorrarUrl.style.color = "red";
  botonBorrarUrl.style.opacity = 0; // Inicialmente oculto
  botonBorrarUrl.style.transition = 'opacity 0.3s ease 0s'

  // Mostrar el ícono de borrar al pasar el cursor sobre la fila
  fila.addEventListener("mouseover", function () {botonBorrarUrl.style.opacity = 1;});
  // Ocultar el ícono de borrar al sacar el cursor de la fila
  fila.addEventListener("mouseout", function () {botonBorrarUrl.style.opacity = 0;});
  botonBorrarUrl.addEventListener("click", function () {
    fila.remove();
    borrarCampo(inputUrl.id); // Llamada a la función para eliminar el campo en el controlador
  });
  columnaBorrar.appendChild(botonBorrarUrl);

  const columnaIcono = document.createElement("td");
  const iconoUrl = document.createElement("img");
  iconoUrl.style.margin = "15px";
  iconoUrl.classList.add("icono-url");
  columnaIcono.appendChild(iconoUrl);

  const columnaUrl = document.createElement("td");
  columnaUrl.style.width = "100%";
  columnaUrl.appendChild(inputUrl);

  fila.appendChild(columnaBorrar);
  fila.appendChild(columnaIcono);
  fila.appendChild(columnaUrl);


  inputUrl.addEventListener("input", function () {
    const url = inputUrl.value;
    const domain = obtenerDominio(url);
    const icono = obtenerIconoPorDominio(domain);
    let numeroIcono = obtenerNumeroIconoPorDominio(domain);

    // Mostrar el icono correspondiente
    if (icono) {
      iconoUrl.src = icono;
      iconoUrl.style.display = "inline-block";
    } else {
      iconoUrl.src = "";
      iconoUrl.style.display = "none";
    }

    // Almacenar el número de icono en el atributo data del inputUrl
    inputUrl.setAttribute("data-numero-icono", numeroIcono);
  });

  contadorUrl++;
  contenido.appendChild(fila);
  inputUrl.focus()
  inputUrl.addEventListener("blur", handleCampoBlur);
}

// Función para obtener el dominio de una URL
function obtenerDominio(url) {
  const parser = document.createElement("a");
  parser.href = url;
  return parser.hostname;
}

// Función para obtener el icono correspondiente según el dominio
function obtenerIconoPorDominio(domain) {
  const dominios = {
    "drive.google.com": "../logos_recursos/Archivo_Google_Drive.svg",
    "youtube.com": "../logos_recursos/Video_Youtube.svg",
    "vimeo.com": "../logos_recursos/Video_Vimeo.svg",
    "notion.so": "../logos_recursos/notion.svg"
  };

  if (domain.includes('www.'))
    domain = domain.split('www.')[1]

  return dominios[domain] || "../logos_recursos/Pagina_Web.svg";
}

// Obtener el número correcto de cada url ingresado
function obtenerNumeroIconoPorDominio(domain) {
  let numeroIcono;

  switch (domain) {
    case "youtube.com":
      numeroIcono = 1;
      break;
    case "vimeo.com":
      numeroIcono = 2;
      break;
    case "notion.so":
      numeroIcono = 3;
      break;
    case "drive.google.com":
      numeroIcono = 4;
      break;
    default:
      numeroIcono = 5;
      break;
  }

  return numeroIcono;
}

// Función para crear el campo de file
function crearCampoArchivo() {
  const inputFile = document.createElement("input");
  inputFile.type = "file";
  inputFile.name = "file" + contadorFile;
  inputFile.style.display = "none";

  const tabla = document.createElement("table");
  const campoArchivoContainer = document.createElement("tr");
  tabla.appendChild(campoArchivoContainer)

  const archivoIcono = document.createElement("td");
  archivoIcono.innerHTML = `<img src="../logos_recursos/cargar_Archivo.svg" style="margin-left: 19px;" class="icono-cargar-archivo">`;

  campoArchivoContainer.addEventListener("mouseover", function() {
    botonBorrarArchivo.style.opacity = 1;
  });

  campoArchivoContainer.addEventListener("mouseout", function() {
    botonBorrarArchivo.style.opacity = 0;
  });

  archivoIcono.addEventListener("click", function() {
    inputFile.click();
  });

  const nombreArchivo = document.createElement("td");
  nombreArchivo.classList.add("nombre-archivo");

  const botonBorrarArchivo = document.createElement("td");
  botonBorrarArchivo.style.color = 'red'
  botonBorrarArchivo.style.opacity = 0
  botonBorrarArchivo.style.transition = 'opacity 0.3s ease 0s'
  botonBorrarArchivo.innerHTML = `<i class="fas fa-trash-alt"></i>`;

  botonBorrarArchivo.addEventListener("click", function () {
    campoArchivoContainer.remove();
    borrarCampo(inputFile.name); // Llamada a la función para eliminar el campo en el controlador
  });

  campoArchivoContainer.appendChild(botonBorrarArchivo);
  campoArchivoContainer.appendChild(archivoIcono);
  campoArchivoContainer.appendChild(nombreArchivo);
  contenido.appendChild(campoArchivoContainer);
  contadorFile++;

  inputFile.addEventListener("change", function(event) {
    const archivo = event.target.files[0];
    const extension = obtenerExtensionArchivo(archivo.name);
    const icono = obtenerIcono(extension);
    archivoIcono.innerHTML = `<img src="${icono}" style="margin:15px" class="icono-cargar-archivo">`;
  
    // Limitar la longitud del nombre del archivo a mostrar
    const MAX_LONGITUD_NOMBRE = 20;
    let nombreArchivoMostrado = archivo.name;
    let nombreSinExtension = archivo.name.substr(0, archivo.name.lastIndexOf('.'));
    let extensionArchivo = archivo.name.substr(archivo.name.lastIndexOf('.'));
    
    if (nombreSinExtension.length > MAX_LONGITUD_NOMBRE) {
      nombreSinExtension = nombreSinExtension.substring(0, MAX_LONGITUD_NOMBRE) + "...";
      nombreArchivoMostrado = nombreSinExtension + extensionArchivo;
    }
    
    nombreArchivo.textContent = nombreArchivoMostrado;

    const extensiones = {
      'doc': 1,
      'docx': 1,
      'pdf': 2,
      'ppt': 3,
      'pptx': 3,
      'xls': 4,
      'xlsx': 4,
      'jpg': 5,
      'jpeg': 5,
      'png': 5
    };
    const numeroIcono = extensiones[extension] || 6;
    
    const archivos = event.target.files;
    const formData = new FormData();
    formData.append("id", inputFile.name);
    formData.append("valor", archivos[0].name);
    formData.append("tipo", "5");
    formData.append("numeroIcono", numeroIcono.toString());

    for (let i = 0; i < archivos.length; i++) {
      formData.append("archivos", archivos[i]);
    }

    fetch("/guardar-grupo", {
      method: "POST",
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

// Función para obtener la extensión de un archivo
function obtenerExtensionArchivo(nombreArchivo) {
  return nombreArchivo.split('.').pop();
}

// Función para obtener el icono correspondiente a una extensión de archivo
function obtenerIcono(extension) {
  switch (extension) {
    case 'doc':
    case 'docx':
    case 'docm':
      return "../logos_recursos/Documento_Word.svg";
    case 'pdf':
      return "../logos_recursos/Documento_PDF.svg";
    case 'ppt':
    case 'pptx':
    case 'pptm':
    case 'potx':
      return "../logos_recursos/Documento_PowePoint.svg";
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'xltx':
      return "../logos_recursos/Documento_Excel.svg";
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'psd':
    case 'ai':
    case 'tiff':
      return "../logos_recursos/Archivo_imagen.svg";
    default:
      return "../logos_recursos/Otro.svg";
  }
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
  select.selectedIndex = 0;
});

function handleCampoBlur(event) {
  const valorCampo = event.target.value, campoId = event.target.id;
  let tipoCampo;
  
  // Determinar el tipo de campo según su ID
  if (campoId.startsWith('titulo')) {
    tipoCampo = '1'; // Tipo 1 para títulos
  } else if (campoId.startsWith('descripcion')) {
    tipoCampo = '2'; // Tipo 2 para descripcion
  } else if (campoId.startsWith('url')) {
    tipoCampo = '4'; // Tipo 4 para url
  }

  // Obtener el número de icono desde el atributo data del inputUrl
  let numeroIcono = event.target.getAttribute("data-numero-icono");
  console.log("Número de icono:", numeroIcono);
  console.log("campoId:", campoId);

  // Ejemplo: enviar el valor del campo al controlador mediante fetch
  fetch('/guardar-grupo', {
    method: 'POST',
    body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo, numeroIcono:numeroIcono }),
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

// ELIMINANDO GRUPO DE RECURSOS
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
          if (response)
            location.reload();
          else
            Swal.fire(
              'Error!',
              'Error al borrar el grupo.',
              'error'
            )
        });
    }
  })
}

// ELIMINAR CAMPOS CREADOS POR 1ERA VEZ
function borrarCampo(idCampo) {
  console.log("........ ID CAMPO -.-.-.-.-.- .........", idCampo);
  fetch("/eliminarCampo", {
    method: "POST",
    body: JSON.stringify({ idCampo, idGrupo: false }),
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Campo eliminado:", data);
    })
    .catch((error) => {
      console.log("Error al eliminar campo:", error);
    });
}

// AGREGAR ICONO ELIMINAR A CADA ELEMENTO
function addIconoEliminar_(campoContainer, nuevoCampo) {
  const btnBorrar = document.createElement("i");
  btnBorrar.classList.add("fas", "fa-trash-alt");
  btnBorrar.style.color = "red";
  btnBorrar.style.opacity = "0"; // Establecer la opacidad inicialmente a 0
  btnBorrar.style.transition = "opacity 0.3s"; // Agregar la transición de opacidad
  
  btnBorrar.addEventListener("click", function () {
    campoContainer.remove();
    borrarCampo(nuevoCampo.id); // Llamada a la función para eliminar el campo en el controlador
  });

  campoContainer.addEventListener("mouseover", function () {
    btnBorrar.style.opacity = 1; // Mostrar el ícono de borrar
  });

  campoContainer.addEventListener("mouseout", function () {
    btnBorrar.style.opacity = 0; // Ocultar el ícono de borrar
  });

  campoContainer.appendChild(btnBorrar);
}