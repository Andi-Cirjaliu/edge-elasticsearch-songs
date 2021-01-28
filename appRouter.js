const express = require('express');
const controller = require('./appController');

const router = express.Router();

//get all items from list
router.get('/', controller.getAllItems);

//filter list
router.post('/', controller.filterList);

module.exports = router;