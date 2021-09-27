import { boot } from 'quasar/wrappers';
import axios, { AxiosInstance } from 'axios';
import API from 'src/common/api';
import errors from '@app/shared/errors';
import { StateInterface } from 'src/store';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: API;
  }
}

export default boot(async ({ app, store }) => {
  app.config.globalProperties.$axios = axios;

  const api = new API();
  app.config.globalProperties.$api = api;

  if (api.hasAccessToken()) {
    try {
      const session = await api.user.getSession();
      store.commit('setUser', session);
      console.log('user', (store.state as StateInterface).user);
    } catch (e) {
      console.log(errors.getMessage(e));
    }
  }
});
