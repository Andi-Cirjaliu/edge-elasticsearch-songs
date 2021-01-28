const db = require('./elasticSearch');

const TITLE = 'Top Spotify songs from 2010-2019 - by year';

const getAllItems = async (req, res, next) => {
    console.log('Get all items...');

    try {
      const result = await db.getAllItems();
      // return res.json(result);
      return res.render("main", {
        items: result,
        pageTitle: TITLE,
        errorMsg: null 
      });
    } catch (err) {
        console.log('An error occured: ', err);
        const error = new Error("Could not retrieve the shopping list");
        error.statusCode = 500;
        return next(error);
    }
}

const filterList = async (req, res, next) => {
  console.log('Filter list...');

  const info = req.body.info.trim();
  const year = req.body.year.trim();
  console.log('Filter by info <', info, '> and year ', year);

  try {
    const result = await db.filterItems(info, year);
    // return res.json(result);
    return res.render("main", {
      items: result,
      pageTitle: TITLE,
      errorMsg: null 
    });
  } catch (err) {
      console.log('An error occured: ', err);
      const error = new Error("Could not retrieve the shopping list");
      error.statusCode = 500;
      return next(error);
  }
}

module.exports = {
  getAllItems,
  filterList,
};