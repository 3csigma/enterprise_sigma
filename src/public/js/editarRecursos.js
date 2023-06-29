653// Variables de contador para cada tipo de campo
const selectorEdit = document.getElementById("opcionesEdit");
const contenidosEdit = document.getElementById("contenidoEdit");

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
  nuevoCampo.placeholder = 'Ingrese el título aquí';
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
  formData.append("idCampo", campoId);
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

  if (domain.includes('www.')) domain = domain.split('www.')[1]

  return dominios[domain] || "../logos_recursos/Pagina_Web.svg";
}

// Obtener el número correcto de cada url ingresado
function obtenerNumeroIconoPorDominio(domain) {
  switch (domain) {
    case "youtube.com":
      return 1;
    case "vimeo.com":
      return 2;
    case "notion.so":
      return 3;
    case "drive.google.com":
      return 4;
    default:
      return 5;
  }
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
  });
  td.appendChild(iconoBorrar);
  row.appendChild(td);

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

    const esValido = validarPeso_Video(extensiones, archivo)

    if (esValido) {
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
          case 'doc':
          case 'docx':
          case 'docm':
            return '1';
          case 'pdf':
            return '2';
          case 'ppt':
          case 'pptx':
          case 'pptm':
          case 'potx':
            return '3';
          case 'xls':
          case 'xlsx':
          case 'xlsm':
          case 'xltx':
            return '4';
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'svg':
          case 'psd':
          case 'ai':
          case 'tiff':
            return '5';
          case 'mov':
          case 'mp4':
          case 'avi':
            return '6'
          default:
            return '7' 
        }
      };
      
      const numeroIcono = numero_Icon_(extensiones);
      // Crear un objeto FormData para enviar los datos y los archivos al controlador
      const formData = new FormData();
      formData.append("idCampo", nuevoCampo.name);
      formData.append("valor", archivo.name);
      formData.append("tipo", "5"); // Tipo 5 para archivos
      formData.append("idRecurso", idGrupo);
      formData.append("numeroIcono", numeroIcono); // Número de icono
      formData.append("archivo", archivo);
      
      // actualizarRecurso(formData)
      fetch('/actualizarRecurso', {
        method: 'POST',
        body: formData,
        headers: { 'enctype': 'multipart/form-data'}
      })
      .then(response => response.json())
      .then(data => {
        console.log('Archivo subido:', data);
      })
      .catch(error => {
        // console.error('Error al subir archivo:', error);
      });
    }

  });
}

// Función para obtener la extensión de un archivo
function obtenerExt(nombreFiles) {
  return nombreFiles.split(".").pop();
}

// Función para obtener el icono correspondiente a una extensión de archivo
function obtenerIcon(ext) {
  switch (ext) {
    case 'pdf':
      return '../logos_recursos/Documento_PDF.svg';
    case 'doc':
    case 'docx':
    case 'docm':
      return '../logos_recursos/Documento_Word.svg';
    case 'ppt':
    case 'pptx':
    case 'pptm':
    case 'potx':
      return '../logos_recursos/Documento_PowerPoint.svg';
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'xltx':
      return '../logos_recursos/Documento_Excel.svg';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'psd':
    case 'ai':
    case 'tiff':
      return '../logos_recursos/Archivo_imagen.svg';
    case 'mov':
    case 'mp4':
    case 'avi':
      return '../logos_recursos/icon_Video.svg';
    default:
      return '../logos_recursos/Otro.svg';
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
    $(`#iconG${idGrupo}_${idCampo}`).css('opacity', '0');
  });
}

function handleCampoBlur2(event) {
  const idCampo = event.target.id;
  const valor = event.target.value;
  // Obtener el id del grupo correspondiente
  const idGrupo = event.target.closest('.modal').getAttribute('id').split('-')[1];
  const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;
  // Obtener el número de icono desde el atributo data del inputUrl
  let numeroIcono = event.target.getAttribute("data-numero-icono");
  let tipo;

  // Determinar el tipo de campo según su ID
  if (idCampo.includes('titulo')) {
      tipo = '1'; // Tipo 1 para títulos
  } else if (idCampo.includes('descripcion')) {
      tipo = '2'; // Tipo 2 para descripcion
  } else if (idCampo.includes('url')) {
      tipo = '4'; // Tipo 4 para url
  }

  const formData = new FormData();
  formData.append("idCampo", idCampo);
  formData.append("valor", valor);
  formData.append("tipo", tipo);
  formData.append("idRecurso", idRecurso); // Tipo 5 para archivos
  formData.append("numeroIcono", numeroIcono); // Número de icono

  console.log("FORM DATA - HANDLE CAMPO BLUR ==> ", formData)

  actualizarRecurso(formData)
  // fetch('/actualizarRecurso', {
  //     method: 'POST',
  //     body: JSON.stringify({ idCampo, valor, tipo, idRecurso, numeroIcono }),
  //     headers: { 'Content-Type': 'application/json'}
  //   })
  //     .then(response => response.json())
  //     .then(data => {
  //     console.log("TODO BIEN", data);
  //     })
  //     .catch(error => {
  //      console.log("TODO MAL", error);
  //     });
}


// ----------------------------------------------------------------
  // PARA ACTUALIZAR EN VIVO EL CAMPO URL
// ----------------------------------------------------------------
// Función para mostrarel nuevo icono de la url
function mostrarUrlNueva(campo) {
  const valor = campo.value;
  const domain = obtenerDominio(valor);
  const icono = obtenerIconoPorDominio(domain);
  const numeroIcono = obtenerNumeroIconoPorDominio(domain); // Asignar el número de icono

  // Actualizar el icono correspondiente
  const iconoElemento = campo.closest('tr').querySelector('.icono-svg');
  iconoElemento.src = icono;

  // Guardar el número de icono en el atributo 'data-numero-icono' del campo
  campo.setAttribute('data-numero-icono', numeroIcono);

  return numeroIcono;
}

// ACTUALIZAR CAMPOS DESDE EL MISMO GRUPO YA CREADO
// let numeroIcono; // Variable para almacenar el número de icono
const camposDinamicos = document.querySelectorAll('.camposD');
camposDinamicos.forEach(campo => {
  campo.addEventListener('input', () => {

    const idCampo = campo.id; // Obtener el ID del recurso
    const valor = campo.value; // Obtener el valor actualizado del campo
    let numeroIcono = null;
    if (idCampo.includes('url')) {
      numeroIcono = mostrarUrlNueva(campo);
    }

    console.log(" idCampo ->" , idCampo);
    console.log(" valor ->" , valor);

    // Obtener el id del grupo correspondiente
    const idGrupo = campo.closest('.modal').getAttribute('id').split('-')[1];
    const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;

    const formData = new FormData();
    formData.append("idCampo", idCampo);
    formData.append("valor", valor);
    formData.append("tipo", null); // Tipo 5 para archivos
    formData.append("idRecurso", idRecurso); // Tipo 5 para archivos
    formData.append("numeroIcono", numeroIcono); // Número de icono

    actualizarRecurso(formData)

    // fetch('/actualizarRecurso', {
    //   method: 'POST',
    //   body: JSON.stringify({ idCampo, valor, idRecurso, numeroIcono }),
    //   headers: { 'Content-Type': 'application/json' }
    // })
    //   .then(response => response.json())
    //   .then(data => {
    //     console.log('Campo actualizado:', data);
    //   })
    //   .catch(error => {
    //    // console.error('Error al actualizar campo:', error);
    //   });
  });
});

// Función para mostrar el nuevo icono del archivo
function mostrarFilesNuevos(campo) {
  const valor = campo.files[0].name;
  const extension = obtenerExtension(valor);
  const numeroIcono = obtenerNumeroIconoPorExtension(extension); // Asignar el número de icono
  const icono = obtenerIconoPorNumero(numeroIcono); // Obtener el icono correspondiente

  // Actualizar el icono correspondiente
  const iconoElemento = campo.closest('tr').querySelector('.icono-svg');
  iconoElemento.src = icono;

  // Obtener el elemento del nombre del archivo
  const nombreArchivoElemento = campo.closest('tr').querySelector('.nombre-archivo');

  // Obtener el nombre del archivo sin la extensión
  const nombreArchivo = valor.substr(0, valor.lastIndexOf('.'));

  // Obtener la extensión del archivo
  const extensionArchivo = valor.substr(valor.lastIndexOf('.'));

  // Acortar el nombre del archivo si es necesario
  const MAX_LONGITUD_NOMBRE = 20;
  let nombreArchivoMostrado = nombreArchivo;
  if (nombreArchivo.length > MAX_LONGITUD_NOMBRE) {
    nombreArchivoMostrado = nombreArchivo.substr(0, MAX_LONGITUD_NOMBRE) + '...';
  }

  // Actualizar el texto del nombre del archivo
  nombreArchivoElemento.textContent = nombreArchivoMostrado + extensionArchivo;

  // Almacenar el nombre completo del archivo en un atributo de datos
  campo.setAttribute('data-nombre-completo', valor);

  // Almacenar el nombre abreviado del archivo en un atributo de datos
  campo.setAttribute('data-nombre-abreviado', nombreArchivoMostrado + extensionArchivo);

  // Guardar el número de icono en el atributo 'data-numero-icono' del campo
  campo.setAttribute('data-numerofile-icono', numeroIcono);
}

// Función para obtener la extensión de un archivo
function obtenerExtension(nombreArchivo) {
  const extension = nombreArchivo.split('.').pop();
  return extension.toLowerCase();
}

// Función para obtener el número de icono correspondiente a una extensión de archivo
function obtenerNumeroIconoPorExtension(extension) {
  switch (extension) {
    case 'doc':
    case 'docx':
    case 'docm':
      return 1;
    case 'pdf':
      return 2;
    case 'ppt':
    case 'pptx':
    case 'pptm':
    case 'potx':
      return 3;
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'xltx':
      return 4;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'psd':
    case 'ai':
    case 'tiff':
      return 5;
    case 'mov':
    case 'mp4':
    case 'avi':
      return 6;
    default:
      return 7;
  }
}

// Función para obtener el icono correspondiente según el número de icono
function obtenerIconoPorNumero(numeroIcono) {
  switch (numeroIcono) {
    case 1:
      return "../logos_recursos/Documento_Word.svg";
    case 2:
      return "../logos_recursos/Documento_PDF.svg";
    case 3:
      return "../logos_recursos/Documento_PowePoint.svg";
    case 4:
      return "../logos_recursos/Documento_Excel.svg";
    case 5:
      return "../logos_recursos/Archivo_imagen.svg";
    case 6:
      return "../logos_recursos/icon_Video.svg";
    default:
      return "../logos_recursos/Otro.svg";
  }
}

// Actualizar campo archivos una vez creados en grupo recursos
const camposArchivo = document.querySelectorAll('.campo_archivo');
camposArchivo.forEach(campo => {
  campo.addEventListener('input', () => {
    mostrarFilesNuevos(campo);

    // Obtener el id del grupo correspondiente
    const idGrupo = campo.closest('.modal').getAttribute('id').split('-')[1];
    const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;
    const recursoId = campo.id; // Obtener el recurso.id del campo grupo1_file4

    const extension = obtenerExtension(campo.files[0].name);

    const esValido = validarPeso_Video(extension, campo.files[0])
    if (esValido) {
      const numIcono = obtenerNumeroIconoPorExtension(extension);
      // Crear una instancia de FormData y agregar el archivo seleccionado
      const formData = new FormData();
      formData.append('archivo', campo.files[0]);
      formData.append('idCampo', recursoId);
      formData.append('valor', campo.files[0].name);
      formData.append('idRecurso', idRecurso);
      formData.append('numeroIcono', numIcono.toString());

      fetch('/actualizarRecurso', {
        method: 'POST',
        body: formData,
        headers: { 'enctype': 'multipart/form-data'}
      })
      .then(response => response.json())
      .then(data => {
        console.log('Archivo subido:', data);
      })
      .catch(error => {
        console.error('Error al subir archivo:', error);
      });
    }
  });
});

const colorButtons_edit = document.querySelectorAll('.colorBtnEdit');
const colorGrupoInput_edit = document.getElementById("colorGrupoInput_edit");
capturarColor_Grupo(colorButtons_edit, colorGrupoInput_edit)

function validarPeso_Video(extension, archivo) {
  if (extension === 'mov' || extension === 'mp4' || extension === 'avi') {
    // Verificar el tamaño del archivo
    const maxSize = 20 * 1024 * 1024; // 20 megabytes
    if (archivo.size > maxSize) {
      // Mostrar mensaje de error o realizar acciones correspondientes
      toastr.warning("Tu video supera 20MB", "Error", {
        positionClass: "toast-top-full-width",
        timeOut: 5000,
        closeButton: !0,
        debug: !1,
        newestOnTop: !0,
        progressBar: !0,
        preventDuplicates: !0,
        onclick: null,
        showDuration: "500",
        hideDuration: "200",
        extendedTimeOut: "400",
        showEasing: "swing",
        hideEasing: "linear",
        showMethod: "fadeIn",
        hideMethod: "fadeOut",
        tapToDismiss: !1
      })
      return false;
    }
  }
  return true;
}