import { db } from '../config/db.js';

export const renderMenuPage = async (req, res) => {
  const { category, area } = req.query;
  let selectedCategory;
  let selectedArea;
  let dishes;
  if (category && area) {
    selectedCategory = await db('category').where('category_id', category).first();
    selectedArea = await db('area').where('area_id', area).first();
    const query = await db.raw(`select * from dish as d join area_dish_availability a on d.dish_id = a.dish_id and a.area_id = ${area} where d.category_id = ${category}`);
    dishes = query[0];
  } else if (category) {
    selectedCategory = await db('category').where('category_id', category).first();
    const query = await db.raw(`select * from dish as d where d.category_id = ${category}`);
    dishes = query[0];
  } else if (area) {
    selectedArea = await db('area').where('area_id', area).first();
    const query = await db.raw(`select * from dish as d join area_dish_availability a on d.dish_id = a.dish_id and a.area_id = ${area}`);
    dishes = query[0];
  } else {
    dishes = await db('dish');
  }

  const allAreas = await db('area');
  const allCategories = await db('category');

  res.render('layout/main-layout', {
    title: 'Thực đơn | Samurai Sushi',
    description: 'Thực đơn món ăn tại Samurai Sushi',
    dishes,
    allAreas,
    allCategories,
    selectedCategory,
    selectedArea,
    content: '../pages/menu.ejs'
  });
};
