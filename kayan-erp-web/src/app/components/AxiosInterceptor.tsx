'use client';

import { useEffect } from 'react';
import axios from 'axios';

export default function AxiosInterceptor() {
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('kayan_token');
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        try {
          const tenantStr = localStorage.getItem('kayan_tenant');
          if (tenantStr) {
            const tenant = JSON.parse(tenantStr);
            if (tenant.companyId && !config.headers['x-company-id']) {
              config.headers['x-company-id'] = String(tenant.companyId);
            }
          }

          const userStr = localStorage.getItem('kayan_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role && !config.headers['x-user-role']) {
              config.headers['x-user-role'] = user.role;
            }
          }
        } catch (e) {
          console.warn('Tenant header injection warning:', e);
        }
      }
      return config;
    });

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  return null;
}
