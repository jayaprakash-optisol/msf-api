import swaggerJSDoc from 'swagger-jsdoc';

import { version } from '../../package.json';
import { getEnv } from '../utils/config.util';

/**
 * Base definitions for API documentation
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API Documentation',
    version,
    description: 'API documentation for the application',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'Dev',
      url: 'https:/localhost.com',
      email: 'support@localhost.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${getEnv('PORT')}${getEnv('API_PREFIX')}`,
      description: 'Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'integer',
            description: 'User ID',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email',
          },
          firstName: {
            type: 'string',
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            description: 'User last name',
          },
          role: {
            type: 'string',
            enum: ['admin', 'user'],
            description: 'User role',
          },
          isActive: {
            type: 'boolean',
            description: 'User account status',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'User last update timestamp',
          },
        },
      },
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
        },
      },
      Guest: {
        type: 'object',
        required: ['id', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Guest ID',
          },
          firstName: {
            type: 'string',
            description: 'Guest first name',
          },
          lastName: {
            type: 'string',
            description: 'Guest last name',
          },
          location: {
            type: 'string',
            description: 'Guest location',
          },
          role: {
            type: 'string',
            enum: ['Stock Manager', 'Store Keeper'],
            description: 'Guest role',
          },
          accessPeriod: {
            type: 'string',
            description: 'Guest access period',
          },
          username: {
            type: 'string',
            description: 'Guest username',
          },
          status: {
            type: 'string',
            enum: ['Active', 'Inactive', 'Expired'],
            description: 'Guest status',
          },
          credentialsViewed: {
            type: 'boolean',
            description: 'Whether credentials have been viewed',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Guest creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Guest last update timestamp',
          },
        },
      },
      Product: {
        type: 'object',
        required: ['id', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Product ID',
          },
          unidataId: {
            type: 'string',
            description: 'Unidata ID',
          },
          productCode: {
            type: 'string',
            description: 'Product code',
          },
          productDescription: {
            type: 'string',
            description: 'Product description',
          },
          type: {
            type: 'string',
            description: 'Product type',
          },
          state: {
            type: 'string',
            description: 'Product state',
          },
          freeCode: {
            type: 'string',
            description: 'Free code',
          },
          formerCodes: {
            type: 'object',
            description: 'Former codes (JSON)',
          },
          standardizationLevel: {
            type: 'string',
            description: 'Standardization level',
          },
          labels: {
            type: 'object',
            description: 'Product labels (JSON)',
          },
          sourceSystem: {
            type: 'string',
            description: 'Source system',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Product creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Product last update timestamp',
          },
        },
      },
      Task: {
        type: 'object',
        required: ['id', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Task ID',
          },
          parcelId: {
            type: 'string',
            format: 'uuid',
            description: 'Associated parcel ID',
          },
          status: {
            type: 'string',
            enum: ['Yet to Start', 'In Progress', 'Completed', 'Cancelled'],
            description: 'Task status',
          },
          itemType: {
            type: 'string',
            description: 'Item type',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Task creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Task last update timestamp',
          },
        },
      },
      Parcel: {
        type: 'object',
        required: ['id', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Parcel ID',
          },
          purchaseOrderNumber: {
            type: 'string',
            description: 'Purchase order number',
          },
          parcelFrom: {
            type: 'integer',
            description: 'Parcel from number',
          },
          parcelTo: {
            type: 'integer',
            description: 'Parcel to number',
          },
          totalWeight: {
            type: 'number',
            format: 'decimal',
            description: 'Total weight',
          },
          totalVolume: {
            type: 'number',
            format: 'decimal',
            description: 'Total volume',
          },
          totalNumberOfParcels: {
            type: 'integer',
            description: 'Total number of parcels',
          },
          packageWeight: {
            type: 'number',
            format: 'decimal',
            description: 'Package weight',
          },
          packageVolume: {
            type: 'number',
            format: 'decimal',
            description: 'Package volume',
          },
          firstParcelNumber: {
            type: 'integer',
            description: 'First parcel number',
          },
          lastParcelNumber: {
            type: 'integer',
            description: 'Last parcel number',
          },
          parcelQuantity: {
            type: 'integer',
            description: 'Parcel quantity',
          },
          totalHeight: {
            type: 'number',
            format: 'decimal',
            description: 'Total height',
          },
          totalLength: {
            type: 'number',
            format: 'decimal',
            description: 'Total length',
          },
          totalWidth: {
            type: 'number',
            format: 'decimal',
            description: 'Total width',
          },
          packingListNumber: {
            type: 'string',
            description: 'Packing list number',
          },
          messageEsc1: {
            type: 'string',
            description: 'Message ESC 1',
          },
          messageEsc2: {
            type: 'string',
            description: 'Message ESC 2',
          },
          sourceSystem: {
            type: 'string',
            description: 'Source system',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Parcel creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Parcel last update timestamp',
          },
        },
      },
      ParcelItem: {
        type: 'object',
        required: ['id', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Parcel item ID',
          },
          productId: {
            type: 'string',
            format: 'uuid',
            description: 'Associated product ID',
          },
          parcelId: {
            type: 'string',
            format: 'uuid',
            description: 'Associated parcel ID',
          },
          productQuantity: {
            type: 'integer',
            description: 'Product quantity',
          },
          productCode: {
            type: 'string',
            description: 'Product code',
          },
          expiryDate: {
            type: 'string',
            format: 'date-time',
            description: 'Product expiry date',
          },
          batchNumber: {
            type: 'string',
            description: 'Batch number',
          },
          weight: {
            type: 'number',
            format: 'decimal',
            description: 'Item weight',
          },
          volume: {
            type: 'number',
            format: 'decimal',
            description: 'Item volume',
          },
          parcelNumber: {
            type: 'string',
            description: 'Parcel number',
          },
          lineNumber: {
            type: 'integer',
            description: 'Line number',
          },
          externalRef: {
            type: 'string',
            description: 'External reference',
          },
          unitOfMeasure: {
            type: 'string',
            description: 'Unit of measure',
          },
          currencyUnit: {
            type: 'string',
            description: 'Currency unit',
          },
          unitPrice: {
            type: 'number',
            format: 'decimal',
            description: 'Unit price',
          },
          messageEsc1: {
            type: 'string',
            description: 'Message ESC 1',
          },
          messageEsc2: {
            type: 'string',
            description: 'Message ESC 2',
          },
          comments: {
            type: 'string',
            description: 'Comments',
          },
          contains: {
            type: 'string',
            description: 'Contains information',
          },
          sourceSystem: {
            type: 'string',
            description: 'Source system',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Parcel item creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Parcel item last update timestamp',
          },
        },
      },
      Shipment: {
        type: 'object',
        required: ['id', 'createdAt', 'updatedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Shipment ID',
          },
          packingNumber: {
            type: 'integer',
            description: 'Packing number',
          },
          dispatchReference: {
            type: 'string',
            description: 'Dispatch reference',
          },
          customerReceiverCode: {
            type: 'string',
            description: 'Customer receiver code',
          },
          orderReference: {
            type: 'integer',
            description: 'Order reference',
          },
          transportMode: {
            type: 'string',
            description: 'Transport mode',
          },
          packingStatus: {
            type: 'string',
            description: 'Packing status',
          },
          fieldReference: {
            type: 'string',
            description: 'Field reference',
          },
          supplierName: {
            type: 'string',
            description: 'Supplier name',
          },
          notes: {
            type: 'string',
            description: 'Notes',
          },
          messageEsc: {
            type: 'string',
            description: 'Message ESC',
          },
          freight: {
            type: 'string',
            description: 'Freight information',
          },
          origin: {
            type: 'string',
            description: 'Shipment origin',
          },
          sourceSystem: {
            type: 'string',
            description: 'Source system',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Shipment creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Shipment last update timestamp',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication information is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Unauthorized',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Insufficient privileges',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Insufficient permissions to access this resource',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Resource not found',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error:
                'email: Invalid email format, password: Password must be at least 6 characters',
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Internal server error',
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Guests',
      description: 'Guest account management endpoints',
    },
    {
      name: 'Sync',
      description: 'Sync related endpoints',
    },
  ],
};

/**
 * Options for the swagger docs
 */
const options = {
  swaggerDefinition,
  apis: ['./src/docs/index.yaml', './src/docs/routes/**/*.yaml'],
};

/**
 * Initialize swagger-jsdoc
 */
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
