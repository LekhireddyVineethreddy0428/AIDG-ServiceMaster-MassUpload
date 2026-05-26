sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
],
    function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
        "use strict";

        return Controller.extend("zaidgsmmsup.controller.View1", {
            onInit: function () {
                this.getOwnerComponent().getRouter().getRoute("View1").attachPatternMatched(this._onRouteMatched, this);
            },
            _onRouteMatched: function () {
                this.getView().byId("UserMasterSmartTable").rebindTable();
            },
            onUploadpress: function () {
                var oView = this.getView(),
                    oButton = oView.byId("idCreate");

                if (!this._oCreateNewFragment) {
                    this._oCreateNewFragment = Fragment.load({
                        id: oView.getId(),
                        name: "zaidgsmmsup.fragments.createNewMenu",
                        controller: this,
                    }).then(function (oMenu) {
                        oMenu.openBy(oButton);
                        this._oCreateNewFragment = oMenu;
                        return this._oCreateNewFragment;
                    }.bind(this));
                } else {
                    this._oCreateNewFragment.openBy(oButton);
                }
            },

            // ===============================
            // MASS UPLOAD DIALOG
            // ===============================

            onMassUploadpress: function () {
                var oView = this.getView();

                if (!this._oRequestDialog) {
                    this._oRequestDialog = sap.ui.xmlfragment(
                        "zaidgsmmsup.fragments.MassUpload",
                        this
                    );
                    oView.addDependent(this._oRequestDialog);
                }

                this._clearForm("UPLOAD");
                this._oRequestDialog.open();
            },

            onMassUpdatePress: function () {
                var oView = this.getView();

                if (!this._oUpdateDialog) {
                    this._oUpdateDialog = sap.ui.xmlfragment(
                        "zaidgsmmsup.fragments.MassUpdate",
                        this
                    );
                    oView.addDependent(this._oUpdateDialog);
                }

                this._clearForm("UPDATE");
                this._oUpdateDialog.open();
            },

            onCancelFrag: function () {
                if (this._oRequestDialog) {
                    this._oRequestDialog.close();
                }
                this._clearForm("UPLOAD");
            },

            onCancelFragUpdate: function () {
                if (this._oUpdateDialog) {
                    this._oUpdateDialog.close();
                }
                this._clearForm("UPDATE");
            },

            // ===============================
            // CLEAR FORM
            // ===============================

            _clearForm: function (sType) {

                var oCore = sap.ui.getCore();

                if (sType === "UPLOAD") {

                    oCore.byId("requestPriorityInput").setValue("");
                    oCore.byId("requestDescriptionInput").setValue("");

                    let oUploader = oCore.byId("fileUploader");

                    if (oUploader) {
                        oUploader.clear();
                    }

                } else {

                    oCore.byId("requestPriorityInput1").setValue("");
                    oCore.byId("requestDescriptionInput1").setValue("");

                    let oUploader = oCore.byId("fileUploader1");

                    if (oUploader) {
                        oUploader.clear();
                    }
                }
            },

            // ===============================
            // DOWNLOAD TEMPLATE
            // ===============================

            onClickDownloadTemplate: function () {

                const aHeaders = [
                    "Service Category",
                    "Base UOM",
                    "Short Text",
                    "Material Service Group",
                    "Division",
                    "Valuation Class",
                    "Authorization Group",
                    "Service Type",
                    "Tax indicator",
                    "Deletion Indicator",
                    "Long Text"
                ];

                const workbook = new ExcelJS.Workbook();

                const worksheet = workbook.addWorksheet(
                    "Service Master Template"
                );

                worksheet.columns = aHeaders.map(function (header) {
                    return {
                        header: header,
                        key: header,
                        width: 25
                    };
                });

                const headerRow = worksheet.getRow(1);

                headerRow.height = 30;

                headerRow.eachCell(function (cell) {

                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: 'FF0070C0'
                        }
                    };

                    cell.font = {
                        color: {
                            argb: 'FFFFFFFF'
                        },
                        bold: true,
                        size: 11
                    };

                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: 'center'
                    };

                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };

                });

                for (let i = 0; i < 20; i++) {

                    const dataRow = worksheet.addRow([]);

                    for (let j = 1; j <= aHeaders.length; j++) {

                        const cell = dataRow.getCell(j);

                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                }

                workbook.xlsx.writeBuffer().then(function (buffer) {

                    const blob = new Blob([buffer], {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    });

                    const link = document.createElement("a");

                    const url = URL.createObjectURL(blob);

                    link.href = url;

                    link.download = "Service Master Mass Upload Template.xlsx";

                    document.body.appendChild(link);

                    link.click();

                    setTimeout(function () {

                        document.body.removeChild(link);

                        URL.revokeObjectURL(url);

                    }, 0);

                    sap.m.MessageToast.show(
                        "Template Downloaded Successfully!"
                    );

                }).catch(function (error) {

                    console.error(error);

                    sap.m.MessageToast.show(
                        "Error generating Excel file."
                    );
                });
            },

            // ===============================
            // VALUE HELP
            // ===============================

            onValueHelpRequested: function (oEvent) {

                this._oCurrentInput = oEvent.getSource();

                const oView = this.getView();

                const oModel = oView.getModel();

                const sEntitySetPath = "/zi_qudg_requstpriority_vh";

                if (this._bF4HelpLoading) {
                    return;
                }

                if (!this._oF4HelpDialog) {

                    this._bF4HelpLoading = true;

                    sap.ui.core.Fragment.load({
                        id: oView.getId(),
                        name: "zaidgsmmsup.fragments.F4HelpforRequestPriority",
                        controller: this
                    }).then(function (oDialog) {

                        this._oF4HelpDialog = oDialog;

                        oView.addDependent(oDialog);

                        oDialog.setModel(oModel);

                        oDialog.setSupportMultiselect(false);

                        if (oDialog.setKey) {
                            oDialog.setKey("domvalue_l");
                        }

                        if (oDialog.setDescriptionKey) {
                            oDialog.setDescriptionKey("Ddtext");
                        }

                        oModel.read(sEntitySetPath, {

                            success: function (oData) {

                                const aResults = oData.results || [];

                                if (!aResults.length) {

                                    sap.m.MessageToast.show(
                                        "No data found."
                                    );

                                    this._bF4HelpLoading = false;

                                    return;
                                }

                                oView.setModel(
                                    new sap.ui.model.json.JSONModel(aResults),
                                    "ReqPrioVH"
                                );

                                const aFieldMappings = [
                                    {
                                        key: "domvalue_l",
                                        label: "Request Priority"
                                    },
                                    {
                                        key: "Ddtext",
                                        label: "Description"
                                    }
                                ];

                                const aColumns = aFieldMappings.map(function (field) {

                                    return new sap.m.Column({
                                        header: new sap.m.Label({
                                            text: field.label
                                        })
                                    });

                                });

                                const oTemplate = new sap.m.ColumnListItem({

                                    cells: aFieldMappings.map(function (field) {

                                        return new sap.m.Text({
                                            text: "{" + field.key + "}"
                                        });

                                    })

                                });

                                const oTable = new sap.m.Table({
                                    columns: aColumns,
                                    mode: "SingleSelectLeft"
                                });

                                oTable.bindItems({
                                    path: sEntitySetPath,
                                    template: oTemplate
                                });

                                oDialog.setTable(oTable);

                                this._bF4HelpLoading = false;

                                this._resetF4Dialog();

                                oDialog.open();

                            }.bind(this),

                            error: function () {

                                sap.m.MessageToast.show(
                                    "Failed to load value help data."
                                );

                                this._bF4HelpLoading = false;

                            }.bind(this)

                        });

                    }.bind(this));

                } else {

                    this._resetF4Dialog();

                    this._oF4HelpDialog.open();
                }
            },

            onValueHelpRequestedUpdate: function (oEvent) {
                this.onValueHelpRequested(oEvent);
            },

            onValueHelpOk: function (oEvent) {

                const oSelectedToken =
                    (oEvent.getParameter("tokens") || [])[0];

                const oInput = this._oCurrentInput;

                if (oSelectedToken && oInput) {

                    const sKey = oSelectedToken.getKey();

                    const sText = oSelectedToken.getText();

                    oInput.setValue(sText);

                    oInput.data("priorityKey", sKey);

                    oInput.setValueState(
                        sap.ui.core.ValueState.None
                    );
                }

                this._oF4HelpDialog.close();
            },

            onValueHelpOkUpdate: function (oEvent) {
                this.onValueHelpOk(oEvent);
            },

            onValueHelpCancel: function () {

                if (this._oF4HelpDialog) {
                    this._oF4HelpDialog.close();
                }
            },

            onPriorityChange: function (oEvent) {

                const oInput = oEvent.getSource();

                const sVal = (oInput.getValue() || "").trim();

                const oView = this.getView();

                if (!sVal) {

                    oInput.setValueState(
                        sap.ui.core.ValueState.None
                    );

                    oInput.data("priorityKey", null);

                    return;
                }

                const oVHModel = oView.getModel("ReqPrioVH");

                if (oVHModel) {

                    const aList = oVHModel.getData() || [];

                    const oHit = aList.find(function (r) {

                        return r.domvalue_l === sVal ||
                            r.Ddtext === sVal;

                    });

                    if (oHit) {

                        oInput.setValue(
                            oHit.Ddtext || oHit.domvalue_l
                        );

                        oInput.data(
                            "priorityKey",
                            oHit.domvalue_l
                        );

                        oInput.setValueState(
                            sap.ui.core.ValueState.None
                        );

                        return;
                    }

                    markInvalid();

                    return;
                }

                function markInvalid() {

                    oInput.setValue("");

                    oInput.data("priorityKey", null);

                    oInput.setValueState(
                        sap.ui.core.ValueState.Error
                    );

                    oInput.setValueStateText(
                        "Please choose a value using F4."
                    );

                    sap.m.MessageToast.show(
                        "Please choose a value from the list (F4)."
                    );
                }
            },

            _resetF4Dialog: function () {

                if (!this._oF4HelpDialog) {
                    return;
                }

                const oFilterBar =
                    this._oF4HelpDialog.getFilterBar();

                if (oFilterBar) {

                    const aItems =
                        oFilterBar.getAllFilterItems(true) || [];

                    aItems.forEach(function (oItem) {

                        const oControl = oItem.getControl();

                        if (oControl && oControl.setValue) {
                            oControl.setValue("");
                        }

                    });
                }

                this._oF4HelpDialog.setTokens([]);

                const oTable = this._oF4HelpDialog.getTable();

                if (oTable && oTable.removeSelections) {
                    oTable.removeSelections(true);
                }
            },

            // ===============================
            // SUBMIT MASS UPLOAD
            // ===============================

            onSubmitExcel: function () {
                this._submitMassAction("CREATE_MAS");
            },

            onSubmitExcelUpdate: function () {
                this._submitMassAction("UPDATE_MAS");
            },

            _submitMassAction: function (sActionType) {

                const bIsUpload =
                    sActionType === "CREATE_MAS";

                const sPriorityId =
                    bIsUpload ?
                        "requestPriorityInput" :
                        "requestPriorityInput1";

                const sDescId =
                    bIsUpload ?
                        "requestDescriptionInput" :
                        "requestDescriptionInput1";

                const sUploaderId =
                    bIsUpload ?
                        "fileUploader" :
                        "fileUploader1";

                const sDialogId =
                    bIsUpload ?
                        "requestDialog" :
                        "requestDialog1";

                var oPriority =
                    sap.ui.getCore().byId(sPriorityId);

                var oDesc =
                    sap.ui.getCore().byId(sDescId);

                var oFileUploader =
                    sap.ui.getCore().byId(sUploaderId);

                var bValid = true;

                oPriority.setValueState("None");

                oDesc.setValueState("None");

                if (!oPriority.getValue()) {

                    oPriority.setValueState("Error");

                    oPriority.setValueStateText(
                        "Request Priority is required"
                    );

                    bValid = false;
                }

                if (!oDesc.getValue()) {

                    oDesc.setValueState("Error");

                    oDesc.setValueStateText(
                        "Description is required"
                    );

                    bValid = false;
                }

                if (!oFileUploader.getValue()) {

                    sap.m.MessageBox.error(
                        "Please upload a file"
                    );

                    bValid = false;
                }

                if (!bValid) {
                    return;
                }

                this.reqprio = oPriority.getValue();

                this.req_desc = oDesc.getValue();

                sap.m.MessageBox.confirm(
                    "Are you sure want to submit?",
                    {
                        title: "Confirm Submission",

                        onClose: function (oAction) {

                            if (oAction === sap.m.MessageBox.Action.OK) {

                                sap.ui.getCore()
                                    .byId(sDialogId)
                                    .setBusy(true);

                                var oModel =
                                    this.getOwnerComponent()
                                        .getModel("ZC_QU_DG_SM_MASS_SRV");

                                oModel.read("/MassUploadSet", {

                                    success: function (res) {

                                        this.reqid =
                                            res.results[0].reqid;

                                        this._processMassUpload(
                                            this.reqid,
                                            sActionType,
                                            sUploaderId,
                                            sDialogId
                                        );

                                    }.bind(this),

                                    error: function (err) {

                                        sap.m.MessageBox.error(
                                            JSON.stringify(err)
                                        );

                                        sap.ui.getCore()
                                            .byId(sDialogId)
                                            .setBusy(false);

                                    }.bind(this)

                                });

                            } else {

                                sap.m.MessageToast.show(
                                    "Submission cancelled"
                                );
                            }

                        }.bind(this)

                    }
                );
            },

            _processMassUpload: function (
                reqid,
                sActionType,
                sUploaderId,
                sDialogId
            ) {

                sap.ui.getCore()
                    .byId(sDialogId)
                    .setBusy(true);

                let oDataModel =
                    this.getView()
                        .getModel("ZC_QU_DG_SM_MASS_SRV");

                let sTokenForUpload =
                    oDataModel.getSecurityToken();

                let sUrl =
                    oDataModel.sServiceUrl +
                    "/MassUploadSet";

                var oHeaderParameter =
                    new sap.ui.unified.FileUploaderParameter({
                        name: "X-CSRF-Token",
                        value: sTokenForUpload
                    });

                var oHeaderSlug =
                    new sap.ui.unified.FileUploaderParameter({
                        name: "SLUG",
                        value:
                            `${reqid}|${this.reqprio}|${this.req_desc}|${sActionType}`
                    });

                var oFileUploader =
                    sap.ui.getCore().byId(sUploaderId);

                oFileUploader.removeAllHeaderParameters();

                oFileUploader.addHeaderParameter(
                    oHeaderParameter
                );

                oFileUploader.addHeaderParameter(
                    oHeaderSlug
                );

                oFileUploader.setUploadUrl(sUrl);

                oFileUploader.upload();
            },

            // ===============================
            // UPLOAD COMPLETE
            // ===============================

            handleUploadComplete: function (oEvent) {
                this._handleUploadResponse(
                    oEvent,
                    "requestDialog"
                );
            },

            handleCompleteUpdate: function (oEvent) {
                this._handleUploadResponse(
                    oEvent,
                    "requestDialog1"
                );
            },

            _handleUploadResponse: function (
                oEvent,
                sDialogId
            ) {

                var sResponse =
                    oEvent.getParameter("status");

                let error =
                    oEvent.getParameters("response")
                        .response;

                if (
                    sResponse === 201 ||
                    sResponse === 202 ||
                    sResponse === 204
                ) {

                    sap.m.MessageToast.show(
                        "File uploaded successfully"
                    );

                    sap.ui.getCore()
                        .byId(sDialogId)
                        .setBusy(false);

                    if (
                        sDialogId === "requestDialog" &&
                        this._oRequestDialog
                    ) {
                        this._oRequestDialog.close();
                    }

                    if (
                        sDialogId === "requestDialog1" &&
                        this._oUpdateDialog
                    ) {
                        this._oUpdateDialog.close();
                    }

                    const oRouter =
                        this.getOwnerComponent()
                            .getRouter();

                    oRouter.navTo("OverViewPage", {
                        Reqid: this.reqid,
                        req_status: "Process Not Started"
                    });

                } else {

                    const fullError =
                        error.split('/SAP/')[0];

                    const errorMessage =
                        fullError.replace('SY/530', '');

                    sap.m.MessageBox.error(
                        "Upload Failed: " + errorMessage,
                        {
                            title: "Error"
                        }
                    );

                    sap.ui.getCore()
                        .byId(sDialogId)
                        .setBusy(false);
                }
            },

            onItemPress: function (oEvent) {
                var oBindingContext = oEvent.getSource().getBindingContext();
                var Reqid = oBindingContext.getProperty("reqid");
                var requestStatus = oBindingContext.getProperty("req_status");
                this.getOwnerComponent().getRouter().navTo("OverViewPage", {
                    Reqid: Reqid,
                    req_status: requestStatus
                });
            },
            onExisitingPress: function (oEvent) {
                var sComponent = "aidgservicemaster";
                var oBindingContext = oEvent.getSource().getBindingContext();
                var matnrNum = oBindingContext.getProperty("asnum");
                let sNo = oBindingContext.getProperty('s_no')

                let oParams = {
                    SNO: sNo,
                    REQID: "",
                    MATNR: matnrNum,
                    ISACTIVEENTITY: true
                }

                sap.ui.getCore().navigateExternal(sComponent, '', { params: oParams });
            },

            onBeforeRebindTable: function (oEvent) {
                let oBindingParams = oEvent.getParameter("bindingParams");
                let oTable = oEvent.getSource().getTable();

                oBindingParams.sorter.push(
                    new sap.ui.model.Sorter("req_created_on", true)
                );

                oBindingParams.events = {
                    dataReceived: function () {
                        let aItems = oTable.getItems();
                        aItems.forEach((oItem) => {
                            oItem.setType("Navigation");
                            oItem.attachPress(this.onItemPress, this);
                        });
                    }.bind(this)
                };
            },
            onBeforeRebindTableExt: function (oEvent) {
                let oBindingParams = oEvent.getParameter("bindingParams");
                let oTable = oEvent.getSource().getTable();
                oBindingParams.events = {
                    dataReceived: function () {
                        let aItems = oTable.getItems();
                        aItems.forEach((oItem) => {
                            oItem.setType("Navigation");
                            oItem.attachPress(this.onExisitingPress, this);
                        });
                    }.bind(this)
                };

            },


            onTabSelect: function (oEvent) {
                const sSelectedKey = oEvent.getParameter("key");
                const oRequestsFilterBar = this.byId("smartFilterBar");
                const oMaterialsFilterBar = this.byId("smartFilterBar2");
                const oSmartFilterBar = this.byId("smartFilterBar");
                if (sSelectedKey === "requests") {
                    oSmartFilterBar.setEntitySet("ZI_QU_DG_SM_MassRqst_REQ");
                    oRequestsFilterBar.setVisible(true);
                    oMaterialsFilterBar.setVisible(false);
                } else if (sSelectedKey === "materials") {
                    oSmartFilterBar.setEntitySet("ZI_QU_DG_SM_MassRqst_EX");
                    oRequestsFilterBar.setVisible(false);
                    oMaterialsFilterBar.setVisible(true);
                }
            },

            onGoPress: function () {
                const sSelectedKey = this.byId("iconTabBar").getSelectedKey();
                let oSmartTable;
                if (sSelectedKey === "requests") {
                    oSmartTable = this.byId("UserMasterSmartTable");
                } else if (sSelectedKey === "materials") {
                    oSmartTable = this.byId("idSmartTableMaterials");
                }
                if (oSmartTable) {
                    oSmartTable.rebindTable();
                }
            },

            // we have alredy basic data ("BASIC DATA(MARA)"
            onPressExport: function () {
                debugger;
                const oSmartTable = this.byId("idSmartTableMaterials");
                const oTable = oSmartTable.getTable();
                const aSelectedItems = oTable.getSelectedItems();

                if (aSelectedItems.length === 0) {
                    MessageToast.show("Please select at least one row to export.");
                    return;
                }
                const oFirstSelectedObject = aSelectedItems[0].getBindingContext().getObject();
                const aMaterialNumbers = aSelectedItems.map(oItem => {
                    return oItem.getBindingContext().getObject().asnum;
                });
                this.materialType = oFirstSelectedObject.astyp;
                this.aMatnr = aMaterialNumbers;
                const aSelectedData = aSelectedItems.map(oItem => {
                    return oItem.getBindingContext().getObject();
                });

                MessageToast.show(aSelectedData.length + " rows are ready for export.");
                this.onDownloadTrigger();
            },


            // Manages the entire Excel download workflow, including the busy indicator and error handling.

            onDownloadTrigger: async function () {
                this.getView().setBusy(true);
                try {
                    await this.getData();
                } catch (error) {
                    const errorMessage = error.message || (typeof error === 'string' ? error : "An unexpected error occurred.");
                    sap.m.MessageBox.error(`Failed to generate the Excel file: ${errorMessage}`, {
                        title: "Download Error"
                    });
                    console.error("Complete error object:", error);
                } finally {
                    this.getView().setBusy(false);
                }
            },

            // Fetches material data from the backend and initiates the template preparation.

            getData: function () {
                return new Promise((resolve, reject) => {
                    let oModel = this.getOwnerComponent().getModel("ZC_QU_DG_SM_MASS_SRV");

                    oModel.callFunction("/Get_related_tables", {
                        method: "POST",
                        urlParameters: {
                            "ASNUM": this.aMatnr,
                            "ASTYP": this.materialType
                        },
                        success: function (oData) {
                            let aFinalData = [];
                            try {
                                if (oData.final_data && typeof oData.final_data === 'string') {
                                    const parsedData = JSON.parse(oData.final_data);
                                    if (Array.isArray(parsedData)) {
                                        aFinalData = parsedData;
                                    } else if (parsedData && Array.isArray(parsedData.results)) {
                                        aFinalData = parsedData.results;
                                    }
                                }
                            } catch (e) {
                                console.log("Failed to parse 'final_data' from backend response.", e);
                                reject(new Error("Could not parse material data from the server."));
                                return;
                            }

                            let oJsonModel = new sap.ui.model.json.JSONModel(aFinalData);
                            this.getView().setModel(oJsonModel, "relatedTables");

                            this.prepareTemplate().then(resolve).catch(reject);

                        }.bind(this),
                        error: function (oErr) {
                            reject(oErr);
                        }
                    });
                });
            },

            // Retrieves the Excel template structure and triggers the file generation with pre-filled data.
            prepareTemplate: function () {
                const that = this;
                return new Promise((resolve, reject) => {
                    const oModel = this.getOwnerComponent().getModel("ZC_QU_DG_SM_MASS_SRV");
                    const sMaterial = this.materialType;

                    oModel.callFunction("/Get_related_tables", {
                        method: "POST",
                        urlParameters: {
                            MTART: sMaterial
                        },
                        success: async function (oData) {
                            try {
                                const oTemplateData = JSON.parse(oData.final_data);
                                const oResult = {
                                    mType: sMaterial,
                                    oTemplateData: oTemplateData
                                };
                                await that._GenerateExcelTemplate(oTemplateData, sMaterial);
                                resolve(oResult);
                            } catch (e) {
                                console.error("Failed to parse template JSON or generate Excel:", e);
                                reject(e);
                            }
                        },
                        error: function (oErr) {
                            console.error("OData function call failed:", oErr);
                            reject(oErr);
                        }
                    });
                });
            },

            _GenerateExcelTemplate: async function (oData, sMaterialType) {
                const oPrefilledDataModel = this.getView().getModel("relatedTables");
                const aPrefilledData = oPrefilledDataModel ? oPrefilledDataModel.getData() : [];

                const workbook = new ExcelJS.Workbook();
                for (const table of oData) {
                    const worksheet = workbook.addWorksheet(table.TABNAME);
                    const fieldNameRow = table.TAB_VALUE.map(field => field.FIELDNAME);
                    worksheet.addRow(fieldNameRow);
                    const labelRow = table.TAB_VALUE.map(field => field.SCRTEXT_L || '');
                    worksheet.addRow(labelRow);
                    const tableData = aPrefilledData.find(data => data.TABNAME === table.TABNAME);
                    if (tableData && tableData.FIELDVALUE) {
                        try {
                            const rowsData = JSON.parse(tableData.FIELDVALUE);
                            if (Array.isArray(rowsData)) {
                                rowsData.forEach(dataRowObject => {
                                    const rowValues = fieldNameRow.map(fieldName => dataRowObject[fieldName] || "");
                                    worksheet.addRow(rowValues);
                                });
                            }
                        } catch (e) {
                            console.error(`Error parsing FIELDVALUE for table ${table.TABNAME}:`, e);
                        }
                    }
                    const lastRow = worksheet.lastRow ? worksheet.lastRow.number : 2;
                    const emptyRowsToAdd = 20 - lastRow > 0 ? 20 - lastRow : 0;
                    for (let i = 0; i < emptyRowsToAdd; i++) {
                        worksheet.addRow([]);
                    }
                    const header1 = worksheet.getRow(1);
                    header1.height = 20;
                    header1.eachCell({
                        includeEmpty: true
                    }, (cell, colNumber) => {
                        const field = table.TAB_VALUE[colNumber - 1];
                        const isMandatory = field.KEYFLAG === 'X' || field.MANDATORY === 'X';
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: isMandatory ? '90D5FF' : 'FFFFFF'
                            }
                        };
                        cell.font = {
                            color: {
                                argb: 'FF000000'
                            },
                            bold: true
                        };
                        cell.alignment = {
                            vertical: 'middle',
                            horizontal: 'center'
                        };
                        cell.border = {
                            top: {
                                style: 'thin'
                            },
                            left: {
                                style: 'thin'
                            },
                            bottom: {
                                style: 'thin'
                            },
                            right: {
                                style: 'thin'
                            }
                        };
                    });
                    const header2 = worksheet.getRow(2);
                    header2.height = 20;
                    header2.eachCell({
                        includeEmpty: true
                    }, (cell, colNumber) => {
                        const field = table.TAB_VALUE[colNumber - 1];
                        const isMandatory = field.KEYFLAG === 'X' || field.MANDATORY === 'X';
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: isMandatory ? '90D5FF' : 'FFFFFF'
                            }
                        };
                        cell.font = {
                            color: {
                                argb: 'FF000000'
                            },
                            bold: true
                        };
                        cell.alignment = {
                            vertical: 'middle',
                            horizontal: 'center'
                        };
                        cell.border = {
                            top: {
                                style: 'thin'
                            },
                            left: {
                                style: 'thin'
                            },
                            bottom: {
                                style: 'thin'
                            },
                            right: {
                                style: 'thin'
                            }
                        };
                    });
                    for (let i = 3; i <= worksheet.lastRow.number; i++) {
                        const row = worksheet.getRow(i);
                        row.eachCell({
                            includeEmpty: true
                        }, (cell) => {
                            cell.border = {
                                top: {
                                    style: 'thin'
                                },
                                left: {
                                    style: 'thin'
                                },
                                bottom: {
                                    style: 'thin'
                                },
                                right: {
                                    style: 'thin'
                                }
                            };
                        });
                    }
                    worksheet.columns.forEach(column => {
                        column.width = 25;
                    });
                    worksheet.views = [{
                        state: 'frozen',
                        ySplit: 2
                    }];
                    worksheet.autoFilter = {
                        from: 'A2',
                        to: {
                            row: 2,
                            column: table.TAB_VALUE.length
                        }
                    };
                }

                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], {
                    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `${sMaterialType}_prefilled_data.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                sap.m.MessageToast.show("Excel file has been downloaded successfully!");
            },
            formatDate: function (sDate) {
                if (!sDate) return "NA";

                var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "dd.MM.yyyy"
                });
                return oDateFormat.format(new Date(sDate));
            },
            formatValue: function (oValue) {
                if (oValue) {
                    return oValue
                } else {
                    return "NA"
                }
            },
            formatdesc: function (req_desc) {
                if (req_desc) {
                    return req_desc
                }
                else {
                    return "NA"
                }
            }

        });
    });
