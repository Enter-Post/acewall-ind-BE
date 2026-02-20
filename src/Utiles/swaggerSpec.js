import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Acewall API",
      version: "1.0.0",
      description: "OpenAPI spec for Acewall backend .",
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 5050}`, description: "Local dev server" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        FileObject: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri" },
            public_id: { type: "string" },
            filename: { type: "string" }
          }
        },
        Course: {
          type: "object",
          properties: {
            _id: { type: "string" },
            courseTitle: { type: "string" },
            courseDescription: { type: "string" },
            thumbnail: { $ref: "#/components/schemas/FileObject" },
            category: { type: "object" },
            subcategory: { type: "object" },
            createdby: { type: "object" },
            price: { type: "number" },
            isVerified: { type: "string" },
            published: { type: "boolean" }
          }
        },
        Lesson: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            pdfFiles: { type: "array", items: { $ref: "#/components/schemas/FileObject" } }
          }
        },
        Chapter: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            lessons: { type: "array", items: { $ref: "#/components/schemas/Lesson" } }
          }
        },
        Semester: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            startDate: { type: "string", format: "date" },
            endDate: { type: "string", format: "date" }
          }
        },
        CourseStatsItem: {
          type: "object",
          properties: {
            date: { type: "string" },
            students: { type: "integer" }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      }
    },
  },
  apis: [
    "./src/Routes/**/*.js",
    "./src/Contollers/**/*.js",
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
