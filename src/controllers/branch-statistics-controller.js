import { db } from '../config/db.js';

export const renderBranchStatistics = async (req, res) => {
  const { branchId } = req.query;
  const branches = await db('branch');
  res.render('layout/main-layout', {
    title: 'Thống kê chi nhánh | Samurai Sushi',
    description: 'Thống kê chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    branches,
    selectedBranch: branchId
  });
};

export const renderBranchRevenue = async (req, res) => {
  const { branchId, period = 'day', year, month, yearLimit = 5 } = req.query; // Default to 'day'
  let revenueData = [];
  let availableYears = [];
  let availableMonths = [];

  if (branchId) {
    // Get available years
    const yearsQuery = await db.raw(
      `
      SELECT DISTINCT YEAR(i.issue_date) as year
      FROM invoice i
      JOIN \`order\` o ON i.order_id = o.order_id
      WHERE o.branch_id = ?
      ORDER BY year DESC`,
      [branchId]
    );
    availableYears = yearsQuery[0];

    // Get available months if year is selected
    if (year) {
      const monthsQuery = await db.raw(
        `
        SELECT DISTINCT MONTH(i.issue_date) as month
        FROM invoice i
        JOIN \`order\` o ON i.order_id = o.order_id
        WHERE o.branch_id = ? 
        AND YEAR(i.issue_date) = ?
        ORDER BY month ASC`,
        [branchId, year]
      );
      availableMonths = monthsQuery[0];
    }

    let timeQuery = '';
    switch (period) {
      case 'month':
        timeQuery = `
          SELECT 
            DATE_FORMAT(i.issue_date, '%Y-%m') as date,
            SUM(i.total_amount) as revenue
          FROM invoice i
          JOIN \`order\` o ON i.order_id = o.order_id
          WHERE o.branch_id = ?
          ${year ? 'AND YEAR(i.issue_date) = ?' : ''}
          GROUP BY DATE_FORMAT(i.issue_date, '%Y-%m')
          ORDER BY date ASC
          LIMIT 12`;
        break;
      case 'quarter':
        timeQuery = `
            SELECT 
              CONCAT(YEAR(i.issue_date), '-Q', QUARTER(i.issue_date)) as date,
              SUM(i.total_amount) as revenue
            FROM invoice i
            JOIN \`order\` o ON i.order_id = o.order_id
            WHERE o.branch_id = ?
            ${year ? 'AND YEAR(i.issue_date) = ?' : ''}
            GROUP BY date
            ORDER BY date ASC
            LIMIT 8`;
        break;
      case 'year':
        timeQuery = `
          SELECT 
            YEAR(i.issue_date) as date,
            SUM(i.total_amount) as revenue
          FROM invoice i
          JOIN \`order\` o ON i.order_id = o.order_id
          WHERE o.branch_id = ?
          GROUP BY YEAR(i.issue_date)
          ORDER BY date ASC
          LIMIT ?`; // show 5 recent years
        break;
      default: // day
        timeQuery = `
          SELECT 
            DATE(i.issue_date) as date,
            SUM(i.total_amount) as revenue
          FROM invoice i
          JOIN \`order\` o ON i.order_id = o.order_id
          WHERE o.branch_id = ?
          ${year && month ? 'AND YEAR(i.issue_date) = ? AND MONTH(i.issue_date) = ?' : ''}
          GROUP BY DATE(i.issue_date)
          ORDER BY date ASC
          LIMIT 30`;
    }

    const params = [branchId];
    if (period === 'day' && year && month) {
      params.push(year, month);
    } else if ((period === 'month' || period === 'quarter') && year) {
      params.push(year);
    } else if (period === 'year') {
      params.push(Number(yearLimit));
    }

    const query = await db.raw(timeQuery, params);
    revenueData = query[0];
  }

  const branches = await db('branch');
  res.render('layout/main-layout', {
    title: 'Doanh thu chi nhánh | Samurai Sushi',
    description: 'Thống kê doanh thu chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath: '../branch/revenue.ejs',
    branches,
    selectedBranch: branchId,
    selectedPeriod: period,
    selectedYear: year,
    selectedMonth: month,
    yearLimit: Number(yearLimit),
    availableYears,
    availableMonths,
    revenueData
  });
};

export const renderBranchEmployees = async (req, res) => {
  const { branchId, employeeId, period = 'day', year, month, yearLimit = 5, employmentStatus = 'all', search, page = 1 } = req.query;

  const perPage = 20;
  let employees = [];
  let selectedEmployee = null;
  let serviceData = [];
  let availableYears = [];
  let totalEmployees = 0;

  if (branchId) {
    if (employeeId) {
      // Get selected employee info
      selectedEmployee = await db('employee')
        .select('employee.employee_id', 'employee.name', 'department.name as department_name')
        .join('department', 'employee.department_id', 'department.department_id')
        .where('employee.employee_id', employeeId)
        .first();

      // Get available years for service points
      const yearsQuery = await db.raw(
        `
        SELECT DISTINCT YEAR(o.creation_date) as year
        FROM \`order\` o
        LEFT JOIN feedback f ON o.order_id = f.order_id
        WHERE o.employee_id = ?
        AND f.service_rating IS NOT NULL
        ORDER BY year DESC`,
        [employeeId]
      );
      availableYears = yearsQuery[0];

      // Get service points data based on period
      let timeQuery = '';
      switch (period) {
        case 'day':
          timeQuery = `
            SELECT 
              DATE(o.creation_date) as date,
              CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
              COUNT(*) as total_orders
            FROM \`order\` o
            LEFT JOIN feedback f ON o.order_id = f.order_id
            WHERE o.employee_id = ?
            ${year && month ? 'AND YEAR(o.creation_date) = ? AND MONTH(o.creation_date) = ?' : ''}
            GROUP BY DATE(o.creation_date)
            ORDER BY date ASC
            LIMIT 30`;
          break;
        case 'month':
          timeQuery = `
            SELECT 
              DATE_FORMAT(o.creation_date, '%Y-%m') as date,
              CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
              COUNT(*) as total_orders
            FROM \`order\` o
            LEFT JOIN feedback f ON o.order_id = f.order_id
            WHERE o.employee_id = ?
            ${year ? 'AND YEAR(o.creation_date) = ?' : ''}
            GROUP BY DATE_FORMAT(o.creation_date, '%Y-%m')
            ORDER BY date ASC
            LIMIT 12`;
          break;
        case 'quarter':
          timeQuery = `
            SELECT 
              CONCAT(YEAR(o.creation_date), '-Q', QUARTER(o.creation_date)) as date,
              CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
              COUNT(*) as total_orders
            FROM \`order\` o
            JOIN feedback f ON o.order_id = f.order_id
            WHERE o.employee_id = ?
            ${year ? 'AND YEAR(o.creation_date) = ?' : ''}
            GROUP BY date
            ORDER BY date ASC
            LIMIT 4`;
          break;
        default: // year
          timeQuery = `
            SELECT 
              YEAR(o.creation_date) as date,
              CAST(AVG(f.service_rating) AS DECIMAL(10,2)) as avg_service_rating,
              COUNT(*) as total_orders
            FROM \`order\` o
            LEFT JOIN feedback f ON o.order_id = f.order_id
            WHERE o.employee_id = ?
            GROUP BY YEAR(o.creation_date)
            ORDER BY date ASC
            LIMIT ?`;
      }

      const params = [employeeId];
      if (period === 'day' && year && month) {
        params.push(year, month);
      } else if ((period === 'month' || period === 'quarter') && year) {
        params.push(year);
      } else if (period === 'year') {
        params.push(Number(yearLimit));
      }

      const serviceQuery = await db.raw(timeQuery, params);
      serviceData = serviceQuery[0];
    } else {
      // Employee list query with pagination
      let baseQuery = db('employee')
        .join('department', 'employee.department_id', 'department.department_id')
        .join('employee_work_history', 'employee.employee_id', 'employee_work_history.employee_id')
        .where('employee_work_history.branch_id', branchId);

      // Employment status filter
      if (employmentStatus === 'current') {
        baseQuery = baseQuery.whereNull('employee_work_history.end_date');
      } else if (employmentStatus === 'former') {
        baseQuery = baseQuery.whereNotNull('employee_work_history.end_date');
      }

      // Search filter
      if (search) {
        baseQuery = baseQuery.where(function () {
          this.where('employee.name', 'like', `%${search}%`)
            .orWhere('employee.phone_number', 'like', `%${search}%`)
            .orWhere('employee.address', 'like', `%${search}%`)
            .orWhere('department.name', 'like', `%${search}%`);
        });
      }

      // Count total employees
      const countResult = await baseQuery.clone().count('employee.employee_id as total').first();
      totalEmployees = countResult.total;

      // Get paginated employees
      employees = await baseQuery
        .select('employee.employee_id', 'employee.name', 'employee.phone_number', 'employee.address', 'employee.salary', 'department.name as department_name', 'employee_work_history.end_date')
        .orderBy('employee.employee_id')
        .limit(perPage)
        .offset((Number(page) - 1) * perPage);
    }
  }

  const branches = await db('branch');
  res.render('layout/main-layout', {
    title: 'Nhân viên chi nhánh | Samurai Sushi',
    description: 'Thống kê nhân viên chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath:  employeeId ? '../branch/employee-service-points.ejs' : '../branch/employees.ejs',
    branches,
    selectedBranch: branchId,
    employmentStatus,
    searchTerm: search,
    employees,
    selectedEmployee,
    selectedPeriod: period,
    selectedYear: year,
    selectedMonth: month,
    yearLimit,
    availableYears,
    serviceData,
    pagination: {
      currentPage: Number(page),
      perPage,
      totalItems: totalEmployees,
      totalPages: Math.ceil(totalEmployees / perPage)
    }
  });
};
