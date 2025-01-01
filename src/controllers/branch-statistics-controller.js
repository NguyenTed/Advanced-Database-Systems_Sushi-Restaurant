import { db } from '../config/db.js';

const validateBranchAccess = (requestedBranchId, userBranchId) => {
  if (!requestedBranchId || requestedBranchId != userBranchId) {
    return false;
  }
  return true;
};

export const renderBranchStatistics = async (req, res) => {
  const branchId = req.profile.branch_id;

  const branch = await db('branch').where('branch_id', branchId).first();
  res.render('layout/main-layout', {
    title: 'Thống kê chi nhánh | Samurai Sushi',
    description: 'Thống kê chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    branch,
    selectedBranch: branchId
  });
};

export const renderBranchRevenue = async (req, res) => {
  const userBranchId = req.profile.branch_id;
  const { branchId, period = 'day', year, month, yearLimit = 5 } = req.query; // Default to 'day'
  if (!validateBranchAccess(branchId, userBranchId)) {
    return res.status(403).render('layout/main-layout', {
      title: '403 - Không có quyền',
      description: 'Bạn không có quyền truy cập dữ liệu của chi nhánh khác',
      content: '../pages/403.ejs'
    });
  }

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

    const params = {
      branchId: branchId,
      year: year ? year : null,
      month: month ? month : null
    };

    let result;

    switch (period) {
      case 'month':
        if (params.year) result = await db.raw(`CALL GetMonthlyRevenueByYear(?, ?)`, [params.branchId, params.year]);
        break;
      case 'quarter':
        if (params.year) result = await db.raw(`CALL GetQuarterlyRevenueByYear(?, ?)`, [params.branchId, params.year]);
        break;
      case 'year':
        result = await db.raw(`CALL GetYearlyRevenue(?)`, [params.branchId]);
        break;
      default: // day
        result = await db.raw(`CALL GetDailyRevenueByMonthYear(?, ?, ?)`, [params.branchId, params.year, params.month]);
    }

    revenueData = result ? result[0][0] : [];
  }

  const branch = await db('branch').where('branch_id', branchId).first();
  res.render('layout/main-layout', {
    title: 'Doanh thu chi nhánh | Samurai Sushi',
    description: 'Thống kê doanh thu chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath: '../branch/revenue.ejs',
    branch,
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
  const userBranchId = req.profile.branch_id;
  const { branchId, employeeId, period = 'day', year, month, yearLimit = 5, employmentStatus = 'all', search, page = 1 } = req.query;
  if (!validateBranchAccess(branchId, userBranchId)) {
    return res.status(403).render('layout/main-layout', {
      title: '403 - Không có quyền',
      description: 'Bạn không có quyền truy cập dữ liệu của chi nhánh khác',
      content: '../pages/403.ejs'
    });
  }

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
            .orWhere('department.name', 'like', `%${search}%`)
            .orWhere(function () {
              const salaryNum = parseFloat(search.replace(/[^0-9.-]+/g, ''));
              if (!isNaN(salaryNum)) {
                this.where('employee.salary', '=', salaryNum);
              }
            });
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

  const branch = await db('branch').where('branch_id', branchId).first();
  res.render('layout/main-layout', {
    title: 'Nhân viên chi nhánh | Samurai Sushi',
    description: 'Thống kê nhân viên chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath: employeeId ? '../branch/employee-service-points.ejs' : '../branch/employees.ejs',
    branch,
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

export const renderBranchCustomers = async (req, res) => {
  const userBranchId = req.profile.branch_id;
  const { branchId, search, page = 1, customerId } = req.query;
  if (!validateBranchAccess(branchId, userBranchId)) {
    return res.status(403).render('layout/main-layout', {
      title: '403 - Không có quyền',
      description: 'Bạn không có quyền truy cập dữ liệu của chi nhánh khác',
      content: '../pages/403.ejs'
    });
  }

  const perPage = 20;
  let customers = [];
  let totalCustomers = 0;
  let selectedCustomer = null;

  if (branchId) {
    if (customerId) {
      // Get selected customer with membership card info
      selectedCustomer = await db('customer')
        .select('customer.*', 'membership_card.card_num', 'membership_card.type', 'membership_card.points', 'membership_card.issue_date', 'membership_card.discount_amount')
        .leftJoin('membership_card', 'customer.customer_id', 'membership_card.customer_id')
        .where('customer.customer_id', customerId)
        .first();
    } else {
      // Base conditions for search
      const applyConditions = (query) => {
        query.where('order.branch_id', branchId);
        if (search) {
          query.where(function () {
            const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
            const matches = search.match(dateRegex);

            this.where('customer.name', 'like', `%${search}%`)
              .orWhere('customer.phone_number', 'like', `%${search}%`)
              .orWhere('customer.email', 'like', `%${search}%`)
              .orWhere('customer.personal_id', 'like', `%${search}%`)
              .orWhere('customer.gender', 'like', `${search}`);

            if (matches) {
              const [, day, month, year] = matches;
              const mysqlDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              this.orWhere('customer.date_of_birth', mysqlDate);
            }
          });
        }
        return query;
      };

      // Count query
      const countQuery = db('customer').join('order', 'customer.customer_id', 'order.customer_id');
      applyConditions(countQuery);
      const countResult = await countQuery.countDistinct('customer.customer_id as total').first();
      totalCustomers = countResult.total;

      // Data query
      const dataQuery = db('customer')
        .select('customer.customer_id', 'customer.name', 'customer.phone_number', 'customer.email', 'customer.personal_id', 'customer.date_of_birth', 'customer.gender', 'membership_card.card_num')
        .distinct()
        .join('order', 'customer.customer_id', 'order.customer_id')
        .leftJoin('membership_card', 'customer.customer_id', 'membership_card.customer_id');

      applyConditions(dataQuery);
      customers = await dataQuery
        .orderBy('customer.customer_id')
        .limit(perPage)
        .offset((Number(page) - 1) * perPage);
    }
  }

  const branch = await db('branch').where('branch_id', branchId).first();
  res.render('layout/main-layout', {
    title: 'Khách hàng chi nhánh | Samurai Sushi',
    description: 'Thống kê khách hàng chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath: '../branch/customers.ejs',
    branch,
    selectedBranch: branchId,
    searchTerm: search,
    customers,
    selectedCustomer,
    pagination: {
      currentPage: Number(page),
      perPage,
      totalItems: totalCustomers,
      totalPages: Math.ceil(totalCustomers / perPage)
    }
  });
};

export const renderBranchInvoices = async (req, res) => {
  const userBranchId = req.profile.branch_id;
  const { branchId, search, page = 1, startDate, endDate } = req.query;
  if (!validateBranchAccess(branchId, userBranchId)) {
    return res.status(403).render('layout/main-layout', {
      title: '403 - Không có quyền',
      description: 'Bạn không có quyền truy cập dữ liệu của chi nhánh khác',
      content: '../pages/403.ejs'
    });
  }

  const perPage = 20;
  let invoices = [];
  let totalInvoices = 0;

  if (branchId) {
    // Base query
    const baseQuery = db('invoice as i').join('order as o', 'i.order_id', 'o.order_id').leftJoin('customer as c', 'i.customer_id', 'c.customer_id').where('o.branch_id', branchId);

    // Apply search filters if any
    if (search || startDate || endDate) {
      baseQuery.where(function () {
        if (search) {
          this.where('c.name', 'like', `%${search}%`).orWhere('i.invoice_id', 'like', `%${search}%`);
        }
        if (startDate) {
          this.where('i.issue_date', '>=', startDate);
        }
        if (endDate) {
          this.where('i.issue_date', '<=', endDate);
        }
      });
    }

    // Count total invoices
    const countResult = await baseQuery.clone().count('i.invoice_id as total').first();
    totalInvoices = countResult.total;

    // Get paginated invoices
    invoices = await baseQuery
      .select('i.invoice_id', 'i.issue_date', 'i.total_amount', 'i.discount_amount', 'i.points_earned', 'c.name as customer_name', 'c.customer_id', 'c.phone_number')
      .orderBy('i.issue_date', 'desc')
      .limit(perPage)
      .offset((page - 1) * perPage);
  }

  const branch = await db('branch').where('branch_id', branchId).first();
  res.render('layout/main-layout', {
    title: 'Hóa đơn chi nhánh | Samurai Sushi',
    description: 'Thống kê hóa đơn chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath: '../branch/invoices.ejs',
    branch,
    selectedBranch: branchId,
    searchTerm: search,
    startDate,
    endDate,
    invoices,
    pagination: {
      currentPage: Number(page),
      perPage,
      totalItems: totalInvoices,
      totalPages: Math.ceil(totalInvoices / perPage)
    }
  });
};
