let fileIdV = null;

const dropAreaVideo = document.querySelector(".file-videoleccion");
const dragTextVideo = dropAreaVideo.querySelector("h6");
const btnVideo = dropAreaVideo.querySelector("#btnvideoleccion");
const inputVideo = dropAreaVideo.querySelector("#videoleccion");

btnVideo.addEventListener("click", (e) => {
  e.preventDefault();
  inputVideo.click();
});

inputVideo.addEventListener("change", () => {
  const fileV = inputVideo.files[0];
  showFileV(fileV);
});

dropAreaVideo.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropAreaVideo.classList.add("active");
  dragTextVideo.textContent = "Suelta para subir el archivo";
});

dropAreaVideo.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropAreaVideo.classList.remove("active");
  dragTextVideo.textContent = "Arrastra y suelta el archivo";
});

dropAreaVideo.addEventListener("drop", (e) => {
  e.preventDefault();
  const fileV = e.dataTransfer.files[0];
  showFileV(fileV);
  dropAreaVideo.classList.remove("active");
  dragTextVideo.textContent = "Arrastra y suelta el archivo";
});

function showFileV(fileV) {
    const extenV= fileV.name.split('.').pop().toLowerCase();
    let logoVurl = '';
  
    switch (extenV) {
      case 'mov':
      case 'mp4':
      case 'avi':
      case 'mkv':
        logoVurl = '../logos_recursos/icon_Video.svg';
        break;
    }
  
    const fileReaderV = new FileReader();
  
    fileReaderV.addEventListener("load", () => {
      let imageV = `
      <div id="${fileIdV}" class="file-container">
        <img src="${logoVurl}" class="file-logo" width="35px">
        <div class="status">
          <span>${fileV.name}</span>
          <span class="status-text">Cargando video...</span>
        </div>
      </div>
    `;
      if (fileIdV) {
        const existingFileV = document.getElementById(fileIdV);
        existingFileV.querySelector('.file-logo').src = logoVurl;
        existingFileV.querySelector('.status span').textContent = fileV.name;
      }     
      if (extenV === 'mov' || extenV === 'mp4' || extenV === 'avi' || extenV === 'mkv') {
        // Validar el tamaño del video
        if (fileV.size <= 20 * 1024 * 1024) { // 20 megabytes
          fileIdV = `file-${Math.random().toString(32).substring(7)}`;
    
          imageV = `
             <div id="${fileIdV}" class="file-container">
               <img src="${logoVurl}" class="file-logo" width="35px">
               <div class="status">
                 <span>${fileV.name}</span>
                 <span class="status-text">Cargando videoxd...</span>
               </div>
             </div>
           `;
       
           const previewV = document.querySelector('#previewVideo');
           previewV.innerHTML = imageV;
          uploadFileV(fileV);
        } else {
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
        toastr.warning("Solo se admiten videos", "Error", {
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
    
    fileReaderV.readAsDataURL(fileV);
}

function uploadFileV(fileV) {
  const formData = new FormData();
  formData.append('file', fileV);
  console.log("Videos", fileV);
}
