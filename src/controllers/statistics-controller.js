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
            GROUP BY date  /* Changed to match the computed column name */
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
