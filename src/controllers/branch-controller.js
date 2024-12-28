import { db } from '../config/db.js';

export const renderBranchesPage = async (req, res) => {
  try {
    // Get all areas with their branch counts
    const areasWithCounts = await db('area')
      .select('area.*')
      .count('branch.branch_id as branchCount')
      .leftJoin('branch', 'area.area_id', 'branch.area_id')
      .groupBy('area.area_id');

    // Get all branches with related info
    const branches = await db('branch')
      .select(
        'branch.*',
        'employee.name as manager_name',
        'area.name as area_name'
      )
      .leftJoin('employee', 'branch.employee_id', 'employee.employee_id')
      .leftJoin('area', 'branch.area_id', 'area.area_id')
      .orderBy(['area.name', 'branch.name']);

    res.render('layout/main-layout', {
      title: 'Chi nhánh | SushiX Restaurant',
      description: 'Hệ thống chi nhánh SushiX Restaurant',
      content: '../pages/branches',
      areas: areasWithCounts,
      branches,
      selectedArea: req.query.area || null
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).render('error');
  }
};