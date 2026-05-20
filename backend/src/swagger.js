const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Event Management API',
    version: '1.0.0',
    description: 'API para la gestión de eventos, tickets, compras y usuarios.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Servidor local' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id_user: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          full_name: { type: 'string' },
          id_role: { type: 'integer' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id_category: { type: 'integer' },
          categoryName: { type: 'string' },
          deleted_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id_event: { type: 'integer' },
          eventName: { type: 'string' },
          id_category: { type: 'integer' },
          description: { type: 'string' },
          location: { type: 'string' },
          date_time: { type: 'string', format: 'date-time' },
        },
      },
      TicketType: {
        type: 'object',
        properties: {
          id_event_ticket: { type: 'integer' },
          id_event: { type: 'integer' },
          id_catalog: { type: 'integer' },
          price: { type: 'number' },
          capacity: { type: 'integer' },
        },
      },
      Purchase: {
        type: 'object',
        properties: {
          id_purchase: { type: 'integer' },
          id_user: { type: 'integer' },
          id_event: { type: 'integer' },
          id_event_ticket: { type: 'integer' },
          quantity: { type: 'integer' },
          unit_price: { type: 'number' },
          total_price: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Autenticación'],
        summary: 'Registrar nuevo usuario',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'full_name'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'usuario@ejemplo.com',
                  },
                  password: {
                    type: 'string',
                    minLength: 6,
                    example: 'contraseña123',
                  },
                  full_name: { type: 'string', example: 'Juan Pérez' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Usuario creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Datos inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          409: { description: 'Email ya registrado' },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    example: 'usuario@ejemplo.com',
                  },
                  password: { type: 'string', example: 'contraseña123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Credenciales inválidas' },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Autenticación'],
        summary: 'Cerrar sesión',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Sesión cerrada' },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtener usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Datos del usuario',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          401: { description: 'No autenticado' },
        },
      },
    },

    '/api/categories': {
      get: {
        tags: ['Categorías'],
        summary: 'Listar categorías públicas',
        parameters: [
          {
            in: 'query',
            name: 'order',
            schema: { type: 'string' },
            description: 'Campo de ordenamiento',
          },
        ],
        responses: {
          200: {
            description: 'Lista de categorías',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Category' },
                },
              },
            },
          },
        },
      },
    },

    '/api/categories/admin': {
      get: {
        tags: ['Categorías'],
        summary: 'Listar todas las categorías (Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de categorías incluyendo eliminadas' },
        },
      },
      post: {
        tags: ['Categorías'],
        summary: 'Crear categoría (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoryName'],
                properties: {
                  categoryName: { type: 'string', example: 'Música' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Categoría creada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          400: { description: 'Datos inválidos' },
        },
      },
    },

    '/api/categories/admin/{id}': {
      put: {
        tags: ['Categorías'],
        summary: 'Actualizar categoría (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { categoryName: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Categoría actualizada' },
          404: { description: 'No encontrada' },
        },
      },
      delete: {
        tags: ['Categorías'],
        summary: 'Eliminar categoría (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Categoría eliminada' },
          404: { description: 'No encontrada' },
        },
      },
    },

    '/api/categories/admin/{id}/restore': {
      patch: {
        tags: ['Categorías'],
        summary: 'Restaurar categoría eliminada (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Categoría restaurada' },
          404: { description: 'No encontrada' },
        },
      },
    },

    '/api/events': {
      get: {
        tags: ['Eventos'],
        summary: 'Listar eventos públicos',
        responses: {
          200: {
            description: 'Lista de eventos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Event' },
                },
              },
            },
          },
        },
      },
    },

    '/api/events/admin': {
      post: {
        tags: ['Eventos'],
        summary: 'Crear evento (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventName', 'id_category', 'date_time'],
                properties: {
                  eventName: { type: 'string', example: 'Festival de Rock' },
                  id_category: { type: 'integer', example: 1 },
                  description: { type: 'string' },
                  location: { type: 'string' },
                  date_time: { type: 'string', format: 'date-time' },
                  ticketTypes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id_catalog: { type: 'integer' },
                        price: { type: 'number' },
                        capacity: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Evento creado' },
          400: { description: 'Datos inválidos' },
        },
      },
    },

    '/api/events/admin/all': {
      get: {
        tags: ['Eventos'],
        summary: 'Listar todos los eventos (Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Lista de todos los eventos' },
        },
      },
    },

    '/api/events/{id}': {
      get: {
        tags: ['Eventos'],
        summary: 'Obtener evento por ID',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Evento encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Event' },
              },
            },
          },
          404: { description: 'Evento no encontrado' },
        },
      },
    },

    '/api/events/admin/{id}': {
      put: {
        tags: ['Eventos'],
        summary: 'Actualizar evento (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Event' },
            },
          },
        },
        responses: {
          200: { description: 'Evento actualizado' },
          404: { description: 'No encontrado' },
        },
      },
      delete: {
        tags: ['Eventos'],
        summary: 'Eliminar evento (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Evento eliminado' },
          404: { description: 'No encontrado' },
        },
      },
    },

    '/api/events/admin/{id}/restore': {
      patch: {
        tags: ['Eventos'],
        summary: 'Restaurar evento eliminado (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: { 200: { description: 'Evento restaurado' } },
      },
    },

    '/api/events/{id}/interest/status': {
      get: {
        tags: ['Eventos'],
        summary: 'Verificar interés del usuario en un evento',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Estado de interés',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { interested: { type: 'boolean' } },
                },
              },
            },
          },
        },
      },
    },

    '/api/events/{id}/interest': {
      post: {
        tags: ['Eventos'],
        summary: 'Registrar interés en un evento',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Interés registrado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    total_interests: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Eventos'],
        summary: 'Eliminar interés en un evento',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Interés eliminado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    total_interests: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/events/{id}/ticket-types': {
      get: {
        tags: ['Eventos'],
        summary: 'Obtener tipos de tickets de un evento',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Tipos de tickets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/TicketType' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Eventos'],
        summary: 'Crear tipo de ticket para un evento (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id_catalog', 'price', 'capacity'],
                properties: {
                  id_catalog: { type: 'integer' },
                  price: { type: 'number', example: 50000 },
                  capacity: { type: 'integer', example: 100 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tipo de ticket creado' },
        },
      },
    },

    '/api/events/{id}/ticket-types/{id_ticket}': {
      put: {
        tags: ['Eventos'],
        summary: 'Actualizar tipo de ticket (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
          {
            in: 'path',
            name: 'id_ticket',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TicketType' },
            },
          },
        },
        responses: { 200: { description: 'Tipo de ticket actualizado' } },
      },
      delete: {
        tags: ['Eventos'],
        summary: 'Eliminar tipo de ticket (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
          {
            in: 'path',
            name: 'id_ticket',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: { 200: { description: 'Tipo de ticket eliminado' } },
      },
    },

    '/api/favorites': {
      get: {
        tags: ['Favoritos'],
        summary: 'Obtener eventos favoritos del usuario',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de favoritos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/favorites/{id_event}/status': {
      get: {
        tags: ['Favoritos'],
        summary: 'Verificar si un evento está en favoritos',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id_event',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: {
            description: 'Estado del favorito',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { favorited: { type: 'boolean' } },
                },
              },
            },
          },
        },
      },
    },

    '/api/favorites/{id_event}': {
      post: {
        tags: ['Favoritos'],
        summary: 'Agregar evento a favoritos',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id_event',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Agregado a favoritos' },
          409: { description: 'Ya está en favoritos' },
        },
      },
      delete: {
        tags: ['Favoritos'],
        summary: 'Eliminar evento de favoritos',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id_event',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          200: { description: 'Eliminado de favoritos' },
          404: { description: 'No está en favoritos' },
        },
      },
    },

    '/api/purchases': {
      get: {
        tags: ['Compras'],
        summary: 'Obtener compras del usuario',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de compras',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Purchase' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Compras'],
        summary: 'Realizar una compra de tickets',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'id_event_ticket',
                  'quantity',
                  'pan',
                  'cvv',
                  'cardHolder',
                ],
                properties: {
                  id_event_ticket: {
                    type: 'integer',
                    example: 1,
                    description: 'ID del tipo de ticket del evento',
                  },
                  quantity: {
                    type: 'integer',
                    example: 2,
                    description: 'Cantidad de tickets',
                  },
                  pan: {
                    type: 'string',
                    example: '5412345678901234',
                    description:
                      'Número de tarjeta (13-19 dígitos). Prefijo 4=Visa/Nu, 5=Mastercard',
                  },
                  cvv: {
                    type: 'string',
                    example: '123',
                    description: 'Código de seguridad (3-4 dígitos)',
                  },
                  cardHolder: {
                    type: 'string',
                    example: 'Juan Pérez',
                    description: 'Nombre del titular',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Compra realizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    purchaseId: { type: 'integer' },
                  },
                },
              },
            },
          },
          402: { description: 'Pago rechazado' },
          422: { description: 'Datos de tarjeta inválidos' },
          502: { description: 'Error al contactar la pasarela de pago' },
        },
      },
    },

    '/api/ticket-catalog': {
      get: {
        tags: ['Catálogo de Tickets'],
        summary: 'Obtener tipos de ticket disponibles',
        responses: {
          200: {
            description: 'Lista de tipos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id_catalog: { type: 'integer' },
                          typeName: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/ticket-catalog/admin': {
      post: {
        tags: ['Catálogo de Tickets'],
        summary: 'Crear tipo de ticket (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['typeName'],
                properties: { typeName: { type: 'string', example: 'VIP' } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tipo de ticket creado' },
        },
      },
    },

    '/api/ticket-catalog/admin/{id}': {
      put: {
        tags: ['Catálogo de Tickets'],
        summary: 'Actualizar tipo de ticket (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { typeName: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Actualizado' } },
      },
      delete: {
        tags: ['Catálogo de Tickets'],
        summary: 'Eliminar tipo de ticket (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: { 200: { description: 'Eliminado' } },
      },
    },

    '/api/ticket-catalog/admin/{id}/restore': {
      patch: {
        tags: ['Catálogo de Tickets'],
        summary: 'Restaurar tipo de ticket eliminado (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: { 200: { description: 'Restaurado' } },
      },
    },

    '/api/admin/reports/interests': {
      get: {
        tags: ['Reportes (Admin)'],
        summary: 'Reporte de intereses por evento',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Datos del reporte de intereses' } },
      },
    },

    '/api/admin/reports/sales': {
      get: {
        tags: ['Reportes (Admin)'],
        summary: 'Reporte de ventas general',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Reporte de ventas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/admin/reports/sales-by-event': {
      get: {
        tags: ['Reportes (Admin)'],
        summary: 'Reporte de ventas por evento',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Ventas agrupadas por evento' } },
      },
    },

    '/api/admin/reports/favorites': {
      get: {
        tags: ['Reportes (Admin)'],
        summary: 'Reporte de favoritos',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Reporte de favoritos por evento' } },
      },
    },

    '/api/admin/reports/home-stats': {
      get: {
        tags: ['Reportes (Admin)'],
        summary: 'Estadísticas del panel de administración',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Estadísticas generales del sistema' },
        },
      },
    },

    '/api/admin/users': {
      get: {
        tags: ['Usuarios (Admin)'],
        summary: 'Listar todos los usuarios',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de usuarios',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
    },

    '/api/upload/event-image': {
      post: {
        tags: ['Subida de archivos'],
        summary: 'Subir imagen para un evento (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: {
                    type: 'string',
                    format: 'binary',
                    description:
                      'Archivo de imagen (jpg, png, webp — máx. 5 MB)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Imagen subida',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    url: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          400: { description: 'Archivo inválido o muy grande' },
        },
      },
    },
  },
};

module.exports = swaggerDefinition;
