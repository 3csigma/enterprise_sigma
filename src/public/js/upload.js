let fileId = null;

const dropArea = document.querySelector(".drag-area");
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

function showFile(file) {
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

    if (fileId) {
      const existingFile = document.getElementById(fileId);
      existingFile.querySelector('.file-logo').src = logoUrl;
      existingFile.querySelector('.status span').textContent = file.name;
    } else {
      fileId = `file-${Math.random().toString(32).substring(7)}`;

      const image = `
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

    uploadFile(file);
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
    .then(response => response.json())
    .then(data => {
      const statusText = document.querySelector(`#${fileId} .status-text`);
      if (response.ok) {
        statusText.innerHTML = `<span class="success">Archivo subido correctamente</span>`;
      } else {
        statusText.innerHTML = `<span class="failure">Archivo no pudo subirse...</span>`;
      }
      // Mostrar la respuesta del servidor en el DOM
      const responseText = document.createElement('p');
      responseText.textContent = data.message;
      statusText.appendChild(responseText);
    })
    .catch(error => {
      document.querySelector(`#${fileId} .status-text`).innerHTML = `<span class="success">Archivo leido...</span>`;
    });
}