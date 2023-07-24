let fileIdTh = null;
const dropAreaTh = document.querySelector(".file-thumbnail");
const dragTextth = dropAreaTh.querySelector("h6");
const buttonth = dropAreaTh.querySelector("#btnThumbnail");
const inputth = dropAreaTh.querySelector("#fileThumbnail");

buttonth.addEventListener("click", (e) => {
  e.preventDefault();
  inputth.click();
});

inputth.addEventListener("change", () => {
  const file = inputth.files[0];
  showFile(file);
});

dropAreaTh.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropAreaTh.classList.add("active");
  dragTextth.textContent = "Suelta para subir la imagen";
});

dropAreaTh.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropAreaTh.classList.remove("active");
  dragTextth.textContent = "Arrastra y suelta la imagen";
});

dropAreaTh.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  showFile(file);
  dropAreaTh.classList.remove("active");
  dragTextth.textContent = "Arrastra y suelta la imagen";
});

function showFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const imageExtensions = ["jpg", "jpeg", "png", "svg", "psd", "ai", "tiff"];

  if (imageExtensions.includes(extension)) {
    const logoUrl = "../logos_recursos/Archivo_imagen.svg";
    const fileReader = new FileReader();
    fileReader.addEventListener("load", () => {
      let image = `
      <div id="${fileIdTh}" class="file-container">
        <img src="${logoUrl}" class="file-logo" width="35px">
        <div class="status">
          <span>${file.name}</span>
          <span class="status-text">Cargando...</span>
        </div>
      </div>
    `;
      if (fileIdTh) {
        const existingFile = document.getElementById(fileIdTh);
        existingFile.querySelector(".file-logo").src = logoUrl;
        existingFile.querySelector(".status span").textContent = file.name;
      } else {
        fileIdTh = `file-${Math.random().toString(32).substring(7)}`;
        image = `
        <div id="${fileIdTh}" class="file-container">
          <img src="${logoUrl}" class="file-logo" width="35px">
          <div class="status">
            <span>${file.name}</span>
            <span class="status-text">Cargando...</span>
          </div>
        </div>
      `;
        const preview = document.querySelector("#previewTh");
        preview.innerHTML = image;
      }
      uploadFile(file);
    });
    fileReader.readAsDataURL(file);
  } else {
    toastr.warning("No es una imagen", "Error", {
      positionClass: "toast-top-full-width",
      timeOut: 5000,
      closeButton: true,
      debug: false,
      newestOnTop: true,
      progressBar: true,
      preventDuplicates: true,
      onclick: null,
      showDuration: "500",
      hideDuration: "200",
      extendedTimeOut: "400",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut",
      tapToDismiss: false,
    });
  }
}


  //   headers: { 'enctype': 'multipart/form-data' }
  // })
  //   .then(response => {
  //     const statusText = document.querySelector(`#${fileIdTh} .status-text`);
  //     if (response.ok) {
  //       statusText.innerHTML = `<span class="success">Archivo subido correctamente</span>`;
  //     } else {
  //       statusText.innerHTML = `<span class="failure">Archivo no pudo subirse...</span>`;
  //     }
  //     return response.json();
  //   })
  //   .then(data => {
  //     // Mostrar la respuesta del servidor en el DOM
  //     const responseText = document.createElement('p');
  //     responseText.textContent = data.message;
  //     const statusText = document.querySelector(`#${fileIdTh} .status-text`);
  //     statusText.appendChild(responseText);
  //   })
  //   .catch(error => {
  //   //  statusText.innerHTML = `<span class="success">Archivo subido correctamente</span>`;
  //   });
