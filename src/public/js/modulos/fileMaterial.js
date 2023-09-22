// let fileIdM = null;

// const dropMaterial = document.querySelector(".file-material");
// const dragTextM = dropMaterial.querySelector("h6");
// const btnMaterial = dropMaterial.querySelector("#btnMaterial");
// const inputMaterial = dropMaterial.querySelector("#material");

// btnMaterial.addEventListener("click", (e) => {
//   e.preventDefault();
//   inputMaterial.click();
// });

// inputMaterial.addEventListener("change", () => {
//   const fileM = inputMaterial.files[0];
//   showFileM(fileM);
// });

// dropMaterial.addEventListener("dragover", (e) => {
//   e.preventDefault();
//   dropMaterial.classList.add("active");
//   dragTextM.textContent = "Suelta para subir el archivo";
// });

// dropMaterial.addEventListener("dragleave", (e) => {
//   e.preventDefault();
//   dropMaterial.classList.remove("active");
//   dragTextM.textContent = "Arrastra y suelta el archivo";
// });

// dropMaterial.addEventListener("drop", (e) => {
//   e.preventDefault();
//   const fileM = e.dataTransfer.files[0];
//   showFileM(fileM);
//   dropMaterial.classList.remove("active");
//   dragTextM.textContent = "Arrastra y suelta el archivo";
// });

// function showFileM(fileM) {
//     const extenM = fileM.name.split('.').pop().toLowerCase();
//     let logoMurl = '';
//     switch (extenM) {
//       case 'pdf':
//         logoMurl = '../logos_recursos/Documento_PDF.svg';
//         break;
//       case 'doc':
//       case 'docx':
//       case 'docm':
//         logoMurl = '../logos_recursos/Documento_Word.svg';
//         break;
//       case 'ppt':
//       case 'pptx':
//       case 'pptm':
//       case 'potx':
//         logoMurl = '../logos_recursos/Documento_PowerPoint.svg';
//         break;
//       case 'xls':
//       case 'xlsx':
//       case 'xlsm':
//       case 'xltx':
//         logoMurl = '../logos_recursos/Documento_Excel.svg';
//         break;
//       case 'jpg':
//       case 'jpeg':
//       case 'png':
//       case 'gif':
//       case 'svg':
//       case 'psd':
//       case 'ai':
//       case 'tiff':
//         logoMurl = '../logos_recursos/Archivo_imagen.svg';
//         break;
//       case 'mov':
//       case 'mp4':
//       case 'avi':
//       case 'mkv':
//         logoMurl = '../logos_recursos/icon_Video.svg';
//         break;
//       default:
//         logoMurl = '../logos_recursos/Otro.svg';
//         break;
//     }
  
//     const fileReaderM = new FileReader();
  
//     fileReaderM.addEventListener("load", () => {
//       let imageM = `
//       <div id="${fileIdM}" class="file-container">
//         <img src="${logoMurl}" class="file-logo" width="35px">
//         <div class="status">
//           <span>${fileM.name}</span>
//           <span class="status-text">Cargando...</span>
//         </div>
//       </div>
//     `;
//       if (fileIdM) {
//         const existingFileM = document.getElementById(fileIdM);
//         existingFileM.querySelector('.file-logo').src = logoMurl;
//         existingFileM.querySelector('.status span').textContent = fileM.name;
//       } else {
//         fileIdM = `file-${Math.random().toString(32).substring(7)}`;
    
//        imageM = `
//           <div id="${fileIdM}" class="file-container">
//             <img src="${logoMurl}" class="file-logo" width="35px">
//             <div class="status">
//               <span>${fileM.name}</span>
//               <span class="status-text">Cargando...</span>
//             </div>
//           </div>
//         `;
    
//         const previewM = document.querySelector('#previewMaterial');
//         previewM.innerHTML = imageM;
//       }
    
//       if (extenM === 'mov' || extenM === 'mp4' || extenM === 'avi' || extenM === 'mkv') {
//         // Validar el tamaño del video
//         if (fileM.size <= 20 * 1024 * 1024) { // 20 megabytes
//           // El video cumple con el tamaño permitido, continuar con la carga
//           $('.btnArchivoSuelto').css('display', 'inline-block');
//           uploadFileM(fileM);
//         } else {
//           const previewM = document.querySelector('#preview');
//           previewM.innerHTML = imageM;
//           $('.btnArchivoSuelto').css('display', 'none');
  
//           toastr.warning("Tu video supera 20MB", "Error", {
//             positionClass: "toast-top-full-width",
//             timeOut: 5000,
//             closeButton: !0,
//             debug: !1,
//             newestOnTop: !0,
//             progressBar: !0,
//             preventDuplicates: !0,
//             onclick: null,
//             showDuration: "500",
//             hideDuration: "200",
//             extendedTimeOut: "400",
//             showEasing: "swing",
//             hideEasing: "linear",
//             showMethod: "fadeIn",
//             hideMethod: "fadeOut",
//             tapToDismiss: !1
//         })
         
//         }
//       } else {
//         // No es un video, continuar con la carga sin validación de tamaño
//         uploadFileM(fileM);
//       }
//     });
    
//     fileReaderM.readAsDataURL(fileM);
// }

// function uploadFileM(fileM) {
//   const formData = new FormData();
//   formData.append('file', fileM);
//   console.log("Material", fileM);
// }
