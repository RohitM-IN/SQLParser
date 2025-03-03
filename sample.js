// Sample ResultObject for testing
export const sampleResultObject = {
    CoreEntity0022: {
        Data: [
            {
                key: "123",
                EntityKey: "CoreEntity0022",
                value: {
                    CompanyGroupID: 42,
                    BranchID: 7
                }
            }
        ]
    },
    Employee: {
        Data: [
            {
                key: "123",
                EntityKey: "Employee",
                value: {
                    District: 0,
                    BranchID: 7
                }
            }
        ]
    },
    SaleInvoiceDocument: {
        Data: [
            {
                key: "123",
                EntityKey: "SaleInvoiceDocument",
                value: {
                    ContactID: 42,
                    BranchID: 7
                }
            }
        ]
    },
    AccountingRule: {
        Data: [
            {
                key: "123",
                EntityKey: "AccountingRule",
                value: {
                    CompanyID: 42,
                    BranchID: 7
                }
            }
        ]
    },
    Area: {
        Data: [
            {
                key: "123",
                EntityKey: "Area",
                value: {
                    AreaType: 42,
                    BranchID: 7
                }
            }
        ]
    },
    Item: {
        Data: [
            {
                key: "123",
                EntityKey: "Item",
                value: {
                    ID: 42,
                    BranchID: 7,
                    AllowedItemGroupType: "1,2"
                }
            }
        ]
    },
    WorkOrderLine: {
        Data: [
            {
                key: "123",
                EntityKey: "WorkOrderLine",
                value: {
                    ApplicableUoms: ["UOM1", "UOM2", "UOM3"],
                    CompanyID: 2
                }
            }
        ]
    },
    WorkOrderDocument: {
        Data: [
            {
                key: "456",
                EntityKey: "WorkOrderDocument",
                value: {
                    CompanyID: 42,
                    BranchID: 7
                }
            }
        ]
    },
    TransferOutwardDocument: {
        Data: [
            {
                key: "789",
                EntityKey: "TransferOutwardDocument",
                value: {
                    DocDate: "2022-01-01",
                    RefBranchID: 42,
                    CompanyID: 7
                }
            },
            {
                key: "123",
                EntityKey: "TransferOutwardDocument",
                value: {
                    DocDate: "2024-01-01",
                    RefBranchID: null,
                    CompanyID: null
                }
            }
        ]
    },
    LeadDocument: {
        Data: [
            {
                key: "789",
                EntityKey: "LeadDocument",
                value: {
                    BranchID: 42,
                    CompanyID: 7
                }
            }
        ]
    },
};
