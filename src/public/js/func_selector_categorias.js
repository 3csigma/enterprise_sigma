(function () {
  // ATRAPAR LA OPCION CREADA EN EL SELECTOR Y MANDARLO A UN INPUT HIDDEN 
  $(document).ready(function () {
    function selectBuscar(id, categoriaHiddenId) {
      id.chosen({
        no_results_text: "Sin resultados para",
        allow_single_deselect: true,
        placeholder_text_single: "Selecciona una opción",
        width: '100%',
      });

      const campoBusqueda = id.next('.chosen-container').find('.chosen-search input');
      const categoriaHidden = $('#' + categoriaHiddenId);

      campoBusqueda.on('change', function () {
        const valorBusqueda = campoBusqueda.val().trim();

        const opcionExistente = id.find('option[value="' + valorBusqueda + '"]');
        if (opcionExistente.length) {
          opcionExistente.prop('selected', true);
          categoriaHidden.val(valorBusqueda);
        } else {
          id.prepend('<option value="' + valorBusqueda + '">' + valorBusqueda + '</option>');
          id.val(valorBusqueda);
          categoriaHidden.val(valorBusqueda);
        }

        id.trigger('chosen:updated');
      });

      $(document).on('click', function (e) {
        if (!$(e.target).closest('.chosen-container').length) {
          const opcionSeleccionada = id.find(":selected").val();

          categoriaHidden.val(opcionSeleccionada);
        }
      });
    }
    // const claseCajaGeneralModulo = $('#categoriaSelectModulo');
    // selectBuscar(claseCajaGeneralModulo, 'categoriaHiddenModulo');

    const claseCajaGeneralCargar = $('#categoriaSelectCargar');
    selectBuscar(claseCajaGeneralCargar, 'categoriaHiddenCargar');

    const claseCajaGeneralConectar = $('#categoriaSelectConectar');
    selectBuscar(claseCajaGeneralConectar, 'categoriaHiddenConectar');

  });
})();