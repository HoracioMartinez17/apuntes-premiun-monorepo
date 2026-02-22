import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { UsersService } from "./users/users.service";
import { UserRole } from "./users/user.entity";
import { DataSource } from "typeorm";
import { User } from "./users/user.entity";
import { Apunte } from "./apuntes/apunte.entity";

function getRequiredSeedEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Variable requerida para seed no configurada: ${name}`);
  }

  return value;
}

async function seed() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const allowNonDevSeed = process.env.SEED_ALLOW_NON_DEV === "true";

  if (nodeEnv !== "development" && !allowNonDevSeed) {
    console.error("❌ Seed bloqueado fuera de development.");
    console.error(
      `Entorno actual: ${nodeEnv}. Si realmente lo necesitas, usa SEED_ALLOW_NON_DEV=true.`,
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const dataSource = app.get(DataSource);
  const userRepository = dataSource.getRepository(User);
  const apunteRepository = dataSource.getRepository(Apunte);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@apuntes-premium.com";
  const adminPassword = getRequiredSeedEnv("SEED_ADMIN_PASSWORD");
  const userEmail = process.env.SEED_USER_EMAIL ?? "usuario@test.com";
  const userPassword = getRequiredSeedEnv("SEED_USER_PASSWORD");
  const noAccessEmail = process.env.SEED_NO_ACCESS_EMAIL ?? "sinacceso@test.com";
  const noAccessPassword = getRequiredSeedEnv("SEED_NO_ACCESS_PASSWORD");

  console.log("Iniciando seed de datos...");

  try {
    // Crear usuario admin de prueba
    let existingAdmin = await usersService.findByEmail(adminEmail);

    if (!existingAdmin) {
      const admin = await usersService.create(adminEmail, adminPassword, "Administrador");

      // Actualizar rol y acceso
      await userRepository.update(admin.id, {
        role: UserRole.ADMIN,
        hasAccess: true,
      });

      console.log("Usuario admin creado:");
      console.log(`   Email: ${adminEmail}`);
      console.log("   Rol: admin");
    } else {
      console.log("Usuario admin ya existe");
    }

    // Crear usuario regular de prueba
    let existingUser = await usersService.findByEmail(userEmail);

    if (!existingUser) {
      const user = await usersService.create(userEmail, userPassword, "Usuario Test");

      // Actualizar acceso
      await usersService.updateAccess(user.id, true);

      console.log("Usuario test creado:");
      console.log(`   Email: ${userEmail}`);
      console.log("   Rol: user");
      console.log("   Acceso: Si");
    } else {
      console.log("Usuario test ya existe");
    }

    // Crear usuario sin acceso
    let existingNoAccess = await usersService.findByEmail(noAccessEmail);

    if (!existingNoAccess) {
      await usersService.create(noAccessEmail, noAccessPassword, "Usuario Sin Acceso");

      console.log("Usuario sin acceso creado:");
      console.log(`   Email: ${noAccessEmail}`);
      console.log("   Rol: user");
      console.log("   Acceso: No");
    } else {
      console.log("Usuario sin acceso ya existe");
    }

    console.log("\nSeed completado!");
    console.log("\nUsuarios de prueba:");
    console.log("\nADMIN PANEL (http://localhost:3003):");
    console.log(`   Email: ${adminEmail}`);
    console.log("   Password: configurada por entorno (oculta en logs)");
    console.log("\nCONTENT APP (http://localhost:3002):");
    console.log(`   Email: ${userEmail}`);
    console.log("   Password: configurada por entorno (oculta en logs)");
    console.log("\nUsuario sin acceso:");
    console.log(`   Email: ${noAccessEmail}`);
    console.log("   Password: configurada por entorno (oculta en logs)");

    // Crear apuntes de ejemplo
    console.log("\nCreando apuntes de ejemplo...");

    const apuntesExistentes = await apunteRepository.count();

    if (apuntesExistentes === 0) {
      const adminUser = await usersService.findByEmail("admin@apuntes-premium.com");

      // Apunte 1: Introducción a TypeScript
      await apunteRepository.save({
        title: "Introducción a TypeScript",
        category: "TypeScript",
        published: true,
        author: adminUser,
        modules: [
          {
            title: "Fundamentos de TypeScript",
            lessons: [
              {
                title: "¿Qué es TypeScript?",
                brief: "Descubre qué es TypeScript y por qué es tan popular",
                content_md: `# ¿Qué es TypeScript?

TypeScript es un **lenguaje de programación** desarrollado por Microsoft que se construye sobre JavaScript añadiendo tipos estáticos opcionales.

## Características principales

- **Tipado estático**: Permite definir tipos para variables, funciones y objetos
- **Compatibilidad con JavaScript**: Todo código JavaScript es código TypeScript válido
- **Herramientas mejoradas**: Mejor autocompletado y detección de errores
- **Transpilación**: Se compila a JavaScript puro

## Ventajas

1. Detecta errores en tiempo de desarrollo
2. Mejora la mantenibilidad del código
3. Facilita el refactoring
4. Documentación implícita a través de tipos

## Ejemplo básico

\`\`\`typescript
// JavaScript
function saludar(nombre) {
  return "Hola, " + nombre;
}

// TypeScript
function saludar(nombre: string): string {
  return "Hola, " + nombre;
}
\`\`\`

En TypeScript, especificamos que \`nombre\` debe ser un string, lo que previene errores.`,
              },
              {
                title: "Tipos básicos",
                brief: "Aprende los tipos fundamentales de TypeScript",
                content_md: `# Tipos básicos en TypeScript

TypeScript incluye varios tipos básicos que puedes usar para anotar tus variables.

## Tipos primitivos

### String
\`\`\`typescript
let nombre: string = "Juan";
let apellido: string = 'Pérez';
\`\`\`

### Number
\`\`\`typescript
let edad: number = 25;
let precio: number = 99.99;
\`\`\`

### Boolean
\`\`\`typescript
let activo: boolean = true;
let completado: boolean = false;
\`\`\`

### Array
\`\`\`typescript
let numeros: number[] = [1, 2, 3];
let nombres: Array<string> = ["Ana", "Luis"];
\`\`\`

### Tuple
\`\`\`typescript
let persona: [string, number] = ["Juan", 30];
\`\`\`

### Any
\`\`\`typescript
let cualquierCosa: any = "texto";
cualquierCosa = 42; // OK
\`\`\`

### Unknown
\`\`\`typescript
let valor: unknown = 4;
// valor.toFixed(); // Error
if (typeof valor === "number") {
  valor.toFixed(); // OK
}
\`\`\`

## Consejos

- Evita usar \`any\` cuando sea posible
- Usa \`unknown\` cuando no conozcas el tipo
- Los arrays se pueden declarar de dos formas: \`tipo[]\` o \`Array<tipo>\``,
              },
            ],
          },
          {
            title: "Interfaces y Tipos",
            lessons: [
              {
                title: "Interfaces",
                brief: "Cómo definir estructuras de objetos con interfaces",
                content_md: `# Interfaces en TypeScript

Las **interfaces** definen la estructura que debe tener un objeto.

## Definición básica

\`\`\`typescript
interface Usuario {
  nombre: string;
  edad: number;
  email: string;
}

const usuario: Usuario = {
  nombre: "María",
  edad: 28,
  email: "maria@example.com"
};
\`\`\`

## Propiedades opcionales

\`\`\`typescript
interface Producto {
  id: number;
  nombre: string;
  descripcion?: string; // Opcional
}
\`\`\`

## Propiedades de solo lectura

\`\`\`typescript
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

const config: Config = {
  apiUrl: "https://api.example.com",
  timeout: 5000
};

// config.apiUrl = "otra-url"; // Error
\`\`\`

## Extensión de interfaces

\`\`\`typescript
interface Animal {
  nombre: string;
  edad: number;
}

interface Perro extends Animal {
  raza: string;
  ladrar(): void;
}

const miPerro: Perro = {
  nombre: "Max",
  edad: 3,
  raza: "Labrador",
  ladrar() {
    console.log("¡Guau!");
  }
};
\`\`\``,
              },
            ],
          },
        ],
      });

      // Apunte 2: React Hooks
      await apunteRepository.save({
        title: "React Hooks Esenciales",
        category: "React",
        published: true,
        author: adminUser,
        modules: [
          {
            title: "Introducción a Hooks",
            lessons: [
              {
                title: "¿Qué son los Hooks?",
                brief:
                  "Comprende qué son los Hooks y por qué cambiarán tu forma de programar en React",
                content_md: `# React Hooks

Los **Hooks** son funciones que te permiten usar el estado y otras características de React en componentes funcionales.

## ¿Por qué Hooks?

Antes de los Hooks (React 16.8), necesitabas componentes de clase para usar estado y ciclo de vida.

### Antes (Clase)
\`\`\`javascript
class Contador extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return (
      <button onClick={() => this.setState({ count: this.state.count + 1 })}>
        Clicks: {this.state.count}
      </button>
    );
  }
}
\`\`\`

### Ahora (Hooks)
\`\`\`javascript
function Contador() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicks: {count}
    </button>
  );
}
\`\`\`

## Ventajas

1. **Menos código**: Componentes más simples y legibles
2. **Reutilización**: Comparte lógica entre componentes fácilmente
3. **Mejor organización**: Agrupa lógica relacionada
4. **Sin \`this\`**: Evita confusiones con el contexto

## Reglas de los Hooks

- Solo llama Hooks en el nivel superior (no en loops, condiciones o funciones anidadas)
- Solo llama Hooks desde componentes funcionales o Hooks personalizados`,
              },
              {
                title: "useState",
                brief: "Maneja el estado en componentes funcionales",
                content_md: `# useState Hook

\`useState\` es el Hook más básico y te permite añadir estado a componentes funcionales.

## Sintaxis básica

\`\`\`javascript
const [estado, setEstado] = useState(valorInicial);
\`\`\`

## Ejemplos

### Contador simple
\`\`\`javascript
function Contador() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Has hecho click {count} veces</p>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  );
}
\`\`\`

### Múltiples estados
\`\`\`javascript
function Formulario() {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState(0);
  const [email, setEmail] = useState('');

  return (
    <form>
      <input 
        value={nombre} 
        onChange={e => setNombre(e.target.value)} 
      />
      <input 
        value={edad} 
        onChange={e => setEdad(Number(e.target.value))} 
      />
      <input 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
      />
    </form>
  );
}
\`\`\`

### Estado con objetos
\`\`\`javascript
function Perfil() {
  const [usuario, setUsuario] = useState({
    nombre: '',
    edad: 0,
    email: ''
  });

  const actualizarNombre = (nombre) => {
    setUsuario({ ...usuario, nombre });
  };

  return <div>{usuario.nombre}</div>;
}
\`\`\`

## Consejos

- Usa múltiples \`useState\` en lugar de un objeto grande
- El valor inicial solo se usa en el primer render
- Puedes pasar una función a \`useState\` para cálculos costosos`,
              },
            ],
          },
          {
            title: "Efectos secundarios",
            lessons: [
              {
                title: "useEffect",
                brief: "Maneja efectos secundarios y ciclo de vida",
                content_md: `# useEffect Hook

\`useEffect\` te permite realizar efectos secundarios en componentes funcionales.

## Sintaxis

\`\`\`javascript
useEffect(() => {
  // Tu código aquí
  
  return () => {
    // Limpieza (opcional)
  };
}, [dependencias]);
\`\`\`

## Casos de uso

### Ejecutar en cada render
\`\`\`javascript
useEffect(() => {
  console.log('Componente renderizado');
});
\`\`\`

### Ejecutar solo al montar
\`\`\`javascript
useEffect(() => {
  console.log('Componente montado');
}, []); // Array vacío
\`\`\`

### Ejecutar cuando cambia una dependencia
\`\`\`javascript
useEffect(() => {
  console.log('El count cambió:', count);
}, [count]);
\`\`\`

### Fetch de datos
\`\`\`javascript
function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetch('https://api.example.com/users')
      .then(res => res.json())
      .then(data => setUsuarios(data));
  }, []);

  return <ul>{usuarios.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
\`\`\`

### Limpieza
\`\`\`javascript
useEffect(() => {
  const timer = setInterval(() => {
    console.log('Tick');
  }, 1000);

  return () => clearInterval(timer);
}, []);
\`\`\`

## Tips importantes

- Siempre incluye las dependencias correctamente
- Usa la función de limpieza para evitar memory leaks
- Para async/await, crea una función interna`,
              },
            ],
          },
        ],
      });

      // Apunte 3: Node.js y Express
      await apunteRepository.save({
        title: "Backend con Node.js y Express",
        category: "Backend",
        published: true,
        author: adminUser,
        modules: [
          {
            title: "Primeros pasos",
            lessons: [
              {
                title: "Introducción a Node.js",
                brief: "Aprende qué es Node.js y cómo funciona",
                content_md: `# Node.js

**Node.js** es un entorno de ejecución de JavaScript construido sobre el motor V8 de Chrome.

## ¿Qué es Node.js?

Node.js permite ejecutar JavaScript en el servidor, no solo en el navegador.

## Características principales

- **Asíncrono y basado en eventos**: No bloquea operaciones I/O
- **Single-threaded**: Usa un solo hilo pero maneja múltiples conexiones
- **NPM**: El gestor de paquetes más grande del mundo
- **Multiplataforma**: Funciona en Windows, Linux y macOS

## Casos de uso

1. APIs REST
2. Aplicaciones en tiempo real (chat, streaming)
3. Microservicios
4. Herramientas de línea de comandos
5. Servidores web

## Tu primer programa

\`\`\`javascript
// hello.js
console.log('¡Hola desde Node.js!');
\`\`\`

Ejecutar:
\`\`\`bash
node hello.js
\`\`\`

## Módulos nativos

\`\`\`javascript
const fs = require('fs');
const path = require('path');
const http = require('http');

// Leer archivo
fs.readFile('archivo.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});
\`\`\``,
              },
              {
                title: "Configurando Express",
                brief: "Crea tu primer servidor con Express",
                content_md: `# Express.js

**Express** es un framework minimalista para crear aplicaciones web y APIs con Node.js.

## Instalación

\`\`\`bash
npm install express
\`\`\`

## Servidor básico

\`\`\`javascript
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.listen(port, () => {
  console.log(\`Servidor en http://localhost:\${port}\`);
});
\`\`\`

## Rutas

\`\`\`javascript
// GET
app.get('/usuarios', (req, res) => {
  res.json({ usuarios: ['Ana', 'Luis'] });
});

// POST
app.post('/usuarios', (req, res) => {
  res.status(201).json({ mensaje: 'Usuario creado' });
});

// PUT
app.put('/usuarios/:id', (req, res) => {
  res.json({ mensaje: \`Usuario \${req.params.id} actualizado\` });
});

// DELETE
app.delete('/usuarios/:id', (req, res) => {
  res.json({ mensaje: 'Usuario eliminado' });
});
\`\`\`

## Middleware

\`\`\`javascript
// Middleware para JSON
app.use(express.json());

// Middleware personalizado
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.url}\`);
  next();
});

// Middleware de error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal!');
});
\`\`\`

## Estructura recomendada

\`\`\`
proyecto/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── middlewares/
├── package.json
└── server.js
\`\`\``,
              },
            ],
          },
        ],
      });

      console.log("✅ Se crearon 3 apuntes de ejemplo");
    } else {
      console.log("✅ Ya existen apuntes en la base de datos");
    }
  } catch (error) {
    console.error("Error en seed:", error);
  }

  await app.close();
}

seed();
