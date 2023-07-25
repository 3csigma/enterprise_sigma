let fileId = null;

const dropArea = document.querySelector(".file-recursos");
const dragText = dropArea.querySelector("h2");
const button = dropArea.querySelector("#btnfile");
const input = dropArea.querySelector("#input-file");

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

}

// Formulario Cargar Archivo Recurso Individual
const formFile = document.getElementById('form_UploadFile');
if (formFile) {
  formFile.addEventListener('submit', function(event) {
    event.preventDefault(); // Previene el envío del formulario
    if ($('.status-text').text() == 'Archivo subido correctamente') {
      formFile.submit();
    } else {
      toastr.warning("Por favor debe subir un archivo para poder cargar el recurso..", "Error", {
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
  });
}

function showFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    const logoConfig = {
      pdf: '../logos_recursos/Documento_PDF.svg',
      doc: '../logos_recursos/Documento_Word.svg',
      docx: '../logos_recursos/Documento_Word.svg',
      docm: '../logos_recursos/Documento_Word.svg',
      ppt: '../logos_recursos/Documento_PowerPoint.svg',
      pptx: '../logos_recursos/Documento_PowerPoint.svg',
      pptm: '../logos_recursos/Documento_PowerPoint.svg',
      potx: '../logos_recursos/Documento_PowerPoint.svg',
      xls: '../logos_recursos/Documento_Excel.svg',
      xlsx: '../logos_recursos/Documento_Excel.svg',
      xlsm: '../logos_recursos/Documento_Excel.svg',
      xltx: '../logos_recursos/Documento_Excel.svg',
      jpg: '../logos_recursos/Archivo_imagen.svg',
      jpeg: '../logos_recursos/Archivo_imagen.svg',
      png: '../logos_recursos/Archivo_imagen.svg',
      gif: '../logos_recursos/Archivo_imagen.svg',
      svg: '../logos_recursos/Archivo_imagen.svg',
      psd: '../logos_recursos/Archivo_imagen.svg',
      ai: '../logos_recursos/Archivo_imagen.svg',
      tiff: '../logos_recursos/Archivo_imagen.svg',
      mov: '../logos_recursos/icon_Video.svg',
      mp4: '../logos_recursos/icon_Video.svg',
      avi: '../logos_recursos/icon_Video.svg',
    };

    const logoUrl = logoConfig[extension] || '../logos_recursos/Otro.svg';
  
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
    
      $('.btnArchivoSuelto').css('display', 'inline-block');
      const statusText = document.querySelector(`#${fileId} .status-text`);
      if (extension === 'mov' || extension === 'mp4' || extension === 'avi' || extension === 'mkv') {
        // Validar el tamaño del video
        if (file.size >= 20 * 1024 * 1024) { // Validando si el archivo es mayor igual a 20MB
          const preview = document.querySelector('#preview');
          preview.innerHTML = image;
          $('.btnArchivoSuelto').css('display', 'none');
          statusText.innerHTML = `<span class="failure">Archivo no pudo subirse..</span>`;
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

          statusText.innerHTML = `<span class="failure">Archivo no pudo subirse..</span>`;
         
        }
      }

      statusText.innerHTML = `<span class="success">Archivo subido correctamente</span>`;

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