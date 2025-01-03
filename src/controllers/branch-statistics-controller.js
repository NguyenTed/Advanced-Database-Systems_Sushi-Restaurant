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

  // Access validation
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
      // First get employee basic info
      selectedEmployee = await db('employee')
        .join('department', 'employee.department_id', 'department.department_id')
        .where('employee.employee_id', employeeId)
        .select('employee.employee_id', 'employee.name', 'department.name as department_name')
        .first();

      // Then get service stats
      const statsQuery = await db.raw('CALL GetEmployeeServiceStats(?, ?, ?, ?, ?)', [employeeId, period, year || null, month || null, yearLimit]);

      availableYears = statsQuery[0][0].map((row) => row.year); // Get just the years
      serviceData = statsQuery[0][1]; // Service stats
    } else {
      // Get employee list with filters
      const listQuery = await db.raw('CALL GetEmployeesList(?, ?, ?, ?, ?)', [branchId, employmentStatus, search || null, Number(page), perPage]);

      totalEmployees = listQuery[0][0][0].total; // First result set, first row
      employees = listQuery[0][1]; // Second result set
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
      // Get customer detail
      const customerResult = await db.raw('CALL GetCustomerDetail(?)', [customerId]);
      selectedCustomer = customerResult[0][0][0];
    } else {
      // Get customers list
      const result = await db.raw('CALL GetBranchCustomers(?, ?, ?, ?)', [branchId, search || null, Number(page), perPage]);

      totalCustomers = result[0][0][0].total;
      customers = result[0][1];
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

  // Validate branch access
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
    // Call stored procedure
    const result = await db.raw('CALL SearchInvoicesByCriteria(?, ?, ?, ?, ?, ?)', [branchId, search || null, startDate || null, endDate || null, Number(page), perPage]);

    // First result set contains total count
    totalInvoices = result[0][0][0].total;
    // Second result set contains paginated invoices
    invoices = result[0][1];

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
  } else {
    res.render('layout/main-layout', {
      title: 'Hóa đơn chi nhánh | Samurai Sushi',
      description: 'Thống kê hóa đơn chi nhánh Samurai Sushi',
      content: '../pages/statistics/branch/branch.ejs',
      contentPath: '../branch/invoices.ejs',
      selectedBranch: null
    });
  }
};

export const renderBranchDishes = async (req, res) => {
  const userBranchId = req.profile.branch_id;
  const { branchId, startDate, endDate } = req.query;

  // Validate branch access
  if (!validateBranchAccess(branchId, userBranchId)) {
    return res.status(403).render('layout/main-layout', {
      title: '403 - Không có quyền',
      description: 'Bạn không có quyền truy cập dữ liệu của chi nhánh khác',
      content: '../pages/403.ejs'
    });
  }

  let { sortBy = 'quantity', sortOrder = 'desc' } = req.query;
  const validSortColumns = ['quantity', 'revenue'];
  const validSortOrders = ['asc', 'desc'];

  if (!validSortColumns.includes(sortBy)) sortBy = 'quantity';
  if (!validSortOrders.includes(sortOrder)) sortOrder = 'desc';

  let dishesData = [];
  let bestSelling = [];
  let worstSelling = [];
  let totalRevenue = 0;

  if (branchId) {
    const query = await db.raw('CALL GetMostOrderedDishesInRange(?, ?, ?, ?, ?)', [branchId, startDate || null, endDate || null, sortBy, sortOrder]);

    dishesData = query[0][0];
    const sortedByQuantity = [...dishesData].sort((a, b) => b.quantity - a.quantity);
    bestSelling = sortedByQuantity.slice(0, 5);
    worstSelling = sortedByQuantity.slice(-5).reverse();
    totalRevenue = dishesData.reduce((sum, dish) => sum + Number(dish.revenue), 0);
  }

  const branch = await db('branch').where('branch_id', branchId).first();

  res.render('layout/main-layout', {
    title: 'Thống kê món ăn | Samurai Sushi',
    description: 'Thống kê món ăn chi nhánh Samurai Sushi',
    content: '../pages/statistics/branch/branch.ejs',
    contentPath: '../branch/dishes.ejs', // Add this line
    path: '/thong-ke/chi-nhanh/mon-an', // Add this line
    branch,
    selectedBranch: branchId,
    dishesData,
    bestSelling,
    worstSelling,
    totalRevenue,
    startDate,
    endDate,
    sortBy,
    sortOrder
  });
};
