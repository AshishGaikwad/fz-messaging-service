/**
 * ============================
 * EUREKA CONFIGURATION
 * ============================
 */

const { Eureka } = require('eureka-js-client');
const logger = require('../utils/logger');
const env = require('./environment');

/**
 * Initialize and start Eureka registration
 */
function initializeEureka() {
  const eurekaClient = new Eureka({
    instance: {
      app: 'FZ-MESSAGING-SERVICE',
      instanceId: `FZ-MESSAGING-SERVICE:${env.PORT}`,
      hostName: env.SERVER_IP,
      ipAddr: env.SERVER_IP,
      port: { $: env.PORT, '@enabled': true },
      statusPageUrl: `http://${env.SERVER_IP}:${env.PORT}/info`,
      healthCheckUrl: `http://${env.SERVER_IP}:${env.PORT}/health`,
      vipAddress: 'FZ-MESSAGING-SERVICE',
      dataCenterInfo: {
        '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
        name: 'MyOwn',
      },
    },
    eureka: {
      host: env.EUREKA_HOST,
      port: env.EUREKA_PORT,
      servicePath: env.EUREKA_SERVICE_PATH,
    },
  });

  eurekaClient.start((error) => {
    if (error) {
      logger.error('Eureka registration failed', { error });
    } else {
      logger.info('Eureka registration successful');
    }
  });

  return eurekaClient;
}

module.exports = initializeEureka;
