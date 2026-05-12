export const environment = {
    production: true,
    api: {
      baseUrl: '',
      versionedBaseUrl: '/api/v1',
      endpoints: {
        login: '/api/v1/auth/login',
        refresh: '/api/v1/auth/refresh',
        logout: '/api/v1/auth/logout',
        services: '/api/v1/services',
        suppliers: '/api/v1/suppliers',
        banks: '/api/v1/banks',
        products: '/api/v1/products',
        purchaseOrders: '/api/v1/purchase-orders',
        configuration: '/api/v1/configuration',
        supplierForm: '/api/v1/suppliers/form',
        activate: '/activate',
        setPassword: '/api/v1/auth/set-password',
        resendActivation: '/api/v1/auth/activation/resend'
      }
    },
    auth: {
      accessTokenKey: 'oc.accessToken',
      refreshTokenKey: 'oc.refreshToken'
    }
  };
  
