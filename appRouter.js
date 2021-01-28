const express = require('express');
const controller = require('./appController');

const router = express.Router();

//get all items from list
router.get('/', controller.getAllItems);
// router.get('/shopping', controller.getShopppingList);

//filter list
router.post('/shopping', controller.filterList);

module.exports = router;