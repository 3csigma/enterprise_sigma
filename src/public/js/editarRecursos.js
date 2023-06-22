653// Variables de contador para cada tipo de campo
const selectorEdit = document.getElementById("opcionesEdit");
const contenidosEdit = document.getElementById("contenidoEdit");

// let contador = document.getElementById("contador").value;
// contador = JSON.parse(contador);

const contadores = { c1: 1, c2: 1, c3: 1, c4: 1 };
const banderas = { b1: false, b2: false, b3: false, b4: false };

function actualizarRecurso(formData) {
  // Realizar la solicitud POST usando fetch
  fetch('/actualizarRecurso', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      // Manejar la respuesta de la API
      console.log(data);
    })
    .catch(error => {
      // Manejar errores de la solicitud
      console.error('Error:', error);
    });
}

// Función para agregar el icono al elemento y borrar dicho elemento
function addIconoEliminar(contenidoEdit, nuevoCampo) {
  console.log("........ ID CAMPO ELIMINAR .........", nuevoCampo.id);
  const divPrincipal = document.createElement("div");
  divPrincipal.classList.add("campo-container");

   const iconoBorrar = document.createElement("i");
  iconoBorrar.classList.add("fas", "fa-trash-alt");
  iconoBorrar.style.color = "red";
  iconoBorrar.style.opacity = "0";
  iconoBorrar.style.transition = "opacity 0.3s";
  iconoBorrar.addEventListener("click", () => {
    divPrincipal.remove();
    // borrarCampo(nuevoCampo.id);
  });

  divPrincipal.addEventListener("mouseover", () => {
    iconoBorrar.style.opacity = "1";
  });

  divPrincipal.addEventListener("mouseout", () => {
    iconoBorrar.style.opacity = "0";
  });

  divPrincipal.appendChild(nuevoCampo);
  divPrincipal.appendChild(iconoBorrar);

  contenidoEdit.appendChild(divPrincipal);
}

function eliminarCampo(idGrupo, idCampo) {
  console.group("Se va a eliminar/Actualizar:")
  console.log("Grupo => ", idGrupo)
  console.log("Campo => ", idCampo)
  console.groupEnd()
  console.log("------------")

  if (idCampo.includes('url')) {
    $(`#tablaUrl_g${idGrupo}_${idCampo}`).remove();  
  } else if (idCampo.includes('file')) {
    $(`#tablaFile_g${idGrupo}_${idCampo}`).remove();  
  } else {
    $(`#grupo${idGrupo}_${idCampo}`).remove();
  }
  $(`#iconG${idGrupo}_${idCampo}`).remove();

  fetch('/eliminarCampo', {
    method: 'POST',
    body: JSON.stringify({ idCampo, idGrupo }),
    headers: { "Content-Type": "application/json" },
  })
    .then(response => {
      // Manejo de la respuesta
      if (response) console.log(`Se eliminó el campo con id: ${idCampo} del grupo ${idGrupo} de la Base de datos..`)
      else console.log("No se pudo eliminar el campo de la base de datos..")
    })
    .catch(error => {
      // Manejo del error
      console.log("Error ==> ", error)
    });

}

function agregarCampoTitulo(select) {
  const idGrupo = select.dataset.id;
  const contenidoEdit = document.querySelector(`#contenidoEdit${idGrupo}`);

  let contElements = JSON.parse(document.getElementById(`contador_${idGrupo}`).value);

  if (!banderas.b1) {
    contadores.c1 = contElements.t1 + 1;
    banderas.b1 = true;
  }

  const nuevoCampo = document.createElement('input');
  nuevoCampo.type = 'text';
  nuevoCampo.name = 'titulo';
  nuevoCampo.placeholder = 'Título';
  nuevoCampo.id = `grupo${idGrupo}_titulo${contadores.c1}`;
  nuevoCampo.classList.add("form-control", "campo");
  nuevoCampo.style.cssText = 'width: 100% !important; font-size: 1.5em; font-weight: 700; color: black !important; border: 0px solid #000000 !important; text-align: left;';

  addIconoEliminar(contenidoEdit, nuevoCampo);
  
  contadores.c1++;
  console.log("........ ID CAMPO .........", nuevoCampo.id);
  nuevoCampo.addEventListener("blur", handleCampoBlur2);
}

function agregarCampoTexto(select) {
  // const nuevoCampoHTML = `<input style="width:100% !important;font-size: 1.5em; font-weight: 700; color: black !important; border: 0px solid #000000 !important; text-align: left;" class="form-control input-recursos camposD" type="text" name="titulo" placeholder="Título">`;
  const idGrupo = select.dataset.id;
  const contenidoEdit = document.querySelector(`#contenidoEdit${idGrupo}`);

  let contElements = document.getElementById(`contador_${idGrupo}`).value;
  contElements = JSON.parse(contElements);
  console.group("CONTADORES ELEMENTOS ACTUAL - GRUPO: " + idGrupo)
  console.log(contElements)
  console.groupEnd();
  console.log("-------")

  if (!banderas.b2) {
    contadores.c2 = contElements.t2 + 1;
    banderas.b2 = true;
  }

  const nuevoCampo = document.createElement('input');
  nuevoCampo.type = 'textarea';
  nuevoCampo.name = 'descripcion';
  nuevoCampo.placeholder = 'descripcion...';
  nuevoCampo.id = `grupo${idGrupo}_descripcion${contadores.c2}`;
  nuevoCampo.classList.add("form-control", "campo_descrip");
  nuevoCampo.style.color = "black";
  nuevoCampo.style.resize = "none"; // Quitar la capacidad de redimensionar

  addIconoEliminar(contenidoEdit, nuevoCampo);
  
  contadores.c2++;
  console.log("........ ID CAMPO .........", nuevoCampo.id)
  nuevoCampo.addEventListener("blur", handleCampoBlur2);
}

function agregarSeparador(select) {
  const idGrupo = select.dataset.id;
  const contenidoEdit = document.querySelector(`#contenidoEdit${idGrupo}`);

  let contElements = document.getElementById(`contador_${idGrupo}`).value;
  contElements = JSON.parse(contElements);
  console.group("CONTADORES ELEMENTOS ACTUAL - GRUPO: " + idGrupo)
  console.log(contElements)
  console.groupEnd();``
  console.log("-------")

  if (!banderas.b3) {
    contadores.c3 = contElements.t3 + 1;
    banderas.b3 = true;
  }

  const nuevoCampo = document.createElement("hr");
  nuevoCampo.style.border = "1px solid #5c5c5c";
  nuevoCampo.classList.add("separador");
  nuevoCampo.name = 'separador';
  nuevoCampo.id = `grupo${idGrupo}_separador${contadores.c3}`;
 
  addIconoEliminar(contenidoEdit, nuevoCampo);

  const campoId = nuevoCampo.id;
  const valorCampo = "hr";
  const tipoCampo = "3";

  // Creando Datos del Formulario para enviar al Fetch
  const formData = new FormData();
  formData.append("id", campoId);
  formData.append("valor", valorCampo);
  formData.append("tipo", tipoCampo);
  formData.append("idRecurso", idGrupo);

  actualizarRecurso(formData);

  contadores.c3++;
  console.log("........ ID CAMPO .........", nuevoCampo.id)
  nuevoCampo.addEventListener("blur", handleCampoBlur2);
}

function agregarCampoUrl(select) {
  const urlAgg = document.createElement("input");
  urlAgg.type = "text";
  urlAgg.placeholder = "Ingrese la URL";
  urlAgg.classList.add("form-control", "campo_url");
  urlAgg.style.color = "black"; // Cambiar el color del icono a rojo

  const idGrupo = select.dataset.id;
  const contenidoEdit = document.querySelector(`#contenidoEdit${idGrupo}`);

  let contElements = document.getElementById(`contador_${idGrupo}`).value;
  contElements = JSON.parse(contElements);
  console.group("CONTADORES ELEMENTOS ACTUAL - GRUPO: " + idGrupo)
  console.log(contElements)
  console.groupEnd();
  console.log("-------")

  if (!banderas.b4) {
    contadores.c4 = contElements.t4 + 1;
    banderas.b4 = true;
  } 
  urlAgg.id = `grupo${idGrupo}_url${contadores.c4}`;
  const filaE = document.createElement("tr");
  const columnaDelete = document.createElement("td");
  const iconBorrarUrl = document.createElement("i");
  iconBorrarUrl.classList.add("fas", "fa-trash-alt");
  iconBorrarUrl.style.color = "red"; // Cambiar el color del icono a rojo
  iconBorrarUrl.style.opacity = "0"; // Inicialmente oculto

  filaE.addEventListener("mouseover", () => {
    iconBorrarUrl.style.opacity = "1";
  });
  filaE.addEventListener("mouseout", () => {
    iconBorrarUrl.style.opacity = "0";
  });

  // // Mostrar el ícono de borrar al pasar el cursor sobre la fila
  // filaE.addEventListener("mouse", function () {iconBorrarUrl.style.visibility = "visible";});
  // // Ocultar el ícono de borrar al sacar el cursor de la fila
  // filaE.addEventListener("mouseleave", function () { iconBorrarUrl.style.visibility = "hidden"; });
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
  contenidoEdit.appendChild(filaE);
  contadores.c4++;
  urlAgg.addEventListener('blur', handleCampoBlur2);
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

//  ==============================================================
// Función para crear el campo de file
function agregarArhivo(select) {
  const idGrupo = select.dataset.id;
  const contenidoEdit = document.querySelector(`#contenidoEdit${idGrupo}`);

  let contElements = document.getElementById(`contador_${idGrupo}`).value;
  contElements = JSON.parse(contElements);
  console.group("CONTADORES ELEMENTOS ACTUAL - GRUPO: " + idGrupo)
  console.log(contElements)
  console.groupEnd();
  console.log("-------")

  if (!banderas.b5) {
    contadores.c5 = contElements.t5 + 1;
    banderas.b5 = true;
  }

  const nuevoCampo = document.createElement("input");
  nuevoCampo.type = "file";
  nuevoCampo.style.display = "none";
  nuevoCampo.name = `grupo${idGrupo}_file${contadores.c5}`;
  contenidoEdit.appendChild(nuevoCampo);
  
  const fileContainer = document.createElement("div");
  fileContainer.classList.add("campo-container");

  const table = document.createElement("table");
  // table.classList.add("campo-table");
  fileContainer.appendChild(table);

  const row = document.createElement("tr");
  table.appendChild(row);

  const td = document.createElement("td");
  const iconoBorrar = document.createElement("i");
  iconoBorrar.classList.add("fas", "fa-trash-alt");
  iconoBorrar.style.color = "red";
  iconoBorrar.style.opacity = "0";
  iconoBorrar.style.transition = "opacity 0.3s";
  iconoBorrar.addEventListener("click", () => {
    fileContainer.remove();
    // borrarCampo(nuevoCampo.id);
  });
  td.appendChild(iconoBorrar);
  row.appendChild(td);
  // td.innerHTML = `<i class="fas fa-trash-alt" style="color: red; display: none;"></i>`;

  const archivoIcon = document.createElement("td");
  archivoIcon.style.textAlign = "left";
  archivoIcon.innerHTML = `<img src="../logos_recursos/cargar_Archivo.svg" style="margin-left: 19px;" class="icono-cargar-archivo">`;
  row.appendChild(archivoIcon);

  const nameArchivo = document.createElement("td");
  nameArchivo.classList.add("nombre-archivo");
  row.appendChild(nameArchivo);

  archivoIcon.addEventListener("mouseover", () => {
    iconoBorrar.style.opacity = "1";
  });

  iconoBorrar.addEventListener("mouseover", () => {
    iconoBorrar.style.opacity = "1";
  });

  archivoIcon.addEventListener("mouseout", () => {
    iconoBorrar.style.opacity = "0";
  });

  archivoIcon.addEventListener("click", function () {
    nuevoCampo.click();
  });

  contenidoEdit.appendChild(fileContainer);
  // addIconoEliminar(contenidoEdit, nuevoCampo);

  contadores.c5++;

  nuevoCampo.addEventListener("change", function (event) {
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

    const numero_Icon_ = (extensiones) => {
      switch (extensiones) {
        case "doc":
        case "docx":
          return '1';
        case "pdf":
          return '2';
        case "ppt":
        case "pptx":
          return '3';
        case "xls":
        case "xlsx":
          return '4';
        case "jpg":
        case "jpeg":
        case "png":
          return '5';
        default:
          return '6';
      }
    };
    const archivos = event.target.files;
    const numeroIcono = numero_Icon_(extensiones);
    // Crear un objeto FormData para enviar los datos y los archivos al controlador
    const formData = new FormData();
    formData.append("id", nuevoCampo.name);
    formData.append("valor", archivos[0].name);
    formData.append("tipo", "5"); // Tipo 5 para archivos
    formData.append("idRecurso", idGrupo); // Tipo 5 para archivos
    formData.append("numeroIcono", numeroIcono); // Número de icono

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
document.addEventListener("change", function(event) {
  if (event.target.classList.contains("opcionesEdit")) {
    const select = event.target;
    const idGrupo = select.dataset.id;
    console.log(idGrupo);
    console.log("Opción seleccionada:", select.value);

    const opcionSeleccionada = select.value;
    switch (opcionSeleccionada) {
      case "titulo":
        agregarCampoTitulo(select);
        break;
      case "descripcion":
        agregarCampoTexto(select);
        break;
      case "separador":
        agregarSeparador(select);
        break;
      case "url":
        agregarCampoUrl(select);
        break;
      case "archivo":
        agregarArhivo(select);
        break;
      // otros casos aquí
    }
    select.selectedIndex = 0;
  }
});

function verGrupo(idGrupo){
  // Detectar el evento "mouseover" en cualquier elemento del documento sin saber específicamente a cuál se le hará "hover",
  document.addEventListener("mouseover", function(event) {
    // Acciones a realizar cuando se detecte el evento "mouseover"
    console.log("event.target.id ==> ", event.target.id)
    let idCampo = event.target.id;
    if (idCampo.includes('_')){
      idCampo = idCampo.split('_')[1];
    }

    $(`#iconG${idGrupo}_${idCampo}`).css('opacity', '1');
  });

  // Detectar el evento "mouseout" en cualquier elemento del documento sin saber específicamente a cuál se le hará "hover",
  document.addEventListener("mouseout", function(event) {
    // Acciones a realizar cuando se detecte el evento "mouseover"
    let idCampo = event.target.id;
 
    if (idCampo.includes('_')){
      idCampo = idCampo.split('_')[1];
    }
    // const contID = idCampo.charAt(idCampo.length - 1);

    // $(`#iconG${idGrupo}_titulo${contID}`).css('opacity', '0');
    $(`#iconG${idGrupo}_${idCampo}`).css('opacity', '0');

    // console.log("El puntero del mouse está sobre el elemento:", elemento);
  });
}

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
  if (campoId.includes('titulo')) {
      tipoCampo = '1'; // Tipo 1 para títulos
  } else if (campoId.includes('descripcion')) {
      tipoCampo = '2'; // Tipo 2 para descripcion
  } else if (campoId.includes('url')) {
      tipoCampo = '4'; // Tipo 4 para url
  }

  console.log("valor" , valorCampo);
  console.log("campoid" , campoId);
  console.log("tipoCampo" , tipoCampo);
  console.log("idRecurso" , idRecurso);

  // Ejemplo: enviar el valor del campo al controlador mediante fetch
  fetch('/actualizarRecurso', {
      method: 'POST',
      body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo, idRecurso: idRecurso, numeroIcono:numeroIcono }),
      headers: { 'Content-Type': 'application/json'}
    })
      .then(response => response.json())
      .then(data => {
      console.log("TODO BIEN", data);
      })
      .catch(error => {
       console.log("TODO MAL", error);
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

// ACTUALIZAR CAMPOS DESDE EL MISMO GRUPO YA CREADO
let numeroIcono; // Variable para almacenar el número de icono
const camposDinamicos = document.querySelectorAll('.camposD');
camposDinamicos.forEach(campo => {
  campo.addEventListener('input', () => {

    const id = campo.id; // Obtener el ID del recurso
    const valor = campo.value; // Obtener el valor actualizado del campo

    if (id.includes('url')) {
      mostrarUrlNueva(campo);
    }

    console.log(" id ->" , id);
    console.log(" valor ->" , valor);

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
       // console.error('Error al actualizar campo:', error);
      });
  });
});