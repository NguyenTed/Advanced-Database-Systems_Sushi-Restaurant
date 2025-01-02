import { db } from '../config/db.js';

async function getAreasData() {
  return await db('area').select('area.*').count('branch.branch_id as branchCount').leftJoin('branch', 'area.area_id', 'branch.area_id').groupBy('area.area_id');
}

export const renderBranchStatistics = async (req, res) => {
  const { areaId, branchId } = req.query;
  const areas = await getAreasData();
  const branches = await db('branch').select('branch.*', 'area.name as area_name').leftJoin('area', 'branch.area_id', 'area.area_id').orderBy(['area.name', 'branch.name']);

  res.render('layout/main-layout', {
    title: 'Thống kê chi nhánh | Samurai Sushi',
    description: 'Thống kê chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    areas,
    branches,
    selectedArea: areaId,
    selectedBranch: branchId
  });
};

export const renderBranchRevenue = async (req, res) => {
  const { branchId, period = 'day', year, month, yearLimit = 5, areaId } = req.query; // Default to 'day'
  const areas = await getAreasData();
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

  const branches = await db('branch');
  res.render('layout/main-layout', {
    title: 'Doanh thu chi nhánh | Samurai Sushi',
    description: 'Thống kê doanh thu chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    contentPath: '../company/revenue.ejs',
    areas,
    branches,
    selectedArea: areaId,
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
  const { branchId, employeeId, period = 'day', year, month, yearLimit = 5, employmentStatus = 'all', search, page = 1, areaId } = req.query;
  const areas = await getAreasData();

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

  const branches = await db('branch');
  res.render('layout/main-layout', {
    title: 'Nhân viên chi nhánh | Samurai Sushi',
    description: 'Thống kê nhân viên chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    contentPath: employeeId ? '../company/employee-service-points.ejs' : '../company/employees.ejs',
    areas,
    branches,
    selectedArea: areaId,
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

export const getEditEmployee = async (req, res) => {
  const { branchId, employeeId, areaId } = req.query;
  const areas = await getAreasData();

  if (!employeeId) {
    return res.redirect(`/thong-ke/cong-ty/nhan-vien?areaId=${areaId}&branchId=${branchId}`);
  }

  const employee = await db('EMPLOYEE')
    .join('DEPARTMENT', 'EMPLOYEE.department_id', 'DEPARTMENT.department_id')
    .where('EMPLOYEE.employee_id', employeeId)
    .select('EMPLOYEE.*', 'DEPARTMENT.name as department_name')
    .first();

  if (!employee) {
    return res.redirect(`/thong-ke/cong-ty/nhan-vien?areaId=${areaId}&branchId=${branchId}`);
  }

  const departments = await db('DEPARTMENT').select('name');
  const branches = await db('branch'); // Need branches for company layout

  res.render('layout/main-layout', {
    title: 'Chỉnh sửa nhân viên | Samurai Sushi',
    description: 'Chỉnh sửa thông tin nhân viên',
    content: '../pages/statistics/company/company.ejs',
    contentPath: '../company/edit-employee.ejs',
    path: '/thong-ke/cong-ty/nhan-vien',
    areas,
    selectedArea: areaId,
    branches,
    selectedBranch: branchId,
    employee,
    departments
  });
};

export const postEditEmployee = async (req, res) => {
  const { employee_id } = req.body;
  const { areaId, branchId, type } = req.query;

  try {
    if (type === 'personal') {
      const { name, address, phone_number } = req.body;
      await db('EMPLOYEE').where('employee_id', employee_id).update({
        name,
        address,
        phone_number
      });
    } else if (type === 'transfer') {
      const { department, branch } = req.body;

      // Get department_id from department name
      const departmentRecord = await db('DEPARTMENT').where('name', department).select('department_id').first();

      if (!departmentRecord) {
        return res.status(400).send('Invalid department');
      }

      // Call TransferEmployee stored procedure
      await db.raw('CALL TransferEmployee(?, ?, ?, ?)', [
        employee_id,
        branch,
        departmentRecord.department_id,
        new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD
      ]);
    }

    res.redirect(`/thong-ke/cong-ty/nhan-vien?areaId=${areaId}&branchId=${branchId}`);
  } catch (error) {
    if (error.message.includes('Employee is already in the specified branch and department')) {
      return res.status(400).send('Nhân viên đã thuộc chi nhánh và bộ phận này');
    }
    console.error(error);
    res.status(500).send('Server Error');
  }
};

export const renderBranchCustomers = async (req, res) => {
  const { branchId, search, page = 1, customerId, areaId } = req.query;

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

  const areas = await getAreasData();
  const branches = await db('branch');
  res.render('layout/main-layout', {
    title: 'Khách hàng chi nhánh | Samurai Sushi',
    description: 'Thống kê khách hàng chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    contentPath: '../company/customers.ejs',
    areas,
    branches,
    selectedArea: areaId,
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
  const { branchId, search, page = 1, startDate, endDate, areaId } = req.query;
  const areas = await getAreasData();
  const branches = await db('branch');
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
  }

  res.render('layout/main-layout', {
    title: 'Hóa đơn chi nhánh | Samurai Sushi',
    description: 'Thống kê hóa đơn chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    contentPath: '../company/invoices.ejs',
    areas,
    branches,
    selectedArea: areaId || null,
    selectedBranch: branchId || null,
    searchTerm: search || '',
    startDate: startDate || '',
    endDate: endDate || '',
    invoices,
    pagination: {
      currentPage: Number(page),
      perPage,
      totalItems: totalInvoices,
      totalPages: Math.ceil(totalInvoices / perPage) || 0
    }
  });
};

export const renderBranchDishes = async (req, res) => {
  const { branchId, startDate, endDate, areaId } = req.query;
  let { sortBy = 'quantity', sortOrder = 'desc' } = req.query;
  const areas = await getAreasData();
  const branches = await db('branch');

  // Validate sort parameters
  const validSortColumns = ['quantity', 'revenue'];
  const validSortOrders = ['asc', 'desc'];

  if (!validSortColumns.includes(sortBy)) sortBy = 'quantity';
  if (!validSortOrders.includes(sortOrder)) sortOrder = 'desc';

  let dishesData = [];
  let bestSelling = [];
  let worstSelling = [];
  let totalRevenue = 0;

  if (branchId) {
    // Call stored procedure
    const query = await db.raw('CALL GetMostOrderedDishesInRange(?, ?, ?, ?, ?)', [branchId, startDate || null, endDate || null, sortBy, sortOrder]);
    dishesData = query[0][0]; // First element of first row set

    // Sort by quantity for best/worst selling
    const sortedByQuantity = [...dishesData].sort((a, b) => b.quantity - a.quantity);
    bestSelling = sortedByQuantity.slice(0, 5);
    worstSelling = sortedByQuantity.slice(-5).reverse();

    totalRevenue = dishesData.reduce((sum, dish) => sum + Number(dish.revenue), 0);
  }

  res.render('layout/main-layout', {
    title: 'Thống kê món ăn | Samurai Sushi',
    description: 'Thống kê món ăn chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    contentPath: '../company/dishes.ejs',
    areas,
    branches,
    selectedArea: areaId,
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
