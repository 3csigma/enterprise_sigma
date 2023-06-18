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
  const docType = file.type;
  const extension = file.name.split('.').pop().toLowerCase();

  const validExtensions = {
    pdf: 'application/pdf',
    word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    powerpoint: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.presentationml.slideshow', 'application/vnd.openxmlformats-officedocument.presentationml.slide', 'application/pptx'],
    excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  };

  let fileType = '';
  let logoUrl = '';

  for (const key in validExtensions) {
    if (validExtensions[key].includes(docType) || validExtensions[key].includes(extension)) {
      fileType = key;
      break;
    }
  }

  switch (fileType) {
    case 'pdf':
      logoUrl = '../logos_recursos/Documento_PDF.svg';
      break;
    case 'word':
      logoUrl = '../logos_recursos/Documento_Word.svg';
      break;
    case 'powerpoint':
      logoUrl = '../logos_recursos/Documento_PowerPoint.svg';
      break;
    case 'excel':
      logoUrl = '../logos_recursos/Documento_Excel.svg';
      break;
    case 'image':
      logoUrl = '../logos_recursos/Archivo_imagen.svg';
      break;
    default:
      Swal.fire({
        title: 'Archivo no permnitido',
        text: "",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#50368C',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ok'
    })
      return;
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