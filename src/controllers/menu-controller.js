import { db } from '../config/db.js';

export const renderMenuPage = async (req, res) => {
  const { category, branch } = req.query;
  let selectedCategory = category ? await db('category').where('category_id', category).first() : null;
  let selectedBranch = branch ? await db('branch').where('branch_id', branch).first() : null;

  const data = {
    searchKeyword: null,
    category: category ? category : null,
    area: null,
    branch: branch ? branch : null
  };

  const dishes = await db.raw(`CALL GetDishes(?, ?, ?, ?)`, [data.searchKeyword, data.category, data.area, data.branch]);

  const allBranches = await db('branch');
  const allCategories = await db('category');

  res.render('layout/main-layout', {
    title: 'Thực đơn | Samurai Sushi',
    description: 'Thực đơn món ăn tại Samurai Sushi',
    dishes: dishes[0][0],
    allBranches,
    allCategories,
    selectedCategory,
    selectedBranch,
    content: '../pages/menu.ejs'
  });
};
