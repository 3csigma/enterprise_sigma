// Obtener elementos del DOM
const selectorEdit = document.getElementById("opcionesEdit");
const contenidosEdit = document.getElementById("contenidoEdit");

// Variables de contador para cada tipo de campo
let contador = document.getElementById("contador").value;
contador = JSON.parse(contador)

const contadores = { c1:1, c2:1, c3:1, c4:1}
const banderas = { b1:false, b2:false, b3:false, b4:false}

// Función para crear el campo de título
function crearCampoTituloEdit(edit = false) {
  const aggTitulo = document.createElement("input");
  aggTitulo.type = "text";
  aggTitulo.classList.add("form-control", "campo");
  aggTitulo.style.color = "black";
  aggTitulo.style.width = "100%";
  aggTitulo.placeholder = "Ingrese el título aquí";

  if (edit) {
    if (!banderas.b1) {
      contadores.c1 = contador.t1 + 1;
      banderas.b1 = true;
    }
  }
  aggTitulo.id = "titulo" + contadores.c1;

  const campoContainer = document.createElement("div");
  campoContainer.classList.add("campo-container");

  const tituloContainer = document.createElement("div");
  tituloContainer.classList.add("titulo-container");
  tituloContainer.appendChild(aggTitulo);

  const iconBorrar = document.createElement("i");
  iconBorrar.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrar.style.color = "red";
  iconBorrar.style.opacity = "0"; // Establecer la opacidad inicialmente en 0

  campoContainer.appendChild(tituloContainer);
  campoContainer.appendChild(iconBorrar);

  // Agregar la transición suave al ícono de borrar
  iconBorrar.style.transition = "opacity 0.3s";

  // Agregar el evento de mouseover al campo para mostrar el ícono de borrar
  campoContainer.addEventListener("mouseover", function () {
    iconBorrar.style.opacity = "1";
  });

  // Agregar el evento de mouseout al campo para ocultar el ícono de borrar
  campoContainer.addEventListener("mouseout", function () {
    iconBorrar.style.opacity = "0";
  });

  iconBorrar.addEventListener("click", function () {
    contenidosEdit.removeChild(campoContainer);
  });

  contenidosEdit.appendChild(campoContainer);

  aggTitulo.addEventListener("blur", handleCampoBlur2);
  contadores.c1++;
}

// Función para crear el campo de descripción
function crearCampoDescripcionEdit(edit = false) {
  const textDes = document.createElement("textarea");
  textDes.classList.add("form-control", "campo_descrip");
  textDes.placeholder = "Agrega algo de texto";
  textDes.style.color = "black";
  textDes.style.resize = "none"; // Quitar la capacidad de redimensionar

  if (edit) {
    if (!banderas.b2) {
      contadores.c2 = contador.t2 + 1;
      banderas.b2 = true;
    }
  }

  textDes.id = "descripcion" + contadores.c2;

  const descripContainer = document.createElement("div");
  descripContainer.classList.add("campo-container");
  descripContainer.appendChild(textDes);

  const iconBorrarDescrip = document.createElement("i");
  iconBorrarDescrip.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrarDescrip.style.color = "red";
  iconBorrarDescrip.style.opacity = "0"; // Establecer la opacidad inicialmente en 0

  descripContainer.appendChild(iconBorrarDescrip);

  // Agregar la transición suave al ícono de borrar
  iconBorrarDescrip.style.transition = "opacity 0.3s";

  // Agregar el evento de mouseover al campo para mostrar el ícono de borrar
  descripContainer.addEventListener("mouseover", function () {
    iconBorrarDescrip.style.opacity = "1";
  });

  // Agregar el evento de mouseout al campo para ocultar el ícono de borrar
  descripContainer.addEventListener("mouseout", function () {
    iconBorrarDescrip.style.opacity = "0";
  });

  iconBorrarDescrip.addEventListener("click", function () {
    contenidosEdit.removeChild(descripContainer);
  });

  contenidosEdit.appendChild(descripContainer);
  contadores.c2++;

  // Ajustar la altura del textarea en función de su contenido
  textDes.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

  textDes.addEventListener("blur", handleCampoBlur2);
}

// Función para crear el separador
function crearSeparadorEdit(edit = false) {
  const hrAgg = document.createElement("hr");
  hrAgg.style.border = "1px solid #5c5c5c";
  hrAgg.classList.add("separador");

  if (edit) {
    if (!banderas.b3) {
      contadores.c3 = contador.t3 + 1;
      banderas.b3 = true;
    }
  }

  hrAgg.id = "separador" + contadores.c3;

  // Obtener el id del grupo correspondiente
  const idGrupo = event.target.closest('.modal').getAttribute('id').split('-')[1];
  const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;

  const campoId = hrAgg.id;
  const valorCampo = "hr";
  const tipoCampo = "3";

  // Ejemplo: enviar el valor del separador al controlador mediante fetch
  fetch('/actualizarRecurso', {
    method: 'POST',
    body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo, idRecurso }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(response => response.json())
    .then(data => {
      console.log("Separador creado:", data);
    })
    .catch(error => {
      console.error('Error al crear separador:', error);
    });

  const hrContainer = document.createElement("div");
  hrContainer.classList.add("campo-container");
  hrContainer.appendChild(hrAgg);

  const iconBorrarHr = document.createElement("i");
  iconBorrarHr.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrarHr.style.color = "red"; // Cambiar el color del icono a rojo
  iconBorrarHr.style.opacity = "0"; // Establecer la opacidad inicialmente en 0

  hrContainer.appendChild(iconBorrarHr);

  // Agregar la transición suave al ícono de borrar
  iconBorrarHr.style.transition = "opacity 0.3s";

  // Agregar el evento de mouseover al campo para mostrar el ícono de borrar
  hrContainer.addEventListener("mouseover", function () {
    iconBorrarHr.style.opacity = "1";
  });

  // Agregar el evento de mouseout al campo para ocultar el ícono de borrar
  hrContainer.addEventListener("mouseout", function () {
    iconBorrarHr.style.opacity = "0";
  });

  iconBorrarHr.addEventListener("click", function () {
    contenidosEdit.removeChild(hrContainer);
  });

  contenidosEdit.appendChild(hrContainer);
  contadores.c3++;
}

// Función para crear el campo de URL
function crearCampoUrlEdit(edit = false) {
  const urlAgg = document.createElement("input");
  urlAgg.type = "text";
  urlAgg.placeholder = "Ingrese la URL";
  urlAgg.classList.add("form-control", "campo_url");
  urlAgg.style.color = "black"; // Cambiar el color del icono a rojo

  if (edit) {
    if (!banderas.b4) {
      contadores.c4 = contador.t4 + 1;
      banderas.b4 = true;
    }
  }
  urlAgg.id = "url" + contadores.c4;

  const filaE = document.createElement("tr");
  const columnaDelete = document.createElement("td");
  const iconBorrarUrl = document.createElement("i");
  iconBorrarUrl.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrarUrl.style.color = "red"; // Cambiar el color del icono a rojo
  iconBorrarUrl.style.visibility = "hidden"; // Inicialmente oculto

  // Mostrar el ícono de borrar al pasar el cursor sobre la fila
  filaE.addEventListener("mouseenter", function () {iconBorrarUrl.style.visibility = "visible";});
  // Ocultar el ícono de borrar al sacar el cursor de la fila
  filaE.addEventListener("mouseleave", function () { iconBorrarUrl.style.visibility = "hidden"; });
  iconBorrarUrl.addEventListener("click", function () {
    filaE.remove();
    borrarCampo(urlAgg.id); // Llamada a la función para eliminar el campo en el controlador
  });
  columnaDelete.appendChild(iconBorrarUrl);

  const columnaIcon = document.createElement("td");
  const iconUrl = document.createElement("img");
  iconUrl.style.margin = "15px";
  iconUrl.classList.add("icono-url");
  columnaIcon.appendChild(iconUrl);

  const columnaUrl = document.createElement("td");
  columnaUrl.style.width = "100%";
  columnaUrl.appendChild(urlAgg);

  filaE.appendChild(columnaDelete);
  filaE.appendChild(columnaIcon);
  filaE.appendChild(columnaUrl);

  urlAgg.addEventListener("input", function () {
    const url = urlAgg.value;
    const domain = obtenerDominio(url);
    const icono = obtenerIconoPorDominio(domain);
    let numeroIcono = obtenerNumeroIconoPorDominio(domain);

    // Mostrar el icono correspondiente
    if (icono) {
      iconUrl.src = icono;
      iconUrl.style.display = "inline-block";
    } else {
      iconUrl.src = "";
      iconUrl.style.display = "none";
    }

    // Almacenar el número de icono en el atributo data del urlAgg
    urlAgg.setAttribute("data-numero-icono", numeroIcono);
  });
  contenidosEdit.appendChild(filaE);
  contadores.c4++;
  urlAgg.addEventListener('blur', handleCampoBlur2);
}

// Función para crear el campo de file
function crearCampoArchivoEdit(edit = false) {
  const fileAgg = document.createElement("input");
  fileAgg.type = "file";
  fileAgg.style.display = "none";

  if (edit) {
    if (!banderas.b5) {
      contadores.c5 = contador.t5 + 1;
      banderas.b5 = true;
    }
  }

  fileAgg.name = "file" + contadores.c5;

  // Obtener el id del grupo correspondiente
  const idGrupo = event.target.closest(".modal").getAttribute("id").split("-")[1];
  const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;

  const fileContainer = document.createElement("div");
  fileContainer.classList.add("campo-container");

  const table = document.createElement("table");
  table.classList.add("campo-table");
  fileContainer.appendChild(table);

  const row = document.createElement("tr");
  table.appendChild(row);

  const iconBorrarFile = document.createElement("td");
  iconBorrarFile.style.textAlign = "right";
  iconBorrarFile.innerHTML = `<i class="fas fa-trash-alt icono-borrar" style="color: red; display: none;"></i>`;
  row.appendChild(iconBorrarFile);

  const archivoIcon = document.createElement("td");
  archivoIcon.style.textAlign = "left";
  archivoIcon.innerHTML = `<img src="../logos_recursos/cargar_Archivo.svg" style="margin-left: 19px;" class="icono-cargar-archivo">`;
  row.appendChild(archivoIcon);

  const nameArchivo = document.createElement("td");
  nameArchivo.classList.add("nombre-archivo");
  row.appendChild(nameArchivo);

  archivoIcon.addEventListener("mouseover", function () {
    iconBorrarFile.style.display = "inline-block";
  });

  archivoIcon.addEventListener("mouseout", function () {
    iconBorrarFile.style.display = "none";
  });

  iconBorrarFile.addEventListener("click", function () {
    fileContainer.remove();
  });

  archivoIcon.addEventListener("click", function () {
    fileAgg.click();
  });

  contenidosEdit.appendChild(fileContainer);
  contadores.c5++;

  fileAgg.addEventListener("change", function (event) {
    const archivo = event.target.files[0];
    const extensiones = obtenerExt(archivo.name);
    const icon = obtenerIcon(extensiones);
    archivoIcon.innerHTML = `<img src="${icon}" style="margin:15px" class="icono-cargar-archivo">`;
  
    // Limitar la longitud del nombre del archivo a mostrar
    const MAX_LONGITUD_NOMBRE = 20;
    let nombreArchivoMostrado = archivo.name;
    let nombreSinExtension = archivo.name.substr(0, archivo.name.lastIndexOf('.'));
    let extensionArchivo = archivo.name.substr(archivo.name.lastIndexOf('.'));
    
    if (nombreSinExtension.length > MAX_LONGITUD_NOMBRE) {
      nombreSinExtension = nombreSinExtension.substring(0, MAX_LONGITUD_NOMBRE) + "...";
      nombreArchivoMostrado = nombreSinExtension + extensionArchivo;
    }
    
    nameArchivo.textContent = nombreArchivoMostrado;

    let numeroIcon;

    switch (extensiones) {
      case "doc":
      case "docx":
        numeroIcon = 1;
        break;
      case "pdf":
        numeroIcon = 2;
        break;
      case "ppt":
      case "pptx":
        numeroIcon = 3;
        break;
      case "xls":
      case "xlsx":
        numeroIcon = 4;
        break;
      case "jpg":
      case "jpeg":
      case "png":
        numeroIcon = 5;
        break;
      default:
        numeroIcon = 6;
    }
    const archivos = event.target.files;

    // Crear un objeto FormData para enviar los datos y los archivos al controlador
    const formData = new FormData();
    formData.append("id", fileAgg.name);
    formData.append("valor", archivos[0].name);
    formData.append("tipo", "5"); // Tipo 5 para archivos
    formData.append("idRecurso", idRecurso); // Tipo 5 para archivos
    formData.append("numeroIcono", numeroIcon.toString()); // Número de icono

    // Agregar los archivos al FormData
    for (let i = 0; i < archivos.length; i++) {
      formData.append("archivos", archivos[i]);
    }

    // Ejemplo: enviar el FormData al controlador mediante fetch
    fetch("/actualizarRecurso", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        // ...
      })
      .catch((error) => {
        // ...
      });
  });
}
// Función para obtener la extensión de un archivo
function obtenerExt(nombreFiles) {
  return nombreFiles.split(".").pop();
}

// Función para obtener el icono correspondiente a una extensión de archivo
function obtenerIcon(ext) {
  switch (ext) {
    case "doc":
    case "docx":
      return "../logos_recursos/Documento_Word.svg";
    case "pdf":
      return "../logos_recursos/Documento_PDF.svg";
    case "ppt":
    case "pptx":
      return "../logos_recursos/Documento_PowePoint.svg";
    case "xls":
    case "xlsx":
      return "../logos_recursos/Documento_Excel.svg";
    case "jpg":
    case "jpeg":
    case "png":
      return "../logos_recursos/Archivo_imagen.svg";
    default:
      return "../logos_recursos/Otro.svg";
  }
}

// Evento change del selector de opciones
selectorEdit.addEventListener("change", function() {
  const opcionSeleccionada = selectorEdit.value;
  switch (opcionSeleccionada) {
    case "titulo":
        crearCampoTituloEdit(true);
      break;
    case "descripcion":
      crearCampoDescripcionEdit(true);
      break;
    case "separador":
      crearSeparadorEdit(true);
      break;
    case "url":
      crearCampoUrlEdit(true);
      break;
    case "archivo":
      crearCampoArchivoEdit(true);
      break;
  }
});

function handleCampoBlur2(event) {
    const valorCampo = event.target.value;
    const campoId = event.target.id;

    // Obtener el id del grupo correspondiente
    const idGrupo = event.target.closest('.modal').getAttribute('id').split('-')[1];
    const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;
    // Obtener el número de icono desde el atributo data del inputUrl
    let numeroIcono = event.target.getAttribute("data-numero-icono");
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
    fetch('/actualizarRecurso', {
        method: 'POST',
        body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo, idRecurso: idRecurso, numeroIcono:numeroIcono }),
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


// ----------------------------------------------------------------
  // PARA ACTUALIZAR EN VIVO EL CAMPO URL
// ----------------------------------------------------------------
// Función para mostrarel nuevo icono de la url
function mostrarUrlNueva(campo) {
  const valor = campo.value;
  const domain = obtenerDominio(valor);
  const icono = obtenerIconoPorDominio(domain);
  numeroIcono = obtenerNumeroIconoPorDominio(domain); // Asignar el número de icono

  // Actualizar el icono correspondiente
  const iconoElemento = campo.closest('tr').querySelector('.icono-svg');
  iconoElemento.src = icono;

  // Guardar el número de icono en el atributo 'data-numero-icono' del campo
  campo.setAttribute('data-numero-icono', numeroIcono);
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
    "www.youtube.com": "../logos_recursos/Video_Youtube.svg",
    "vimeo.com": "../logos_recursos/Video_Vimeo.svg",
    "www.notion.so": "../logos_recursos/notion.svg"
  };

  return dominios[domain] || "../logos_recursos/Pagina_Web.svg";
}

// Obtener el número correcto de cada url ingresado
function obtenerNumeroIconoPorDominio(domain) {
  let numeroIcono;

  switch (domain) {
    case "www.youtube.com":
      numeroIcono = 1;
      break;
    case "vimeo.com":
      numeroIcono = 2;
      break;
    case "www.notion.so":
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

// ACTUALIZAR CAMPOS DESDE EL MISMO GRUPO YA CREADO
let numeroIcono; // Variable para almacenar el número de icono
const camposDinamicos = document.querySelectorAll('.camposD');
camposDinamicos.forEach(campo => {
  campo.addEventListener('input', () => {
    mostrarUrlNueva(campo);
    const id = campo.id; // Obtener el ID del recurso
    const valor = campo.value; // Obtener el valor actualizado del campo

    // Obtener el id del grupo correspondiente
    const idGrupo = campo.closest('.modal').getAttribute('id').split('-')[1];
    const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;
    numeroIcono = JSON.stringify(numeroIcono);
    fetch('/actualizarRecurso', {
      method: 'POST',
      body: JSON.stringify({ id: id, valor: valor, idRecurso: idRecurso, numeroIcono: numeroIcono }),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => response.json())
      .then(data => {
        console.log('Campo actualizado:', data);
      })
      .catch(error => {
        console.error('Error al actualizar campo:', error);
      });
  });
});