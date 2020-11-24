import router from "@/router";
import { clearLoginInfo } from "@/utils";
import axios from "axios";
import merge from "lodash/merge";
import qs from "qs";
import Vue from "vue";

const http = axios.create({
  timeout: 1000 * 30,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json; charset=utf-8"
  }
});

/**
 * 请求拦截
 */
http.interceptors.request.use(
  config => {
    config.headers["token"] = Vue.cookies.get("token"); // 请求头带上token
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截
 */
http.interceptors.response.use(
  response => {
    if (response.data && response.data.code === 401) {
      // 401, token失效
      clearLoginInfo();
      // noinspection JSIgnoredPromiseFromCall
      router.push({ name: "login" });
    }
    return response;
  },
  error => {
    return Promise.reject(error);
  }
);

/**
 * 请求地址处理
 * @param {*} actionName action方法名称
 */
http.adornUrl = (actionName: string) => {
  // 非生产环境 && 开启代理, 接口前缀统一使用[/api/]前缀做代理拦截!
  return (
    (process.env.NODE_ENV !== "production" && process.env.VUE_APP_OPEN_PROXY
      ? "/api"
      : window.SITE_CONFIG.baseUrl) + actionName
  );
};

/**
 * get请求参数处理
 * @param {*} params 参数对象
 * @param {*} openDefaultParams 是否开启默认参数?
 */
http.adornParams = (params: any = {}, openDefaultParams: boolean = true) => {
  const defaults = {
    t: new Date().getTime()
  };
  return openDefaultParams ? merge(defaults, params) : params;
};

/**
 * post请求数据处理
 * @param {*} data 数据对象
 * @param {*} openDefaultData 是否开启默认数据?
 * @param {*} contentType 数据格式
 *  json: 'application/json; charset=utf-8'
 *  form: 'application/x-www-form-urlencoded; charset=utf-8'
 */
http.adornData = (
  data: any = {},
  openDefaultData: boolean = true,
  contentType: string = "json"
) => {
  const defaults = {
    t: new Date().getTime()
  };
  data = openDefaultData ? merge(defaults, data) : data;
  return contentType === "json" ? JSON.stringify(data) : qs.stringify(data);
};

export default http;
