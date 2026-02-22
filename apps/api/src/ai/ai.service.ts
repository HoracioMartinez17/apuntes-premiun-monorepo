import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// --- 1. DEFINICIÓN DE ESQUEMAS ZOD (Validación Estricta) ---

// Esquema para el contenido de una lección individual
const LessonContentSchema = z.object({
  content_md: z.string().min(200, "El contenido debe tener al menos 200 palabras"),
});

// Esquema para la estructura del curso
const LessonStructureSchema = z.object({
  title: z.string().min(4, "El título es demasiado corto"),
  brief: z.string().min(20, "El brief debe tener al menos 20 palabras"),
  // content_md es opcional aquí porque se rellena después
  content_md: z.string().optional(),
});

const ModuleSchema = z.object({
  title: z.string().min(4, "El título del módulo es demasiado corto"),
  lessons: z
    .array(LessonStructureSchema)
    .min(2)
    .max(3, "Cada módulo debe tener entre 2 y 3 lecciones"),
});

const CourseSchema = z.object({
  title: z.string(),
  category: z.string().min(3, "La categoría es requerida"),
  modules: z.array(ModuleSchema).min(6).max(8, "El curso debe tener entre 6 y 8 módulos"),
});

// Tipos inferidos automáticamente de Zod
type CourseStructure = z.infer<typeof CourseSchema>;
type LessonContent = z.infer<typeof LessonContentSchema>;

type GenerationProgress = {
  processed: number;
  total: number;
  lessonTitle?: string;
};

type GenerationOptions = {
  onTotal?: (total: number) => void;
  onProgress?: (progress: GenerationProgress) => void;
  signal?: AbortSignal;
};

@Injectable()
export class AiService {
  private model;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Usando gemini-pro (modelo básico compatible con todas las API keys)
    this.model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview", // Puedes cambiar a 'gemini-3-flash' o 'gemini-3' si tu clave lo permite
    });
  }

  // --- MÉTODO PRINCIPAL ---
  async generateApuntes(
    topic: string,
    options: GenerationOptions = {},
  ): Promise<CourseStructure> {
    console.log(`[AI Service] 🚀 Iniciando generación robusta para: "${topic}"`);

    try {
      // FASE 1: Estructura
      const structure = await this._generateStructure(topic);

      // FASE 2: Relleno de Contenido
      const totalLessons = structure.modules.reduce(
        (acc, m) => acc + m.lessons.length,
        0,
      );
      let processed = 0;

      options.onTotal?.(totalLessons);

      console.log(
        `[AI Service] Estructura válida recibida. Generando ${totalLessons} lecciones...`,
      );

      for (const module of structure.modules) {
        for (const lesson of module.lessons) {
          if (options.signal?.aborted) {
            throw new Error("Generación cancelada");
          }

          console.log(
            `[AI Service] [${processed + 1}/${totalLessons}] Generando contenido: "${lesson.title}"`,
          );

          try {
            // Pequeña pausa para evitar Rate Limit de Google
            await new Promise((r) => setTimeout(r, 1000));

            const contentData = await this._generateLessonContent(
              topic,
              module.title,
              lesson.title,
              lesson.brief,
            );
            lesson.content_md = contentData.content_md;
            processed += 1;
            options.onProgress?.({
              processed,
              total: totalLessons,
              lessonTitle: lesson.title,
            });
          } catch (error) {
            console.error(
              `[AI Service] ❌ Falló lección "${lesson.title}": ${error.message}`,
            );
            lesson.content_md = `> Error: No se pudo generar el contenido para esta lección. \n> Detalles: ${error.message}`;
            processed += 1;
            options.onProgress?.({
              processed,
              total: totalLessons,
              lessonTitle: lesson.title,
            });
          }
        }
      }

      console.log(`[AI Service] ✅ Curso generado y validado correctamente.`);
      return structure;
    } catch (error) {
      console.error("[AI Service] Error Crítico:", error);
      throw new InternalServerErrorException("Error generando el curso con IA");
    }
  }

  // --- HELPER 1: Generar Estructura ---
  private async _generateStructure(topic: string): Promise<CourseStructure> {
    const prompt = `
Eres un arquitecto de cursos senior. Genera la ESTRUCTURA COMPLETA de un curso profesional sobre:

"${topic}"

### OBJETIVO
Crear la tabla de contenidos completa del curso, dividida en módulos y lecciones, sin generar aún el contenido Markdown.

### CATEGORÍAS DISPONIBLES
Debes asignar el curso a UNA de estas categorías según su contenido:
- Frontend (React, Vue, Angular, HTML/CSS, UI/UX)
- Backend (Node.js, Python, Java, APIs, Servidores)
- Full Stack (Proyectos completos con frontend + backend)
- DevOps (Docker, CI/CD, Cloud, Kubernetes)
- Bases de Datos (SQL, NoSQL, PostgreSQL, MongoDB)
- Testing (Unit tests, E2E, TDD)
- Mobile (React Native, Flutter, iOS, Android)
- Data Science (Python, Machine Learning, IA)
- Seguridad (Ciberseguridad, Ethical Hacking)
- Arquitectura (Patrones de diseño, Clean Code, Microservicios)

### ESTRUCTURA REQUERIDA
- Entre 6 y 8 módulos temáticos.
- Cada módulo debe tener entre 2 y 3 lecciones progresivas (máximo 3).
- Cada lección debe incluir:
  * "title": título claro, profesional y descriptivo (4-8 palabras).
  * "brief": resumen ejecutivo de 2-3 líneas explicando qué aprenderá el estudiante (mínimo 20 palabras).

### CRITERIOS DE CALIDAD
- Los títulos deben ser específicos, no genéricos (evita "Introducción" sin contexto).
- Los briefs deben responder: ¿Qué problema resuelve esta lección? ¿Qué habilidad se desarrolla?
- La progresión debe ser lógica: desde fundamentos hasta casos avanzados.
- Incluir módulos de práctica, debugging, y casos reales.

### FORMATO DE SALIDA (OBLIGATORIO)
Responde ÚNICAMENTE con un JSON válido siguiendo esta estructura exacta:

{
  "title": "${topic}",
  "category": "Categoría más apropiada de la lista anterior",
  "modules": [
    {
      "title": "Nombre del Módulo",
      "lessons": [
        {
          "title": "Nombre de la Lección",
          "brief": "Resumen detallado de 2-3 líneas (mínimo 20 palabras)"
        }
      ]
    }
  ]
}

### REGLAS FINALES
- NO incluyas bloques de código como \`\`\`json.
- NO incluyas texto antes o después del JSON.
- NO generes el contenido "content_md" todavía.
- Asegúrate de que el JSON sea válido.
- La categoría debe ser EXACTAMENTE una de la lista (respeta mayúsculas/minúsculas).
    `;

    return await this._generateSafeJSON<CourseStructure>(prompt, CourseSchema);
  }

  // --- HELPER 2: Generar Contenido ---
  private async _generateLessonContent(
    topic: string,
    modTitle: string,
    lesTitle: string,
    brief: string,
  ): Promise<LessonContent> {
    const prompt = `
Eres un profesor experto. Genera contenido profesional que sirva tanto para APRENDER como para CONSULTAR RÁPIDAMENTE cuando se necesite resolver algo específico.

**Curso**: "${topic}"
**Módulo**: "${modTitle}"
**Lección**: "${lesTitle}"
**Contexto**: "${brief}"

### OBJETIVO DUAL DEL CONTENIDO
Este material debe funcionar como:
1. **Guía de aprendizaje**: Explicaciones claras para entender el concepto
2. **Material de consulta rápida**: Soluciones y ejemplos listos para usar cuando se tenga una duda

### FORMATO VISUAL DEL CONTENIDO (CRÍTICO)
El campo "content_md" debe ser fácil de escanear y buscar:

**OBLIGATORIO:**
- Títulos descriptivos y específicos (## y ###) que faciliten búsqueda
- Separadores visuales claros (---) entre secciones
- Listas concisas con viñetas (-) o numeradas (1.)
- Bloques de código COPIABLES: \`\`\`typescript, \`\`\`javascript, \`\`\`python
- Código inline con backticks: \`variable\`
- **Negritas** para conceptos clave y palabras de búsqueda
- Tablas para comparaciones y soluciones rápidas
- Párrafos cortos (máximo 4 líneas)

**PROHIBIDO:**
- Párrafos largos y densos
- Código sin comentarios o difícil de entender
- Explicaciones teóricas sin aplicación práctica
- Contenido que no se pueda usar directamente

### CONTENIDO DE CADA LECCIÓN (ESTRUCTURA OBLIGATORIA)

El "content_md" debe incluir EXACTAMENTE estas 6 secciones optimizadas para consulta:

## 1. Introducción y Conceptos Clave

**¿Qué es y para qué sirve?**
Explicación concisa en 2-3 párrafos del concepto principal.

**¿Cuándo usarlo?**
- Escenario 1: [Situación específica]
- Escenario 2: [Otro caso de uso]
- Escenario 3: [Cuándo evitarlo]

**Palabras clave**: [término1], [término2], [término3] (para facilitar búsqueda)

---

## 2. Ejemplos Prácticos y Código Reutilizable

### ⚡ Ejemplo 1: [Nombre descriptivo del caso]

**Caso de uso**: [Qué problema resuelve este código]

**IMPORTANTE PARA CSS PURO**: Si estás enseñando estilos CSS puros, siempre proporciona ejemplos completos en HTML que incluyan:
1. El CSS dentro de etiquetas \`<style>\`
2. El HTML de demostración que usa esas clases
3. Múltiples elementos de ejemplo para ver variaciones

\`\`\`html
<style>
/* CSS aquí - con comentarios explicativos */
.ejemplo {
  display: flex;
  /* More styles... */
}
</style>

<!-- HTML de demostración -->
<div class="ejemplo">
  <div class="ejemplo__item">Elemento 1</div>
  <div class="ejemplo__item">Elemento 2</div>
</div>

<!-- Variación con modificador -->
<div class="ejemplo ejemplo--destacado">
  <div class="ejemplo__item">Variante destacada</div>
</div>
\`\`\`

**IMPORTANTE PARA TAILWIND CSS**: Si usas Tailwind CSS, SIEMPRE incluye el CDN al inicio:
1. Script del CDN: \`<script src="https://cdn.tailwindcss.com"></script>\`
2. Estilos adicionales opcionales en \`<style>\` si son necesarios
3. HTML con clases de Tailwind y múltiples variantes/estados

\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>

<style>
  /* Estilos adicionales opcionales */
  body { font-family: sans-serif; background: #f3f4f6; padding: 20px; }
</style>

<!-- HTML con Tailwind -->
<div class="flex gap-3 p-5 bg-white rounded-xl">
  <button class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all">
    Botón con Tailwind
  </button>
</div>
\`\`\`

**Para JavaScript/TypeScript**: Ejemplo ejecutable con contexto visual (como en el playground)
**Prioridad**: Si no puedes construir un ejemplo VISUAL y ejecutable en navegador, NO incluyas ejemplo (evita snippets sueltos sin resultado).
**Errores/anti-patrones en JS/TS**: Si el ejemplo muestra un error, DEBE incluir:
- Un bloque 
  "mal" con el error dentro de try/catch
- Mostrar el error en el DOM y en console.log
- Incluir el arreglo correcto y explicar qué cambiar para que funcione

\`\`\`html
<div class="demo">
  <button id="accion" class="btn">Probar</button>
  <p id="resultado" class="texto">Resultado: --</p>
</div>

<script>
  // Codigo 100% ejecutable en navegador (sin types ni imports)
  // Con comentarios explicativos en cada paso importante
  // Debe escribir en el DOM y usar console.log
</script>
\`\`\`

**Cómo adaptarlo a tu proyecto**:
- Cambiar X por tu valor
- Ajustar Y según necesites
- Opcional: Z si tu caso requiere...

### ⚡ Ejemplo 2: [Caso más complejo o diferente]

**Caso de uso**: [Situación práctica]

\`\`\`html
<!-- Si es CSS/HTML: ejemplo completo visual -->
<style>
.componente {
  /* Estilos aquí */
}
</style>

<div class="componente">
  <!-- Ejemplo que se puede ver funcionando -->
</div>
\`\`\`

\`\`\`html
<!-- Si es JavaScript/TypeScript: otro ejemplo ejecutable con DOM + <script> -->
<div class="demo"></div>
<script>
  // Alternativa para otro escenario
</script>
\`\`\`

**Notas importantes**: [Advertencias o consideraciones]
**Si hay error**: Explica cómo corregirlo y muestra el fragmento correcto.

---

## 3. Casos de Uso Reales

**Aplicaciones en proyectos profesionales:**

1. **[Industria/Empresa conocida]**: Cómo se usa este concepto en producción
2. **[Framework/Librería popular]**: Implementación específica con ejemplos
3. **[Caso corporativo]**: Situación real donde esto es esencial
4. **[Proyecto open-source]**: Referencias a código real que puedes consultar

**Enlaces de referencia**: [Si aplica, menciona docs oficiales o repos]

---

## 4. Problemas Comunes y Soluciones (Guía Rápida)

**Tabla de soluciones rápidas:**

| ❌ Problema | 🔍 Causa | ✅ Solución Paso a Paso |
|:-----------|:--------|:----------------------|
| [Error específico que verás] | Por qué ocurre | 1. Hacer X<br>2. Verificar Y<br>3. Confirmar Z |
| [Otro error común] | Causa raíz clara | Solución directa y práctica |
| [Bug típico] | Razón técnica | Fix con código si es necesario |

**💡 Tips de Debugging**:
- **Tip 1**: [Cómo detectar el problema rápido]
- **Tip 2**: [Herramienta o técnica útil]
- **Tip 3**: [Prevención de errores comunes]

**🔗 Comandos útiles**:
\`\`\`bash
# Si aplica, comandos para diagnosticar
\`\`\`

---

## 5. Buenas Prácticas y Patrones Recomendados

**✓ DO (Hacer)**:
1. **[Práctica 1]**: Por qué es importante y cómo implementarla
2. **[Práctica 2]**: Beneficios en mantenibilidad y rendimiento
3. **[Práctica 3]**: Casos donde es crítica
4. **[Práctica 4]**: Impacto en código de producción
5. **[Práctica 5]**: Prevención de bugs comunes

**✗ DON'T (Evitar)**:
- ❌ **Anti-patrón 1**: Por qué es malo y qué usar en su lugar
- ❌ **Anti-patrón 2**: Consecuencias y alternativa correcta
- ❌ **Anti-patrón 3**: Error común y cómo evitarlo

**📋 Checklist de implementación**:
- [ ] Verificar X
- [ ] Asegurar Y
- [ ] Validar Z
- [ ] Testear W

---

## 6. Resumen y Referencia Rápida

**📌 Puntos clave para recordar:**

1. **[Concepto fundamental]**: Definición en 1 línea + cuándo usarlo
2. **[Patrón principal]**: Sintaxis básica o estructura
3. **[Solución común]**: Respuesta a la pregunta más frecuente
4. **[Advertencia importante]**: Qué evitar y por qué
5. **[Próximo paso]**: Qué aprender después de dominar esto

**🔖 Glosario de términos técnicos:**

| Término | Definición Clara | Uso en Contexto |
|:--------|:-----------------|:----------------|
| **[Término 1]** | Qué significa | Ejemplo: "Se usa para..." |
| **[Término 2]** | Definición práctica | Ejemplo en código |
| **[Término 3]** | Explicación concisa | Cuándo aparece |

**⚡ Sintaxis rápida (Cheatsheet)**:

**Para CSS Puro**: Proporciona ejemplos HTML completos y visuales
\`\`\`html
<style>
/* Patrón CSS más común */
.clase-ejemplo {
  propiedad: valor;
  /* Comentario de uso */
}

.clase-ejemplo--variante {
  /* Modificador BEM */
}
</style>

<!-- Demostración visual -->
<div class="clase-ejemplo">
  Contenido de ejemplo
</div>
<div class="clase-ejemplo clase-ejemplo--variante">
  Variante
</div>
\`\`\`

**Para Tailwind CSS**: SIEMPRE incluir el CDN y ejemplos con estados
\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>

<style>
  body { padding: 20px; background: #f3f4f6; }
</style>

<!-- Ejemplo con estados interactivos -->
<button class="bg-blue-600 text-white px-6 py-3 rounded-lg 
               hover:bg-blue-700 active:scale-95 
               focus:ring-2 focus:ring-blue-500 
               transition-all">
  Botón Tailwind
</button>
\`\`\`

**Para JavaScript/TypeScript**: Ejemplo ejecutable con HTML + <script>
\`\`\`html
<div id="app"></div>
<script>
  // Patrón básico más usado
  // Listo para copiar, sin types ni imports
</script>
\`\`\`

**Para otros lenguajes**: Sintaxis más común con ejemplo práctico

### ESTILO Y TONO
- **Directo y consultable**: Facilitar encontrar respuestas específicas
- **Ejemplos del mundo real**: Empresas, productos, casos actuales
- **Código listo para usar**: Copyable y adaptable
- **Sin relleno**: Cada línea debe resolver dudas o enseñar algo útil
- **Prioridad en APLICABILIDAD**: Cómo usar esto HOY en tu proyecto
- **TypeScript/JavaScript por defecto**, Python cuando sea apropiado

### EJEMPLOS DE FORMATO CORRECTO

**✅ CSS PURO - FORMATO CORRECTO (Ejemplo completo visual con múltiples estados):**
\`\`\`html
<style>
/* Botón base con estados profesionales */
.btn-pro {
  /* Estructura base */
  background: #2563eb;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  
  /* Transiciones suaves para todos los cambios */
  transition: all 150ms ease-in-out;
  
  /* Sombra inicial sutil */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Estado Hover - Cuando pasas el ratón */
.btn-pro:hover {
  background: #1d4ed8;
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
  transform: translateY(-2px);
}

/* Estado Active - Cuando haces click (efecto de presión) */
.btn-pro:active {
  transform: scale(0.95) translateY(0);
  background: #1e40af;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Estado Focus - Accesibilidad con teclado (Tab) */
.btn-pro:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
}

/* Estado Disabled - Botón inactivo */
.btn-pro:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Variantes de color */
.btn-success {
  background: #10b981;
}
.btn-success:hover {
  background: #059669;
}

.btn-danger {
  background: #ef4444;
}
.btn-danger:hover {
  background: #dc2626;
}

/* Container para demostración */
.demo {
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>

<!-- Demostración de estados y variantes -->
<div class="demo">
  <button class="btn-pro">Botón Normal</button>
  <button class="btn-pro btn-success">Éxito</button>
  <button class="btn-pro btn-danger">Eliminar</button>
  <button class="btn-pro" disabled>Deshabilitado</button>
</div>

<p style="margin-top: 20px; color: #64748b; font-size: 14px;">
  💡 <strong>Prueba:</strong> Pasa el ratón, haz click, usa Tab para navegar
</p>
\`\`\`

**✅ TAILWIND CSS - FORMATO CORRECTO (Estados interactivos con CDN):**
\`\`\`html
<!-- IMPORTANTE: Siempre incluir el script del CDN de Tailwind -->
<script src="https://cdn.tailwindcss.com"></script>

<style>
  /* Estilos adicionales opcionales */
  body { font-family: sans-serif; background: #f3f4f6; padding: 20px; }
</style>

<!-- Ejemplo: Botones con estados hover, active y focus -->
<div class="flex gap-3 flex-wrap p-5 bg-white rounded-xl shadow-sm">
  
  <!-- Botón primario con todos los estados -->
  <button class="
    bg-blue-600 text-white px-6 py-3 rounded-lg font-medium
    transition-all duration-150
    hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5
    active:scale-95 active:bg-blue-800 active:translate-y-0
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none
  ">
    Botón Primario
  </button>
  
  <!-- Variante de éxito -->
  <button class="
    bg-green-600 text-white px-6 py-3 rounded-lg font-medium
    transition-all duration-150
    hover:bg-green-700 hover:shadow-lg hover:-translate-y-0.5
    active:scale-95 active:bg-green-800
    focus:outline-none focus:ring-2 focus:ring-green-500
  ">
    Guardar
  </button>
  
  <!-- Variante de peligro -->
  <button class="
    bg-red-600 text-white px-6 py-3 rounded-lg font-medium
    transition-all duration-150
    hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5
    active:scale-95 active:bg-red-800
    focus:outline-none focus:ring-2 focus:ring-red-500
  ">
    Eliminar
  </button>
  
  <!-- Botón secundario (outline) -->
  <button class="
    bg-transparent text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg font-medium
    transition-all duration-150
    hover:bg-blue-600 hover:text-white hover:-translate-y-0.5
    active:scale-95
    focus:outline-none focus:ring-2 focus:ring-blue-500
  ">
    Cancelar
  </button>
  
  <!-- Botón deshabilitado -->
  <button disabled class="
    bg-blue-600 text-white px-6 py-3 rounded-lg font-medium
    disabled:bg-gray-400 disabled:cursor-not-allowed
  ">
    Deshabilitado
  </button>
  
</div>

<p class="mt-5 text-gray-600 text-sm">
  💡 <strong>Interactúa:</strong> Prueba hover, click y navegación con Tab (focus)
</p>
\`\`\`

**✅ TAILWIND CSS - EJEMPLO AVANZADO (Dropdown con group-hover):**
\`\`\`html
<script src="https://cdn.tailwindcss.com"></script>

<style>
  body { font-family: sans-serif; background: #f3f4f6; padding: 20px; }
</style>

<!-- Navegación con Dropdown -->
<nav class="flex justify-center">
  
  <!-- Ítem de Menú Padre (group) -->
  <div class="relative group">
    
    <!-- Botón Trigger -->
    <button class="flex items-center gap-2 px-6 py-3 bg-white rounded-lg shadow-sm text-gray-700 hover:text-blue-600 transition-colors font-medium">
      <span>Menú Productos</span>
      <!-- Icono que rota al hacer hover -->
      <svg class="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- DROPDOWN FLOTANTE con group-hover -->
    <div class="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden 
                invisible opacity-0 translate-y-2 scale-95 
                group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 
                transition-all duration-200 ease-out origin-top-left z-50">
      
      <div class="py-2">
        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
          Electrónica
        </a>
        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
          Hogar y Jardín
        </a>
        <a href="#" class="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
          Ofertas Especiales
        </a>
      </div>
    </div>

  </div>
</nav>
\`\`\`

**❌ CSS PURO - FORMATO INCORRECTO (CSS sin contexto visual):**
\`\`\`css
.card {
  background: white;
  padding: 20px;
}
\`\`\`
*Esto NO permite ver el resultado en el playground*

**❌ TAILWIND - FORMATO INCORRECTO (Sin CDN):**
\`\`\`html
<button class="bg-blue-600 text-white px-6 py-3 rounded-lg">
  Botón
</button>
\`\`\`
*Falta el script del CDN, NO funcionará*

**❌ TAILWIND - FORMATO INCORRECTO (Solo clases sin HTML):**
\`\`\`
bg-blue-600 hover:bg-blue-700 active:scale-95
\`\`\`
*No se puede ejecutar ni ver el resultado*

### REQUISITOS DE CALIDAD
- Contenido: 600-900 palabras (conciso pero completo)
- Código: mínimo 2 ejemplos con 15+ líneas COPIABLES
- **CSS Puro**: SIEMPRE usar bloques \`\`\`html con <style> + HTML de demostración
  - Incluir múltiples elementos para mostrar diferentes estados
  - Mostrar variaciones (normal, hover, activo, etc.)
  - Usar clases descriptivas que se entiendan fácilmente
  - Proporcionar ejemplos visuales completos, no solo CSS puro
- **Tailwind CSS**: SIEMPRE incluir \`<script src="https://cdn.tailwindcss.com"></script>\` al inicio
  - Ejemplos ejecutables con estados hover, active, focus
  - Múltiples variantes de componentes
  - Clases documentadas con comentarios cuando sea complejo
- **JavaScript/TypeScript**: Ejemplos ejecutables en navegador (sin types ni imports). Siempre incluir HTML + <script> y salida visual en el DOM.
  - Si NO puedes dar salida visual clara, omite el ejemplo en lugar de dar código sin contexto.
- Tabla obligatoria en "Problemas comunes"
- Cheatsheet o sintaxis rápida en resumen con ejemplos visuales
- Líneas horizontales (---) entre secciones
- Comentarios útiles en código (no obvios)
- Ejemplos ejecutables y probados mentalmente

### FORMATO DE SALIDA (OBLIGATORIO)
Responde ÚNICAMENTE con un JSON válido:

{
  "content_md": "# ${lesTitle}\\n\\n## 1. Introducción y Conceptos Clave\\n[contenido]\\n\\n---\\n\\n## 2. Ejemplos Prácticos y Código Reutilizable\\n[contenido]..."
}

### VALIDACIÓN FINAL
Antes de responder, verifica:
✓ La lección tiene las 6 secciones numeradas
✓ Hay 2+ ejemplos de código COPIABLES (15+ líneas)
✓ **Si hay CSS puro**: TODOS los ejemplos deben ser bloques \`\`\`html con <style> + HTML
✓ **Si hay Tailwind CSS**: TODOS los ejemplos DEBEN incluir \`<script src="https://cdn.tailwindcss.com"></script>\`
✓ **Ejemplos CSS**: Incluyen múltiples elementos para mostrar variaciones visuales
✓ **Código ejecutable**: Se puede copiar y pegar directamente en un proyecto o playground
✓ Tabla de problemas con soluciones paso a paso
✓ Cheatsheet o sintaxis rápida en resumen
✓ Títulos descriptivos que faciliten búsqueda
✓ Líneas horizontales (---) separando secciones
✓ **Ejemplos prácticos**: Muestran casos reales, no código trivial
✓ JSON válido (sin comentarios externos, sin bloques markdown)
✓ Contenido útil para CONSULTA RÁPIDA

### REGLAS FINALES
- NO incluyas bloques de código como \`\`\`json al envolver la respuesta
- NO incluyas texto explicativo antes o después del JSON
- El contenido Markdown debe estar dentro del string "content_md"
- Usa \\n para saltos de línea dentro del string JSON
- Asegúrate de que el JSON sea 100% válido
- El contenido debe servir para aprender Y consultar después
    `;

    return await this._generateSafeJSON<LessonContent>(prompt, LessonContentSchema);
  }

  // --- EL NÚCLEO ROBUSTO: Generación Segura con Reintentos y Validación ---
  private async _generateSafeJSON<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    retries = 3,
  ): Promise<T> {
    let attempt = 0;
    let lastError: any;

    while (attempt < retries) {
      try {
        attempt++;
        if (attempt > 1)
          console.warn(`[AI Service] ⚠️ Reintento ${attempt}/${retries}...`);

        const result = await this.model.generateContent(prompt);
        const text = result.response.text();

        // 1. Limpieza Agresiva
        const jsonString = this._cleanJsonString(text);

        // 2. Parseo
        const parsed = JSON.parse(jsonString);

        // 3. Validación con Zod (Aquí es donde ocurre la magia)
        // Si el JSON no cumple la estructura, esto lanza un error y provoca un reintento.
        const validatedData = schema.parse(parsed);

        return validatedData;
      } catch (error) {
        lastError = error;
        console.error(
          `[AI Service] Intento ${attempt} fallido:`,
          error instanceof z.ZodError ? "Error de Validación Zod" : error.message,
        );

        // Si es el último intento, no esperamos
        if (attempt < retries) await new Promise((r) => setTimeout(r, 2000)); // Espera exponencial simple
      }
    }

    throw new Error(
      `Falló la generación después de ${retries} intentos. Último error: ${lastError.message}`,
    );
  }

  // --- UTILIDAD DE LIMPIEZA ---
  private _cleanJsonString(text: string): string {
    let clean = text.trim();
    // Eliminar bloques markdown ```json ... ``` o ``` ... ```
    clean = clean
      .replace(/^```json\s*/g, "")
      .replace(/^```\s*/g, "")
      .replace(/\s*```$/g, "");

    // Encontrar el objeto JSON real
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    return clean;
  }
}
