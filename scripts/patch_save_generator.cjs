const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'save-generator-design.js');
let code = fs.readFileSync(filePath, 'utf8');

// Añadimos envoltorio para generatePdf y reforzamos interceptDownloadActions
const oldIntercept = `function interceptDownloadActions(options, getGeneratorDataFn) {
  // 1. Interceptar función global openDownloadModal
  const wrapOpenDownloadModal = () => {
    if (typeof window.openDownloadModal === 'function' && !window.openDownloadModal.__mrWrapped) {
      const originalModal = window.openDownloadModal;
      const wrapped = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          try {
            const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
            if (currentDesign) {
              sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
            }
          } catch (e) {}

          openAuthModal({
            title: options?.isPremium ? 'Descarga tu diseño en PDF' : 'Descarga tu plantilla en PDF',
            subtitle: options?.isPremium 
              ? 'Accede a tu cuenta para generar y descargar tu archivo listo para imprenta.'
              : 'Crea tu cuenta gratuita o accede para descargar e imprimir tu plantilla en PDF de alta resolución.',
            badge: options?.isPremium ? 'Edición Completa' : 'Descarga en PDF',
            actionContext: 'download',
            isPremium: !!options?.isPremium,
            onSuccess: (loggedUser) => {
              prefillEmailInputs(loggedUser);
              originalModal.apply(this, args);
            }
          });
          return;
        }

        prefillEmailInputs(user);
        return originalModal.apply(this, args);
      };
      wrapped.__mrWrapped = true;
      window.openDownloadModal = wrapped;
    }
  };

  // 2. Interceptar función global openCompileModal (Libro Completo)
  const wrapOpenCompileModal = () => {
    if (typeof window.openCompileModal === 'function' && !window.openCompileModal.__mrWrapped) {
      const originalCompile = window.openCompileModal;
      const wrapped = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          try {
            const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
            if (currentDesign) {
              sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
            }
          } catch (e) {}

          openAuthModal({
            title: 'Descarga tu Cuaderno Completo en PDF',
            subtitle: 'Accede a tu cuenta para compilar y descargar tu libro completo listo para imprimir.',
            badge: 'Cuaderno Completo',
            actionContext: 'download',
            isPremium: true,
            onSuccess: (loggedUser) => {
              prefillEmailInputs(loggedUser);
              originalCompile.apply(this, args);
            }
          });
          return;
        }

        prefillEmailInputs(user);
        return originalCompile.apply(this, args);
      };
      wrapped.__mrWrapped = true;
      window.openCompileModal = wrapped;
    }
  };

  wrapOpenDownloadModal();
  wrapOpenCompileModal();

  setTimeout(() => {
    wrapOpenDownloadModal();
    wrapOpenCompileModal();
  }, 100);

  // 3. Captura defensiva de clics en botones de descarga
  document.addEventListener('click', (e) => {
    const target = e.target && e.target.closest && e.target.closest('.btn-download-primary, .btn-download-send, .btn-compile-pdf');
    if (!target) return;
    if (target.id === 'btn-save-generator-design' || target.id === 'btn-save-as-copy' || target.getAttribute('href')) return;

    let user = auth.currentUser;
    if (!user) {
      e.preventDefault();
      e.stopPropagation();

      try {
        const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
        if (currentDesign) {
          sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
        }
      } catch (err) {}

      openAuthModal({
        title: options?.isPremium ? 'Descarga tu diseño en PDF' : 'Descarga tu plantilla en PDF',
        subtitle: options?.isPremium 
          ? 'Accede a tu cuenta para generar y descargar tu archivo listo para imprenta.'
          : 'Crea tu cuenta gratuita o accede para descargar e imprimir tu plantilla en PDF de alta resolución.',
        badge: options?.isPremium ? 'Edición Completa' : 'Descarga en PDF',
        actionContext: 'download',
        isPremium: !!options?.isPremium,
        onSuccess: (loggedUser) => {
          prefillEmailInputs(loggedUser);
          if (typeof window.openDownloadModal === 'function') {
            window.openDownloadModal();
          } else if (typeof window.openCompileModal === 'function') {
            window.openCompileModal();
          }
        }
      });
    }
  }, true);
}`;

const newIntercept = `function interceptDownloadActions(options, getGeneratorDataFn) {
  // 1. Interceptar función global openDownloadModal
  const wrapOpenDownloadModal = () => {
    if (typeof window.openDownloadModal === 'function' && !window.openDownloadModal.__mrWrapped) {
      const originalModal = window.openDownloadModal;
      const wrapped = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          try {
            const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
            if (currentDesign) {
              sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
            }
          } catch (e) {}

          openAuthModal({
            title: options?.isPremium ? 'Descarga tu diseño en PDF' : 'Descarga o imprime en PDF',
            subtitle: options?.isPremium 
              ? 'Accede a tu cuenta para generar y descargar tu archivo listo para imprenta.'
              : 'Inicia sesión o crea tu cuenta gratuita para descargar e imprimir tu plantilla en PDF de alta resolución.',
            badge: options?.isPremium ? 'Edición Completa' : 'Descarga en PDF',
            actionContext: 'download',
            isPremium: !!options?.isPremium,
            onSuccess: (loggedUser) => {
              prefillEmailInputs(loggedUser);
              originalModal.apply(this, args);
            }
          });
          return;
        }

        prefillEmailInputs(user);
        return originalModal.apply(this, args);
      };
      wrapped.__mrWrapped = true;
      window.openDownloadModal = wrapped;
    }
  };

  // 2. Interceptar función global generatePdf
  const wrapGeneratePdf = () => {
    if (typeof window.generatePdf === 'function' && !window.generatePdf.__mrWrapped) {
      const origPdf = window.generatePdf;
      const wrappedPdf = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          if (typeof window.closeDownloadModal === 'function') window.closeDownloadModal();
          openAuthModal({
            title: 'Descarga o imprime en PDF',
            subtitle: 'Inicia sesión o crea tu cuenta gratuita para generar y descargar tu plantilla en PDF.',
            badge: 'Descarga en PDF',
            actionContext: 'download',
            onSuccess: () => {
              origPdf.apply(this, args);
            }
          });
          return;
        }
        return origPdf.apply(this, args);
      };
      wrappedPdf.__mrWrapped = true;
      window.generatePdf = wrappedPdf;
    }
  };

  // 3. Interceptar función global openCompileModal (Libro Completo)
  const wrapOpenCompileModal = () => {
    if (typeof window.openCompileModal === 'function' && !window.openCompileModal.__mrWrapped) {
      const originalCompile = window.openCompileModal;
      const wrapped = function(...args) {
        let user = auth.currentUser;
        if (!user) {
          try {
            const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
            if (currentDesign) {
              sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
            }
          } catch (e) {}

          openAuthModal({
            title: 'Descarga tu Cuaderno Completo en PDF',
            subtitle: 'Accede a tu cuenta para compilar y descargar tu libro completo listo para imprimir.',
            badge: 'Cuaderno Completo',
            actionContext: 'download',
            isPremium: true,
            onSuccess: (loggedUser) => {
              prefillEmailInputs(loggedUser);
              originalCompile.apply(this, args);
            }
          });
          return;
        }

        prefillEmailInputs(user);
        return originalCompile.apply(this, args);
      };
      wrapped.__mrWrapped = true;
      window.openCompileModal = wrapped;
    }
  };

  wrapOpenDownloadModal();
  wrapGeneratePdf();
  wrapOpenCompileModal();

  setTimeout(() => {
    wrapOpenDownloadModal();
    wrapGeneratePdf();
    wrapOpenCompileModal();
  }, 100);

  setInterval(() => {
    wrapOpenDownloadModal();
    wrapGeneratePdf();
    wrapOpenCompileModal();
  }, 500);

  // 4. Captura defensiva de clics en botones de descarga, impresión o envío
  document.addEventListener('click', (e) => {
    const target = e.target && e.target.closest && e.target.closest('.btn-download-primary, .btn-download-send, .btn-compile-pdf, .btn-modal-primary, .btn-modal-secondary, #btn-modal-send-email');
    if (!target) return;
    if (target.id === 'btn-save-generator-design' || target.id === 'btn-save-as-copy' || target.getAttribute('href')) return;

    let user = auth.currentUser;
    if (!user) {
      e.preventDefault();
      e.stopPropagation();

      try {
        const currentDesign = getGeneratorDataFn ? getGeneratorDataFn() : null;
        if (currentDesign) {
          sessionStorage.setItem('mr_temp_generator_draft', JSON.stringify(currentDesign));
        }
      } catch (err) {}

      if (typeof window.closeDownloadModal === 'function') {
        window.closeDownloadModal();
      }

      openAuthModal({
        title: options?.isPremium ? 'Descarga tu diseño en PDF' : 'Descarga o imprime en PDF',
        subtitle: options?.isPremium 
          ? 'Accede a tu cuenta para generar y descargar tu archivo listo para imprenta.'
          : 'Inicia sesión o crea tu cuenta gratuita para descargar e imprimir tu plantilla en PDF de alta resolución.',
        badge: options?.isPremium ? 'Edición Completa' : 'Descarga en PDF',
        actionContext: 'download',
        isPremium: !!options?.isPremium,
        onSuccess: (loggedUser) => {
          prefillEmailInputs(loggedUser);
          if (typeof window.openDownloadModal === 'function') {
            window.openDownloadModal();
          } else if (typeof window.openCompileModal === 'function') {
            window.openCompileModal();
          }
        }
      });
    }
  }, true);
}`;

if (code.includes(oldIntercept)) {
  code = code.replace(oldIntercept, newIntercept);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('save-generator-design.js actualizado (LF)');
} else if (code.includes(oldIntercept.replace(/\n/g, '\r\n'))) {
  code = code.replace(oldIntercept.replace(/\n/g, '\r\n'), newIntercept.replace(/\n/g, '\r\n'));
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('save-generator-design.js actualizado (CRLF)');
} else {
  console.warn('Bloque no encontrado en save-generator-design.js');
}
