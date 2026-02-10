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
                this.getOwnerComponent().getRouter().navTo("MainPageList");
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
                const oSmartTable = this.byId("idSmartTableMaterials");
                const oTable = oSmartTable.getTable();
                const aSelectedItems = oTable.getSelectedItems();

                if (aSelectedItems.length === 0) {
                    MessageToast.show("Please select at least one row to export.");
                    return;
                }
                const oFirstSelectedObject = aSelectedItems[0].getBindingContext().getObject();
                const aMaterialNumbers = aSelectedItems.map(oItem => {
                    return oItem.getBindingContext().getObject().Matnr;
                });
                this.materialType = oFirstSelectedObject.Mtart;
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
                    let oModel = this.getOwnerComponent().getModel("ZQU_DG_MAT_MASS_UPLOAD_SRV");

                    oModel.callFunction("/Get_material_data", {
                        method: "POST",
                        urlParameters: {
                            "MATNR": this.aMatnr,
                            "MTART": this.materialType
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
                    const oModel = this.getOwnerComponent().getModel("ZQU_DG_MAT_MASS_UPLOAD_SRV");
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
