import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        habla: resolve(__dirname, 'habla-claro.html'),
        deja: resolve(__dirname, 'deja-de-darle-mil-vueltas.html'),
        p90: resolve(__dirname, 'planificador-90-dias.html'),
        p180: resolve(__dirname, 'planificador-180-dias.html'),
        planificadorSimple: resolve(__dirname, 'planificador-semanal-simple.html'),
        planificadorReversible: resolve(__dirname, 'planificador-semanal-reversible.html'),
        aviso: resolve(__dirname, 'aviso-legal.html'),
        privacidad: resolve(__dirname, 'politica-privacidad.html'),
        cookies: resolve(__dirname, 'politica-cookies.html'),
        sim90: resolve(__dirname, 'simulador-90-dias.html'),
        sim180: resolve(__dirname, 'simulador-180-dias.html'),
        simdeja: resolve(__dirname, 'simulador-deja-de-darle-mil-vueltas.html'),
        simhabla: resolve(__dirname, 'simulador-habla-claro.html'),
        simuladorSimple: resolve(__dirname, 'simulador-semanal-simple.html'),
        simuladorReversible: resolve(__dirname, 'simulador-semanal-reversible.html'),
        lecturas: resolve(__dirname, 'lecturas.html'),
        ensayoNo: resolve(__dirname, 'como-decir-que-no-en-el-trabajo.html'),
        ensayoSobrepensar: resolve(__dirname, 'como-dejar-de-sobrepensar-las-decisiones.html'),
        ensayo90Dias: resolve(__dirname, 'planificacion-trimestral-90-dias.html'),
        fatigaDecision: resolve(__dirname, 'la-fatiga-por-decision.html'),
        listasInfinitas: resolve(__dirname, 'la-trampa-de-las-listas-infinitas.html'),
        falsaUrgencia: resolve(__dirname, 'la-falsa-urgencia-y-el-mensaje-inmediato.html'),
        papelPantalla: resolve(__dirname, 'por-que-el-papel-ordena-lo-que-la-pantalla-satura.html'),
        ensayoBandejaEntrada: resolve(__dirname, 'el-sindrome-de-la-bandeja-de-entrada-vacia.html'),
        ensayoCalendarios: resolve(__dirname, 'por-que-los-calendarios-milimetrados-te-generan-ansiedad.html'),
        links: resolve(__dirname, 'links.html'),
        visorDeja: resolve(__dirname, 'visor-deja-de-darle-mil-vueltas.html'),
        visorHabla: resolve(__dirname, 'visor-habla-claro.html'),
        visorSimple: resolve(__dirname, 'visor-planificador-semanal-simple.html'),
        visorReversible: resolve(__dirname, 'visor-planificador-semanal-reversible.html'),
        visor90: resolve(__dirname, 'visor-planificador-90-dias.html'),
        visor180: resolve(__dirname, 'visor-planificador-180-dias.html'),
        apps: resolve(__dirname, 'apps.html'),
        preLecturas: resolve(__dirname, 'pre-lecturas.html'),
        generador: resolve(__dirname, 'generador.html'),
        generadorPlanificadorDiario: resolve(__dirname, 'generador-planificador-diario.html'),
        generadorPlanificadorSemanal: resolve(__dirname, 'generador-planificador-semanal.html'),
        generadorPlanificadorMensual: resolve(__dirname, 'generador-planificador-mensual.html'),
        generadorDiario: resolve(__dirname, 'demo_generador_pdf_planificador.html'),
        generadorSemanal: resolve(__dirname, 'demo_generador_pdf_planificador_semanal.html')
      }
    }
  }
})
