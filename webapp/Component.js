/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "zaidgsmmsup/model/models",
  ],
  function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("zaidgsmmsup.Component", {
      metadata: {
        manifest: "json",
      },

      /**
       * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
       * @public
       * @override
       */
      init: function () {
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // enable routing
        this.getRouter().initialize();
        this.setModel(models.createDeviceModel(), "device");
        sap.ui.loader.config({
          paths: {
            "com/list/masslist": "/sap/bc/ui5_ui5/sap/zaidgsmmsup",
          }
        });

        //jQuery.sap.registerModulePath("zmassmatproc", "/sap/bc/ui5_ui5/sap/zmassmatproc");

        //ADDING EXTERNAL LIBRARIES FOR PDF EXPORT
        jQuery.sap.includeScript("https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js");
        jQuery.sap.includeScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.extendscript.min.js");
        //jQuery.sap.includeScript("https://cdn.jsdelivr.net/npm/xlsx-style@0.8.13/dist/ExcelJS-style.min.js");
        // sap.ui.loader.config({
        //   paths: {
        //     "libs": "./libs"
        //   }
        // });

        // // Include locally hosted xlsx-style
        // jQuery.sap.includeScript("libs/xlsx.js");
      },
      onStartUpParams: function (data) {
        debugger;
        const oParams = data.params
        //HANDLING STARTUP PARAMETERS (NAVIGATING FROM MYTASK/NOTIFICATION/DASHBOARD)
        if (oParams && oParams.sRoute && oParams.Reqid) {
          const oRouter = this.getRouter();
          const sRouteName = oParams.sRoute;
          const reqid = oParams.Reqid;
          oRouter.navTo(sRouteName, { Reqid: reqid, req_status: "Process Not Started" }, true);
        } else {
          if (oParams) {
            const oRouter = this.getRouter();
            const sRouteName = "StatusPage";
            oRouter.navTo(sRouteName, { Reqid: oParams.REQID }, true);
          } else {
            this._NavigatingFromExternal = false;
            this._StartUpParams = null
          }
        }
      },


    });
  }
);
