/**
 * 全站路由配置
 *
 * 建议:
 * 1. 代码中路由统一使用name属性跳转(不使用path属性)
 */
import { clearLoginInfo } from "@/utils";
import http from "@/utils/httpRequest";
import { isURL } from "@/utils/validate";
import Vue from "vue";
import Router, { Route, RouteConfig } from "vue-router";

Vue.use(Router);

// 开发环境不使用懒加载, 因为懒加载页面太多的话会造成webpack热更新太慢, 所以只有生产环境使用懒加载
const _import = require("./import-" + process.env.NODE_ENV);

// 全局路由(无需嵌套上左右整体布局)
const globalRoutes: RouteConfig[] = [
  {
    path: "/404",
    component: _import("common/404"),
    name: "404",
    meta: { title: "404未找到" }
  },
  {
    path: "/login",
    component: _import("common/login"),
    name: "login",
    meta: { title: "登录" }
  }
];

// 主入口路由(需嵌套上左右整体布局)
const mainRoutes: RouteConfig = {
  path: "/",
  component: _import("main"),
  name: "main",
  redirect: { name: "home" },
  meta: { title: "主入口整体布局" },
  children: [
    // 通过meta对象设置路由展示方式
    // 1. isTab: 是否通过tab展示内容, true: 是, false: 否
    // 2. iframeUrl: 是否通过iframe嵌套展示内容, '以http[s]://开头': 是, '': 否
    // 提示: 如需要通过iframe嵌套展示内容, 但不通过tab打开, 请自行创建组件使用iframe处理!
    {
      path: "/home",
      component: _import("common/home"),
      name: "home",
      meta: { title: "聚合分析" }
    },
    {
      path: "/theme",
      component: _import("common/theme"),
      name: "theme",
      meta: { title: "主题" }
    },
    {
      path: "/demo-echarts",
      component: _import("demo/echarts"),
      name: "demo-echarts",
      meta: { title: "demo-echarts", isTab: true }
    },
    {
      path: "/demo-user-filter",
      component: _import("demo/user-filter"),
      name: "user-filter",
      meta: { title: "用户雷达", isTab: true }
    }
  ],
  beforeEnter(to, from, next) {
    let token = Vue.cookies.get("token") as string;
    if (!token || !/\S/.test(token)) {
      clearLoginInfo();
      next({ name: "login" });
      return;
    }
    next();
  }
};

const router = new Router({
  mode: "hash",
  scrollBehavior: () => ({ x: 0, y: 0 }),
  routes: globalRoutes.concat(mainRoutes)
}) as Router & MyRoute;

type MyRoute = {
  isAddDynamicMenuRoutes: boolean;
};

// 是否已经添加动态(菜单)路由
router.isAddDynamicMenuRoutes = false;

router.beforeEach((to, from, next) => {
  // 添加动态(菜单)路由
  // 1. 已经添加 or 全局路由, 直接访问
  // 2. 获取菜单列表, 添加并保存本地存储
  if (
    router.isAddDynamicMenuRoutes ||
    fnCurrentRouteType(to, globalRoutes) === "global"
  ) {
    next();
  } else {
    http({
      url: http.adornUrl("/sys/menu/nav"),
      method: "get",
      params: http.adornParams()
    })
      .then(({ data }) => {
        if (data && data.code === 0) {
          fnAddDynamicMenuRoutes(data.menuList);
          router.isAddDynamicMenuRoutes = true;
          sessionStorage.setItem(
            "menuList",
            JSON.stringify(data.menuList || "[]")
          );
          sessionStorage.setItem(
            "permissions",
            JSON.stringify(data.permissions || "[]")
          );
          next({ ...to, replace: true });
        } else {
          sessionStorage.setItem("menuList", "[]");
          sessionStorage.setItem("permissions", "[]");
          next();
        }
      })
      .catch(() => {
        // noinspection JSIgnoredPromiseFromCall
        router.push({ name: "login" });
      });
  }
});

/**
 * 判断当前路由类型, global: 全局路由, main: 主入口路由
 * @param {*} route 当前路由
 * @param globalRoutes
 */
function fnCurrentRouteType(
  route: Route,
  globalRoutes: RouteConfig[] = []
): string {
  let temp: RouteConfig[] = [];
  for (let i = 0; i < globalRoutes.length; i++) {
    if (route.path === globalRoutes[i].path) {
      return "global";
    } else {
      const children = globalRoutes[i].children;
      if (children && children.length >= 1) {
        temp = temp.concat(children);
      }
    }
  }
  return temp.length >= 1 ? fnCurrentRouteType(route, temp) : "main";
}

/**
 * 添加动态(菜单)路由
 * @param {*} menuList 菜单列表
 * @param {*} routes 递归创建的动态(菜单)路由
 */
function fnAddDynamicMenuRoutes(
  menuList: StringMap = [],
  routes: RouteConfig[] = []
) {
  let temp: StringMap = [];
  for (let i = 0; i < menuList.length; i++) {
    if (menuList[i].list && menuList[i].list.length >= 1) {
      temp = temp.concat(menuList[i].list);
    } else if (menuList[i].url && /\S/.test(menuList[i].url)) {
      menuList[i].url = menuList[i].url.replace(/^\//, "");
      const route: RouteConfig = {
        path: menuList[i].url.replace("/", "-"),
        name: menuList[i].url.replace("/", "-"),
        meta: {
          menuId: menuList[i].menuId,
          title: menuList[i].name,
          isDynamic: true,
          isTab: true,
          iframeUrl: ""
        }
      };
      // url以http[s]://开头, 通过iframe展示
      if (isURL(menuList[i].url)) {
        route["path"] = `i-${menuList[i].menuId}`;
        route["name"] = `i-${menuList[i].menuId}`;
        route["meta"]["iframeUrl"] = menuList[i].url;
      } else {
        try {
          route["component"] = _import(`modules/${menuList[i].url}`) || null;
        } catch (e) {}
      }
      routes.push(route);
    }
  }
  if (temp.length >= 1) {
    fnAddDynamicMenuRoutes(temp, routes);
  } else {
    mainRoutes.name = "main-dynamic";
    mainRoutes.children = routes;
    router.addRoutes([mainRoutes, { path: "*", redirect: { name: "404" } }]);
    sessionStorage.setItem(
      "dynamicMenuRoutes",
      JSON.stringify(mainRoutes.children || "[]")
    );
  }
}

export default router;