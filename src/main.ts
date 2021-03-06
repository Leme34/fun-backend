import cloneDeep from "lodash/cloneDeep";
import Vue from "vue";
import VueCookies from "vue-cookies-ts"; // api: https://github.com/ztytotoro/vue-cookies-ts
import App from "./App.vue";
import "./element-ui"; // api: https://github.com/ElemeFE/element
import "./element-ui-theme";
import "./icons"; // api: http://www.iconfont.cn/
import router from "./router"; // api: https://github.com/vuejs/vue-router
import store from "./store"; // api: https://github.com/vuejs/vuex
import "./styles/index.scss";
import { isAuth } from "./utils";
import httpRequest from "./utils/httpRequest"; // api: https://github.com/axios/axios

Vue.use(VueCookies);
Vue.config.productionTip = false;

// 非生产环境, 适配mockjs模拟数据 // api: https://github.com/nuysoft/Mock
if (process.env.NODE_ENV !== "production") {
  require("./mock");
}

// 挂载全局
Vue.prototype.$http = httpRequest; // ajax请求方法
Vue.prototype.isAuth = isAuth; // 权限方法

// 保存整站vuex本地储存初始状态
window.SITE_CONFIG["storeState"] = cloneDeep(store.state);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
