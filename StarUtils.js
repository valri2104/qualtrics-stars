/**
 * StarUtils.js
 * Conjunto modular de funciones para reemplazar las estrellas nativas de Qualtrics
 * por estrellas <img> personalizadas (Twemoji por defecto).
 *
 * Opción elegida: A → eliminar por completo las estrellas nativas.
 *
 * Funciones disponibles:
 *
 *  StarUtils.applySpacing(qid, { spacing, starSize, numStars })
 *      → Construye estrellas personalizadas y define espaciado/tamaño.
 *
 *  StarUtils.applyColorGradient(qid, { colors })
 *      → Aplica coloración por estrella (decorativo).
 *
 *  StarUtils.addLabels(qid, { leftText, rightText })
 *      → Agrega etiquetas a los lados, como "Muy insatisfecho" / "Muy satisfecho".
 *
 *  StarUtils.enforceMinStar(qid, minValue)
 *      → Fuerza que la pregunta no pueda tener 0 estrellas.
 *
 *  StarUtils.removeNativeStars(qid)
 *      → Elimina las estrellas nativas de Qualtrics.
 *
 *  StarUtils.setStarIcon(url)
 *      → Cambia el ícono de estrella Twemoji por otro personalizado.
 *
 * Cómo usar dentro del JavaScript de una pregunta:
 *
 * Qualtrics.SurveyEngine.addOnload(function() {
 *     var qid = this.questionId;
 *
 *     StarUtils.applySpacing(qid, { spacing: 20, starSize: 30, numStars: 5 });
 *     StarUtils.addLabels(qid, { leftText: 'Muy insatisfecho', rightText: 'Muy satisfecho' });
 *     StarUtils.enforceMinStar(qid, 1);
 * });
 */

window.StarUtils = (function () {

  /* ---------------------------------------------------------------------
     CONFIGURACIÓN GLOBAL
  --------------------------------------------------------------------- */

  // Ícono por defecto (Twemoji estrella amarilla)
  var defaultStarIcon =
    'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2b50.svg';


  /* ---------------------------------------------------------------------
     HELPERS INTERNOS
  --------------------------------------------------------------------- */

  // Obtener contenedor de la pregunta
  function _getQuestionContainer(questionIdOrElem) {
    if (!questionIdOrElem) return null;

    // si es un id tipo "QID3"
    if (typeof questionIdOrElem === 'string') {
      return document.getElementById(questionIdOrElem) || null;
    }
    // si es un elemento
    if (questionIdOrElem.nodeType) return questionIdOrElem;

    return null;
  }

  // querySelectorAll seguro (evita errores si el selector falla)
  function _qsAll(q, selector) {
    try {
      return q.querySelectorAll(selector);
    } catch (e) {
      return [];
    }
  }


  /* ---------------------------------------------------------------------
     ELIMINAR ESTRELLAS NATIVAS DE QUALTRICS (OPCIÓN A)
  --------------------------------------------------------------------- */

  function removeNativeStars(questionIdOrElem) {
    var q = _getQuestionContainer(questionIdOrElem);
    if (!q) return;

    var containers = _qsAll(q, '.StarsContainer');

    containers.forEach(function(c) {
      try {
        // Eliminar elementos del control nativo
        ['.StarTrack', '.Filled', '.StarsEventWatcher', '.handle'].forEach(selector => {
          var el = c.querySelector(selector);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });

        // Limpiar contenido del contenedor (eliminamos estrellas nativas)
        c.innerHTML = '';
        c.style.background = 'none';

      } catch (e) {
        /* ignorar */
      }
    });
  }


  /* ---------------------------------------------------------------------
     CREAR ESTRELLAS <img> PERSONALIZADAS EN UN CONTENEDOR
  --------------------------------------------------------------------- */

  function _buildCustomStarsForContainer(container, opts) {
    var spacing  = opts.spacing;
    var starSize = opts.starSize;
    var numStars = opts.numStars;
    var starIcon = opts.starIcon || defaultStarIcon;

    if (!container) return null;

    // Evitar que se construya dos veces
    if (container.getAttribute('data-starutils-built') === '1') return container;
    container.setAttribute('data-starutils-built', '1');

    // Crear wrapper que contiene las estrellas
    var wrapper = document.createElement('div');
    wrapper.className = 'starutils-wrapper';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'flex-start';
    wrapper.style.gap = spacing + 'px';
    wrapper.style.height = starSize + 'px';
    wrapper.style.pointerEvents = 'auto';

    var stars = [];
    var selectedValue = 0;

    // Función para actualizar visual
    function updateVisual(v) {
      stars.forEach((s, idx) => {
        s.style.opacity = (idx < v) ? '1' : '0.35';
      });
    }

    // Crear estrellas individuales
    for (let i = 1; i <= numStars; i++) {
      var img = document.createElement('img');
      img.src = starIcon;
      img.alt = i + ' estrellas';
      img.className = 'starutils-star';
      img.style.width = starSize + 'px';
      img.style.height = starSize + 'px';
      img.style.cursor = 'pointer';
      img.style.opacity = '0.35';
      img.style.transition = 'opacity 0.15s ease';

      img.setAttribute('data-value', i);

      // Interacción de hover
      img.addEventListener('mouseenter', () => updateVisual(i));
      img.addEventListener('mouseleave', () => updateVisual(selectedValue));

      // Selección (click)
      img.addEventListener('click', () => {
        selectedValue = i;

        var tr = container.closest('tr');
        if (tr) {
          var input = tr.querySelector('.ResultsInput');
          if (input) {
            input.value = selectedValue;

            // Disparar eventos para que Qualtrics lo registre
            input.dispatchEvent(new Event('input',  { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        updateVisual(selectedValue);
      });

      wrapper.appendChild(img);
      stars.push(img);
    }

    // Insertar wrapper dentro del contenedor
    container.appendChild(wrapper);

    return {
      wrapper: wrapper,
      stars: stars,
      setSelected: (v) => { selectedValue = v; updateVisual(v); }
    };
  }


  /* ---------------------------------------------------------------------
     API PÚBLICA: applySpacing → crea estrellas personalizadas
  --------------------------------------------------------------------- */

  function applySpacing(questionIdOrElem, options) {
    var spacing  = options.spacing  ?? 20;
    var starSize = options.starSize ?? 30;
    var numStars = options.numStars ?? 5;

    var q = _getQuestionContainer(questionIdOrElem);
    if (!q) return;

    // Esperar render de Qualtrics
    setTimeout(function () {

      // Borrar estrellas nativas
      removeNativeStars(q);

      // Crear estrellas en cada fila
      var containers = _qsAll(q, '.StarsContainer');

      containers.forEach(function(c) {

        c.innerHTML = '';
        c.style.display = 'inline-block';
        c.style.verticalAlign = 'middle';

        _buildCustomStarsForContainer(c, {
          spacing: spacing,
          starSize: starSize,
          numStars: numStars
        });

        // Ajustar ancho del resultado para que no se superponga
        var totalWidth = numStars * starSize + (numStars - 1) * spacing;

        var tr = c.closest('tr');
        if (tr) {
          var resultTd = tr.querySelector('td.value');
          if (resultTd) resultTd.style.paddingLeft = (totalWidth - 60) + 'px';

          var controlTd = tr.querySelector('td.control') ||
                          tr.querySelector('td.BarOuter');
          if (controlTd) {
            controlTd.style.minWidth = totalWidth + 'px';
            controlTd.style.whiteSpace = 'nowrap';
          }
        }
      });

    }, 300);
  }


  /* ---------------------------------------------------------------------
     API PÚBLICA: applyColorGradient → colores por estrella
  --------------------------------------------------------------------- */

  function applyColorGradient(questionIdOrElem, options) {
    var colors = options.colors ||
      ['#ff6666','#ff9a4d','#ffd166','#8be28b','#66c2ff'];

    var q = _getQuestionContainer(questionIdOrElem);
    if (!q) return;

    setTimeout(function () {
      // Encontrar estrellas personalizadas
      var imgs = q.querySelectorAll('img.starutils-star');

      imgs.forEach((img, idx) => {
        var color = colors[idx] || colors[colors.length - 1];
        img.style.backgroundColor = color;
        img.style.boxShadow = `0 0 0 2px ${color} inset`;
      });
    }, 200);
  }


/* --- Public API: addLabels (left/right) --- */
function addLabels(questionIdOrElem, options) {
  var opts = options || {};
  var leftText = typeof opts.leftText === 'string' ? opts.leftText : 'Muy insatisfecho';
  var rightText = typeof opts.rightText === 'string' ? opts.rightText : 'Muy satisfecho';

  var q = _getQuestionContainer(questionIdOrElem);
  if (!q) return;

  setTimeout(function () {
    // Seleccionar todos los wrappers donde están las estrellas personalizadas
    var wrappers = _qsAll(q, '.starutils-wrapper');

    for (var i = 0; i < wrappers.length; i++) {
      var starsWrapper = wrappers[i];

      // Evitar agregar dos veces
      if (starsWrapper.parentNode.classList.contains('star-flex-wrapper')) continue;

      // Crear contenedor exterior
      var flexWrap = document.createElement('div');
      flexWrap.className = 'star-flex-wrapper';
      flexWrap.style.display = 'flex';
      flexWrap.style.alignItems = 'center';
      flexWrap.style.justifyContent = 'center';
      flexWrap.style.gap = '20px';
      flexWrap.style.width = '100%';
      flexWrap.style.margin = '8px 0';

      // Crear etiquetas
      var left = document.createElement('span');
      left.className = 'star-label-left';
      left.style.width = '120px';
      left.style.textAlign = 'right';
      left.style.whiteSpace = 'nowrap';
      left.innerText = leftText;

      var right = document.createElement('span');
      right.className = 'star-label-right';
      right.style.width = '120px';
      right.style.textAlign = 'left';
      right.style.whiteSpace = 'nowrap';
      right.innerText = rightText;

      // Insertar el wrapper nuevo antes del wrapper de estrellas
      var parent = starsWrapper.parentNode;
      parent.insertBefore(flexWrap, starsWrapper);

      // Mover las estrellas dentro del nuevo flex
      flexWrap.appendChild(left);
      flexWrap.appendChild(starsWrapper);
      flexWrap.appendChild(right);
    }
  }, 300);
}



  /* ---------------------------------------------------------------------
     API PÚBLICA: enforceMinStar → fuerza mínimo de estrellas
  --------------------------------------------------------------------- */

  function enforceMinStar(questionIdOrElem, minValue) {
    minValue = minValue ?? 1;

    var q = _getQuestionContainer(questionIdOrElem);
    if (!q) return;

    setTimeout(function () {
      var rows = _qsAll(q, 'tr');

      rows.forEach(function(tr) {
        var input = tr.querySelector('.ResultsInput');
        if (!input) return;

        var enforce = function () {
          var v = parseInt(input.value || '0', 10);
          if (v < minValue) input.value = minValue;
        };

        input.addEventListener('blur', enforce);

        var c = tr.querySelector('.StarsContainer');
        if (c) c.addEventListener('click', enforce);
      });

    }, 300);
  }


  /* ---------------------------------------------------------------------
     API PÚBLICA: cambiar icono de estrella
  --------------------------------------------------------------------- */

  function setStarIcon(url) {
    if (url) defaultStarIcon = url;
  }


  /* ---------------------------------------------------------------------
     EXPORTAR FUNCIONES
  --------------------------------------------------------------------- */
  return {
    applySpacing: applySpacing,
    applyColorGradient: applyColorGradient,
    addLabels: addLabels,
    enforceMinStar: enforceMinStar,
    removeNativeStars: removeNativeStars,
    setStarIcon: setStarIcon
  };

})();
