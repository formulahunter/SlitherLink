/* eslint-env node */

/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js
const express = require('express');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
// import { defineConfig } from 'vite';
const vue = require('@vitejs/plugin-vue');


const { configure } = require('quasar/wrappers');

async function saveHandler (req, res) {
  console.log(req.path);
  console.log(req.route);
  console.log(req.baseUrl);
  console.log(req.originalUrl);
  console.log(req.params);
  let body = '';
  for await(const chunk of req) {
    body += chunk;
  }
  // console.log(body.length);

  //  write the data to a file
  const data = JSON.parse(body);
  const {size, level, id} = data;

  const reldir = path.join('samples', `${size}_${level}`);
  const dirpath = path.resolve(reldir);
  // console.log('verifying directory exists:');
  // console.log(dirpath);
  await mkdir(dirpath, { recursive: true });

  const relpath = path.join('samples', `${size}_${level}`, id + '.csv');
  const filepath = path.resolve(relpath);
  // console.log('saving file to path: ');
  // console.log(filepath);
  await writeFile(filepath, data.csv);
  console.log('saved file ' + relpath);

  // console.log(data.csv.length);
  res.end();
}
async function saveHandler (req, res) {
  let body = '';
  for await(const chunk of req) {
    body += chunk;
  }

  //  write the data to a file
  const data = body;
  const { size, level, id } = req.params;

  const reldir = path.join('samples', size, level);
  const dirpath = path.resolve(reldir);
  // console.log('verifying directory exists:');
  // console.log(dirpath);
  await mkdir(dirpath, { recursive: true });

  const relpath = path.join('samples', size, level, id + '.csv');
  const filepath = path.resolve(relpath);
  // console.log('saving file to path: ');
  // console.log(filepath);
  await writeFile(filepath, body);
  console.log(`saved ${ body.length } B to ./${ relpath }`);
  res.end();
}

const saveCSVPlugin = () => ({
  name: 'save-csv',
  configureServer(server) {
    const api = express.Router();
    api.post('/csv/:size/:level/:id', saveHandler);

    server.middlewares.use('/api', api);
  }
});

module.exports = configure(function (/* ctx */) {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // // app boot file (/src/boot)
    // // --> boot files are part of "main.js"
    // // https://v2.quasar.dev/quasar-cli-vite/boot-files
    // boot: [
    //
    //
    // ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
      'material-icons-outlined',
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#build
    build: {
      target: {
        browser: [ 'es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1' ],
        node: 'node20'
      },

      vueRouterMode: 'history', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},

      // vitePlugins: [
      //   [ 'package-name', { ..pluginOptions.. }, { server: true, client: true } ]
      // ]
      vitePlugins: [ saveCSVPlugin() ],
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#devServer
    devServer: {
      https: true,
      open: false,
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: []
    },

    // // animations: 'all', // --- includes all animations
    // // https://v2.quasar.dev/options/animations
    // animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   registerServiceWorker: 'src-pwa/register-service-worker',
    //   serviceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    // // },

    // // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    // ssr: {
    //   // ssrPwaHtmlFilename: 'offline.html', // do NOT use index.html as name!
    //                                       // will mess up SSR
    //
    //   // extendSSRWebserverConf (esbuildConf) {},
    //   // extendPackageJson (json) {},
    //
    //   pwa: false,
    //
    //   // manualStoreHydration: true,
    //   // manualPostHydrationTrigger: true,
    //
    //   prodPort: 3000, // The default port that the production server should use
    //                   // (gets superseded if process.env.PORT is specified at runtime)
    //
    //   middlewares: [
    //     'render' // keep this as last one
    //   ]
    // },
    //
    // // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    // pwa: {
    //   workboxMode: 'generateSW', // or 'injectManifest'
    //   injectPwaMetaTags: true,
    //   swFilename: 'sw.js',
    //   manifestFilename: 'manifest.json',
    //   useCredentialsForManifestTag: false,
    //   // useFilenameHashes: true,
    //   // extendGenerateSWOptions (cfg) {}
    //   // extendInjectManifestOptions (cfg) {},
    //   // extendManifestJson (json) {}
    //   // extendPWACustomSWConf (esbuildConf) {}
    // },
    //
    // // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    // cordova: {
    //   // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    // },
    //
    // // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    // capacitor: {
    //   hideSplashscreen: true
    // },
    //
    // // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    // electron: {
    //   // extendElectronMainConf (esbuildConf)
    //   // extendElectronPreloadConf (esbuildConf)
    //
    //   inspectPort: 5858,
    //
    //   bundler: 'packager', // 'packager' or 'builder'
    //
    //   packager: {
    //     // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
    //
    //     // OS X / Mac App Store
    //     // appBundleId: '',
    //     // appCategoryType: '',
    //     // osxSign: '',
    //     // protocol: 'myapp://path',
    //
    //     // Windows only
    //     // win32metadata: { ... }
    //   },
    //
    //   builder: {
    //     // https://www.electron.build/configuration/configuration
    //
    //     appId: 'slitherlink'
    //   }
    // },
    //
    // // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    // bex: {
    //   contentScripts: [
    //     'my-content-script'
    //   ],
    //
    //   // extendBexScriptsConf (esbuildConf) {}
    //   // extendBexManifestJson (json) {}
    // }
  }
});
