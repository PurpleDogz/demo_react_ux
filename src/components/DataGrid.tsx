"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, ColDef } from "ag-grid-community";
import styles from "./DataGrid.module.css";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  salary: number;
  startDate: string;
  status: string;
  email: string;
}

const EMPLOYEES: Employee[] = [
  { id: 1, name: "Alice Johnson", department: "Engineering", role: "Senior Developer", salary: 125000, startDate: "2020-03-15", status: "Active", email: "alice@company.com" },
  { id: 2, name: "Bob Smith", department: "Design", role: "UX Lead", salary: 110000, startDate: "2019-07-22", status: "Active", email: "bob@company.com" },
  { id: 3, name: "Carol Williams", department: "Engineering", role: "Tech Lead", salary: 140000, startDate: "2018-01-10", status: "Active", email: "carol@company.com" },
  { id: 4, name: "David Brown", department: "Marketing", role: "Marketing Manager", salary: 95000, startDate: "2021-05-03", status: "On Leave", email: "david@company.com" },
  { id: 5, name: "Eva Martinez", department: "Engineering", role: "Backend Developer", salary: 115000, startDate: "2020-11-18", status: "Active", email: "eva@company.com" },
  { id: 6, name: "Frank Lee", department: "Sales", role: "Account Executive", salary: 88000, startDate: "2022-02-14", status: "Active", email: "frank@company.com" },
  { id: 7, name: "Grace Chen", department: "Engineering", role: "Frontend Developer", salary: 118000, startDate: "2021-08-25", status: "Active", email: "grace@company.com" },
  { id: 8, name: "Henry Wilson", department: "HR", role: "HR Director", salary: 105000, startDate: "2017-06-01", status: "Active", email: "henry@company.com" },
  { id: 9, name: "Irene Davis", department: "Design", role: "Product Designer", salary: 100000, startDate: "2022-04-11", status: "Active", email: "irene@company.com" },
  { id: 10, name: "Jack Thompson", department: "Engineering", role: "DevOps Engineer", salary: 130000, startDate: "2019-12-05", status: "Inactive", email: "jack@company.com" },
  { id: 11, name: "Karen White", department: "Finance", role: "Financial Analyst", salary: 92000, startDate: "2021-01-20", status: "Active", email: "karen@company.com" },
  { id: 12, name: "Leo Garcia", department: "Engineering", role: "QA Engineer", salary: 98000, startDate: "2020-09-30", status: "Active", email: "leo@company.com" },
  { id: 13, name: "Mia Robinson", department: "Marketing", role: "Content Strategist", salary: 85000, startDate: "2022-07-18", status: "Active", email: "mia@company.com" },
  { id: 14, name: "Nathan Clark", department: "Sales", role: "Sales Director", salary: 120000, startDate: "2018-04-12", status: "Active", email: "nathan@company.com" },
  { id: 15, name: "Olivia Adams", department: "Engineering", role: "Data Scientist", salary: 135000, startDate: "2020-06-08", status: "On Leave", email: "olivia@company.com" },
  { id: 16, name: "Peter Hall", department: "Design", role: "Design System Lead", salary: 115000, startDate: "2019-03-25", status: "Active", email: "peter@company.com" },
  { id: 17, name: "Quinn Baker", department: "Engineering", role: "Mobile Developer", salary: 122000, startDate: "2021-10-14", status: "Active", email: "quinn@company.com" },
  { id: 18, name: "Rachel Young", department: "HR", role: "Recruiter", salary: 78000, startDate: "2022-01-07", status: "Active", email: "rachel@company.com" },
  { id: 19, name: "Sam Turner", department: "Finance", role: "Controller", salary: 112000, startDate: "2018-09-19", status: "Active", email: "sam@company.com" },
  { id: 20, name: "Tina Phillips", department: "Engineering", role: "Security Engineer", salary: 138000, startDate: "2020-02-28", status: "Inactive", email: "tina@company.com" },
];

function StatusCellRenderer(params: { value: string }) {
  const className =
    params.value === "Active"
      ? styles.statusActive
      : params.value === "Inactive"
        ? styles.statusInactive
        : styles.statusOnLeave;
  return <span className={className}>{params.value}</span>;
}

function SalaryCellRenderer(params: { value: number }) {
  return <span>${params.value.toLocaleString()}</span>;
}

export default function DataGrid() {
  const columnDefs = useMemo<ColDef<Employee>[]>(
    () => [
      { field: "id", headerName: "ID", width: 70, sortable: true },
      { field: "name", headerName: "Name", flex: 1, minWidth: 150, sortable: true, filter: true },
      { field: "email", headerName: "Email", flex: 1, minWidth: 180, sortable: true, filter: true },
      { field: "department", headerName: "Department", width: 140, sortable: true, filter: true },
      { field: "role", headerName: "Role", flex: 1, minWidth: 160, sortable: true, filter: true },
      { field: "salary", headerName: "Salary", width: 120, sortable: true, cellRenderer: SalaryCellRenderer },
      { field: "startDate", headerName: "Start Date", width: 130, sortable: true },
      { field: "status", headerName: "Status", width: 110, sortable: true, filter: true, cellRenderer: StatusCellRenderer },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
    }),
    []
  );

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Employee Directory</h2>
      <div className={styles.gridContainer}>
        <AgGridReact<Employee>
          rowData={EMPLOYEES}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[5, 10, 20]}
        />
      </div>
    </div>
  );
}
