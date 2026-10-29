# Sistema de Diseño: Cronos & Co. — Gestor de Tareas y Compromisos
*Estética Aurora Vintage & Rigor Cromático Decimonónico*

---

## 1. Visión General del Producto y Dirección Artística

**Cronos & Co.** es una plataforma de gestión de tareas y compromisos que fusiona la sofisticación tipográfica de las imprentas y talleres litográficos de principios del siglo XX con la atmósfera contemporánea de las interfaces Aurora Gradient.

### Principios de Diseño
1. **Rigor Cromático 60/40**: El color blanco (`--blanco`) domina el 60% de la superficie para mantener ligereza visual y máxima legibilidad editorial. El 40% restante se reparte metódicamente entre los cinco acentos verdes pastel botánicos (`--pastel-1` a `--pastel-5`).
2. **Atmósfera Aurora Orgánica**: Degradados elípticos y radiales con desenfoque gaussiano (`filter: blur(...)`) que simulan veladuras de luz y acuarela botánica sin saturar el fondo.
3. **Oficio Tipográfico y Editorial**: Contraste armónico entre tipografías serif de linaje clásico y una sans-serif geométrica nítida para metadatos y registros tabulares.
4. **Fidelidad al Modelo de Dominio**: Modelado explícito de entidades (`Task` y `Commitment`), estados unificados, prioridades y validaciones visibles con micro-interacciones claras.

---

## 2. Sistema de Color (Color Tokens)

La paleta es estricta, basada en variables CSS que alimentan toda la jerarquía de la interfaz.

```css
:root {
  /* Superficie Base Predominante (~60%) */
  --blanco: #ffffff;

  /* Acentos Aurora Pastel Botánicos (~40%) */
  --pastel-1: #112109; /* Ébano Musgo / Deep Forest */
  --pastel-2: #2b421c; /* Oliva Profundo / Herbal Shadow */
  --pastel-3: #546d2f; /* Salvia Bosque / Botanical Olive */
  --pastel-4: #8ba246; /* Brote Dorado / Sage Aurora */
  --pastel-5: #d5e261; /* Lima Aurora / Bright Pistachio */
}
```

### Tabla de Aplicación y Ratio de Contraste

| Token | Valor Hex | Rol Principal | Superficie / Elementos | Contraste / Accesibilidad |
| :--- | :--- | :--- | :--- | :--- |
| `--blanco` | `#ffffff` | Fondo base estructural | Lienzo general, fondos de tarjetas principales, campos de formulario | Base neutral pura |
| `--pastel-1` | `#112109` | Contraste máximo, textos clave | Encabezados H1-H3, botones principales CTA, prioridad `CRITICA` | AAA (> 13:1 sobre blanco) |
| `--pastel-2` | `#2b421c` | Estructura y subtítulos | Bordes de tarjetas, chips secundarios, prioridad `ALTA`, etiquetas | AAA (> 8.5:1 sobre blanco) |
| `--pastel-3` | `#546d2f` | Estados y metadatos | Separadores ornamentales, estado `EN_PROCESO`, prioridad `MEDIA` | AA (> 4.8:1 sobre blanco) |
| `--pastel-4` | `#8ba246` | Iluminación e interactividad | Anillos de foco (focus rings), bordes activos, badges de prioridad `BAJA` | Legible en acentos y fondos oscuros |
| `--pastel-5` | `#d5e261` | Resplandor Aurora & Alertas | Píldoras de aviso, halos difusos `aurora-glow`, badges `PENDIENTE` | Uso exclusivo con texto `--pastel-1` |

---

## 3. Tipografía (Typography Scale)

### Fuentes
- **Títulos y Rótulos Editoriales:** `Cinzel` / `Playfair Display` (Serif de alto carácter histórico).
- **Subtítulos y Citas:** `Instrument Serif` / Georgia (Itálica elegante, 400).
- **Cuerpo y Formularios:** `Plus Jakarta Sans` / `Inter` (Sans-serif funcional para máxima legibilidad).
- **Identificadores y UUIDs:** `JetBrains Mono` / `Courier Prime` (Monospaced para hashes técnicos).

### Escala Jerárquica

```css
/* Escala de texto */
--text-xs:   0.72rem;  /* 11.5px — UUIDs, micro-etiquetas de límite de caracteres */
--text-sm:   0.85rem;  /* 13.6px — Metadatos, fechas, badges de estado */
--text-base: 0.95rem;  /* 15.2px — Cuerpo de descripciones y valores de input */
--text-lg:   1.125rem; /* 18.0px — Títulos de tarjetas y secciones */
--text-xl:   1.35rem;  /* 21.6px — Encabezados de módulo */
--text-2xl:  1.75rem;  /* 28.0px — Subtítulos editoriales */
--text-3xl:  2.25rem;  /* 36.0px — Título principal "Cuaderno de Tareas & Compromisos" */
```

---

## 4. Elevación, Sombras y Texturas Vintage

### Sombras y Resplandores
```css
/* Sombra estilo litografía suave sobre papel */
--shadow-paper: 0 4px 20px -2px rgba(17, 33, 9, 0.05), 0 2px 6px -1px rgba(43, 66, 28, 0.03);

/* Sombra flotante para modales y tarjetas activas */
--shadow-elevated: 0 12px 32px -4px rgba(17, 33, 9, 0.08), 0 4px 12px -2px rgba(84, 109, 47, 0.06);

/* Halos Aurora Gradient */
--aurora-ambient: radial-gradient(circle at 10% 20%, rgba(213, 226, 97, 0.18) 0%, transparent 45%),
                  radial-gradient(circle at 90% 80%, rgba(139, 162, 70, 0.14) 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, rgba(84, 109, 47, 0.05) 0%, transparent 60%);
```

### Acabado Superficial
- **Micro-textura Papel Verjurado:** Tramado sutil mediante CSS SVG noise (`opacity: 0.025`).
- **Remates Ornamentales Decimonónicos:** Símbolos tipográficos clásicos (`❦`, `✦`, `❖`) centrados como separadores de sección.

---

## 5. Especificación de Componentes del Dominio

### A. Entidad Tarea (Task Card)
- **Contenedor:** Fondo `--blanco` con borde sutil de `1px solid rgba(84, 109, 47, 0.2)`. Radio de curvatura `8px`.
- **Cabecera Técnica:** Badge monoespaciado para el `id` (UUID abreviado), alineado con el badge de **Prioridad**.
- **Jerarquía de Prioridades:**
  - `CRITICA`: Fondo `--pastel-1`, texto `--blanco`.
  - `ALTA`: Fondo `--pastel-2`, texto `--blanco`.
  - `MEDIA`: Fondo `--pastel-4`, texto `--pastel-1`.
  - `BAJA`: Fondo `rgba(213, 226, 97, 0.35)`, borde `--pastel-4`, texto `--pastel-1`.
- **Badges de Estado (`TaskState`):**
  - `PENDIENTE`: Borde punteado con dot animado en `--pastel-5`.
  - `EN_PROCESO`: Píldora sólida `--pastel-3` con texto `--blanco`.
  - `COMPLETADA`: Fondo `--pastel-2` con icono de verificación vintage.
  - `CANCELADA`: Tachado sutil con tono desaturado y borde tenue.
- **Contadores de Caracteres en Formulario:**
  - `titulo`: Máximo 100 caracteres (`visible: {count} / 100`).
  - `descripcion`: Máximo 500 caracteres (`visible: {count} / 500`).

### B. Entidad Compromiso (Commitment Card)
- **Identificador:** UUID en chip monospaced con fondo `rgba(139, 162, 70, 0.1)`.
- **Rango Temporal & Validación:**
  - Muestra `fechaInicio` y `fechaFin`.
  - **Insignia de Validación:** Píldora de confirmación `Intervalo verificado (Duración: Xh Ym)` en verde aurora cuando `fechaFin > fechaInicio`. Indicador de error contextual en rojo terracota si la condición no se cumple.
- **Participantes:** Lista de chips individuales para cada correo. El creador lleva insignia destacada `(Creador)`. Mínimo 1 participante validado.
- **Badges de Estado (`CommitmentState`):**
  - `PROGRAMADO`: Borde de contorno fino en `--pastel-3`.
  - `CONFIRMADO`: Fondo oscuro `--pastel-1` con tipografía nítida en `--pastel-5`.
  - `CANCELADO`: Atenuado con borde neutral.
- **Recordatorio:** Valor por defecto `15 minutos previos`.

### C. Formulario Oficial de Alta
- **Estructura:** Tabs intercambiables para "Registrar Nueva Tarea (Task)" y "Registrar Compromiso (Commitment)".
- **Inputs & Selects:** Fondo `--blanco`, bordes en `1.5px solid rgba(43, 66, 28, 0.25)`.
- **Estados Interactivos:**
  - `Hover`: Borde transiciona a `--pastel-3`.
  - `Focus`: Anillo exterior de resplandor `0 0 0 3px rgba(213, 226, 97, 0.45)` y borde `--pastel-2`.
- **Acciones:** Botón primario ("Guardar") con fondo `--pastel-1` y texto `--blanco`; botón secundario ("Limpiar Campos") transparente con borde `--pastel-2`.

---

## 6. Reglas de Responsive Design

| Breakpoint | Dispositivo | Disposición |
| :--- | :--- | :--- |
| `< 640px` | Móvil | Flujo en una sola columna. Formulario colapsado verticalmente. Filtros horizontales con scroll táctil. |
| `641px - 1024px` | Tablet | Sidebar superior o colapsable. Rejilla de 2 columnas para Tareas y Compromisos. |
| `> 1025px` | Desktop | Layout completo: Navegación lateral izquierda fija (240px), lienzo de trabajo central con columnas gemelas de entidades y formulario oficial de alta al pie. |

---

## 7. Verificación de Conformidad y Auditoría
- **Superficie Blanca:** ≥ 60% garantizado en todo momento como lienzo de respiro.
- **Acentos Pastel:** ≤ 40% distribuido armónicamente en navegación, estados, bordes e iluminación aurora.
- **WCAG 2.1:** Nivel AA y AAA cumplidos para todas las combinaciones de texto y fondos interactivos.
