const express = require('express')
const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Node API',
      version: '1.0.0',
      description: 'Swagger Documentation of Node API'
    },
    servers: [
              {
        url: 'http://localhost:5000',
        description: 'Localhost address'
      },
      {
        url: 'https://be-tan-theta.vercel.app',
        description: 'VERCEL server'
      },

    ],
    
  },
  apis: ['./**/*.routes.yml']
}

const specs = swaggerJsdoc(options)

module.exports = specs