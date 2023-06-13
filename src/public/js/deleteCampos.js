function borrarCampo(campoId) {
    // Ejemplo: enviar el ID del campo al controlador mediante fetch para eliminarlo
    fetch('/eliminarcampo', {
      method: 'POST',
      body: JSON.stringify({ id: campoId }),
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => response.json())
      .then(data => {
        console.log("Campo eliminado:", data);
      })
      .catch(error => {
        console.error('Error al eliminar campo:', error);
      });
  }