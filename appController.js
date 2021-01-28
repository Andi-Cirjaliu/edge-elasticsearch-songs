const db = require('./elasticSearch');

const getAllItems = async (req, res, next) => {
    console.log('Get all items...');

    try {
      const result = await db.getAllItems();
      // return res.json(result);
      return res.render("shopping/main", {
        items: result,
        pageTitle: "Shopping list",
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

  const item = req.body.item.trim();
  console.log('Filter by item <', item, '>');

  try {
    const result = await db.filterItems(item);
    // return res.json(result);
    return res.render("shopping/main", {
      items: result,
      pageTitle: "Shopping list",
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