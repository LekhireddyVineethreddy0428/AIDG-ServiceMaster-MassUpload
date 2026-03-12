sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "sap/ui/core/Fragment",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/comp/valuehelpdialog/ValueHelpDialog"
    ],
    function (Controller, JSONModel, MessageToast, MessageBox, Fragment, Filter, FilterOperator, ValueHelpDialog) {
        "use strict";

        return Controller.extend("zaidgsmmsup.controller.MainPageList", {
            onInit: function () {
                this.getOwnerComponent().getRouter().getRoute("MainPageList").attachPatternMatched(function (oEvent) {
                    this.reqid = '';
                }, this);

            },
            onClickDownloadTemplate: function (oEvent) {
                const aHeaders = [
                    "Service Category", "Base UOM", "Short Text", "Material Service Group",
                    "Division", "Valuation Class", "Authorization Group", "Service Type", "Tax indicator", "Deletion Indicator", "Long Text"
                ];

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet("Service Master Template");

                worksheet.columns = aHeaders.map(header => ({
                    header: header,
                    key: header,
                    width: 25
                }));

                const headerRow = worksheet.getRow(1);
                headerRow.height = 30;

                headerRow.eachCell({ includeEmpty: true }, (cell) => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF0070C0' } // SAP Blue
                    };
                    cell.font = {
                        color: { argb: 'FFFFFFFF' }, // White
                        bold: true,
                        size: 11
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
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

                    sap.m.MessageToast.show("Template Downloaded Successfully!");
                }).catch(function (error) {
                    console.error("Template Generation Failed:", error);
                    sap.m.MessageToast.show("Error generating Excel file.");
                });
            },
            onSubmitExcel: async function (oEvent) {
                var oDescriptionInput = this.byId("requestDescriptionInput");
                var oPriorityInput = this.byId("requestPriorityInput");
                var sDescription = oDescriptionInput.getValue();
                var sPriority = oPriorityInput.getValue();

                // setting into global values 
                this.reqprio = sPriority;
                this.req_desc = sDescription;

                oDescriptionInput.setValueState(sap.ui.core.ValueState.None);
                oPriorityInput.setValueState(sap.ui.core.ValueState.None);

                if (!sDescription) {
                    oDescriptionInput.setValueState(sap.ui.core.ValueState.Error);
                    oDescriptionInput.setValueStateText("Description is required");
                    bValid = false;
                }
                if (!sPriority) {
                    oPriorityInput.setValueState(sap.ui.core.ValueState.Error);
                    oPriorityInput.setValueStateText("Priority is required");
                    bValid = false;
                }
                // Show confirmation dialog
                sap.m.MessageBox.confirm(
                    "Are you sure want to submit?",
                    {
                        title: "Confirm Submission",
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                this.getView().setBusy(true);
                                var oModel = this.getOwnerComponent().getModel("ZC_QU_DG_SM_MASS_SRV");
                                oModel.read("/MassUploadSet", {
                                    success: function (res) {
                                        this.reqid = res.results[0].reqid;
                                        this.getView().byId("idRequest").setText(`Request Id : ${this.reqid}`);
                                        this.processMassUpload(this.reqid);
                                    }.bind(this),
                                    error: function (err) {
                                        sap.m.MessageBox.error(
                                            "Cannot Fetch Data: " + JSON.stringify(err)
                                        );
                                        this.getView().setBusy(false);
                                    }.bind(this),
                                });
                            } else {
                                sap.m.MessageToast.show("Submission cancelled");
                            }
                        }.bind(this)
                    }
                );
            },
            processMassUpload: function (reqid) {
                let aItems = this.getView().byId("idMtype_table").getItems();
                let oDataModel = this.getView().getModel("ZC_QU_DG_SM_MASS_SRV");
                let sTokenForUpload = oDataModel.getSecurityToken();
                let sUrl = oDataModel.sServiceUrl + "/MassUploadSet";

                this.count = 0;

                aItems.forEach((oItem) => {
                    let oFileUploader = oItem.getCells()[2];

                    if (oFileUploader && oFileUploader.getValue()) {
                        oFileUploader.removeAllHeaderParameters();

                        oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                            name: "X-CSRF-Token",
                            value: sTokenForUpload
                        }));

                        oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                            name: "SLUG",
                            value: `${reqid}|${this.reqprio}|${this.req_desc}|CREATE_MAS`
                        }));

                        oFileUploader.setUploadUrl(sUrl);
                        oFileUploader.upload();

                        this.count++;
                    }
                });
            },
            handleUploadComplete: function (oEvent) {
                var oDescriptionInput = this.byId("requestDescriptionInput");
                var oPriorityInput = this.byId("requestPriorityInput");
                var sResponse = oEvent.getParameter("status");
                let error = oEvent.getParameters("response").response;
                if (sResponse === 201 || sResponse === 202 || sResponse === 204) {
                    MessageToast.show(`Files (${this.count}) uploaded Successfully`);

                    this.getView().setBusy(false);
                    if (this._oFragment && this._oFragment.isOpen()) {
                        this._oFragment.close();
                    }
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("OverViewPage", {
                        Reqid: this.reqid,
                        req_status: "Process Not Started" 
                    });
                    // Clear inputs
                    oDescriptionInput.setValue("");
                    oPriorityInput.setValue("");

                } else {
                    const fullError = error.split('/SAP/')[0];
                    const errorMessage = fullError.replace('SY/530', '');

                    sap.m.MessageBox.error("Upload Failed: " + errorMessage, {
                        title: "Error"
                    });

                    this.getView().setBusy(false);
                }
            },
            onSubmitopenFrag: async function () {
                try {
                    var oView = this.getView();

                    if (!this._oFragment) {
                        Fragment.load({
                            id: oView.getId(),
                            name: "zaidgsmmsup.fragments.RequestingData",
                            controller: this
                        }).then(function (oFragment) {
                            this._oFragment = oFragment;
                            oView.addDependent(oFragment);
                            oFragment.open();
                        }.bind(this));
                    } else {
                        this._oFragment.open();
                    }
                } catch (error) {
                    console.error("Validation or fragment open failed:", error);
                }
            },
            onCancelFrag: function () {
                this.byId("requestPriorityInput").setValue("");
                this.byId("requestDescriptionInput").setValue("");
                this._oFragment.close();
            },

            onValueHelpRequested: function () {
                const oView = this.getView();
                const oModel = oView.getModel();                            
                const sEntitySetPath = "/zi_qudg_requstpriority_vh";

                if (!this._oF4HelpDialog) {
                    sap.ui.core.Fragment.load({
                        id: oView.getId(),
                        name: "zaidgsmmsup.fragments.F4HelpforRequestPriority",
                        controller: this
                    }).then(function (oDialog) {
                        this._oF4HelpDialog = oDialog;
                        oView.addDependent(oDialog);
                        oDialog.setModel(oModel);
                        oDialog.setSupportMultiselect(false);
                        if (oDialog.setKey) { oDialog.setKey("domvalue_l"); }
                        if (oDialog.setDescriptionKey) { oDialog.setDescriptionKey("Ddtext"); }
                        oModel.read(sEntitySetPath, {
                            success: function (oData) {
                                const aResults = oData.results || [];

                                if (!aResults.length) {
                                    sap.m.MessageToast.show("No data found.");
                                    return;
                                }
                                oView.setModel(new sap.ui.model.json.JSONModel(aResults), "ReqPrioVH");

                                // Build columns dynamically
                                const aFieldMappings = [
                                    { key: "domvalue_l", label: "Request Priority" },
                                    { key: "Ddtext", label: "Description" }
                                ];

                                const aColumns = aFieldMappings.map(function (field) {
                                    return new sap.m.Column({
                                        header: new sap.m.Label({ text: field.label })
                                    });
                                });

                                const oTemplate = new sap.m.ColumnListItem({
                                    cells: aFieldMappings.map(function (field) {
                                        return new sap.m.Text({ text: "{" + field.key + "}" });
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
                                oDialog.open();
                            },
                            error: function () {
                                sap.m.MessageToast.show("Failed to load value help data.");
                            }
                        });
                    }.bind(this));
                } else {
                    this._oF4HelpDialog.open();
                }
            },

            onValueHelpOk: function (oEvent) {
                const oSelectedToken = (oEvent.getParameter("tokens") || [])[0];
                const oInput = this.byId("requestPriorityInput");
                if (oSelectedToken && oInput) {
                    const sKey = oSelectedToken.getKey();
                    const sText = oSelectedToken.getText();
                    oInput.setValue(sText);
                    oInput.data("priorityKey", sKey);
                    oInput.setValueState(sap.ui.core.ValueState.None);
                }
                this._oF4HelpDialog.close();
            },

            onValueHelpCancel: function () {
                this._oF4HelpDialog.close();
            },
            onPriorityChange: function (oEvent) {
                const oInput = oEvent.getSource();
                const sVal = (oInput.getValue() || "").trim();
                const oView = this.getView();

                if (!sVal) {
                    oInput.setValueState(sap.ui.core.ValueState.None);
                    oInput.data("priorityKey", null);
                    return;
                }

                const oVHModel = oView.getModel("ReqPrioVH");
                if (oVHModel) {
                    const aList = oVHModel.getData() || [];
                    const oHit = aList.find(function (r) {
                        return r.domvalue_l === sVal || r.Ddtext === sVal;
                    });

                    if (oHit) {
                        oInput.setValue(oHit.Ddtext || oHit.domvalue_l);
                        oInput.data("priorityKey", oHit.domvalue_l);
                        oInput.setValueState(sap.ui.core.ValueState.None);
                        return;
                    }

                    markInvalid();
                    return;
                }

                const oModel = oView.getModel();
                const sEntitySetPath = "/zi_qudg_requstpriority_vh";
                const Filter = sap.ui.model.Filter;
                const FO = sap.ui.model.FilterOperator;

                const oOrFilter = new Filter({
                    filters: [
                        new Filter("domvalue_l", FO.EQ, sVal),
                        new Filter("Ddtext", FO.EQ, sVal)
                    ],
                    and: false
                });

                oModel.read(sEntitySetPath, {
                    filters: [oOrFilter],
                    success: function (oData) {
                        const aRes = oData.results || [];
                        if (aRes.length) {
                            const r = aRes[0];
                            oInput.setValue(r.Ddtext || r.domvalue_l);
                            oInput.data("priorityKey", r.domvalue_l);
                            oInput.setValueState(sap.ui.core.ValueState.None);
                        } else {
                            markInvalid();
                        }
                    }.bind(this),
                    error: markInvalid
                });

                function markInvalid() {
                    oInput.setValue("");
                    oInput.data("priorityKey", null);
                    oInput.setValueState(sap.ui.core.ValueState.Error);
                    oInput.setValueStateText("Please choose a value using F4.");
                    sap.m.MessageToast.show("Please choose a value from the list (F4).");
                }
            },


            onFilterBarSearch: function (oEvent) {
                const oFilterBar = oEvent.getSource();
                const oTable = oFilterBar.getParent().getTable();
                if (oTable) {
                }
            },
            onPressCancel: function () {
                window.history.go(-1);
            }



        });
    }
);
