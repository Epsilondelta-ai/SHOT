[한국어](./README.ko.md) | [English](./README.en.md) | [简体中文](./README.zh-cn.md) | [日本語](./README.ja.md) | **Español** | [Português (BR)](./README.pt-br.md) | [Français](./README.fr.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT!

Juego de estrategia por turnos multijugador en línea · Agentes contra Espías

**[Jugar ahora en https://shot.game/](https://shot.game/)**

---

## Descripción General

SHOT! es un juego de estrategia de cartas multijugador en línea donde los jugadores se dividen secretamente en dos equipos: **Agentes** (mayoría) y **Espías** (minoría). Los Agentes deben identificar y eliminar a todos los Espías, mientras que los Espías deben eliminar a todos los Agentes sin ser descubiertos.

Con soporte para **9 idiomas**, **bots de IA**, **sistema de repetición** y **autenticación OAuth**, SHOT! ofrece una experiencia de juego fluida y emocionante para 5-12 jugadores.

---

## Características Principales

- **Juego Multijugador en Vivo**: 5-12 jugadores simultáneamente con turnos sincronizados
- **Soporte para 9 Idiomas**: Interfaz completamente localizada en coreano, inglés, chino, japonés, español, portugués, francés, ruso y alemán
- **Bots de IA Inteligentes**: Juega contra oponentes controlados por IA o mezcla de humanos y bots
- **Sistema de Repetición**: Ve todos los movimientos y decisiones después de que termine el juego
- **Autenticación Google OAuth**: Inicia sesión fácilmente con tu cuenta de Google
- **Aplicación Web Progresiva (PWA)**: Juega directamente desde tu navegador, sin instalación necesaria
- **Tiempo Real con SSE**: Actualizaciones instantáneas usando Server-Sent Events y Redis Pub/Sub
- **Diseño Responsivo**: Interfaz optimizada para dispositivos de escritorio, tablet y móvil

---

## Reglas del Juego

### Visión General Rápida

| Aspecto | Detalle |
|--------|---------|
| **Jugadores** | 5-12 por partida |
| **Roles** | Agentes vs Espías (asignados aleatoriamente) |
| **Vida Inicial** | 3 HP por jugador |
| **Mano Inicial** | 2 cartas por jugador |
| **Límite de Turnos** | Número de jugadores × 3 |
| **Temporizador de Turno** | 2 minutos por turno |

### Roles

**Agentes** (Mayoría)
- Objetivo: Eliminar a todos los Espías
- Conocimiento: No pueden ver qué role tienen los demás
- HP: 3

**Espías** (Minoría)
- Objetivo: Eliminar a todos los Agentes sin ser descubiertos
- Conocimiento: Se ven mutuamente desde el inicio del juego
- HP: 3

### Sistema de Cartas

| Carta | Efecto | Límite | Notas |
|-------|--------|--------|-------|
| **Ataque** | Causa 1 daño al objetivo | 6 cartas | Obligatorio al menos 1 por turno |
| **Curación** | Restaura 1 HP (máximo inicial) | 2 cartas | Se puede usar en ti o en otros |
| **Cárcel** | Evita que el objetivo use cartas de ataque 1 turno | 1 carta | Sin duplicados |
| **Inspección** | Revela el rol del objetivo | Ilimitadas | No se puede usar en identidades confirmadas |

- **Visibilidad**: Todas las cartas sostenidas son visibles para todos los jugadores
- **Límites**: Las cartas que exceden el límite se descartan automáticamente

### Flujo de Turno

1. **Fase de Robo**: Roba 2 cartas
2. **Fase de Acción**: Usa cartas sin límite. Debes usar al menos 1 carta de Ataque para terminar tu turno (excepto si estás en Cárcel o no tienes cartas de Ataque)
3. **Fin de Turno**: El turno pasa al siguiente jugador

Nota: Si estás en Cárcel no puedes usar cartas de Ataque, pero sí puedes usar otras cartas.

### Recompensas por Eliminación

Cuando eliminas a un jugador (sea Agente o Espía):
- Recuperas 1 HP
- Robas 1 carta adicional

### Condiciones de Victoria

- **Agentes Ganan**: Se eliminan todos los Espías
- **Espías Ganan**: Se eliminan todos los Agentes (excluidos los Espías)
- **Empate**: Se alcanza el límite de turnos sin que ningún equipo gane

### Penalización por Fuego Amigo

Si un Agente (o un Espía oculto) mata a otro Agente, entra en estado de Cárcel.

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|-----------|
| **Frontend** | Astro 5.0, TypeScript, Tailwind CSS, Bun |
| **Backend** | Go (Fiber), PostgreSQL, Redis |
| **Infraestructura** | Docker Compose, Nginx, Let's Encrypt |
| **Comunicación en Tiempo Real** | SSE (Server-Sent Events) + Redis Pub/Sub |
| **Autenticación** | Google OAuth 2.0, JWT |

---

## Inicio Rápido

### Requisitos Previos

- Docker y Docker Compose instalados
- Clon del repositorio

### Con Docker Compose (Recomendado)

```bash
# Clonar el repositorio
git clone https://github.com/yourusername/shot.git
cd shot

# Crear archivo .env
cp .env.example .env

# (Opcional) Configurar Google OAuth en .env
# Editar: GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET

# Iniciar los servicios
docker-compose up -d

# Esperar a que los servicios estén listos (30-60 segundos)
# La aplicación estará disponible en http://localhost
```

### Verificar que está Funcionando

```bash
# Ver logs del backend
docker-compose logs -f backend

# Ver logs del frontend
docker-compose logs -f frontend

# Verificar que PostgreSQL está activo
docker-compose logs postgres | grep "database system is ready"

# Verificar que Redis está activo
docker-compose logs redis | grep "Ready to accept"
```

### Detener los Servicios

```bash
docker-compose down
```

---

## Variables de Entorno

Copia `.env.example` a `.env` y configura los siguientes valores:

### Base de Datos

```env
DB_USER=shot                    # Usuario de PostgreSQL
DB_PASSWORD=shot                # Contraseña de PostgreSQL
DB_NAME=shot                    # Nombre de la base de datos
```

### Autenticación

```env
JWT_SECRET=<random-hex-32>     # Generar con: openssl rand -hex 32
```

### Google OAuth (Opcional)

```env
GOOGLE_CLIENT_ID=              # Dejar en blanco para desactivar OAuth
GOOGLE_CLIENT_SECRET=          # Dejar en blanco para desactivar OAuth
```

### URLs

```env
# URL pública del frontend (con https:// en producción)
FRONTEND_URL=http://localhost

# URL pública del backend (con https:// en producción)
BACKEND_URL=http://localhost

# API pública (dejar vacío para usar rutas relativas /api/...)
PUBLIC_API_URL=
```

### Producción (Let's Encrypt)

```env
DOMAIN=shot.example.com        # Dominio que apunta a este servidor
CERTBOT_EMAIL=admin@example.com # Email para notificaciones de Let's Encrypt
STAGING=0                       # 1 para usar staging (evita límites de tasa)
```

---

## Despliegue en Producción

### Configuración Initial (First Time)

```bash
# 1. Editar variables de entorno
nano .env
# Configurar: DOMAIN, CERTBOT_EMAIL, FRONTEND_URL, BACKEND_URL, JWT_SECRET

# 2. Ejecutar script de inicialización de SSL
./init-letsencrypt.sh

# 3. Iniciar servicios de producción
docker-compose -f docker-compose.prod.yml up -d
```

### Renovación de Certificados SSL

Let's Encrypt se renueva automáticamente cada 60 días a través de Certbot. El contenedor nginx está configurado para recargar la configuración después de la renovación.

### Monitoreo y Mantenimiento

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs específicos
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Hacer backup de la base de datos
docker-compose exec postgres pg_dump -U shot shot > backup.sql

# Restaurar desde backup
docker-compose exec -T postgres psql -U shot shot < backup.sql
```

---

## Estructura del Proyecto

```
shot/
├── frontend/              # Aplicación Astro (TypeScript, Tailwind CSS)
│   ├── src/              # Código fuente
│   ├── public/           # Archivos estáticos
│   └── package.json
├── backend/              # Servidor Go (Fiber)
│   ├── main.go
│   ├── go.mod
│   └── ...
├── nginx/                # Configuración de Nginx
│   └── conf.d/          # Directivas de proxy inverso
├── docker-compose.yml    # Desarrollo
├── docker-compose.prod.yml # Producción
├── .env.example          # Variables de entorno (plantilla)
├── init-letsencrypt.sh   # Script para SSL inicial
└── docs/                 # Documentación
    └── readme/          # READMEs multiidioma
```

---

## Desarrollo Local

### Requisitos Previos

- Node.js 18+ (para el frontend)
- Go 1.21+ (para el backend)
- Docker (para PostgreSQL y Redis)

### Configurar Desarrollo

```bash
# 1. Iniciar servicios de base de datos
docker-compose up postgres redis -d

# 2. Configurar frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev

# 3. En otra terminal, configurar backend
cd backend
cp .env.example .env
go mod download
go run main.go
```

### Ejecutar Pruebas

```bash
# Frontend
cd frontend
npm run test

# Backend
cd backend
go test ./...
go test -race ./...  # Con verificación de race conditions
```

---

## Características Técnicas Destacadas

### Frontend (Astro 5.0 + TypeScript)

- **Paraglide**: Sistema de internacionalización para 9 idiomas
- **Tailwind CSS**: Diseño moderno y responsivo
- **Astro Islands**: Componentes interactivos optimizados
- **PWA Ready**: Funciona sin conexión con caché de Service Worker
- **Build optimizado**: Bun para empaquetado rápido

### Backend (Go + Fiber)

- **High Performance**: Manejo eficiente de miles de conexiones simultáneas
- **WebSocket/SSE**: Comunicación en tiempo real para actualizaciones instantáneas
- **Database-First**: PostgreSQL con migraciones versionadas
- **Redis Pub/Sub**: Broadcasting de eventos a múltiples conexiones

### Base de Datos

- **PostgreSQL 17**: Almacenamiento relacional robusto
- **Redis**: Cache y pub/sub para tiempo real
- **Health Checks**: Verificación automática de disponibilidad en Docker

---

## API Pública

El backend expone una API REST en `/api/`:

```
GET  /api/health           # Estado del servidor
POST /api/auth/login       # Autenticación local
GET  /api/auth/google      # OAuth de Google
GET  /api/games            # Listar partidas disponibles
POST /api/games            # Crear nueva partida
GET  /api/games/:id        # Detalles de la partida
POST /api/games/:id/join   # Unirse a una partida
...
```

Para documentación completa de la API, consulta `/api/docs` cuando el servidor esté ejecutándose.

---

## Solución de Problemas

### Docker no inicia

```bash
# Verificar logs
docker-compose logs

# Limpiar e reintentar
docker-compose down -v
docker-compose up -d
```

### Puerto 80 en uso

```bash
# Cambiar puerto en docker-compose.yml
# Buscar "ports:" en la sección frontend y cambiar 80:80 a 8080:80
docker-compose up -d
# Acceder en http://localhost:8080
```

### PostgreSQL no se conecta

```bash
# Verificar que el contenedor de PostgreSQL está activo
docker-compose ps

# Reiniciar PostgreSQL
docker-compose restart postgres

# Verificar credenciales en .env
# DB_USER debe ser 'shot' y DB_PASSWORD debe coincidir
```

### La página no carga

```bash
# Verificar que el frontend se compiló
docker-compose logs frontend | grep -i "error\|success"

# Reiniciar frontend
docker-compose restart frontend

# Limpiar caché del navegador (Ctrl+Shift+Delete)
```

---

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

Por favor asegúrate que:
- El código sigue los estándares del proyecto
- Las pruebas pasan (`npm test` en frontend, `go test ./...` en backend)
- La documentación está actualizada

---

## Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalles.

---

## Contacto y Soporte

- **Sitio web**: https://shot.game/
- **GitHub**: [github.com/yourusername/shot](https://github.com/yourusername/shot)
- **Reportar bugs**: [GitHub Issues](https://github.com/yourusername/shot/issues)

---

## Reconocimientos

SHOT! fue construido con:
- [Astro](https://astro.build/) - Framework web moderno
- [Go](https://golang.org/) - Lenguaje backend robusto
- [PostgreSQL](https://www.postgresql.org/) - Base de datos confiable
- [Redis](https://redis.io/) - Cache y pub/sub rápido
- [Docker](https://www.docker.com/) - Containerización
- Comunidad open source

---

**¡Gracias por jugar SHOT!**
