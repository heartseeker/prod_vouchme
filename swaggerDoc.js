const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        swagger: '2.0',
        info: {
            title: 'VouchMe API',
            version: '1.0.0',
            description: 'VouchMe API with express',
        },
        basePath: '/'
    },
    apis: ['./routes/routes.js']
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(options));
};
