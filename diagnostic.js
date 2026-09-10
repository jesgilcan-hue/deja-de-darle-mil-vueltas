// diagnostic.js - Recomendador Inteligente Adaptativo Menos Ruido V1

document.addEventListener('DOMContentLoaded', () => {
  // BASE DE DATOS DE LIBROS Y ESPECIFICACIONES
  const BOOKS = {
    habla: {
      id: 'habla',
      title: 'Habla Claro',
      subtitle: 'Cuaderno de preparación mental para conversaciones difíciles, límites y resoluciones',
      image: '/cover_habla.jpg',
      webLink: './habla-claro.html',
      simLink: './simulador-habla-claro.html',
      amazonLink: 'https://www.amazon.es/dp/B0HGBQH446',
      rationale: 'Diseñado específicamente para vaciar la cabeza, desactivar la reactividad emocional y estructurar argumentos indiscutibles antes de entrar a una conversación incómoda.',
      allSpecs: [
        'Formato libro ergonómico de 6 x 9 pulgadas (15,2 x 22,8 cm) para llevar en la mochila o maletín',
        '128 páginas en papel crema mate premium antirreflejos de alto gramaje',
        'Filtro Hechos vs. Relatos para separar la realidad de la interpretación subjetiva',
        'El Guion Mínimo de Apertura: estructura tus primeros 20 segundos con serenidad y firmeza',
        'Matriz de Negociación y 3 límites innegociables para mantener el control bajo presión',
        'Simulador de respuestas ante objeciones, evasivas y manipulación emocional',
        '15 plantillas guiadas completas (6 páginas estructuradas por conversación situacional)',
        'Papel crema mate agradable al tacto con pluma o lápiz, despojado de frases vacías'
      ]
    },
    deja: {
      id: 'deja',
      title: 'Deja de darle mil vueltas',
      subtitle: 'Para cuando pensar más ya no te está ayudando',
      image: '/cover_deja.jpg',
      webLink: './deja-de-darle-mil-vueltas.html',
      simLink: './simulador-deja-de-darle-mil-vueltas.html',
      amazonLink: 'https://www.amazon.es/dp/B0H3KBSC78',
      rationale: 'La herramienta práctica para sacar un dilema de la mente y ponerlo sobre la mesa. Desbloquea la parálisis por análisis y convierte la rumiación en un siguiente paso amable.',
      allSpecs: [
        'Formato libro estándar de 6 x 9 pulgadas (130 páginas) para escribir cómodamente en cualquier lugar',
        'Papel blanco de alto contraste libre de sangrado, apto para lápiz, bolígrafo o pluma',
        'Atajo para decisiones rápidas y recorrido guiado completo para dilemas importantes',
        'Ejercicios para separar datos objetivos, suposiciones, miedo, deseo y presión externa',
        'Matriz de comparación de opciones y diseño de mini-experimentos reversibles',
        '12 herramientas prácticas para comparar, aparcar, desbloquear y revisar decisiones',
        '20 páginas libres con trama de puntos para seguir pensando en papel con total libertad',
        'Enfoque sobrio y honesto, sin positividad tóxica ni relleno académico'
      ]
    },
    p90: {
      id: 'p90',
      title: 'Planificador de 90 Días',
      subtitle: 'Un trimestre de foco diario anti-burnout y calma en papel',
      image: '/cover_90.jpg',
      webLink: './planificador-90-dias.html',
      simLink: './simulador-90-dias.html',
      amazonLink: 'https://www.amazon.es/dp/B0H41SDNFJ',
      rationale: 'El antídoto contra las listas interminables de 20 tareas. Un ciclo trimestral cerrado que te obliga a elegir una sola prioridad indiscutible por jornada para avanzar sin quemarte.',
      allSpecs: [
        'Duración trimestral (3 meses completos) para mantener la motivación alta sin agobios',
        '100% Atemporal (sin fechas impresas): empieza cualquier día del año sin perder páginas',
        'Metodología de Prioridad Única Diaria: foco absoluto en lo verdaderamente importante',
        'Plantillas de seguimiento mensual de hábitos (Habit Tracker) integradas',
        'Espacio dedicado a reflexiones de cierre de semana y bienestar personal',
        'Formato vertical manejable de 6 x 9 pulgadas con cubierta mate suave al tacto',
        'Celdas limpias con casillas de verificación [ ] para tus prioridades'
      ]
    },
    p180: {
      id: 'p180',
      title: 'Planificador de 180 Días',
      subtitle: 'Medio año de constancia sostenida para grandes proyectos y oposiciones',
      image: '/cover_180.jpg',
      webLink: './planificador-180-dias.html',
      simLink: './simulador-180-dias.html',
      amazonLink: 'https://www.amazon.es/dp/B0H8C9GG4V',
      rationale: 'Para propósitos que necesitan espacio para madurar. Seis meses estructurados para mantener el rumbo a largo plazo sin fatiga mental ni sensación de llegar tarde.',
      allSpecs: [
        'Semestre completo (180 días) para proyectos de largo recorrido, oposiciones o cambios vitales',
        'Completamente atemporal y sin fechas fijas: tú marcas el ritmo de trabajo',
        'Foco diario anti-burnout con espacio para la prioridad reina del día',
        'Espacios de retrospectiva quincenal y mensual para evaluar constancia y salud mental',
        'Formato vertical de 6 x 9 pulgadas, encuadernación sólida y papel de alto gramaje',
        'Cubierta mate aterciopelada de tacto sobrio y elegante'
      ]
    },
    psimple: {
      id: 'psimple',
      title: 'Planificador Semanal Atemporal',
      subtitle: 'Agenda apaisada de escritorio con avance secuencial continuo (53 semanas)',
      image: '/planner_simple_mockup.png',
      webLink: './planificador-semanal-simple.html',
      simLink: './simulador-semanal-simple.html',
      amazonLink: 'https://www.amazon.es/dp/B0H3LFFDKB',
      rationale: 'Diseñado en proporción horizontal ergonómica para situarse frente al teclado en tu mesa de trabajo. Organiza tus metas en el bloque inicial y avanza de forma secuencial semana tras semana.',
      allSpecs: [
        'Formato horizontal apaisado (8.25 x 6 pulgadas / 21 x 15,2 cm) diseñado para descansar bajo el teclado',
        '108 páginas en papel blanco de alto contraste sin líneas forzadas ni cuadrículas asfixiantes',
        '53 semanas completas a doble página limpia de lunes a domingo con casilla de Foco Semanal',
        'Bloque inicial con 14 vistas mensuales, 12 plantillas de Habit Tracker y metas trimestrales',
        'Páginas libres con malla de puntos para proyectos y notas rápidas',
        'Leyenda oficial de códigos Bullet y atajos de productividad en página central',
        '100% Atemporal: comienza en cualquier fecha sin desperdiciar páginas'
      ]
    },
    preversible: {
      id: 'preversible',
      title: 'Planificador Semanal Reversible',
      subtitle: 'Doble portada tête-bêche (180°): separa la estrategia mensual de la acción semanal',
      image: '/planner_reversible_mockup.png',
      webLink: './planificador-semanal-reversible.html',
      simLink: './simulador-semanal-reversible.html',
      amazonLink: 'https://www.amazon.es/dp/B0H41SKNKQ',
      rationale: 'Innovador diseño físico de dos portadas opuestas. Dale la vuelta 180° al libro para cambiar de mentalidad: por un lado planificas meses y hábitos; por el otro ejecutas tu semana con foco absoluto.',
      allSpecs: [
        'Diseño Reversible único (Tête-Bêche): dos portadas opuestas que separan estrategia de ejecución',
        'Formato apaisado de escritorio (8.25 x 6 pulgadas / 21 x 15,2 cm) para trabajar junto al ordenador',
        'Bloque 1 (Visión Global): 14 meses atemporales, 12 meses de Habit Tracker, metas y tablero de proyectos',
        'Bloque 2 (Enfoque Semanal - Giro 180°): 53 vistas semanales a doble página limpia de lunes a domingo',
        '108 páginas en papel blanco premium de alto contraste con casillas de verificación [ ]',
        'Página 54 central con Leyenda de Símbolos y Atajos de Productividad Bullet',
        'Cubierta mate aterciopelada de tacto sobrio y elegante',
        '100% Atemporal: comienza en cualquier fecha sin desperdiciar páginas'
      ]
    }
  };

  // ÁRBOL DE PREGUNTAS DINÁMICO (Sin opción D ambigua en Q1)
  const QUESTIONS = {
    // PREGUNTA 1: RAÍZ CLARA EN 3 CAMINOS
    q1: {
      step: 1,
      totalSteps: 5,
      title: '¿Dónde está tu mayor saturación o bloqueo en este momento?',
      desc: 'Selecciona el dolor principal que te impide pensar con serenidad:',
      options: [
        {
          badge: 'A',
          text: 'Tengo una conversación difícil pendiente o necesito poner límites sin sentir culpa ni perder los papeles.',
          featureMatch: 'Preparar conversaciones difíciles y asertividad sin culpa',
          scores: { habla: 10, deja: 0, p90: 0, p180: 0, psimple: 0, preversible: 0 },
          next: 'q_habla_2'
        },
        {
          badge: 'B',
          text: 'Tengo un dilema o decisión que no para de darme vueltas en la cabeza y no sé qué camino tomar.',
          featureMatch: 'Desbloquear decisiones atascadas y frenar la parálisis por análisis',
          scores: { habla: 0, deja: 10, p90: 0, p180: 0, psimple: 0, preversible: 0 },
          next: 'q_deja_2'
        },
        {
          badge: 'C',
          text: 'Tengo demasiadas tareas, rutinas y frentes abiertos; necesito foco y orden en mi mesa de trabajo.',
          featureMatch: 'Organización integral de tareas, hábitos y tiempo sobre el escritorio',
          scores: { habla: 0, deja: 0, p90: 3, p180: 3, psimple: 3, preversible: 3 },
          next: 'q_plan_horizon'
        }
      ]
    },

    // --- RAMA HABLA CLARO ---
    q_habla_2: {
      step: 2,
      totalSteps: 5,
      title: '¿Con qué tipo de situación te enfrentas principalmente?',
      desc: 'Identificar el contexto te ayuda a enfocar la preparación:',
      options: [
        {
          badge: 'A',
          text: 'Ámbito laboral o profesional: pedir un aumento, resolver un conflicto con un compañero o frenar abusos de horario.',
          featureMatch: 'Preparación de conversaciones laborales y negociación profesional',
          scores: { habla: 6 },
          next: 'q_habla_3'
        },
        {
          badge: 'B',
          text: 'Ámbito personal o familiar: límites con la pareja, la familia o amistades donde se mezclan emociones intensas.',
          featureMatch: 'Poner límites personales y familiares sin dañar el vínculo',
          scores: { habla: 6 },
          next: 'q_habla_3'
        },
        {
          badge: 'C',
          text: 'Cualquiera de las dos / Me cuesta decir "NO" en general y acabo cediendo por evitar la incomodidad.',
          featureMatches: ['Preparación de conversaciones laborales', 'Poner límites personales firmes'],
          scores: { habla: 6 },
          next: 'q_habla_3'
        }
      ]
    },
    q_habla_3: {
      step: 3,
      totalSteps: 5,
      title: 'Al abordar una conversación difícil, ¿cuál suele ser tu mayor obstáculo?',
      desc: 'Reconocer el punto débil es el primer paso para dominarlo:',
      options: [
        {
          badge: 'A',
          text: 'Me gana la emoción, la reactividad o la culpa, y acabo perdiendo la razón o aceptando cosas que no quiero.',
          featureMatch: 'Filtro para neutralizar la reactividad emocional y argumentos basados en hechos',
          scores: { habla: 6 },
          next: 'q_habla_4'
        },
        {
          badge: 'B',
          text: 'Doy demasiados rodeos, me justifico en exceso y no sé cómo entrar al tema con firmeza y serenidad.',
          featureMatch: 'Guion mínimo de apertura para ir al grano en los primeros 20 segundos',
          scores: { habla: 6 },
          next: 'q_habla_4'
        },
        {
          badge: 'C',
          text: 'Cualquiera de las dos cosas / Me paraliza anticipar que la otra persona reaccione mal o me manipule.',
          featureMatches: ['Control de reactividad emocional', 'Simulador de respuestas ante manipulación u objeciones'],
          scores: { habla: 7 },
          next: 'q_habla_4'
        }
      ]
    },
    q_habla_4: {
      step: 4,
      totalSteps: 5,
      title: '¿Qué tipo de estructura práctica necesitas encontrar dentro del libro?',
      desc: 'Las herramientas metodológicas que incluye esta edición:',
      options: [
        {
          badge: 'A',
          text: 'El filtro "Hechos vs. Relatos" para separar lo que ocurrió de mis interpretaciones mentales.',
          featureMatch: 'Plantilla Hechos vs. Relatos para construir argumentos irrefutables',
          scores: { habla: 6 },
          next: 'q_habla_5'
        },
        {
          badge: 'B',
          text: 'Una matriz de 3 límites innegociables para tener claro dónde puedo ceder y dónde jamás pasar.',
          featureMatch: 'Matriz de límites innegociables y margen de acuerdo',
          scores: { habla: 6 },
          next: 'q_habla_5'
        },
        {
          badge: 'C',
          text: 'Me encajan ambas / Quiero tener el proceso guiado completo de principio a fin antes de entrar a la sala.',
          featureMatches: ['Plantilla Hechos vs. Relatos', 'Matriz de límites innegociables'],
          scores: { habla: 7 },
          next: 'q_habla_5'
        }
      ]
    },
    q_habla_5: {
      step: 5,
      totalSteps: 5,
      title: 'Para tu cuaderno de trabajo, ¿qué aspecto físico valoras más?',
      desc: 'Decisión final de formato y acabado (elige tu preferencia):',
      options: [
        {
          badge: 'A',
          text: 'Formato libro clásico (6x9"), discreto y manejable para llevar en la mochila y preparar mi charla en cualquier lugar.',
          featureMatch: 'Formato ergonómico de 6x9 pulgadas discreto para llevar siempre contigo',
          scores: { habla: 10 },
          next: 'RESULT'
        },
        {
          badge: 'B',
          text: 'Papel crema mate antirreflejos de alto gramaje para escribir con pluma o lápiz sin prisas.',
          featureMatch: 'Papel crema mate premium que no refleja la luz y facilita la escritura reposada',
          scores: { habla: 10 },
          next: 'RESULT'
        }
      ]
    },

    // --- RAMA DEJA DE DARLE MIL VUELTAS ---
    q_deja_2: {
      step: 2,
      totalSteps: 5,
      title: '¿Qué tipo de decisión es la que no te deja en paz?',
      desc: 'Diferentes decisiones requieren diferentes enfoques en papel:',
      options: [
        {
          badge: 'A',
          text: 'Una encrucijada importante: cambiar de trabajo, mudanza, cerrar una etapa o iniciar un proyecto clave.',
          featureMatch: 'Recorrido guiado completo para decisiones importantes y complejas',
          scores: { deja: 6 },
          next: 'q_deja_3'
        },
        {
          badge: 'B',
          text: 'Dilemas cotidianos o compras que me bloquean y me hacen posponer las cosas una y otra vez.',
          featureMatch: 'Atajos y matrices simples para desbloquear decisiones cotidianas rápidas',
          scores: { deja: 6 },
          next: 'q_deja_3'
        },
        {
          badge: 'C',
          text: 'Cualquiera de las dos / Tiendo a sobrepensar casi cualquier cosa y necesito un método para vaciar la mente.',
          featureMatches: ['Recorrido para decisiones importantes', 'Atajos para decisiones cotidianas'],
          scores: { deja: 6 },
          next: 'q_deja_3'
        }
      ]
    },
    q_deja_3: {
      step: 3,
      totalSteps: 5,
      title: '¿Cuál es la trampa mental en la que sueles caer?',
      desc: 'Identifica la raíz de tu sobrepensamiento:',
      options: [
        {
          badge: 'A',
          text: 'Confundir lo que deseo con el miedo al qué dirán o la presión del entorno.',
          featureMatch: 'Ejercicios para aislar el miedo, el deseo y las expectativas ajenas',
          scores: { deja: 6 },
          next: 'q_deja_4'
        },
        {
          badge: 'B',
          text: 'Pensar que la decisión es un camino sin retorno y tener miedo a equivocarme irremediablemente.',
          featureMatch: 'Técnica del mini-experimento reversible para probar antes de arriesgar',
          scores: { deja: 6 },
          next: 'q_deja_4'
        },
        {
          badge: 'C',
          text: 'Cualquiera de las dos / Mi cabeza no para de proyectar escenarios catastróficos.',
          featureMatches: ['Aislar presiones externas', 'Mini-experimentos reversibles'],
          scores: { deja: 7 },
          next: 'q_deja_4'
        }
      ]
    },
    q_deja_4: {
      step: 4,
      totalSteps: 5,
      title: '¿Qué tipo de dinámica de escritura te resulta más efectiva?',
      desc: 'El interior del libro combina reflexión guiada y espacio libre:',
      options: [
        {
          badge: 'A',
          text: 'Preguntas concretas y matrices visuales donde solo tenga que rellenar casillas con calma.',
          featureMatch: '12 herramientas prácticas de apoyo: comparador de opciones, matriz simple y desbloqueo',
          scores: { deja: 6 },
          next: 'q_deja_5'
        },
        {
          badge: 'B',
          text: 'Páginas libres punteadas (tipo bullet) para hacer esquemas, listas y dibujos de desahogo a mi aire.',
          featureMatch: '20 páginas libres con malla de puntos para pensar en papel sin restricciones',
          scores: { deja: 6 },
          next: 'q_deja_5'
        },
        {
          badge: 'C',
          text: 'Cualquiera de las dos / Me gusta tener ejercicios guiados y luego páginas libres para profundizar.',
          featureMatches: ['12 herramientas prácticas de decisión', '20 páginas libres con malla de puntos'],
          scores: { deja: 7 },
          next: 'q_deja_5'
        }
      ]
    },
    q_deja_5: {
      step: 5,
      totalSteps: 5,
      title: 'Para sentarte a decidir en papel, ¿cuál es tu principio esencial?',
      desc: 'Decisión final de enfoque (elige tu preferencia):',
      options: [
        {
          badge: 'A',
          text: 'Un ritual simple de 10 minutos con el móvil boca abajo, lápiz y goma para dar el siguiente paso amable.',
          featureMatch: 'Ritual de 10 minutos en papel sin móvil para aclarar ideas',
          scores: { deja: 10 },
          next: 'RESULT'
        },
        {
          badge: 'B',
          text: 'Un cuaderno adulto sobrio y directo, despojado de frases motivacionales vacías de taza de desayuno.',
          featureMatch: 'Enfoque sobrio y honesto, sin positividad tóxica ni relleno académico',
          scores: { deja: 10 },
          next: 'RESULT'
        }
      ]
    },

    // --- RAMA ORGANIZACIÓN (PLANIFICADORES) ---
    q_plan_horizon: {
      step: 2,
      totalSteps: 5,
      title: '¿Para cuánto tiempo quieres que te sirva este planificador?',
      desc: 'El horizonte de tiempo define la escala de tu herramienta:',
      options: [
        {
          badge: 'A',
          text: 'Un ciclo cerrado de 3 meses (90 días) para un objetivo muy concreto sin agobiarme a largo plazo.',
          featureMatch: 'Horizonte trimestral de 90 días para foco intenso y rápido',
          scores: { p90: 10, p180: -4, psimple: -4, preversible: -4 },
          next: 'q_plan_desk'
        },
        {
          badge: 'B',
          text: 'Medio año completo (6 meses / 180 días) para proyectos que requieren constancia (oposición, cambio de hábitos).',
          featureMatch: 'Horizonte semestral de 180 días para proyectos de largo recorrido',
          scores: { p90: -4, p180: 10, psimple: -4, preversible: -4 },
          next: 'q_plan_desk'
        },
        {
          badge: 'C',
          text: 'Un año entero (53 semanas consecutivas) para tener cubierta toda mi rutina de trabajo y proyectos.',
          featureMatch: 'Estructura anual completa de 53 semanas de lunes a domingo',
          scores: { p90: -4, p180: -4, psimple: 8, preversible: 8 },
          next: 'q_plan_desk'
        },
        {
          badge: 'D',
          text: 'Cualquiera de las duraciones / Lo importante para mí es la ergonomía y no tener fechas fijas.',
          featureMatch: '100% Atemporal sin fechas para empezar cualquier día del año',
          scores: { p90: 0, p180: 0, psimple: 0, preversible: 0 },
          next: 'q_plan_desk'
        }
      ]
    },
    q_plan_desk: {
      step: 3,
      totalSteps: 5,
      title: '¿Dónde y en qué posición vas a colocar el cuaderno para trabajar?',
      desc: 'La ergonomía sobre la mesa marca la diferencia:',
      options: [
        {
          badge: 'A',
          text: 'Formato horizontal apaisado (8.25x6"): que descanse abierto bajo el teclado de mi ordenador sin estorbar con el ratón.',
          featureMatch: 'Formato apaisado de escritorio (8.25 x 6 pulgadas) para descansar bajo el teclado',
          scores: { psimple: 8, preversible: 8, p90: -5, p180: -5 },
          next: 'q_plan_philosophy'
        },
        {
          badge: 'B',
          text: 'Formato vertical tradicional (6x9"): cómodo para mover entre la oficina, casa, sofá o llevar en la mochila.',
          featureMatch: 'Formato vertical manejable de 6 x 9 pulgadas para llevar en la mochila',
          scores: { p90: 8, p180: 8, psimple: -5, preversible: -5 },
          next: 'q_plan_philosophy'
        },
        {
          badge: 'C',
          text: 'Cualquiera de los dos formatos me resulta cómodo / Me adapto a lo que mejor funcione.',
          featureMatches: ['Ergonomía limpia sobre la mesa', 'Fácil manejo en cualquier entorno'],
          scores: { p90: 0, p180: 0, psimple: 0, preversible: 0 },
          next: 'q_plan_philosophy'
        }
      ]
    },
    q_plan_philosophy: {
      step: 4,
      totalSteps: 5,
      title: 'A la hora de estructurar tu día a día, ¿cuál es tu filosofía prioritaria?',
      desc: 'Diferentes formas de combatir la dispersión:',
      options: [
        {
          badge: 'A',
          text: 'Foco anti-burnout: obligarme a marcar UNA sola prioridad indiscutible cada día para evitar saturarme.',
          featureMatch: 'Metodología anti-burnout: una sola prioridad reina por jornada',
          scores: { p90: 8, p180: 8, psimple: -4, preversible: -4 },
          next: 'q_plan_route_check'
        },
        {
          badge: 'B',
          text: 'Vista panorámica semanal: ver toda la semana limpia de lunes a domingo de un vistazo con casillas para tareas.',
          featureMatch: 'Vista semanal completa a doble página de lunes a domingo con casillas [ ]',
          scores: { psimple: 8, preversible: 8, p90: -4, p180: -4 },
          next: 'q_plan_route_check'
        },
        {
          badge: 'C',
          text: 'Cualquiera de las dos / Lo primordial es tener casillas de verificación [ ] y cero renglones rígidos.',
          featureMatches: ['Celdas abiertas sin líneas rígidas', 'Casillas de verificación [ ] para tareas'],
          scores: { p90: 0, p180: 0, psimple: 0, preversible: 0 },
          next: 'q_plan_route_check'
        }
      ]
    },

    // PASO 5 CONDICIONAL: DESEMPATE EXACTO SIN OPCIÓN "CUALQUIERA"
    // Caso A: Apaisados (Simple vs Reversible)
    q_plan_final_apaisado: {
      step: 5,
      totalSteps: 5,
      title: 'Para tu planificador de escritorio apaisado, ¿qué estructura prefieres?',
      desc: 'Decisión final de navegación (elige una de las dos opciones):',
      options: [
        {
          badge: 'A',
          text: 'Diseño Reversible (180°): dos portadas opuestas para separar físicamente la estrategia mensual de la semana diaria.',
          featureMatch: 'Diseño Reversible (Doble Portada 180°): separación física de estrategia y acción',
          scores: { preversible: 16, psimple: -10 },
          next: 'RESULT'
        },
        {
          badge: 'B',
          text: 'Estructura secuencial continua: avanzar página a página de forma lineal de principio a fin.',
          featureMatch: 'Estructura secuencial continua: pasa páginas de forma natural de principio a fin',
          scores: { psimple: 16, preversible: -10 },
          next: 'RESULT'
        }
      ]
    },

    // Caso B: Verticales (90 Días vs 180 Días)
    q_plan_final_vertical: {
      step: 5,
      totalSteps: 5,
      title: 'Para tu planificador de foco diario en formato libro (6x9"), ¿qué ritmo prefieres?',
      desc: 'Decisión final de horizonte (elige una de las dos opciones):',
      options: [
        {
          badge: 'A',
          text: 'Un ciclo cerrado de 3 meses (90 días) para avanzar con intensidad en un trimestre sin quemarme.',
          featureMatch: 'Horizonte trimestral de 90 días para foco intenso y rápido',
          scores: { p90: 16, p180: -10 },
          next: 'RESULT'
        },
        {
          badge: 'B',
          text: 'Un semestre completo (180 días) con revisiones periódicas para oposiciones o proyectos de largo recorrido.',
          featureMatch: 'Horizonte semestral de 180 días para proyectos de largo recorrido',
          scores: { p180: 16, p90: -10 },
          next: 'RESULT'
        }
      ]
    },

    // Caso C: Desempate global si el usuario marcó "Cualquiera" en todo
    q_plan_final_tiebreak: {
      step: 5,
      totalSteps: 5,
      title: 'Para determinar tu herramienta exacta sobre el escritorio, elige tu prioridad:',
      desc: 'Decisión final entre los dos grandes conceptos de trabajo:',
      options: [
        {
          badge: 'A',
          text: 'Formato apaisado para trabajar bajo el teclado con vista panorámica de lunes a domingo (53 semanas).',
          featureMatch: 'Formato apaisado de escritorio (8.25 x 6 pulgadas) para descansar bajo el teclado',
          scores: { preversible: 12, psimple: 10, p90: -10, p180: -10 },
          next: 'RESULT'
        },
        {
          badge: 'B',
          text: 'Formato vertical manejable centrado en una sola prioridad reina cada día (anti-burnout).',
          featureMatch: 'Metodología anti-burnout: una sola prioridad reina por jornada',
          scores: { p90: 12, p180: 10, psimple: -10, preversible: -10 },
          next: 'RESULT'
        }
      ]
    }
  };

  // ESTADO DEL CUESTIONARIO
  let state = {
    history: [],
    selectedMatches: [],
    scores: { habla: 0, deja: 0, p90: 0, p180: 0, psimple: 0, preversible: 0 },
    currentQuestionId: 'q1',
    isEarlyExit: false
  };

  // ELEMENTOS DEL DOM
  const overlay = document.getElementById('diagnostic-modal-overlay');
  const closeBtn = document.getElementById('diagnostic-close-btn');
  const bodyEl = document.getElementById('diagnostic-body');
  const stepTagEl = document.getElementById('diagnostic-step-tag');
  const progressFillEl = document.getElementById('diagnostic-progress-fill');
  const btnBack = document.getElementById('diagnostic-btn-back');
  const btnEarlyExit = document.getElementById('diagnostic-btn-early-exit');
  const footerEl = document.getElementById('diagnostic-footer');

  // BOTÓN DE APERTURA EN HOME
  const openButtons = document.querySelectorAll('.btn-open-diagnostic, #btn-open-diagnostic');
  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  function openModal() {
    resetState();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderQuestion('q1');
  }

  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeModal();
    }
  });

  function resetState() {
    state = {
      history: [],
      selectedMatches: [],
      scores: { habla: 0, deja: 0, p90: 0, p180: 0, psimple: 0, preversible: 0 },
      currentQuestionId: 'q1',
      isEarlyExit: false
    };
    footerEl.style.display = 'flex';
  }

  // VALIDAR SI SE PUEDE MOSTRAR EL BOTÓN DE SALIDA RÁPIDA
  function canShowEarlyExit() {
    // 1. Mínimo estricto de 3 preguntas respondidas
    if (state.history.length < 3) {
      return false;
    }

    // 2. Comprobar que haya un ganador indiscutible y con ventaja suficiente:
    const sorted = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const topScore = sorted[0][1];
    const secondScore = sorted[1][1];

    // Exigimos que el ganador tenga al menos 14 puntos y una ventaja de al menos 6 puntos sobre el segundo
    if (topScore < 14 || (topScore - secondScore) < 6) {
      return false;
    }

    // 3. Comprobar que existan al menos 2 características concretas seleccionadas
    if (state.selectedMatches.length < 2) {
      return false;
    }

    return true;
  }

  // RENDERIZAR PREGUNTA
  function renderQuestion(qId) {
    // Resolver bifurcación dinámica de la pregunta 4 a la 5 en Organización
    if (qId === 'q_plan_route_check') {
      const apaisadoScore = (state.scores.psimple || 0) + (state.scores.preversible || 0);
      const verticalScore = (state.scores.p90 || 0) + (state.scores.p180 || 0);

      if (apaisadoScore > verticalScore) {
        qId = 'q_plan_final_apaisado';
      } else if (verticalScore > apaisadoScore) {
        qId = 'q_plan_final_vertical';
      } else {
        qId = 'q_plan_final_tiebreak';
      }
    }

    const q = QUESTIONS[qId];
    if (!q) {
      showResult();
      return;
    }

    state.currentQuestionId = qId;

    // Actualizar paso y barra de progreso
    stepTagEl.textContent = `Paso ${q.step} de ${q.totalSteps}`;
    const percent = Math.min(100, Math.round((q.step / q.totalSteps) * 100));
    progressFillEl.style.width = `${percent}%`;

    // Botón volver
    btnBack.disabled = state.history.length === 0;

    // Botón de salida rápida: solo cuando se cumplan las condiciones estrictas
    if (canShowEarlyExit()) {
      btnEarlyExit.style.display = 'inline-flex';
    } else {
      btnEarlyExit.style.display = 'none';
    }

    // Contenido
    let html = `
      <div class="diagnostic-question-title">${q.title}</div>
      <div class="diagnostic-question-desc">${q.desc}</div>
      <div class="diagnostic-options">
    `;

    q.options.forEach((opt, idx) => {
      html += `
        <button type="button" class="diagnostic-option" data-opt-idx="${idx}">
          <span class="diagnostic-badge">${opt.badge}</span>
          <span class="diagnostic-option-text">${opt.text}</span>
        </button>
      `;
    });

    html += `</div>`;
    bodyEl.innerHTML = html;

    // Bindings de opciones
    const optButtons = bodyEl.querySelectorAll('.diagnostic-option');
    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-opt-idx'), 10);
        handleSelectOption(q, idx);
      });
    });
  }

  function handleSelectOption(question, optIdx) {
    const opt = question.options[optIdx];

    // Guardar en historial
    state.history.push({
      qId: state.currentQuestionId,
      scoresApplied: { ...opt.scores },
      matchesAdded: opt.featureMatches ? [...opt.featureMatches] : (opt.featureMatch ? [opt.featureMatch] : [])
    });

    // Sumar puntuaciones
    if (opt.scores) {
      for (const [k, v] of Object.entries(opt.scores)) {
        state.scores[k] = (state.scores[k] || 0) + v;
      }
    }

    // Agregar coincidencias seleccionadas
    if (opt.featureMatches) {
      opt.featureMatches.forEach(m => {
        if (!state.selectedMatches.includes(m)) state.selectedMatches.push(m);
      });
    } else if (opt.featureMatch && !state.selectedMatches.includes(opt.featureMatch)) {
      state.selectedMatches.push(opt.featureMatch);
    }

    // Siguiente paso
    if (opt.next === 'RESULT') {
      showResult();
    } else {
      renderQuestion(opt.next);
    }
  }

  // BOTÓN VOLVER
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (state.history.length === 0) return;
      const prev = state.history.pop();

      // Restar puntuaciones
      for (const [k, v] of Object.entries(prev.scoresApplied)) {
        state.scores[k] = (state.scores[k] || 0) - v;
      }

      // Quitar matches agregados en ese paso
      prev.matchesAdded.forEach(m => {
        const idx = state.selectedMatches.lastIndexOf(m);
        if (idx !== -1) state.selectedMatches.splice(idx, 1);
      });

      renderQuestion(prev.qId);
    });
  }

  // BOTÓN SALIDA RÁPIDA
  if (btnEarlyExit) {
    btnEarlyExit.addEventListener('click', () => {
      state.isEarlyExit = true;
      showResult();
    });
  }

  // DETERMINAR GANADOR
  function getWinningBook() {
    let topBook = 'preversible';
    let maxScore = -999;

    for (const [bookId, score] of Object.entries(state.scores)) {
      if (score > maxScore) {
        maxScore = score;
        topBook = bookId;
      }
    }
    return BOOKS[topBook] || BOOKS.preversible;
  }

  // MOSTRAR PANTALLA DE RESULTADOS
  function showResult() {
    const book = getWinningBook();

    // Actualizar barra al 100%
    stepTagEl.textContent = state.isEarlyExit ? 'Diagnóstico Rápido' : 'Diagnóstico Completado';
    progressFillEl.style.width = '100%';
    footerEl.style.display = 'none'; // Ocultar footer durante el resultado

    // Coincidencias exactas (lo que el usuario marcó)
    const matches = state.selectedMatches.length > 0 
      ? state.selectedMatches 
      : ['Pensar en papel y reducir el uso de pantallas'];

    // Otras especificaciones incluidas en la edición
    const specs = book.allSpecs;

    let matchesHtml = matches.map(m => `
      <li class="result-list-item">
        <span class="match-icon">✓</span>
        <span><strong>${m}</strong></span>
      </li>
    `).join('');

    let specsHtml = specs.map(s => `
      <li class="result-list-item">
        <span class="spec-icon">•</span>
        <span>${s}</span>
      </li>
    `).join('');

    let headerBadgeText = state.isEarlyExit 
      ? '⚡ Diagnóstico preliminar (Con tus respuestas)' 
      : '✨ Tu herramienta recomendada';

    bodyEl.innerHTML = `
      <div class="result-screen">
        <div class="result-badge-header">${headerBadgeText}</div>
        
        <div class="result-main-card">
          <div class="result-image-box">
            <img src="${book.image}" alt="${book.title}" loading="lazy">
          </div>
          <div class="result-info-box">
            <h2 class="result-book-title">${book.title}</h2>
            <div class="result-book-subtitle">${book.subtitle}</div>
            <div class="result-rationale">${book.rationale}</div>
          </div>
        </div>

        <div class="result-section-title">
          <span>🎯 Características que encajan con tu búsqueda:</span>
        </div>
        <ul class="result-list">
          ${matchesHtml}
        </ul>

        <div class="result-section-title">
          <span>📋 Otras especificaciones incluidas en esta edición:</span>
        </div>
        <ul class="result-list">
          ${specsHtml}
        </ul>

        <div class="result-actions">
          <a href="${book.webLink}" class="btn-secondary">Ver libro en la web</a>
          <a href="${book.simLink}" class="btn-secondary">Probar simulador gratis</a>
          <a href="${book.amazonLink}" target="_blank" rel="noopener noreferrer" class="btn-primary">Comprar en Amazon</a>
        </div>

        <div class="result-restart-wrap">
          <button type="button" class="btn-restart" id="btn-restart-quiz">↺ Repetir cuestionario con otras respuestas</button>
        </div>
      </div>
    `;

    // Bind reiniciar
    const restartBtn = document.getElementById('btn-restart-quiz');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        resetState();
        footerEl.style.display = 'flex';
        renderQuestion('q1');
      });
    }
  }
});
