sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
  ],
  function (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator, Fragment) {
    "use strict";

    return Controller.extend("zaidgsmmsup.controller.StatusPage", {
      onInit: function () {
        //Navigating from the list item press
        this.getOwnerComponent().getRouter().getRoute("StatusPage").attachPatternMatched(this._onRouteMatched, this);
        this._rebindDebounceTimer = null;
        this.REBIND_DEBOUNCE_TIME = 800;

        // button visibility 
        var oDefaultVisibility = {
          ProceedBtn: false,
          ProceedWoErrorBtn: false,
          ShowLogBtn: false,
          ShowStatusBtn: false,
          WithdrawBtn: false
        };

        // Create the JSON model
        var oModel = new sap.ui.model.json.JSONModel(oDefaultVisibility);
        this.getView().setModel(oModel, "controllModel");

      },


      _onRouteMatched: function (oEvent) {
        var sReqid = oEvent.getParameter("arguments").Reqid;
        var reqStatus = oEvent.getParameter("arguments").req_status;
        let oModel = this.getView().getModel();
        this.reqid = sReqid;
        this.RequestStatus = reqStatus;
        if (this.RequestStatus == "Process Not Started") {
          this.getView().byId("onEdit").setVisible(true);
          this.getView().byId("onDuplicateButton").setVisible(true);
          this.getView().byId("onErrorButton").setVisible(true);
        } else {
          // For "In Process", "Completed", "Withdrawn", or any other status
          this.getView().byId("onEdit").setVisible(false);
          this.getView().byId("onDuplicateButton").setVisible(false);
          this.getView().byId("onErrorButton").setVisible(false);
        }
        this.getView().byId("idRequest").setText(`Request Id : ${this.reqid}`);
        oModel.metadataLoaded().then(function () {
          this.getView().byId("smartErrorChart")?.rebindChart();
          this.getView().byId("smartErrorTable")?.rebindTable();
        })
        oModel.read("/ZP_QU_DG_SMROOT", {
          filters: [new sap.ui.model.Filter("reqid", "EQ", this.reqid)],
          success: function (res) {
            debugger;
            this.Daftdata = this.findDuplicatesBySNoAndMatnr(res.results)
            this._buttonControll();
            this.checkWorkItemRequests();
          }.bind(this),
          error: function (err) {
            console.log(err);
          }.bind(this)
        });
      },

      _ReadErrorData: function () {
        const graphStats = {
          visible: false,
          totalCount: 0,
          errorCount: 0,
          noErrorCount: 0,
          overFlowBar: false,
          proceed: false,
          proceedWithoutError: false,
          cancel: false,
        };

        const graphStatsModel = new sap.ui.model.json.JSONModel(graphStats);
        this.getView().setModel(graphStatsModel, "graphStatsModel");

        if (this.reqid) {
          let oModel = this.getOwnerComponent().getModel();
          oModel.read("/ZI_QU_DG_SM_Errorcount", {
            filters: [new sap.ui.model.Filter("reqid", "EQ", this.reqid)],
            success: function (res) {
              this.totalcountError = +res?.results[0]?.Errors + +res?.results[0]?.Without_Errors;
              this.totalerrorCount = res?.results[0]?.Errors;
              this.totalnoErrorCount = res?.results[0]?.Without_Errors;

              const error = res?.results[0]?.Errors > 0;
              this.getView().getModel("graphStatsModel").setData({
                visible: true,
                totalCount: +res?.results[0]?.Errors + +res?.results[0]?.Without_Errors,
                errorCount: res?.results[0]?.Errors,
                noErrorCount: res?.results[0]?.Without_Errors,
                overFlowBar: true,
                proceed: !error,
                proceedWithoutError: error,
                cancel: true,
              });
              if (this.RequestStatus === "Completed") {
                this.getView().byId("proceedButton").setProperty("visible", false);
              }
            }.bind(this),
            error: function (err) {
              console.log(err);
            },
          });
          const oSmartChart = this.byId("smartErrorChart");
          oSmartChart.attachInitialized(() => {
            oSmartChart.getChartAsync().then((chart) => {
              const oVizProperties = {
                plotArea: {
                  dataLabel: {
                    visible: true,
                  },
                  colorPalette: ["#f53131", "#30914c"],
                },
              };
              chart.setVizProperties(oVizProperties);
              chart.attachSelectData(this.onSelectChart, this);
              chart.attachDeselectData(this.onDeselectChart, this);
            });
          });

        }

      },

      _buttonControll: function () {
        debugger;

        var oModel = this.getOwnerComponent().getModel();

        var mParameters = {
          s_no: 1,
          reqid: this.reqid,
          asnum: "",
          IsActiveEntity: true
        };

        oModel.callFunction("/mass_get_button_status", {
          method: "POST",
          urlParameters: mParameters,

          success: function (oData) {

            this._ReadErrorData();

            var oVisibility = {};
            var oResp = oData && oData.mass_get_button_status;

            if (oResp) {
              Object.keys(oResp).forEach(function (key) {
                oVisibility[key] = oResp[key] === "X";
              });
            }

            var oButtonModel = this.getView().getModel("controllModel");

            if (!oButtonModel) {
              oButtonModel = new sap.ui.model.json.JSONModel();
              this.getView().setModel(oButtonModel, "controllModel");
            }

            oButtonModel.setData(oVisibility);
            oButtonModel.refresh(true);

          }.bind(this),

          error: function (oError) {
            console.log("Function Import Error:", oError);
            this._ReadErrorData();
          }.bind(this)
        });
      },

      // to check workitem id 
      checkWorkItemRequests: function () {
        debugger;
        let that = this;
        var oModel = this.getOwnerComponent().getModel("ZP_QU_DG_WORKITM_RQSTS_SRV");
        oModel.read("/ZP_QU_DG_WORKITEMWITHREQUESTS", {
          urlParameters: {
            "sap-client": "200",
            "$skip": "0",
            "$top": "1"
          },
          filters: [new sap.ui.model.Filter("Technical_WorkFlow_Object", sap.ui.model.FilterOperator.EQ, this.reqid)],
          success: function (oData) {
            debugger;
            if (oData.results.length === 0) {
              // handle empty array case
            } else {
              that.WorkItem_ID = oData.results[0].WorkItem_ID;
              that._ProcessId = oData.results[0].process_id;
            }
            if (oData.results && oData.results.length > 0 && oData.results[0].WorkItem_ID) {
              that.getView().byId("onEdit").setProperty("visible", false);
              that.getView().getModel("graphStatsModel").setData({
                proceed: false,
                proceedWithoutError: false,
                totalCount: that.totalcountError,
                errorCount: that.totalerrorCount,
                noErrorCount: that.totalnoErrorCount
              });
            }

          },
          error: function (oError) {
            console.log("Error checking work item requests:", oError);
          }
        });
      },

      onBeforeRebindChart: function (oEvent) {
        oEvent.getParameter("bindingParams").filters.push(new sap.ui.model.Filter("reqid", "EQ", this.reqid));
        const oSmartChart = this.byId("smartErrorChart");
        oSmartChart.getChartAsync().then((chart) => {
          const oVizProperties = {
            plotArea: {
              dataLabel: {
                visible: true,
              },
              colorPalette: ["#f53131", "#30914c"],
            },
          };
          chart.setVizProperties(oVizProperties);
          chart.attachSelectData(this.onSelectChart, this);
          chart.attachDeselectData(this.onDeselectChart, this);
        });
      },

      onBeforeRebindTable: function (oEvent) {

        let that = this;
        let oBindingParams = oEvent.getParameter("bindingParams");
        // Add your existing Reqid filter
        if (this.reqid) {
          oBindingParams.filters.push(
            new sap.ui.model.Filter("reqid", "EQ", this.reqid)
          );
        }

        oBindingParams.filters.push(
          new sap.ui.model.Filter("mass_upld_error", sap.ui.model.FilterOperator.EQ, false)
        );

        // Add filter for active entities
        oBindingParams.filters.push(new sap.ui.model.Filter("IsActiveEntity", "EQ", true));

        // Add error filter if it exists
        if (this.oErrorFilter) {
          oBindingParams.filters.push(this.oErrorFilter);
        }

        oBindingParams.events = {
          dataReceived: function (oDataReceivedEvent) {
            that._UploadedData = oDataReceivedEvent.getParameter("data").results;
          }
        };
      },

      formatRowHighlight: function (oValue) {
        if (oValue) {
          return "Error";
        } else {
          return "Success";
        }
      },
      onActionButtonPress: function (oEvent) {
        // debugger
        var oButton = oEvent.getSource();
        let selectedTableData = oEvent
          .getSource()
          .getBindingContext()
          .getObject();
        const selData = new JSONModel(selectedTableData);
        this.byId("actionSheet").openBy(oButton);
        this.byId("actionSheet").setModel(selData, "selData");
      },

      onSelectChart: function (oEvent) {
        debugger;
        const type = oEvent.getParameters().data[0].data.measureNames;
        const oTable = this.getView().byId("smartErrorTable");

        if (type === "Errors") {
          this.oErrorFilter = new sap.ui.model.Filter({
            path: "mass_upld_error",
            operator: sap.ui.model.FilterOperator.EQ,
            value1: true,
          });
        } else if (type === "Without_Errors") {
          this.oErrorFilter = new sap.ui.model.Filter({
            path: "mass_upld_error",
            operator: sap.ui.model.FilterOperator.EQ,
            value1: false,
          });
        }
        oTable.rebindTable();
      },
      onDeselectChart: function (oEvent) {
        // Clear the error filter to show all data
        this.oErrorFilter = null;
        const oTable = this.getView().byId("smartErrorTable");
        oTable.rebindTable();
      },
      _debounceRebindTable: function (oTable) {
        if (this._rebindDebounceTimer) {
          clearTimeout(this._rebindDebounceTimer);
        }
        this._rebindDebounceTimer = setTimeout(function () {
          oTable.rebindTable();
          this._rebindDebounceTimer = null;
        }.bind(this), this.REBIND_DEBOUNCE_TIME);
      },

      onCheckDuplicate: function (oEvent) {
        this.oTable = this.getView().byId("smartErrorTable");
        this.oTable.setBusy(true);
        var rowData = oEvent.getSource().getModel("selData").getData();
        const currentRecord = new JSONModel([rowData]);
        this.getView().setModel(currentRecord, "currentRecord");

        const oModel = this.getOwnerComponent().getModel();

        var mParameters = {
          s_no: 1,
          reqid: this.reqid,
          asnum: rowData.asnum,
          IsActiveEntity: true,
        };

        oModel.callFunction("/check_duplicate", {
          method: "POST",
          urlParameters: mParameters,
          success: function (oData, response) {
            if (oData.results.length === 0) {
              MessageToast.show("No Duplicates Available");
              this.oTable.setBusy(false);
              return;
            }
            const duplicateModel = new JSONModel(oData.results);
            this.getView().setModel(duplicateModel, "duplicateModel");

            if (!this.duplicateFragment) {
              this.duplicateFragment = sap.ui.xmlfragment(
                "zaidgsmmsup.fragments.DuplicateCheck",
                this
              );
              this.getView().addDependent(this.duplicateFragment);
            }

            this.duplicateFragment.open();
            this.oTable.setBusy(false);
          }.bind(this),
          error: function (oError) {
            MessageToast.show("Error calling function import", oError);
            this.oTable.setBusy(false);
          }.bind(this),
        });
      },

      onCloseDuplicateCheck: function () {
        this.duplicateFragment.close();
      },
      onIgnoreDuplicates: function () {
        let sPath = this.getView().getBindingContext();
        let oModelData = this.getView().getModel();
        if (oModelData.getProperty(sPath + "/dupindicator") === false) {
          oModelData.setProperty(sPath + "/dupindicator", true);
          sap.m.MessageToast.show("Potential duplicates Ignored");
        }
        else {
          oModelData.setProperty(sPath + "/dupindicator", false);
          sap.m.MessageToast.show("Potential duplicates will be checked");
        }
        this.duplicateFragment.close();
      },
      findDuplicatesBySNoAndMatnr: function (arr) {
        // debugger;
        if (!Array.isArray(arr)) {
          console.error("Input is not an array");
          return [];
        }

        const keyCount = {}; // Track occurrence count of each key
        const duplicateKeys = []; // Store keys that have duplicates

        arr.forEach((item) => {
          const key = `${item.asnum}`;
          keyCount[key] = (keyCount[key] || 0) + 1;

          // If count reaches 2, it's a duplicate (add only once)
          if (keyCount[key] === 2) {
            duplicateKeys.push(key);
          }
        });

        return duplicateKeys;
      },

      onEditRecord: function (oEvent) {
        debugger;
        var rowData = oEvent.getSource().getModel("selData").getData();
        var sComponent = "aidgservicemaster";
        let oParams = {
          SNO: 1,
          REQID: this.reqid,
          MATNR: rowData.asnum,
          ISACTIVEENTITY: true
        }
        let oParamsDraft = {
          SNO: 1,
          REQID: this.reqid,
          MATNR: rowData.asnum,
          ISACTIVEENTITY: false
        }

        let oPayload = {
          s_no: 1,
          reqid: this.reqid,
          asnum: rowData.asnum,
          IsActiveEntity: true,
          PreserveChanges: true
        };
        let currentpage = {
          sRoute: "OverViewPage",
          Reqid: this.reqid,
        };


        if (this.Daftdata && this.Daftdata.includes(rowData.asnum)) {
          sap.ui.getCore().backNavigationFromServiceToMassUpload = currentpage;
          sap.ui.getCore().navigateExternal(sComponent, '', { params: oParamsDraft });
        } else {
          // for active requests
          let oModel = this.getOwnerComponent().getModel()
          oModel.callFunction('/ZP_QU_DG_SMROOTEdit', {
            method: 'POST',
            urlParameters: oPayload,
            success: function (oData, oRes) {
              sap.ui.getCore().backNavigationFromServiceToMassUpload = currentpage;
              sap.ui.getCore().navigateExternal(sComponent, '', { params: oParams });
            }.bind(this),
            error: function (oErr) {
              try {
                const errorData = JSON.parse(oErr.responseText);
                const errorMessage = errorData.error?.message?.value || "An unknown error occurred.";
                sap.m.MessageBox.error(errorMessage, { title: "Error" });
              } catch {
                sap.m.MessageBox.error("Failed to process the error. Please try again.", { title: "Error" });
              }
            }
          })
        }
      },

      onPressErrors: function (oEvent) {
        debugger;
        const oModel = this.getOwnerComponent().getModel();
        var rowData = oEvent.getSource().getModel("selData").getData();
        this.getView().setBusy(true);

        //debugger;
        oModel.callFunction("/validate_mass_single", {
          method: "POST",
          urlParameters: {
            s_no: 1,
            reqid: this.reqid,
            asnum: rowData.asnum,
            IsActiveEntity: true,
          },
          success: function (oData, oRes) {
            this.getView().setBusy(false);
            // Parse the SAP message header
            const sapMessage = JSON.parse(oRes.headers["sap-message"]);

            let sMsg = sapMessage.message;
            if (sapMessage.details && sapMessage.details.length > 0) {
              // sMsg += "\n\nAdditional Errors:";
              sapMessage.details.forEach((detail) => {
                sMsg += `\n ${detail.message}`;
              });
            }
            MessageBox.error(sMsg, {
              title: "Error"
            });
            console.error("Full Error Message:", sMsg);

          }.bind(this),
          error: function (oError) {
            this.getView().setBusy(false);
            MessageToast.show("Something went wrong...!!!", oError);
          }.bind(this),
        });
      },
      onPressProceedWihoutError: async function (oEvent) {
        try {
          let that = this;
          debugger;
          // console.log("clicked");
          const oModel = this.getOwnerComponent().getModel();
          const firstValidRecord = this._UploadedData.find(item => item.IsError === false);
          if (!firstValidRecord) {
            MessageToast.show("No Valid Records found to proceed..!!!");
            return;
          }
          this.getView().setBusy(true);

          // First call - ignore_error
          await new Promise((resolve, reject) => {
            oModel.callFunction("/ignore_error", {
              method: "POST",
              urlParameters: {
                s_no: 1,
                reqid: this.reqid,
                asnum: '',
                IsActiveEntity: true
              },
              success: function (oData, response) {
                MessageToast.show("Errors disregarded successfully..!!");

                resolve();
              },
              error: function (oError) {
                reject(oError);
              }
            });
          });

          // Second call - initiate_workflow (only after first call succeeds)
          await new Promise((resolve, reject) => {
            oModel.callFunction("/initiate_workflow", {
              method: "POST",
              urlParameters: {
                s_no: 1,
                reqid: this.reqid,
                asnum: "",
                IsActiveEntity: true,
              },
              success: function (oData, response) {
                MessageBox.success(`Workflow initiated successfully...!!!`, {
                  onClose: () => {
                    that.getOwnerComponent().getRouter().navTo("View1");
                    resolve();
                  }
                });
              },
              error: function (oError) {
                reject(oError);
              }
            });
          });

          // After both calls complete successfully
          this._ReadErrorData();

        } catch (oError) {
          MessageToast.show("Something went wrong...!!!", oError);
        } finally {
          this.getView().setBusy(false);
        }
      },

      onWithdraw: function (oEvent) {
        debugger;
        let that = this;
        sap.m.MessageBox.confirm("Are you sure you want to Withdraw the request?", {
          icon: sap.m.MessageBox.Icon.WARNING,
          title: "",
          onClose: function (oAction) {
            if (oAction === sap.m.MessageBox.Action.OK) {
              that.getView().setBusy(true);

              let oPayload = {
                s_no: 1,
                reqid: that.reqid,
                asnum: '',
                IsActiveEntity: true,
                WiId: that.WorkItem_ID,
                Step: ''
              };

              let oModel = that.getOwnerComponent().getModel();
              oModel.callFunction("/withdraw", {
                method: "POST",
                urlParameters: oPayload,
                success: (oData, response) => {
                  let successMessage = JSON.parse(response.headers['sap-message']).message;
                  that.getView().setBusy(false);
                  sap.m.MessageBox.show(successMessage, {
                    icon: sap.m.MessageBox.Icon.SUCCESS,
                    title: "SUCCESS",
                    actions: [sap.m.MessageBox.Action.OK],
                    emphasizedAction: sap.m.MessageBox.Action.OK,
                    onClose: function (oAction) {
                      if (oAction === sap.m.MessageBox.Action.OK) {
                        window.history.go(-1);
                      }
                    }
                  });
                },
                error: function (oError) {
                  let sMessage = "Error posting data";
                  if (oError && oError.responseText) {
                    try {
                      let oErrorObj = JSON.parse(oError.responseText);
                      sMessage = oErrorObj.error.message.value || sMessage;
                    } catch (e) {
                      sMessage = oError.message || sMessage;
                    }
                  }
                  MessageToast.show(sMessage);
                  that.getView().setBusy(false);
                }
              });
            }
          }

        });
      },
      onApprove: function () {
        debugger;
        sap.ui.core.BusyIndicator.show(0);
        let that = this;
        let oModel = this.getOwnerComponent().getModel();

        const oParams = {
          s_no: 1,
          reqid: that.reqid,
          asnum: '',
          IsActiveEntity: true,
          WiId: that.WorkItem_ID,
          Step: '',
          IsAllApprove: false
        };

        oModel.callFunction("/approve", {
          method: "POST",
          urlParameters: oParams,
          success: (oData, response) => {
            let successMessage = "Request Approved";
            const uniqueMessages = new Set();
            const extractMessages = (sapMessage) => {
              if (!sapMessage) return;
              if (sapMessage.message) {
                uniqueMessages.add(sapMessage.message);
              }
              if (sapMessage.details && Array.isArray(sapMessage.details)) {
                sapMessage.details.forEach((detail) => {
                  if (detail.message) {
                    uniqueMessages.add(detail.message);
                  }
                });
              }
            };

            // Case 1: Message inside metadata
            if (oData && oData.__metadata && oData.__metadata["sap-message"]) {
              const sapMessage = JSON.parse(oData.__metadata["sap-message"]);
              extractMessages(sapMessage);
            }

            // Case 2: Message inside response header
            else if (response && response.headers && response.headers["sap-message"]) {
              const sapMessage = JSON.parse(response.headers["sap-message"]);
              extractMessages(sapMessage);
            }

            // Convert Set → string
            if (uniqueMessages.size > 0) {
              successMessage = Array.from(uniqueMessages).join("\n\n");
            }
            sap.ui.core.BusyIndicator.hide();

            sap.m.MessageBox.show(successMessage, {
              icon: sap.m.MessageBox.Icon.SUCCESS,
              title: "Success",
              actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
              emphasizedAction: sap.m.MessageBox.Action.OK,
              onClose: function (oAction) {
                if (oAction === sap.m.MessageBox.Action.OK) {
                  window.history.go(-1);
                }
              }
            });
          },
          error: (oError) => {
            sap.ui.core.BusyIndicator.hide();
            sap.m.MessageToast.show("Approval failed");
            console.log("Approve error", oError);
          }
        });
      },
      onReject: function (oEvent) {
        sap.ui.core.BusyIndicator.show(0)
        var oModel = this.getOwnerComponent().getModel("ZP_QU_DG_MYTASK_BND")
        let sequence = this._Sequence
        let reqid = this.reqid;

        oModel.read(`/ZI_QU_DG_RejctionVH(iv_reqid='${reqid}',iv_sequence='${sequence}')/Set`, {
          success: function (oData) {
            let oJsonModel = new sap.ui.model.json.JSONModel(oData.results)
            this.getView().setModel(oJsonModel, "oRejModel")
            if (!this._rejectDialog) {
              this.loadFragment({
                name: "zaidgsmmsup.fragments.Reject"
              }).then(function (oDialog) {
                this._rejectDialog = oDialog;
                this._rejectDialog.open();
                sap.ui.core.BusyIndicator.hide()
              }.bind(this));
            } else {
              // Re-open the dialog if it already exists
              this._rejectDialog.open();
              sap.ui.core.BusyIndicator.hide()
            }
          }.bind(this),
          error: function (oErr) {
            sap.ui.core.BusyIndicator.hide()
          }
        })
      },

      onCancel: function () {
        if (this._rejectDialog) {
          this._rejectDialog.close();
          this._rejectDialog.destroy();
          this._rejectDialog = null;
        }
      },

      onConfirmReject: async function (oEvent) {
        debugger;

        const oCommentInput = this.getView().byId("idRejectComment");
        const oComboBox = this.getView().byId("idrejectip");
        const that = this;

        if (oCommentInput.getValue() && oComboBox.getSelectedKey()) {
          try {
            this._rejectDialog.setBusy(true);

            const sRejectionComment = oCommentInput.getValue();
            const rejectInputValue = oComboBox.getSelectedKey();

            const topLevelWiId = this._TopLevelWiid;

            // ✅ Correct callFunction for POST Function Import
            const oResponse = await new Promise((resolve, reject) => {
              const oParams = {
                s_no: 1,
                reqid: that.reqid,
                asnum: '',
                IsActiveEntity: true,
                WiId: that.WorkItem_ID,
                Step: rejectInputValue
              };

              const oModel = that.getOwnerComponent().getModel();
              oModel.callFunction("/reject", {
                method: "POST",
                urlParameters: oParams,
                success: resolve,
                error: reject
              });
            });

            // ✅ Close and destroy dialog safely
            if (this._rejectDialog) {
              this._rejectDialog.close();
              this._rejectDialog.destroy();
              this._rejectDialog = null;
            }

            // ✅ Add rejection comment
            const oContext = oEvent.getSource().getBindingContext();
            const sLoggedInUser = oContext?.getObject()?.user_name || "";
            const oCommentModel = this.getOwnerComponent().getModel("ZQU_DG_ATTACHMENT_COMMENT_SRV");
            const oPayload = {
              InstanceId: topLevelWiId,
              Id: "",
              Filename: "USER COMMENTS",
              Text: sRejectionComment,
              CreatedAt: new Date(),
              CreatedBy: sLoggedInUser
            };

            await new Promise((resolve, reject) => {
              oCommentModel.create(`/TaskSet('${topLevelWiId}')/TaskToComments`, oPayload, {
                success: resolve,
                error: reject
              });
            });

            // ✅ Handle success message from OData
            let rejectMessage = "Rejection successful.";
            if (oResponse && oResponse.headers && oResponse.headers["sap-message"]) {
              try {
                const sapMsg = JSON.parse(oResponse.headers["sap-message"]);
                if (sapMsg.message) rejectMessage = sapMsg.message;
              } catch (e) {
                console.log("SAP message parse failed:", e);
              }
            }

            sap.m.MessageBox.success(rejectMessage, {
              onClose: function () {
                window.history.go(-1);
              }
            });

          } catch (oError) {
            sap.m.MessageToast.show("Rejection failed, please try again.");
            console.log("Error:", oError);
          } finally {
            this._rejectDialog.setBusy(false);
          }

        } else {
          // Validation
          if (!oCommentInput.getValue()) {
            oCommentInput.setValueState("Error");
            oCommentInput.setValueStateText("Please add a comment to proceed...!!!");
          }
          if (!oComboBox.getSelectedKey()) {
            oComboBox.setValueState("Error");
            oComboBox.setValueStateText("Please select a rejection reason.");
          }
        }
      },


      onPressCancel: function () {
        window.history.go(-1);
      },

      OnPressErrorExcel: function () {
        var that = this;
        this.getView().setBusy(true);

        var oPayload = {
          REQID: this.reqid
        };

        let oModel = this.getOwnerComponent().getModel("ZQU_DG_MAT_MASS_UPLOAD_SRV");

        oModel.callFunction("/Export_all_errors", {
          method: "POST",
          urlParameters: oPayload,
          success: function (oResponse) {
            that.getView().setBusy(false);

            try {
              var responseData = oResponse;

              if (!responseData) {
                throw new Error("Empty response from server");
              }

              var finalDataString = responseData.d?.final_data ||
                responseData.final_data ||
                responseData.d?.results?.final_data;

              if (!finalDataString) {
                throw new Error("Could not find error data in response");
              }

              var errorData = JSON.parse(finalDataString);
              if (!Array.isArray(errorData)) {
                errorData = errorData && typeof errorData === 'object' ? [errorData] : [];
              }

              if (errorData.length === 0) {
                sap.m.MessageToast.show("No error data available to export");
                return;
              }

              // Create HTML table with proper formatting
              var html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                      xmlns:x="urn:schemas-microsoft-com:office:excel"
                      xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <!--[if gte mso 9]>
                    <xml>
                        <x:ExcelWorkbook>
                            <x:ExcelWorksheets>
                                <x:ExcelWorksheet>
                                    <x:Name>Material Errors</x:Name>
                                    <x:WorksheetOptions>
                                        <x:DisplayGridlines/>
                                    </x:WorksheetOptions>
                                </x:ExcelWorksheet>
                            </x:ExcelWorksheets>
                        </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <style>
                        td {
                            vertical-align: top;
                            mso-style-parent: "";
                        }
                        .errors {
                            white-space: pre-wrap; /* Keeps line breaks in cell */
                            word-wrap: break-word;
                            width: 500px; /* Column width in px */
                        }
                    </style>
                </head>
                <body>
                    <table border="1">
                        <tr>
                            <th>Material ID</th>
                            <th>Error Messages</th>
                        </tr>`;

              // Populate rows
              errorData.forEach(function (material) {
                if (!material) return;

                var materialId = material.asnum || "N/A";
                var errors = material.ERRORS || [];

                // Add serial number in bold
                var errorText = errors.length > 0
                  ? errors.map((e, i) => `<b>${i + 1}.</b> ${e.ERROR_DATA || "No error message"}`).join('\r\n')
                  : 'No errors found';

                html += `<tr>
                                <td>${materialId}</td>
                                <td class="errors">${errorText}</td>
                             </tr>`;
              });

              html += `</table></body></html>`;

              // Create Blob and download
              var blob = new Blob([html], {
                type: 'application/vnd.ms-excel'
              });
              var link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `Material_Errors_${new Date().toISOString().slice(0, 10)}.xls`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

            } catch (e) {
              console.error("Export processing error:", e);
              sap.m.MessageToast.show(`Export failed: ${e.message}`);
            }
          },
          error: function (oError) {
            that.getView().setBusy(false);
            console.error("API Error:", oError);
            var errorMsg = oError.responseText ?
              JSON.parse(oError.responseText).error.message.value :
              oError.message || "Unknown error";
            sap.m.MessageToast.show(`Export failed: ${errorMsg}`);
          }
        });
      },

      onShowLog: function (oEvent) {
        this.getView().setBusy(true);
        this._PrepareLog(oEvent)
      },

      onCloseLog: function () {
        let _oDialogLog = this.getView().byId("idLogs");
        _oDialogLog.close();
        _oDialogLog.destroy();
        _oDialogLog === null;
      },

      _PrepareLog: function (oEvent) {
        let oWorkflowModel = this.getOwnerComponent().getModel("WorkFlowModel");
        debugger;
        let _oDialogLog = this.getView().byId("idLogs");
        if (!_oDialogLog) {
          _oDialogLog = new sap.ui.xmlfragment(this.getView().getId(), "zaidgsmmsup.fragments.Logs", this);
          this.getView().addDependent(_oDialogLog);
        }
        let sWorkItemId = this.WorkItem_ID
        if (!sWorkItemId || sWorkItemId === undefined) {
          sap.m.MessageBox.show("WorkItem ID is not present")
          return
        }
        oWorkflowModel.read('/WorkflowLogSet', {
          filters: [new sap.ui.model.Filter('WfId', "EQ", sWorkItemId)],
          success: function (oData, oRes) {
            let aFilteredData = oData.results.filter((item) => {
              return item.WiStat !== "PENDING"
            })
            this._LogForTimeline(aFilteredData)
            this.getView().setBusy(false)
            _oDialogLog.open()
          }.bind(this),
          error: function (oErr) {
            this.getView().setBusy(false)
          }.bind(this),
        })

      },
      _LogForTimeline: function (aData) {
        var logModel = new sap.ui.model.json.JSONModel();
        logModel.setData({ "LogCollection": aData });
        this.getView().byId("logList").setModel(logModel, "logModel");
      },
      onShowStatus: function (oEvent) {
        debugger;
        this.getView().setBusy(true);
        this._PrepareStatusLog(oEvent)
      },
      onCloseStatusLog: function () {
        let _oDialogStatusLog = this.getView().byId("idStatusLogs")
        _oDialogStatusLog.close();
        _oDialogStatusLog.destroy();
        _oDialogStatusLog === null;
      },

      _PrepareStatusLog: function (oEvent) {
        let oWorkflowModel = this.getOwnerComponent().getModel("WorkFlowModel");

        let sWorkItemId = this.WorkItem_ID;

        //LOG FOR STATUS --- NETWORK GRAPH
        let _oDialogStatusLog = this.getView().byId("idStatusLogs");
        if (!_oDialogStatusLog) {
          _oDialogStatusLog = new sap.ui.xmlfragment(this.getView().getId(), "zaidgsmmsup.fragments.StatusLog", this);
          this.getView().addDependent(_oDialogStatusLog);
        }
        debugger

        oWorkflowModel.read('/WorkflowLogSet', {
          filters: [new sap.ui.model.Filter('WfId', "EQ", sWorkItemId)],
          success: function (oData, oRes) {
            this._LogForGraph(oData.results)
            this.getView().setBusy(false)
            _oDialogStatusLog.open()
          }.bind(this),
          error: function (oErr) {
            this.getView().setBusy(false)
          }.bind(this),
        })
      },
      _LogForGraph: function (aData) {
        let aLogData = aData;
        const seenSequences = new Set();
        const aFilteredData = [];

        // Filter duplicate sequences
        for (let i = aLogData.length - 1; i >= 0; i--) {
          if (!seenSequences.has(aLogData[i].Sequence)) {
            seenSequences.add(aLogData[i].Sequence);
            aFilteredData.push(aLogData[i]);
          }
        }

        let aNodes = aFilteredData;
        let aLines = [];

        // Create lines, ensuring valid from/to references
        aFilteredData.forEach(item => {
          const { Sequence, Preceeding_seq } = item;
          if (Sequence === 'START') {
            aLines.push({ from: 'START', to: '1-1', lineType: 'Dotted' });
          }
          const predecessors = Preceeding_seq.split('&');
          predecessors.forEach(predecessor => {
            if (predecessor !== "0-0" && predecessor !== "" && aFilteredData.some(node => node.Sequence === predecessor)) {
              aLines.push({ from: predecessor, to: Sequence, lineType: "Solid" });
            }
          });
        });

        // Update WiStat for nodes after "1-1" if READY
        aNodes.forEach(item => {
          if (aNodes.some(obj => obj.Sequence === "1-1" && obj.WiStat === "READY")) {
            if (item.Sequence !== "1-1" && item.Sequence !== "START") {
              item.WiStat = "PENDING";
            }
          }
        });

        // Set default values for empty fields and nullify dates for READY
        aNodes.forEach(item => {
          item.WiText = item.WiText || "No Description";
          item.Step_name = item.Step_name || "Unknown Step";
          item.WiAagent = item.WiAagent || "Unknown";
          if (item.WiStat === 'READY') {
            item.WiAed = null;
            item.WiCt = null;
          }
        });

        const oGraphData = {
          nodes: aNodes,
          lines: aLines
        };

        console.log("Graph Data:", JSON.stringify(oGraphData, null, 2)); // Debug output

        var oNetworkModel = new sap.ui.model.json.JSONModel(oGraphData);
        const oGraph = this.byId('networkGraph');
        oGraph.setModel(oNetworkModel, 'StatusLogModel');
        oGraph.invalidate(); // Force re-render
      },
      onManageRoles: function (oEvent) {
        let oSelectedNodeContext = oEvent.getSource().getBindingContext("StatusLogModel")
        let oSelectedNode = oSelectedNodeContext.getObject()
        let aFilters = [
          new sap.ui.model.Filter("ProcessId", "EQ", this._ProcessId),
          new sap.ui.model.Filter("StepId", "EQ", oSelectedNode.Step_Id),
          new sap.ui.model.Filter("AssignedRole", "NE", ''),
        ]
        this.loadFragment({
          name: "zaidgsmmsup.fragments.ManageRolesUsers"
        }).then((oDialog) => {
          this._oPopOverManageRoles = oDialog;
          this._oPopOverManageRoles.setModel(this.getOwnerComponent().getModel('ZP_QU_DG_PRO_STEP_ROLE_CDS'))
          let oList = this.getView().byId("idSmartListRoles")
          let oCustomData = new sap.ui.core.CustomData({
            key: "filterObject",
            value: aFilters
          });
          oList.addCustomData(oCustomData);
          oList.rebindList()
          this._oPopOverManageRoles.openBy(oEvent.getSource());
          //initilise the users page
          this.getView().byId("idUsersPage").addEventDelegate({
            onBeforeShow: function (oEvent) {
              let sRole = oEvent.data.AssignedRole
              let sStepId = oEvent.data.StepId
              let oSmartList = this.getView().byId('idSmartListUsers')
              oSmartList.addCustomData(
                new sap.ui.core.CustomData({
                  key: "role",
                  value: sRole,
                })
              );
              oSmartList.addCustomData(
                new sap.ui.core.CustomData({
                  key: "stepId",
                  value: sStepId,
                })
              );
              oSmartList.rebindList()
            }.bind(this),

          });
        });
      },
      onBeforeRebindList: function (oEvent) {
        if (oEvent.getSource().getId() === this.getView().getId() + '--idSmartListRoles') {
          let aFilter = oEvent.getSource().getCustomData()[0].getValue()
          oEvent.getParameter("bindingParams").filters = aFilter
        } else if (oEvent.getSource().getId() === this.getView().getId() + '--idSmartListUsers') {
          let oCustomRoleData = oEvent.getSource().getCustomData().find((data) => data.getKey() === "role")
          let oCustomStepData = oEvent.getSource().getCustomData().find((data) => data.getKey() === "stepId")
          if (oCustomRoleData && oCustomStepData) {
            let sRole = oCustomRoleData.getValue()
            let sStepId = oCustomStepData.getValue()
            oEvent.getParameter("bindingParams").filters = [new sap.ui.model.Filter("RoleName", "EQ", sRole), new sap.ui.model.Filter("StepId", "EQ", sStepId)]
          }
        }

      },

      handleClosePopOver: function (oEvent) {
        if (this._oPopOverManageRoles) {
          this._oPopOverManageRoles.close()
        }
      },
      handleOnAfterPopOverClose: function (oEvent) {
        if (this._oPopOverManageRoles) {
          this._oPopOverManageRoles.destroy()
          this._oPopOverManageRoles = null
        }
      },
      handleNavigation: function (oEvent) {
        let oBindingContext = oEvent.getSource().getBindingContext()
        let navCon = this.getView().byId("navCon");
        if (oBindingContext) {
          let oUserspage = this.getView().byId('idUsersPage')
          navCon.to(oUserspage, oBindingContext.getObject());
        } else {
          navCon.back();
        }
      },
      logStatusFormatter: function (text) {
        if (text === "SUBMITTED") {
          return 'Success'
        } else if (text === "STARTED") {
          return 'Information'
        } else if (text === "REJECTED") {
          return 'Error'
        } else if (text === "APPROVED") {
          return 'Success'
        } else if (text === 'READY') {
          return "None"
        } else if (text === 'PENDING') {
          return "Standard"
        }

      },

      dateTimeFormat: function (oDate, oTime) {
        debugger;
        if (oDate && oTime) {
          let sDate = oDate.toDateString()
          let time = oTime.ms
          let newDateTime = new Date(sDate)
          return newDateTime.setMilliseconds(time)
        }

      },
      logStatusClassFormatter: function (text) {
        debugger;
        if (text === 'PENDING') {
          return 'myDisabledNode'
        }
      }


    });
  }
);