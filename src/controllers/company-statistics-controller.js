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
  const { branchId, period = 'day', year, month, yearLimit = 5, areaId, type } = req.query;
  const areas = await getAreasData();
  let revenueData = [];
  let availableYears = [];
  let availableMonths = [];

  // Get available years for either company or branch view
  const yearsQuery = await db.raw(
    `
    SELECT DISTINCT YEAR(i.issue_date) as year
    FROM invoice i
    JOIN \`order\` o ON i.order_id = o.order_id
    ${branchId ? 'WHERE o.branch_id = ?' : ''}
    ORDER BY year DESC`,
    branchId ? [branchId] : []
  );
  availableYears = yearsQuery[0];

  // Get available months if year is selected
  if (year) {
    const monthsQuery = await db.raw(
      `
      SELECT DISTINCT MONTH(i.issue_date) as month
      FROM invoice i
      JOIN \`order\` o ON i.order_id = o.order_id
      ${branchId ? 'WHERE o.branch_id = ?' : ''} 
      ${year ? `${branchId ? 'AND' : 'WHERE'} YEAR(i.issue_date) = ?` : ''}
      ORDER BY month ASC`,
      branchId ? [branchId, year] : [year]
    );
    availableMonths = monthsQuery[0];
  }

  let timeQuery = '';
  switch (period) {
    case 'month':
      timeQuery = `
        SELECT 
          DATE_FORMAT(i.issue_date, '%Y-%m') as date,
          COUNT(DISTINCT o.branch_id) as branch_count,
          SUM(i.total_amount) as revenue
        FROM invoice i
        JOIN \`order\` o ON i.order_id = o.order_id
        ${branchId ? 'WHERE o.branch_id = ?' : ''}
        ${year ? `${branchId ? 'AND' : 'WHERE'} YEAR(i.issue_date) = ?` : ''}
        GROUP BY DATE_FORMAT(i.issue_date, '%Y-%m')
        ORDER BY date ASC
        LIMIT 12`;
      break;
    case 'quarter':
      timeQuery = `
        SELECT 
          CONCAT(YEAR(i.issue_date), '-Q', QUARTER(i.issue_date)) as date,
          COUNT(DISTINCT o.branch_id) as branch_count,
          SUM(i.total_amount) as revenue
        FROM invoice i
        JOIN \`order\` o ON i.order_id = o.order_id
        ${branchId ? 'WHERE o.branch_id = ?' : ''}
        ${year ? `${branchId ? 'AND' : 'WHERE'} YEAR(i.issue_date) = ?` : ''}
        GROUP BY date
        ORDER BY date ASC
        LIMIT 8`;
      break;
    case 'year':
      timeQuery = `
        SELECT 
          YEAR(i.issue_date) as date,
          COUNT(DISTINCT o.branch_id) as branch_count,
          SUM(i.total_amount) as revenue
        FROM invoice i
        JOIN \`order\` o ON i.order_id = o.order_id
        ${branchId ? 'WHERE o.branch_id = ?' : ''}
        GROUP BY YEAR(i.issue_date)
        ORDER BY date ASC
        LIMIT ?`;
      break;
    default: // day
      timeQuery = `
        SELECT 
          DATE(i.issue_date) as date,
          COUNT(DISTINCT o.branch_id) as branch_count,
          SUM(i.total_amount) as revenue
        FROM invoice i
        JOIN \`order\` o ON i.order_id = o.order_id
        ${branchId ? 'WHERE o.branch_id = ?' : ''}
        ${year && month ? `${branchId ? 'AND' : 'WHERE'} YEAR(i.issue_date) = ? AND MONTH(i.issue_date) = ?` : ''}
        GROUP BY DATE(i.issue_date)
        ORDER BY date ASC
        LIMIT 30`;
  }

  const params = [];
  if (branchId) params.push(branchId);
  if (period === 'day' && year && month) {
    params.push(year, month);
  } else if ((period === 'month' || period === 'quarter') && year) {
    params.push(year);
  } else if (period === 'year') {
    params.push(Number(yearLimit));
  }

  const query = await db.raw(timeQuery, params);
  revenueData = query[0];

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

  try {
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
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
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

      // Get department_id and basic_salary from department name
      const departmentRecord = await db('DEPARTMENT').where('name', department).select('department_id', 'basic_salary').first();

      if (!departmentRecord) {
        return res.status(400).send('Invalid department');
      }

      // Check if there's an existing active work history
      const currentWorkHistory = await db('EMPLOYEE_WORK_HISTORY')
        .where({
          employee_id,
          end_date: null
        })
        .first();

      // If there is an active work history, update its end date
      if (currentWorkHistory) {
        await db('EMPLOYEE_WORK_HISTORY')
          .where({
            employee_id,
            end_date: null
          })
          .update({
            end_date: new Date()
          });
      }

      // Create new work history record
      await db('EMPLOYEE_WORK_HISTORY').insert({
        employee_id,
        branch_id: branch,
        department_id: departmentRecord.department_id,
        start_date: new Date()
      });

      // Update employee record
      await db('EMPLOYEE').where('employee_id', employee_id).update({
        department_id: departmentRecord.department_id,
        branch_id: branch,
        salary: departmentRecord.basic_salary
      });
    }

    res.redirect(`/thong-ke/cong-ty/nhan-vien?areaId=${areaId}&branchId=${branchId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

export const renderBranchCustomers = async (req, res) => {
  const { branchId, search, page = 1, customerId, areaId } = req.query;
  const perPage = 20;
  const areas = await getAreasData();

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

  const branches = await db('branch');

  res.render('layout/main-layout', {
    title: 'Hóa đơn chi nhánh | Samurai Sushi',
    description: 'Thống kê hóa đơn chi nhánh Samurai Sushi',
    content: '../pages/statistics/company/company.ejs',
    contentPath: '../company/invoices.ejs',
    areas,
    branches,
    selectedArea: areaId,
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
    // Base query with safe sort parameters
    const baseQuery = db.raw(
      `SELECT 
          d.name,
          IFNULL(SUM(od.quantity), 0) AS quantity,
          IFNULL(SUM(od.quantity * d.price), 0) AS revenue
         FROM dish d
         LEFT JOIN order_detail od ON d.dish_id = od.dish_id
         LEFT JOIN \`order\` o ON od.order_id = o.order_id
         WHERE o.branch_id = ?
         AND o.status = 'Completed'
         ${startDate ? 'AND o.creation_date >= ?' : ''}
         ${endDate ? 'AND o.creation_date <= ?' : ''}
         GROUP BY d.dish_id, d.name
         ORDER BY ${sortBy} ${sortOrder}`,
      [branchId, ...(startDate ? [startDate] : []), ...(endDate ? [endDate] : [])]
    );

    const query = await baseQuery;
    dishesData = query[0];

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
