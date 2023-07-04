let fileId = null;

const dropArea = document.querySelector(".drag-area");
const dragText = dropArea.querySelector("h2");
const button = dropArea.querySelector("#btnfile");
const input = dropArea.querySelector("#input-file");

// const btnbtn = document.querySelector(".btnArchivoSuelto");
// const inputFile = document.getElementById('input-file');

// btnbtn.addEventListener('click', function(event) {
//   event.preventDefault(); // Evita el envío automático del formulario
//   // Realiza la validación del campo de archivo
//   if (inputFile.files.length === 0) {
//     // El campo de archivo está vacío, muestra una alerta o mensaje
//     alert('Por favor, selecciona un archivo antes de guardar.');
    
//   }else {
//     uploadFile(input.files[0]);
//   }
// });


button.addEventListener("click", (e) => {
  e.preventDefault();
  input.click();
});

input.addEventListener("change", () => {
  const file = input.files[0];
  showFile(file);
});

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("active");
  dragText.textContent = "Suelta para subir el archivo";
});

dropArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropArea.classList.remove("active");
  dragText.textContent = "Arrastra y suelta el archivo";
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  showFile(file);
  dropArea.classList.remove("active");
  dragText.textContent = "Arrastra y suelta el archivo";
});

function showFile(file) {
 
    console.log("epaleeee");
    const extension = file.name.split('.').pop().toLowerCase();

    let logoUrl = '';
  
    switch (extension) {
      case 'pdf':
        logoUrl = '../logos_recursos/Documento_PDF.svg';
        break;
      case 'doc':
      case 'docx':
      case 'docm':
        logoUrl = '../logos_recursos/Documento_Word.svg';
        break;
      case 'ppt':
      case 'pptx':
      case 'pptm':
      case 'potx':
        logoUrl = '../logos_recursos/Documento_PowerPoint.svg';
        break;
      case 'xls':
      case 'xlsx':
      case 'xlsm':
      case 'xltx':
        logoUrl = '../logos_recursos/Documento_Excel.svg';
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'psd':
      case 'ai':
      case 'tiff':
        logoUrl = '../logos_recursos/Archivo_imagen.svg';
        break;
      case 'mov':
      case 'mp4':
      case 'avi':
        logoUrl = '../logos_recursos/icon_Video.svg';
        break;
      default:
        logoUrl = '../logos_recursos/Otro.svg';
        break;
    }
  
    const fileReader = new FileReader();
  
    fileReader.addEventListener("load", () => {
      let image = `
      <div id="${fileId}" class="file-container">
        <img src="${logoUrl}" class="file-logo" width="35px">
        <div class="status">
          <span>${file.name}</span>
          <span class="status-text">Cargando...</span>
        </div>
      </div>
    `;
      if (fileId) {
        const existingFile = document.getElementById(fileId);
        existingFile.querySelector('.file-logo').src = logoUrl;
        existingFile.querySelector('.status span').textContent = file.name;
      } else {
        fileId = `file-${Math.random().toString(32).substring(7)}`;
    
       image = `
          <div id="${fileId}" class="file-container">
            <img src="${logoUrl}" class="file-logo" width="35px">
            <div class="status">
              <span>${file.name}</span>
              <span class="status-text">Cargando...</span>
            </div>
          </div>
        `;
    
        const preview = document.querySelector('#preview');
        preview.innerHTML = image;
      }
    
      if (extension === 'mov' || extension === 'mp4' || extension === 'avi') {
        // Validar el tamaño del video
        if (file.size <= 20 * 1024 * 1024) { // 20 megabytes
          // El video cumple con el tamaño permitido, continuar con la carga
          $('.btnArchivoSuelto').css('display', 'inline-block');
          uploadFile(file);
        } else {
          const preview = document.querySelector('#preview');
          preview.innerHTML = image;
          $('.btnArchivoSuelto').css('display', 'none');
  
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
         
        }
      } else {
        // No es un video, continuar con la carga sin validación de tamaño
        uploadFile(file);
      }
    });
    
    fileReader.readAsDataURL(file);
  

  
}

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  console.log("Uploading file", file);
  fetch('/enviar-archivo', {
    method: 'POST',
    body: formData,
    headers: { 'enctype': 'multipart/form-data' }
  })
    .then(response => {
      const statusText = document.querySelector(`#${fileId} .status-text`);
      if (response.ok) {
        statusText.innerHTML = `<span class="success">Archivo subido correctamente</span>`;
      } else {
        statusText.innerHTML = `<span class="failure">Archivo no pudo subirse...</span>`;
      }
      return response.json();
    })
    .then(data => {
      // Mostrar la respuesta del servidor en el DOM
      const responseText = document.createElement('p');
      responseText.textContent = data.message;
      const statusText = document.querySelector(`#${fileId} .status-text`);
      statusText.appendChild(responseText);
    })
    .catch(error => {
    //  statusText.innerHTML = `<span class="success">Archivo subido correctamente</span>`;
    });
}
