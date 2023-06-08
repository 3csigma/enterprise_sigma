// Obtener elementos del DOM
const selectorEdit = document.getElementById("opcionesEdit");
const contenidosEdit = document.getElementById("contenidoEdit");

// Variables de contador para cada tipo de campo
let contador = document.getElementById("contador").value;
contador = JSON.parse(contador)

const contadores = { c1:1, c2:1, c3:1, c4:1}
const banderas = { b1:false, b2:false, b3:false, b4:false}

// Función para crear el campo de titulo
function crearCampoTituloEdit(edit=false) {
  const aggTitulo = document.createElement("input");
  aggTitulo.type = "text";
  aggTitulo.classList.add("form-control", "campo");
  aggTitulo.style.color = "black";
  aggTitulo.placeholder = "Ingrese el título aquí";
  
  if (edit) { 
    if(!banderas.b1) { 
      contadores.c1 = contador.t1 + 1
      banderas.b1 = true
    }
  }
  aggTitulo.id = "titulo" + contadores.c1

  const campoContainer = document.createElement("div");
  campoContainer.classList.add("campo-container");

  const tituloContainer = document.createElement("div");
  tituloContainer.classList.add("titulo-container");
  tituloContainer.appendChild(aggTitulo);

  const iconBorrar = document.createElement("i");
  iconBorrar.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrar.style.color = "red";
  iconBorrar.addEventListener("click", function() {
    contenidosEdit.removeChild(campoContainer);
  });

  campoContainer.appendChild(tituloContainer);
  campoContainer.appendChild(iconBorrar);

  contenidosEdit.appendChild(campoContainer);
  
  aggTitulo.addEventListener('blur', handleCampoBlur2);
  contadores.c1++
}

// Función para crear el campo de descripción
function crearCampoDescripcionEdit(edit=false) {
  const textDes = document.createElement("textarea");
  textDes.classList.add("form-control", "campo_descrip");
  textDes.placeholder = "Agrega algo de texto";
  textDes.style.color = "black";
  textDes.style.resize = "none"; // Quitar la capacidad de redimensionar

  if (edit) { 
    if(!banderas.b2) { 
      contadores.c2 = contador.t2 + 1
      banderas.b2 = true
    }
  }

  textDes.id = "descripcion" +  contadores.c2

  const descripContainer = document.createElement("div");
  descripContainer.classList.add("campo-container");
  descripContainer.appendChild(textDes);

  const iconBorrarDescrip = document.createElement("i");
  iconBorrarDescrip.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrarDescrip.style.color = "red";
  iconBorrarDescrip.addEventListener("click", function() {
    contenidosEdit.removeChild(descripContainer);
  });

  descripContainer.appendChild(iconBorrarDescrip);

  contenidosEdit.appendChild(descripContainer);
  contadores.c2 ++
  // Ajustar la altura del textarea en función de su contenido
  textDes.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  });

    textDes.addEventListener('blur', handleCampoBlur2);
}

// Función para crear el separador
function crearSeparadorEdit(edit=false) {
  const hrAgg = document.createElement("hr");
  hrAgg.style.border = "1px solid #5c5c5c";
  hrAgg.classList.add("separador");

  if (edit) { 
    if(!banderas.b3) { 
      contadores.c3 = contador.t3 + 1
      banderas.b3 = true
    }
  }


  hrAgg.id = "separador" + contadores.c3;

  // Agregar los valores al separador

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
  iconBorrarHr.addEventListener("click", function() {
    contenidosEdit.removeChild(hrContainer);
  });

  hrContainer.appendChild(iconBorrarHr);

  contenidosEdit.appendChild(hrContainer);
  contadores.c3++;
}

// Función para crear el campo de URL
function crearCampoUrlEdit(edit=false) {
  const urlAgg = document.createElement("input");
  urlAgg.type = "text";
  urlAgg.placeholder = "Ingrese la URL";
  urlAgg.classList.add("form-control","campo_url");
  urlAgg.style.color = "black"; // Cambiar el color del icono a rojo

  if (edit) { 
    if(!banderas.b4) { 
      contadores.c4 = contador.t4 + 1
      banderas.b4 = true
    }
  }


  urlAgg.id = "url" + contadores.c4

  const urlContainer = document.createElement("div");
  urlContainer.classList.add("campo-container");
  urlContainer.appendChild(urlAgg);

  const iconBorrarUrl = document.createElement("i");
  iconBorrarUrl.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrarUrl.style.color = "red"; // Cambiar el color del icono a rojo
  iconBorrarUrl.addEventListener("click", function() {
    contenidosEdit.removeChild(urlContainer);
  });

  urlContainer.appendChild(iconBorrarUrl);

  contenidosEdit.appendChild(urlContainer);
  contadores.c4++
  urlAgg.addEventListener('blur', handleCampoBlur2);
}

// Función para crear el campo de archivo
function crearCampoArchivoEdit(edit=false) {
  const fileAgg = document.createElement("input");
  fileAgg.type = "file";


  if (edit) { 
    if(!banderas.b5) { 
      contadores.c5 = contador.t5 + 1
      banderas.b5 = true
    }
  }

  fileAgg.name = "file" + contadores.c5;

  const fileContainer = document.createElement("div");
  fileContainer.classList.add("campo-container");
  fileContainer.appendChild(fileAgg);

  const iconBorrarFile = document.createElement("i");
  iconBorrarFile.classList.add("fas", "fa-trash-alt", "icono-borrar");
  iconBorrarFile.style.color = "red"; // Cambiar el color del icono a rojo
  iconBorrarFile.addEventListener("click", function() {
    contenidosEdit.removeChild(fileContainer);
  });

  fileContainer.appendChild(iconBorrarFile);
  contenidosEdit.appendChild(fileContainer); 
  contadores.c5++;

  fileAgg.addEventListener('change', function(event) {
    const archivos = event.target.files;
    
    // Obtener el id del grupo correspondiente
    const idGrupo = event.target.closest('.modal').getAttribute('id').split('-')[1];
    const idRecurso = document.getElementById(`idRecurso-${idGrupo}`).value;
    
    // Crear un objeto FormData para enviar los datos y los archivos al controlador
    const formData = new FormData();
    formData.append('id', fileAgg.name);
    formData.append('valor', archivos[0].name);
    formData.append('tipo', '5'); // Tipo 5 para archivos
    formData.append('idRecurso', idRecurso); // Tipo 5 para archivos

    // Agregar los archivos al FormData
    for (let i = 0; i < archivos.length; i++) {
      formData.append('archivos', archivos[i]);
    }

    // Ejemplo: enviar el FormData al controlador mediante fetch
    fetch('/actualizarRecurso', {
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
        body: JSON.stringify({ id: campoId, valor: valorCampo, tipo: tipoCampo, idRecurso: idRecurso }),
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